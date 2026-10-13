// ─── Shared data contract v2.0 ────────────────────────────────────────────────
// Every language's pipeline produces a CompileResult conforming to this schema.

// Generate a simple run ID without external deps
let _runCounter = 0;
function newRunId() {
  _runCounter++;
  return `run-${Date.now()}-${_runCounter}`;
}

// Simple FNV-1a hash for source text
function hashSource(src) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Phase status values */
export const Status = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  PARTIAL: "partial",
  FAILED: "failed",
  NOT_RUN: "not_run",
});

/** Create a fresh, empty result skeleton */
export function createResult(language, source, mode = "live") {
  return {
    schemaVersion: "2.0",
    runId: newRunId(),
    mode,
    language,
    sourceHash: hashSource(source),
    status: Status.PENDING,
    phases: {
      lexical: { status: Status.PENDING },
      syntax: { status: Status.PENDING },
      semantic: { status: Status.PENDING },
      intermediate: { status: Status.PENDING },
      optimization: { status: Status.PENDING },
      target: { status: Status.PENDING },
    },
    diagnostics: [],
  };
}

/** Mark a phase as completed with its data */
export function phaseCompleted(result, phaseId, data) {
  result.phases[phaseId] = { status: Status.COMPLETED, ...data };
}

/** Mark a phase as failed, push diagnostic */
export function phaseFailed(result, phaseId, error) {
  result.phases[phaseId] = {
    status: Status.FAILED,
    diagnostic: error.toDiagnostic
      ? error.toDiagnostic()
      : {
          id: phaseId + "-error",
          phase: phaseId,
          category: "error",
          message: error.message,
          line: error.line ?? null,
          col: error.col ?? null,
          explanation: "",
        },
  };
  result.diagnostics.push(result.phases[phaseId].diagnostic);
  result.status = Status.FAILED;
}

/** Mark remaining phases as not_run due to an upstream failure */
export function markNotRun(result, fromPhaseIndex, phaseOrder, reason) {
  for (let i = fromPhaseIndex; i < phaseOrder.length; i++) {
    const id = phaseOrder[i];
    if (result.phases[id].status === Status.PENDING) {
      result.phases[id] = { status: Status.NOT_RUN, reason };
    }
  }
}

export const PHASE_ORDER = [
  "lexical",
  "syntax",
  "semantic",
  "intermediate",
  "optimization",
  "target",
];

export const PHASE_NAMES = {
  lexical: "Lexical Analysis",
  syntax: "Syntax Analysis",
  semantic: "Semantic Analysis",
  intermediate: "Intermediate Code (TAC)",
  optimization: "Optimization",
  target: "Target Code Generation",
};
