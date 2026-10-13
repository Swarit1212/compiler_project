// ─── Pipeline strip UI ────────────────────────────────────────────────────────
import { PHASE_NAMES } from "../core/contract.js";

const PHASES = [
  "lexical",
  "syntax",
  "semantic",
  "intermediate",
  "optimization",
  "target",
];

const STATUS_LABEL = {
  pending: "Not run yet",
  running: "Generating…",
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
    this.render();
  }

  setStatus(phaseId, status) {
    this.statuses[phaseId] = status;
    this.render();
  }

  reset() {
    this.statuses = {};
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    PHASES.forEach((id, idx) => {
      const st = this.statuses[id] || "pending";
      const label = STATUS_LABEL[st] ?? st;
      const name = PHASE_NAMES[id] ?? id;
      const shortName = name.split(" ")[0];

      const btn = document.createElement("button");
      btn.className = `phase-pill st-${st}`;
      btn.setAttribute("aria-label", `${name}: ${label}`);
      btn.innerHTML = `
        <span class="num">0${idx + 1}</span>
        <span class="name">${shortName}</span>
        <span class="status">
          ${st === "running" ? '<span class="spinner" style="width:8px;height:8px"></span>' : ""}
          ${label}
        </span>`;
      btn.addEventListener("click", () => this.onPhaseClick(id));
      this.container.appendChild(btn);
    });
  }
}
