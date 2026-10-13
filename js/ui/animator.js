// ─── Interactive TAC Step-Through Animator ────────────────────────────────────
// Virtual Machine emulator that steps through Three-Address Code instructions.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export class TACVirtualMachine {
  constructor(instructions = []) {
    this.instructions = instructions.filter(i => i && !i.startsWith(';'));
    this.reset();
  }

  reset() {
    this.pc = 0;
    this.cycles = 0;
    this.registers = {};
    this.history = [];
    this.output = [];
    this.isRunning = false;
    this.isHalted = false;
    this.timer = null;
    this.speed = 800; // ms per step

    // Pre-scan labels
    this.labels = {};
    this.instructions.forEach((inst, idx) => {
      const match = /^(\w+):$/.exec(inst.trim());
      if (match) this.labels[match[1]] = idx;
    });
  }

  step() {
    if (this.pc >= this.instructions.length || this.isHalted) {
      this.isHalted = true;
      return false;
    }

    // Save snapshot for step-back
    this.history.push({
      pc: this.pc,
      cycles: this.cycles,
      registers: { ...this.registers },
      output: [...this.output],
      isHalted: this.isHalted
    });

    const instr = this.instructions[this.pc].trim();
    this.cycles++;

    // Execute instruction
    this.executeInstruction(instr);

    if (this.pc >= this.instructions.length) {
      this.isHalted = true;
    }
    return true;
  }

  stepBack() {
    if (this.history.length === 0) return false;
    const snap = this.history.pop();
    this.pc = snap.pc;
    this.cycles = snap.cycles;
    this.registers = snap.registers;
    this.output = snap.output;
    this.isHalted = snap.isHalted;
    return true;
  }

  executeInstruction(instr) {
    // 1. Label declaration: L1:
    if (/^\w+:$/.test(instr)) {
      this.pc++;
      return;
    }

    // 2. Unconditional jump: goto L1
    const gotoMatch = /^goto\s+(\w+)$/.exec(instr);
    if (gotoMatch) {
      const target = this.labels[gotoMatch[1]];
      this.pc = (target !== undefined) ? target : this.pc + 1;
      return;
    }

    // 3. Conditional jump: if x goto L1 / if_false x goto L1
    const ifMatch = /^(if|if_false)\s+(\S+)\s+goto\s+(\w+)$/.exec(instr);
    if (ifMatch) {
      const isIfFalse = ifMatch[1] === 'if_false';
      const condVal = this.evalVal(ifMatch[2]);
      const target = this.labels[ifMatch[3]];
      const conditionMet = isIfFalse ? !condVal : Boolean(condVal);

      if (conditionMet && target !== undefined) {
        this.pc = target;
      } else {
        this.pc++;
      }
      return;
    }

    // 4. Return statement: return x
    const retMatch = /^return(?:\s+(\S+))?$/.exec(instr);
    if (retMatch) {
      const val = retMatch[1] ? this.evalVal(retMatch[1]) : '0';
      this.output.push(`Process exited with return value: ${val}`);
      this.isHalted = true;
      this.pc = this.instructions.length;
      return;
    }

    // 5. Binary assignment: t1 = a + b
    const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/%<>=!&|^]+)\s+(\S+)$/.exec(instr);
    if (binMatch) {
      const [, dst, l, op, r] = binMatch;
      const lv = this.evalVal(l);
      const rv = this.evalVal(r);
      const res = this.evalOp(op, lv, rv);
      this.registers[dst] = res;
      this.pc++;
      return;
    }

    // 6. Copy assignment: x = 10 / x = y
    const copyMatch = /^(\S+)\s*=\s*(.+)$/.exec(instr);
    if (copyMatch) {
      const [, dst, src] = copyMatch;
      this.registers[dst] = this.evalVal(src.trim());
      this.pc++;
      return;
    }

    // 7. Param / Call
    if (/^param\b/.test(instr)) {
      this.pc++;
      return;
    }

    // Default fall-through
    this.pc++;
  }

  evalVal(token) {
    if (token == null) return 0;
    const s = String(token).trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (s === 'true') return 1;
    if (s === 'false') return 0;
    if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
    return this.registers[s] !== undefined ? this.registers[s] : 0;
  }

  evalOp(op, lv, rv) {
    switch (op) {
      case '+': return lv + rv;
      case '-': return lv - rv;
      case '*': return lv * rv;
      case '/': return rv !== 0 ? Math.floor(lv / rv) : 0;
      case '%': return rv !== 0 ? lv % rv : 0;
      case '<': return lv < rv ? 1 : 0;
      case '>': return lv > rv ? 1 : 0;
      case '<=': return lv <= rv ? 1 : 0;
      case '>=': return lv >= rv ? 1 : 0;
      case '==': return lv === rv ? 1 : 0;
      case '!=': return lv !== rv ? 1 : 0;
      case '&&': return (lv && rv) ? 1 : 0;
      case '||': return (lv || rv) ? 1 : 0;
      default: return rv;
    }
  }
}

/**
 * Global instance and UI renderer for Step-Through Animator.
 */
let activeVM = null;

