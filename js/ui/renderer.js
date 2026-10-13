// ─── Phase Output Renderer (Interactive Multi-View) ───────────────────────────
// Renders compiler outputs with graphical AST diagrams, CFG flowcharts, and TAC step animators.

import { renderASTDiagram } from "./ast-tree.js";
import { renderCFG } from "./cfg.js";
import { renderTACAnimator } from "./animator.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

// ── Global Tab Switcher for Phase Cards ───────────────────────────────────────
if (typeof window !== "undefined") {
  window.switchPhaseTab = (phaseId, tabName, btnEl) => {
    const card = document.getElementById(`card-${phaseId}`);
    if (!card) return;

    // Toggle active tab button
    card
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");

    // Toggle view sections
    card
      .querySelectorAll(".phase-tab-view")
      .forEach((v) => (v.style.display = "none"));
    const target = card.querySelector(`[data-tab="${tabName}"]`);
    if (target) target.style.display = "block";

    // If switching to animator, initialize UI
    if (tabName === "animator" && window.vmUpdateUI) {
      window.vmUpdateUI();
    }
  };
}

// ── Tokens table ──────────────────────────────────────────────────────────────
export function renderTokens(tokens) {
  if (!tokens || tokens.length === 0)
    return '<p style="color:var(--muted)">No tokens produced.</p>';
  const rows = tokens
    .filter((t) => t.type !== "EOF")
    .map(
      (t) => `<tr>
      <td class="tok-${esc(t.type)}">${esc(t.lexeme)}</td>
      <td><span class="tok-tag">${esc(t.type)}</span></td>
      <td>${t.line != null ? `${t.line}:${t.col}` : "—"}</td>
    </tr>`,
    )
    .join("");
  return `
    <div class="scroll-x">
      <table>
        <thead><tr><th>Lexeme</th><th>Category</th><th>Location</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="explain">
      A <strong>token</strong> is a categorized lexical unit; its <strong>lexeme</strong> is its exact source-text spelling.
      Whitespace and comments are consumed by the lexer.
    </div>`;
}

// ── AST Multi-View (Visual Tree Diagram + Indented Text) ──────────────────────
export function renderASTMultiView(ast, astText) {
  const visualHtml = renderASTDiagram(ast, "ast-graph-container");
  const textHtml = `
    <div class="ast-tree">${esc(astText || "No text tree available")}</div>
  `;

  return `
    <!-- View Switcher Tabs -->
    <div class="phase-tabs-bar">
      <button class="tab-btn active" onclick="window.switchPhaseTab('syntax', 'visual', this)">
        🌳 Visual Tree Diagram
      </button>
      <button class="tab-btn" onclick="window.switchPhaseTab('syntax', 'text', this)">
        📄 Indented AST Text
      </button>
    </div>

    <!-- Tab 1: Visual Tree Diagram (Default) -->
    <div class="phase-tab-view" data-tab="visual" style="display:block;">
      ${visualHtml}
    </div>

    <!-- Tab 2: Text Tree View -->
    <div class="phase-tab-view" data-tab="text" style="display:none;">
      ${textHtml}
    </div>

    <div class="explain" style="margin-top:14px;">
      <strong>AST (Abstract Syntax Tree)</strong> encapsulates hierarchical program structure.
      Nesting reflects operator precedence and scope boundaries without grammatical syntax clutter.
    </div>
  `;
}

