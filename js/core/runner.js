// ─── Pipeline Runner ──────────────────────────────────────────────────────────
// Orchestrates lexer → parser → semantic → ir → optimizer → codegen
// Calls phase callbacks so the UI can update incrementally.

import {
  createResult,
  phaseCompleted,
  phaseFailed,
  markNotRun,
  PHASE_ORDER,
  Status,
} from "./contract.js";
import { ParseError } from "./errors.js";
import { parseWithTreeSitter } from "./tree-sitter.js";
import {
  analyzeTreeSitterAst,
  generateTreeSitterIr,
  optimizeTreeSitterIr,
  generateTreeSitterTarget,
} from "./tree-sitter-pipeline.js";

/**
 * Run the full compilation pipeline for a given language module.
 *
 * @param {object} langModule  - Language module (c, java, python, etc.)
 * @param {string} source      - Raw source text from editor
 * @param {object} callbacks   - { onPhaseStart(id), onPhaseEnd(id, phaseData) }
 * @returns {Promise<CompileResult>}
 */
export async function runPipeline(langModule, source, callbacks = {}) {
  const { onPhaseStart, onPhaseEnd } = callbacks;
  let backendResult = null;

  // Try to use the backend if available
  if (langModule.backend && typeof langModule.backend.run === 'function') {
    try {
      backendResult = await langModule.backend.run(source);
    } catch (err) {
      // Fall back to frontend if backend fails
      console.warn('Backend unavailable or failed, falling back to frontend for', langModule.id, err);
    }
  }

  if (backendResult) {
    const result = createResult(langModule.id, source, "backend");
    const lexical = langModule.lexer.tokenize(source);
    const tree = await parseWithTreeSitter(langModule.id, source);

    backendResult.phases = backendResult.phases || {};
    backendResult.phases.lexical = {
      status: "completed",
      tokens: lexical.tokens ?? [],
      errors: lexical.errors ?? [],
    };
    backendResult.phases.syntax = tree?.hasError
      ? {
          status: Status.FAILED,
          diagnostic: {
            phase: "syntax",
            message: "Tree-sitter found invalid syntax.",
            line: (tree.errorNode?.startPosition?.row ?? 0) + 1,
            col: (tree.errorNode?.startPosition?.column ?? 0) + 1,
          },
        }
      : {
          status: "completed",
          ast: tree?.ast,
          astText: tree?.astText ?? "",
          errors: [],
        };

    for (const phaseId of PHASE_ORDER) {
      const phaseData = backendResult.phases[phaseId] ?? {
        status: Status.NOT_RUN,
        reason: "Phase was not provided by the backend.",
      };
      result.phases[phaseId] = {
        ...phaseData,
        status: phaseData.status ?? Status.COMPLETED,
      };
      if (onPhaseEnd) onPhaseEnd(phaseId, result.phases[phaseId]);
    }
    result.status = Object.values(result.phases).some(
      (phase) => phase.status === Status.FAILED,
    )
      ? Status.FAILED
      : Status.COMPLETED;
    return result;
  }

  // Frontend pipeline (Tree-sitter and educational backends)
  const result = createResult(langModule.id, source, backendResult ? "backend" : "live");

  const phaseRunners = [
    {
      id: "lexical",
      fn: async () => {
        const phaseResult = langModule.lexer.tokenize(source);
        const treeResult = await parseWithTreeSitter(langModule.id, source);
        if (treeResult) {
          phaseResult.errors = [];
          phaseResult.treeResult = treeResult;
        }
        return phaseResult;
      },
    },
    {
      id: "syntax",
      fn: async (ctx) => {
        const treeResult =
          ctx.treeResult ?? (await parseWithTreeSitter(langModule.id, source));
        if (!treeResult) {
          throw new ParseError(
            `No Tree-sitter grammar is available for ${langModule.label || langModule.id}.`,
            1,
            1,
          );
        }
        if (treeResult?.hasError) {
          const node = treeResult.errorNode;
          const row = node?.startPosition?.row ?? 0;
          const column = node?.startPosition?.column ?? 0;
          throw new ParseError(
            `Tree-sitter found invalid ${langModule.label || langModule.id} syntax near '${node?.type || "source"}'.`,
            row + 1,
            column + 1,
          );
        }

        try {
          const lowered = langModule.parser.parse(ctx.tokens, source);
          if (!lowered?.errors?.length) return lowered;
        } catch {
          // Fall through to the generic Tree-sitter AST for unsupported syntax.
        }

        return {
          ast: treeResult.ast,
          astText: treeResult.astText,
          treeSitterOnly: true,
        };
      },
    },
    {
      id: "semantic",
      fn: (ctx) =>
        ctx.treeSitterOnly
          ? analyzeTreeSitterAst(ctx.ast, langModule.id)
          : langModule.semantic.analyze(ctx.ast, source),
    },
    {
      id: "intermediate",
      fn: (ctx) =>
        ctx.treeSitterOnly
          ? generateTreeSitterIr(ctx.ast)
          : langModule.ir.generate(ctx.ast, ctx.symbolTable),
    },
    {
      id: "optimization",
      fn: (ctx) =>
        ctx.treeSitterOnly
          ? optimizeTreeSitterIr(ctx.instructions)
          : langModule.optimizer.optimize(ctx.instructions),
    },
    {
      id: "target",
      fn: (ctx) =>
        ctx.treeSitterOnly
          ? generateTreeSitterTarget(ctx.optimizedInstructions, langModule.id)
          : langModule.codegen.generate(
              ctx.optimizedInstructions,
              ctx.symbolTable,
              langModule.id,
            ),
    },
  ];

  // Context carries forward outputs from each phase
  const ctx = {};
  let failedAt = -1;

  for (let i = 0; i < phaseRunners.length; i++) {
    const { id, fn } = phaseRunners[i];
    result.phases[id] = { status: Status.RUNNING };

    if (onPhaseStart) onPhaseStart(id);

    // Small yield to allow UI to update before sync-heavy work
    await yieldToUI();

    if (failedAt >= 0) {
      // Upstream failed: mark not_run
      const prevFailed = PHASE_ORDER[failedAt];
      const reason = `${capitalize(prevFailed)} analysis failed — this phase was not executed.`;
      result.phases[id] = { status: Status.NOT_RUN, reason };
      if (onPhaseEnd) onPhaseEnd(id, result.phases[id]);
      continue;
    }

    try {
      // The backend deliberately owns semantic analysis and later phases. Keep
      // lexical/syntax data from Tree-sitter so those UI panels remain useful.
      if (backendResult && i >= 2) {
        const phaseData = backendResult.phases?.[id];
        if (!phaseData) throw new Error(`Backend did not return the ${id} phase.`);
        if (id === "semantic") ctx.symbolTable = phaseData.symbolTable;
        if (id === "intermediate") ctx.instructions = phaseData.instructions;
        if (id === "optimization") ctx.optimizedInstructions = phaseData.after;
        phaseCompleted(result, id, phaseData);
        if (onPhaseEnd) onPhaseEnd(id, result.phases[id]);
        continue;
      }

      const phaseResult = await fn(ctx);
      if (phaseResult?.errors?.length) {
        throw phaseResult.errors[0];
      }

      // Extract context for next phases
      switch (id) {
        case "lexical":
          ctx.tokens = phaseResult.tokens;
          ctx.treeResult = phaseResult.treeResult;
          phaseCompleted(result, id, {
            tokens: phaseResult.tokens,
            errors: phaseResult.errors ?? [],
          });
          break;
        case "syntax":
          ctx.ast = phaseResult.ast;
          ctx.treeSitterOnly = phaseResult.treeSitterOnly ?? false;
          phaseCompleted(result, id, {
            ast: phaseResult.ast,
            astText: phaseResult.astText ?? "",
            treeSitterOnly: phaseResult.treeSitterOnly ?? false,
            errors: phaseResult.errors ?? [],
          });
          break;
        case "semantic":
          ctx.symbolTable = phaseResult.symbolTable;
          phaseCompleted(result, id, {
            symbolTable: phaseResult.symbolTable,
            checks: phaseResult.checks ?? [],
            warnings: phaseResult.warnings ?? [],
          });
          break;
        case "intermediate":
          ctx.instructions = phaseResult.instructions;
          phaseCompleted(result, id, {
            representation: "TAC",
            instructions: phaseResult.instructions,
          });
          break;
        case "optimization":
          ctx.optimizedInstructions = phaseResult.after;
          phaseCompleted(result, id, {
            before: phaseResult.before,
            after: phaseResult.after,
            passes: phaseResult.passes ?? [],
            note: phaseResult.note ?? "",
          });
          break;
        case "target":
          phaseCompleted(result, id, {
            targetLabel: phaseResult.targetLabel,
            instructions: phaseResult.instructions,
          });
          break;
      }

      if (onPhaseEnd) onPhaseEnd(id, result.phases[id]);
    } catch (err) {
      failedAt = i;
      phaseFailed(result, id, err);
      result.status = "failed";
      if (onPhaseEnd) onPhaseEnd(id, result.phases[id]);
    }
  }

  if (failedAt < 0) result.status = Status.COMPLETED;
  return result;
}

function yieldToUI() {
  return new Promise((r) => setTimeout(r, 0));
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