export function renderTACAnimator(instructions, containerId = 'tac-animator-container') {
  activeVM = new TACVirtualMachine(instructions);
  window.__TAC_VM = activeVM;

  return `
    <div class="animator-wrapper" id="${containerId}">
      <!-- Playback Controls Bar -->
      <div class="animator-controls">
        <div class="btn-group">
          <button class="btn btn-sm" id="btn-vm-reset" onclick="window.vmReset()">⏮ Reset</button>
          <button class="btn btn-sm" id="btn-vm-prev" onclick="window.vmPrev()">◀ Step Back</button>
          <button class="btn btn-sm btn-primary" id="btn-vm-play" onclick="window.vmTogglePlay()">▶ Auto Play</button>
          <button class="btn btn-sm btn-primary" id="btn-vm-next" onclick="window.vmNext()">Step Forward ▶</button>
        </div>

        <div class="speed-control">
          <label>Speed:</label>
          <input type="range" id="vm-speed-slider" min="200" max="1500" step="100" value="800" onchange="window.vmSetSpeed(this.value)">
          <span id="vm-speed-val">800ms</span>
        </div>

        <div class="vm-status-badge" id="vm-status-badge">
          Ready (Line 1/${activeVM.instructions.length})
        </div>
      </div>

      <!-- Split View: Instructions vs Registers -->
      <div class="animator-split">
        <!-- Instruction Column with Active Pointer -->
        <div class="animator-code-panel">
          <div class="panel-tag">TAC Instructions</div>
          <div class="animator-code-list" id="vm-code-list">
            ${renderCodeLines(activeVM)}
          </div>
        </div>

        <!-- Virtual CPU & Memory Panel -->
        <div class="animator-cpu-panel">
          <div class="panel-tag">CPU Registers & Variables</div>
          <div class="registers-grid" id="vm-registers-grid">
            ${renderRegisters(activeVM.registers)}
          </div>

          <div class="panel-tag" style="margin-top:12px;">Execution Console</div>
          <div class="vm-console" id="vm-console-output">
            ${activeVM.output.map(o => `<div>${esc(o)}</div>`).join('') || '<div class="muted-text">Awaiting execution…</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCodeLines(vm) {
  return vm.instructions.map((inst, idx) => {
    const isCurrent = idx === vm.pc;
    const isTarget = inst.trim().endsWith(':');
    return `
      <div class="vm-instr-line ${isCurrent ? 'active-instr' : ''} ${isTarget ? 'is-label' : ''}" id="vm-line-${idx}">
        <span class="vm-line-no">${idx + 1}</span>
        <span class="vm-pointer">${isCurrent ? '▶' : ''}</span>
        <span class="vm-text">${esc(inst)}</span>
      </div>
    `;
  }).join('');
}

function renderRegisters(regs) {
  const entries = Object.entries(regs);
  if (entries.length === 0) {
    return `<div class="empty-regs">No variables loaded yet. Step to initialize.</div>`;
  }
  return entries.map(([k, v]) => `
    <div class="reg-card">
      <span class="reg-name">${esc(k)}</span>
      <span class="reg-val">${esc(v)}</span>
    </div>
  `).join('');
}

// ── Global Window Handlers for Animator UI ───────────────────────────────────
if (typeof window !== 'undefined') {
  window.vmUpdateUI = () => {
    const vm = window.__TAC_VM;
    if (!vm) return;

    // Update code lines
    const codeList = document.getElementById('vm-code-list');
    if (codeList) codeList.innerHTML = renderCodeLines(vm);

    // Scroll active line into view
    const activeEl = document.getElementById(`vm-line-${vm.pc}`);
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Update registers
    const regGrid = document.getElementById('vm-registers-grid');
    if (regGrid) regGrid.innerHTML = renderRegisters(vm.registers);

    // Update console
    const consoleOut = document.getElementById('vm-console-output');
    if (consoleOut) {
      consoleOut.innerHTML = vm.output.map(o => `<div class="log-entry">✓ ${esc(o)}</div>`).join('') ||
        `<div class="muted-text">${vm.isHalted ? 'Execution halted.' : `Executing instruction ${vm.pc + 1}…`}</div>`;
    }

    // Update status badge
    const badge = document.getElementById('vm-status-badge');
    if (badge) {
      badge.textContent = vm.isHalted
        ? `Halted (${vm.cycles} cycles)`
        : `Running (Line ${vm.pc + 1}/${vm.instructions.length} · ${vm.cycles} cycles)`;
      badge.className = `vm-status-badge ${vm.isHalted ? 'halted' : 'active'}`;
    }
  };

  window.vmNext = () => {
    const vm = window.__TAC_VM;
    if (!vm) return;
    vm.step();
    window.vmUpdateUI();
  };

  window.vmPrev = () => {
    const vm = window.__TAC_VM;
    if (!vm) return;
    vm.stepBack();
    window.vmUpdateUI();
  };

  window.vmReset = () => {
    const vm = window.__TAC_VM;
    if (!vm) return;
    if (vm.timer) clearInterval(vm.timer);
    vm.isRunning = false;
    vm.reset();
    const playBtn = document.getElementById('btn-vm-play');
    if (playBtn) playBtn.textContent = '▶ Auto Play';
    window.vmUpdateUI();
  };

  window.vmTogglePlay = () => {
    const vm = window.__TAC_VM;
    if (!vm) return;
    const playBtn = document.getElementById('btn-vm-play');

    if (vm.isRunning) {
      clearInterval(vm.timer);
      vm.isRunning = false;
      if (playBtn) playBtn.textContent = '▶ Auto Play';
    } else {
      if (vm.isHalted) vm.reset();
      vm.isRunning = true;
      if (playBtn) playBtn.textContent = '⏸ Pause';
      vm.timer = setInterval(() => {
        const canContinue = vm.step();
        window.vmUpdateUI();
        if (!canContinue) {
          clearInterval(vm.timer);
          vm.isRunning = false;
          if (playBtn) playBtn.textContent = '▶ Auto Play';
        }
      }, vm.speed);
    }
  };

  window.vmSetSpeed = (ms) => {
    const vm = window.__TAC_VM;
    if (vm) vm.speed = Number(ms);
    const lbl = document.getElementById('vm-speed-val');
    if (lbl) lbl.textContent = `${ms}ms`;
  };
}
