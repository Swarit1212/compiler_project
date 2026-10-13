// ─── Phase feed UI ────────────────────────────────────────────────────────────
import { PHASE_NAMES } from '../core/contract.js';
import { renderPhaseBody } from './renderer.js';

const PHASES = ['lexical','syntax','semantic','intermediate','optimization','target'];

const STATUS_LABEL = {
  running:   'Generating…',
  completed: 'Completed',
  failed:    'Failed',
  not_run:   'Not run',
};

export class PhaseFeed {
  constructor({ containerId }) {
    this.container = document.getElementById(containerId);
    this._cards = {};
  }

  showEmpty(msg = 'Choose a language and example, then click <strong>Analyze</strong>.') {
    this.container.innerHTML = `
      <div class="empty-state">
        <span class="icon">⚙️</span>
        <strong>No run yet</strong>
        ${msg}
      </div>`;
    this._cards = {};
  }

  startRun() {
    this.container.innerHTML = '';
    this._cards = {};
    // Create skeleton cards for all phases
    PHASES.forEach((id, idx) => {
      const card = this._createCard(id, idx, 'running');
      this.container.appendChild(card);
    });
  }

  updatePhase(phaseId, phaseData) {
    const card = this._cards[phaseId];
    if (!card) return;

    const statusEl = card.querySelector('.card-status');
    const bodyEl   = card.querySelector('.card-body');

    const st    = phaseData.status;
    const label = STATUS_LABEL[st] ?? st;

    statusEl.className = `card-status ${st}`;
    statusEl.innerHTML = `${st === 'running' ? '<span class="spinner"></span>' : ''}${label}`;

    bodyEl.classList.remove('skeleton');
    bodyEl.innerHTML = renderPhaseBody(phaseId, phaseData);

    // Scroll into view
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  scrollToPhase(phaseId) {
    const card = this._cards[phaseId];
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  markStale() {
    Object.values(this._cards).forEach(c => c.style.opacity = '.45');
  }

  _createCard(id, idx, initialStatus = 'pending') {
    const card = document.createElement('div');
    card.className = 'phase-card';
    card.id = `card-${id}`;
    card.style.animationDelay = `${idx * 60}ms`;
    card.innerHTML = `
      <div class="card-head">
        <span class="cnum">0${idx + 1}</span>
        <h3>${PHASE_NAMES[id] ?? id}</h3>
        <span class="card-status running"><span class="spinner"></span>Generating…</span>
      </div>
      <div class="card-body skeleton">
        <div class="skel-line"></div>
        <div class="skel-line"></div>
        <div class="skel-line"></div>
      </div>`;
    this._cards[id] = card;
    return card;
  }
}
