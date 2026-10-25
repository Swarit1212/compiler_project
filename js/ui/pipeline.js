// ─── Connected compiler phase rail ───────────────────────────────────────────
import { PHASE_NAMES } from "../core/contract.js";

export const PHASES = [
  "lexical",
  "syntax",
  "semantic",
  "intermediate",
  "optimization",
  "target",
];

const STATUS_LABEL = {
  pending: "Not run",
  running: "Running",
  completed: "Completed",
  partial: "Limited",
  failed: "Failed",
  not_run: "Not run",
};

export class PipelineStrip {
  constructor({ containerId, onPhaseClick }) {
    this.container = document.getElementById(containerId);
    this.onPhaseClick = onPhaseClick ?? (() => {});
    this.statuses = {};
    this.summaries = {};
    this.activePhase = "lexical";
    this.render();
  }

  setStatus(phaseId, status, summary = "") {
    this.statuses[phaseId] = status;
    if (summary) this.summaries[phaseId] = summary;
    this.render();
  }

  setSummary(phaseId, summary) {
    if (summary) this.summaries[phaseId] = summary;
    this.render();
  }

  setActive(phaseId) {
    this.activePhase = phaseId;
    this.render();
  }

  reset(preserveActive = false) {
    this.statuses = {};
    this.summaries = {};
    if (!preserveActive) this.activePhase = "lexical";
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = "";
    PHASES.forEach((id, idx) => {
      const st = this.statuses[id] || "pending";
      const label = STATUS_LABEL[st] ?? st;
      const name = PHASE_NAMES[id] ?? id;
      const shortName = id === "intermediate" ? "IR" : name.split(" ")[0];
      const btn = document.createElement("button");
      btn.className = `phase-pill st-${st}${id === this.activePhase ? " is-active" : ""}`;
      btn.setAttribute("aria-current", id === this.activePhase ? "step" : "false");
      btn.setAttribute("aria-label", `${name}: ${label}`);
      btn.innerHTML = `
        <span class="phase-connector" aria-hidden="true"></span>
        <span class="num">0${idx + 1}</span>
        <span class="name">${shortName}</span>
        <span class="status">
          ${st === "running" ? '<span class="spinner" style="width:8px;height:8px"></span>' : ""}
          ${label}
        </span>
        <span class="phase-summary">${this.summaries[id] || "Awaiting source"}</span>`;
      btn.addEventListener("click", () => {
        this.setActive(id);
        this.onPhaseClick(id);
      });
      this.container.appendChild(btn);
    });
  }
}
