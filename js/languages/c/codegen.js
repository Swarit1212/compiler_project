// ─── C Code Generator (Educational Pseudo-Assembly) ───────────────────────────
// Translates TAC to register-based pseudo-assembly.

const REG_COUNT = 8;

class CodeGenerator {
  constructor(langId = 'c') {
    this.langId      = langId;
    this.output      = [];
    this._regMap     = new Map();  // variable → register
    this._regPool    = Array.from({ length: REG_COUNT }, (_, i) => `R${i}`);
    this._usedRegs   = new Set();
    this._stackVars  = new Map();  // for spilled variables
    this._stackOffset = 0;
  }

  emit(s) { this.output.push(s); }
  emitComment(s) { this.output.push(`; ${s}`); }

  allocReg(varName) {
    if (this._regMap.has(varName)) return this._regMap.get(varName);
    const free = this._regPool.find(r => !this._usedRegs.has(r));
    if (free) {
      this._regMap.set(varName, free);
      this._usedRegs.add(free);
      return free;
    }
    // Spill: reuse R7, store to stack
    const spilled = 'R7';
    this._regMap.set(varName, spilled);
    return spilled;
  }

  getReg(v) {
    if (this._regMap.has(v)) return this._regMap.get(v);
    return null;
  }

  isImmediate(v) { return v != null && !isNaN(Number(v)) && String(v).trim() !== ''; }
  isLabel(v) { return /^\w+:$/.test(v); }

  loadVal(v, destReg) {
    if (this.isImmediate(v)) {
      this.emit(`  MOV   ${destReg}, #${v}`);
    } else if (v && v.startsWith('"')) {
      this.emit(`  LEA   ${destReg}, [${v}]`);
    } else {
      const reg = this.getReg(v);
      if (reg && reg !== destReg) {
        this.emit(`  MOV   ${destReg}, ${reg}`);
      } else {
        this.emit(`  LOAD  ${destReg}, [${v ?? '_'}]`);
      }
    }
  }

  generate(instructions, symbolTable, langId) {
    const targetLabel = this._targetLabel(langId);
    this.emitComment(`Target: ${targetLabel}`);
    this.emit('');

    for (const instr of instructions) {
      this.translateInstr(instr);
    }

    return { targetLabel, instructions: this.output };
  }

  _targetLabel(langId) {
    const labels = {
      c: 'Educational pseudo-assembly (C-like ABI)',
      cpp: 'Educational pseudo-assembly (C++ ABI with vtable stubs)',
      java: 'JVM-style educational bytecode',
      python: 'CPython-style educational bytecode',
      javascript: 'V8-style educational bytecode',
      sql: 'Physical query plan pseudo-instructions',
    };
    return labels[langId] ?? 'Educational pseudo-assembly';
  }