// ── Symbol table ──────────────────────────────────────────────────────────────
export function renderSymbolTable(symbolTable) {
  if (!symbolTable || symbolTable.length === 0)
    return '<p style="color:var(--muted)">Symbol table is empty.</p>';
  const rows = symbolTable
    .map((s) => {
      const isArray = Array.isArray(s);
      const name = isArray ? s[0] : s.name;
      const kind = isArray ? s[1] : s.kind;
      const type = isArray ? s[2] : s.type;
      const scope = isArray ? s[3] : s.scope;
      const value = isArray ? s[4] : (s.value ?? "—");
      return `<tr>
      <td><strong>${esc(name)}</strong></td>
      <td><span class="scope-pill">${esc(kind)}</span></td>
      <td><code>${esc(type)}</code></td>
      <td>${esc(scope)}</td>
      <td>${esc(value)}</td>
    </tr>`;
    })
    .join("");

  return `
    <div class="scroll-x">
      <table>
        <thead><tr><th>Identifier</th><th>Kind</th><th>Type</th><th>Scope</th><th>Value / Init</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ── Checks list ───────────────────────────────────────────────────────────────
export function renderChecks(checks = [], warnings = []) {
  const items = [
    ...checks.map((c) => `<li><span class="ck">✓</span>${esc(c)}</li>`),
    ...warnings.map((w) => `<li><span class="wn">⚠</span>${esc(w)}</li>`),
  ].join("");
  if (!items) return "";
  return `<ul class="checks-list">${items}</ul>`;
}

// ── Intermediate Code Multi-View (TAC + CFG + Step Animator) ──────────────────
export function renderIntermediateMultiView(instructions) {
  if (!instructions || instructions.length === 0) {
    return '<p style="color:var(--muted)">No intermediate instructions generated.</p>';
  }

  const rawCode = instructions.map(esc).join("\n");
  const tacHtml = `
    <div class="code-block-wrap">
      <button class="copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(instructions.join("\n"))}).then(()=>this.textContent='Copied!')">Copy TAC</button>
      <pre class="code-block">${rawCode}</pre>
    </div>
    <div class="explain">
      <strong>Three-Address Code (TAC)</strong> linearizes expressions: each statement has at most one operator.
      Temporaries (<code>t1</code>, <code>t2</code>…) hold intermediate computations.
    </div>
  `;

  const cfgHtml = renderCFG(instructions, "cfg-graph-container");
  const animHtml = renderTACAnimator(instructions, "tac-animator-container");

  return `
    <!-- View Switcher Tabs -->
    <div class="phase-tabs-bar">
      <button class="tab-btn active" onclick="window.switchPhaseTab('intermediate', 'tac', this)">
        📝 Three-Address Code (TAC)
      </button>
      <button class="tab-btn" onclick="window.switchPhaseTab('intermediate', 'cfg', this)">
        🔀 Control Flow Graph (CFG)
      </button>
      <button class="tab-btn" onclick="window.switchPhaseTab('intermediate', 'animator', this)">
        ▶️ Step-Through VM Animator
      </button>
    </div>

    <!-- Tab 1: Linear TAC -->
    <div class="phase-tab-view" data-tab="tac" style="display:block;">
      ${tacHtml}
    </div>

    <!-- Tab 2: Control Flow Graph (CFG) -->
    <div class="phase-tab-view" data-tab="cfg" style="display:none;">
      ${cfgHtml}
    </div>

    <!-- Tab 3: TAC Step Animator -->
    <div class="phase-tab-view" data-tab="animator" style="display:none;">
      ${animHtml}
    </div>
  `;
}

// ── Optimization before/after ────────────────────────────────────────────────
export function renderOptimization(phase) {
  const before = (phase.before || []).map(esc).join("\n");
  const after = (phase.after || []).map(esc).join("\n");
  const passNames = (phase.passes || []).join(", ");
  return `
    <div class="tac-compare">
      <div>
        <h4>Before Optimization</h4>
        <pre class="code-block">${before || "(empty)"}</pre>
      </div>
      <div>
        <h4>After Optimization</h4>
        <pre class="code-block">${after || "(empty)"}</pre>
      </div>
    </div>
    ${
      passNames
        ? `<div class="pass-note"><strong>Passes applied: ${esc(passNames)}</strong><br>${esc(phase.note)}</div>`
        : `<div class="pass-note" style="border-left-color:var(--muted)"><strong>No optimization applied.</strong><br>${esc(phase.note)}</div>`
    }`;
}

// ── Target code ───────────────────────────────────────────────────────────────
export function renderTargetCode(phase) {
  const code = (phase.instructions || []).map(esc).join("\n");
  return `
    <span class="badge info">${esc(phase.targetLabel ?? "Educational target code")} — not executable</span>
    <div class="code-block-wrap">
      <button class="copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify((phase.instructions || []).join("\n"))}).then(()=>this.textContent='Copied!')">Copy Target Code</button>
      <pre class="code-block">${code || "(empty)"}</pre>
    </div>
    <div class="explain">
      Target code translation mapping Three-Address Code into architecture-appropriate virtual machine instructions or assembly.
    </div>`;
}

// ── Diagnostic block ──────────────────────────────────────────────────────────
export function renderDiagnostic(diag) {
  if (!diag) return "";
  const loc =
    diag.line != null
      ? `Line ${diag.line}${diag.col != null ? `, column ${diag.col}` : ""}`
      : "";
  return `
    <div class="diag">
      <div class="dphase">⛔ Error — ${esc(diag.phase ?? "")} phase</div>
      <div class="dmsg">${esc(diag.message)}</div>
      ${loc ? `<div class="dloc">📍 ${esc(loc)}</div>` : ""}
      ${diag.explanation ? `<div class="dexp">${esc(diag.explanation)}</div>` : ""}
    </div>`;
}

// ── Full phase body renderer ──────────────────────────────────────────────────
export function renderPhaseBody(phaseId, phaseData) {
  if (phaseData.status === "not_run") {
    return `<div class="not-run-body"><strong style="color:var(--text)">Not run.</strong><br>${esc(phaseData.reason ?? "")}</div>`;
  }

  let html = `<span class="badge live">● Live analysis</span>`;

  if (phaseData.status === "failed") {
    switch (phaseId) {
      case "lexical":
        html += renderDiagnostic(phaseData.diagnostic);
        break;
      case "syntax":
        html += `<div class="not-run-body">Syntax analysis could not construct a complete Abstract Syntax Tree.</div>`;
        html += renderDiagnostic(phaseData.diagnostic);
        break;
      case "semantic":
        if (phaseData.symbolTable)
          html += renderSymbolTable(phaseData.symbolTable);
        html += renderDiagnostic(phaseData.diagnostic);
        break;
      default:
        html += renderDiagnostic(phaseData.diagnostic);
    }
    return html;
  }

  // Completed
  switch (phaseId) {
    case "lexical":
      html += renderTokens(phaseData.tokens);
      break;
    case "syntax":
      html += renderASTMultiView(phaseData.ast, phaseData.astText);
      if (phaseData.treeSitterOnly) {
        html += `<div class="pass-note"><strong>Tree-sitter-backed educational output.</strong><br>Semantic, intermediate, optimization, and target views are generic node-based results rather than language-specific compiler output.</div>`;
      }
      break;
    case "semantic":
      html += renderSymbolTable(phaseData.symbolTable);
      html += renderChecks(phaseData.checks, phaseData.warnings);
      html += `<div class="explain">The <strong>symbol table</strong> tracks every declared identifier, its type, and its scope. Semantic analysis ensures types are compatible and all identifiers are declared before use.</div>`;
      break;
    case "intermediate":
      html += renderIntermediateMultiView(phaseData.instructions);
      break;
    case "optimization":
      html += renderOptimization(phaseData);
      break;
    case "target":
      html += renderTargetCode(phaseData);
      break;
    default:
      html += `<pre class="code-block">${esc(JSON.stringify(phaseData, null, 2))}</pre>`;
  }
  return html;
}
