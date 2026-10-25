// ─── Active phase workspace ──────────────────────────────────────────────────
import { PHASE_NAMES } from "../core/contract.js";
import { renderPhaseBody } from "./renderer.js";
import { PHASES } from "./pipeline.js";

const STATUS_LABEL = {
  running: "Running",
  completed: "Completed",
  failed: "Failed",
  not_run: "Not run",
  pending: "Not run",
  partial: "Limited",
};

export class PhaseFeed {
  constructor({ containerId, onActivePhaseChange }) {
    this.container = document.getElementById(containerId);
    this.onActivePhaseChange = onActivePhaseChange ?? (() => {});
    this._phaseData = {};
    this._activePhase = "lexical";
    this._stale = false;
  }

  showEmpty(msg = "Select a phase after running the source.") {
    this._phaseData = {};
    this._stale = false;
    this.container.innerHTML = `<div class="empty-state"><strong>No analysis yet</strong>${msg}</div>`;
  }

  startRun() {
    this._phaseData = Object.fromEntries(PHASES.map((id) => [id, { status: "running" }]));
    this._stale = false;
    this._renderActive();
  }

  updatePhase(phaseId, phaseData) {
    this._phaseData[phaseId] = phaseData;
    this._renderActive();
  }

  activatePhase(phaseId) {
    if (!PHASES.includes(phaseId)) return;
    this._activePhase = phaseId;
    this._renderActive();
    this.onActivePhaseChange(phaseId);
  }

  scrollToPhase(phaseId) {
    this.activatePhase(phaseId);
  }

  markStale() {
    if (!Object.keys(this._phaseData).length) return;
    this._stale = true;
    this._renderActive();
  }

  _renderActive() {
    if (!this.container || !Object.keys(this._phaseData).length) return;
    const idx = PHASES.indexOf(this._activePhase);
    const phaseData = this._phaseData[this._activePhase] || { status: "not_run" };
    const status = phaseData.status || "not_run";
    const label = STATUS_LABEL[status] ?? status;
    const summary = this._summary(this._activePhase, phaseData);
    const previous = PHASES[idx - 1];
    const next = PHASES[idx + 1];

    this.container.innerHTML = `
      <section class="phase-workspace${this._stale ? " is-stale" : ""}" aria-live="polite">
        <div class="phase-workspace-head">
          <div class="phase-title-group">
            <span class="cnum">0${idx + 1}</span>
            <div><span class="eyebrow">Active phase</span><h3>${PHASE_NAMES[this._activePhase] ?? this._activePhase}</h3></div>
          </div>
          <span class="card-status ${status}">${status === "running" ? '<span class="spinner"></span>' : ""}${label}</span>
        </div>
        <div class="phase-summary-row">
          <span>${this._stale ? "Source changed. Results are stale." : summary}</span>
          ${this._capability(phaseData)}
        </div>
        <div class="workspace-output ${status === "running" ? "skeleton" : ""}">
          ${status === "running" ? '<div class="skel-line"></div><div class="skel-line"></div><div class="skel-line"></div>' : renderPhaseBody(this._activePhase, phaseData)}
        </div>
        <div class="phase-nav">
          <button class="btn btn-subtle" data-phase="${previous || ""}" ${previous ? "" : "disabled"}>← Previous</button>
          <span class="phase-position">${idx + 1} / ${PHASES.length}</span>
          <button class="btn btn-subtle" data-phase="${next || ""}" ${next ? "" : "disabled"}>Next →</button>
        </div>
      </section>`;

    this.container.querySelectorAll("[data-phase]").forEach((button) => {
      if (button.dataset.phase) button.addEventListener("click", () => this.activatePhase(button.dataset.phase));
    });
  }

  _summary(phaseId, data) {
    if (data.summary) return data.summary;
    if (data.diagnostic) return data.diagnostic.message || "Diagnostic reported";
    if (data.status === "running") return "Processing phase output";
    if (data.status === "failed") return "Phase failed";
    if (data.status === "not_run") return "Phase not run";
    const counts = { lexical: "Tokens emitted", syntax: "Syntax tree available", semantic: "Semantic checks available", intermediate: "Intermediate representation available", optimization: "Optimization comparison available", target: "Target output available" };
    return counts[phaseId] || "Output available";
  }

  _capability(data) {
    const text = data.outputLabel || data.capability || (data.mode === "fallback" ? "Generic output" : "");
    return text ? `<span class="capability-badge">${text}</span>` : "";
  }
}