  translateInstr(instr) {
    if (!instr) return;

    // Label
    if (/^\w+:$/.test(instr)) { this.emit(`${instr}`); return; }
    // Comment pass-through
    if (instr.startsWith('; ') || instr.startsWith(';')) { this.emit(`  ${instr}`); return; }
    // Strip inline comments for parsing
    const [pure] = instr.split(/\s*;\s*/);

    // func_begin / func_end
    const fbMatch = /^func_begin\s+(\S+)$/.exec(pure);
    if (fbMatch) {
      this.emit('');
      this.emit(`${fbMatch[1]}:`);
      this.emit(`  PUSH  {LR}          ; save return address`);
      this._usedRegs.clear();
      this._regMap.clear();
      return;
    }
    const feMatch = /^func_end\s+(\S+)$/.exec(pure);
    if (feMatch) {
      this.emit(`  POP   {LR}          ; restore return address`);
      this.emit('');
      return;
    }

    // param_receive
    const prMatch = /^param_receive\s+(\S+)$/.exec(pure);
    if (prMatch) {
      const reg = this.allocReg(prMatch[1]);
      this.emit(`  ; param '${prMatch[1]}' → ${reg}`);
      return;
    }

    // param (push arg)
    const paramMatch = /^param\s+(\S+)$/.exec(pure);
    if (paramMatch) {
      const val = paramMatch[1];
      const reg = this.allocReg('_arg');
      this.loadVal(val, reg);
      this.emit(`  PUSH  {${reg}}       ; push argument`);
      return;
    }

    // return [val]
    const retMatch = /^return(?:\s+(\S+))?$/.exec(pure);
    if (retMatch) {
      if (retMatch[1]) {
        const v = retMatch[1];
        const r = this.allocReg('_ret');
        this.loadVal(v, r);
        this.emit(`  MOV   R0, ${r}      ; return value`);
      }
      this.emit(`  BX    LR            ; return`);
      return;
    }

    // if cond goto label
    const ifMatch = /^if\s+(\S+)\s+goto\s+(\S+)$/.exec(pure);
    if (ifMatch) {
      const [, cond, lbl] = ifMatch;
      const r = this.allocReg('_cond');
      this.loadVal(cond, r);
      this.emit(`  CMP   ${r}, #0`);
      this.emit(`  BNE   ${lbl}         ; if true, branch`);
      return;
    }

    // if_false cond goto label
    const ifFalseMatch = /^if_false\s+(\S+)\s+goto\s+(\S+)$/.exec(pure);
    if (ifFalseMatch) {
      const [, cond, lbl] = ifFalseMatch;
      const r = this.allocReg('_cond');
      this.loadVal(cond, r);
      this.emit(`  CMP   ${r}, #0`);
      this.emit(`  BEQ   ${lbl}         ; if false, branch`);
      return;
    }

    // goto label
    const gotoMatch = /^goto\s+(\S+)$/.exec(pure);
    if (gotoMatch) {
      this.emit(`  B     ${gotoMatch[1]}`);
      return;
    }

    // t1 = call func, N
    const callMatch = /^(\S+)\s*=\s*call\s+(\S+),\s*(\d+)$/.exec(pure);
    if (callMatch) {
      const [, dst, fn, argc] = callMatch;
      this.emit(`  BL    ${fn}          ; call ${fn}(${argc} args)`);
      const reg = this.allocReg(dst);
      this.emit(`  MOV   ${reg}, R0     ; capture return value → ${dst}`);
      return;
    }

    // t1 = L op R
    const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|\^\<\>\=\!]{1,3})\s+(\S+)$/.exec(pure);
    if (binMatch) {
      const [, dst, left, op, right] = binMatch;
      const rd = this.allocReg(dst);
      const r1 = this.allocReg('_l');
      const r2 = this.allocReg('_r');
      this.loadVal(left,  r1);
      this.loadVal(right, r2);
      const opMap = {
        '+':'ADD','-':'SUB','*':'MUL','/':'DIV','%':'MOD',
        '&':'AND','|':'ORR','^':'XOR','<<':'LSL','>>':'LSR',
        '==':'EQ','!=':'NEQ','<':'LT','>':'GT','<=':'LE','>=':'GE',
        '&&':'AND','||':'ORR',
      };
      const asmOp = opMap[op] ?? op.toUpperCase();
      if (['EQ','NEQ','LT','GT','LE','GE'].includes(asmOp)) {
        this.emit(`  CMP   ${r1}, ${r2}`);
        const setOp = { EQ:'EQ', NEQ:'NE', LT:'LT', GT:'GT', LE:'LE', GE:'GE' }[asmOp];
        this.emit(`  MOV${setOp} ${rd}, #1`);
        this.emit(`  MOV${setOp === 'EQ' ? 'NE' : 'EQ'} ${rd}, #0`);
      } else {
        this.emit(`  ${asmOp.padEnd(5)} ${rd}, ${r1}, ${r2}`);
      }
      this._regMap.set(dst, rd);
      return;
    }

    // t1 = op src (unary)
    const unaryMatch = /^(\S+)\s*=\s*([!~\-])(\S+)$/.exec(pure);
    if (unaryMatch) {
      const [, dst, op, src] = unaryMatch;
      const rd = this.allocReg(dst);
      const rs = this.allocReg('_u');
      this.loadVal(src, rs);
      if (op === '-')  this.emit(`  NEG   ${rd}, ${rs}`);
      if (op === '~')  this.emit(`  MVN   ${rd}, ${rs}`);
      if (op === '!')  { this.emit(`  CMP   ${rs}, #0`); this.emit(`  MOVEQ ${rd}, #1`); this.emit(`  MOVNE ${rd}, #0`); }
      this._regMap.set(dst, rd);
      return;
    }

    // t1 = (type) src  (cast)
    const castMatch = /^(\S+)\s*=\s*\(([^)]+)\)\s*(\S+)$/.exec(pure);
    if (castMatch) {
      const [, dst, , src] = castMatch;
      const rd = this.allocReg(dst);
      this.loadVal(src, rd);
      this.emit(`  ; cast to ${castMatch[2]}`);
      return;
    }

    // x[i] = v  (array store)
    const arrStoreMatch = /^(\S+)\[(\S+)\]\s*=\s*(\S+)$/.exec(pure);
    if (arrStoreMatch) {
      const [, arr, idx, val] = arrStoreMatch;
      const rv = this.allocReg('_vs');
      const ri = this.allocReg('_idx');
      this.loadVal(val, rv);
      this.loadVal(idx, ri);
      this.emit(`  STR   ${rv}, [${arr}, ${ri}]  ; ${arr}[${idx}] = ${val}`);
      return;
    }

    // t1 = a[i]  (array load)
    const arrLoadMatch = /^(\S+)\s*=\s*(\S+)\[(\S+)\]$/.exec(pure);
    if (arrLoadMatch) {
      const [, dst, arr, idx] = arrLoadMatch;
      const rd = this.allocReg(dst);
      const ri = this.allocReg('_il');
      this.loadVal(idx, ri);
      this.emit(`  LDR   ${rd}, [${arr}, ${ri}]  ; ${dst} = ${arr}[${idx}]`);
      return;
    }

    // dst = src  (copy / immediate)
    const copyMatch = /^(\S+)\s*=\s*(\S+)$/.exec(pure);
    if (copyMatch) {
      const [, dst, src] = copyMatch;
      const rd = this.allocReg(dst);
      this.loadVal(src, rd);
      this._regMap.set(dst, rd);
      return;
    }

    // Fallback: emit as comment
    this.emit(`  ; ${instr}`);
  }
}

export function generate(tacInstructions, symbolTable, langId) {
  const gen = new CodeGenerator(langId);
  return gen.generate(tacInstructions, symbolTable, langId);
}
