// ─── TAC Optimizer ────────────────────────────────────────────────────────────
// Applies optimization passes to Three-Address Code instructions.

// ── Utility ───────────────────────────────────────────────────────────────────
const isNumStr = s => s != null && !isNaN(Number(s)) && String(s).trim() !== '';
const numOf    = s => Number(s);

function evalBinOp(op, lv, rv) {
  switch (op) {
    case '+': return lv + rv;
    case '-': return lv - rv;
    case '*': return lv * rv;
    case '/': return rv !== 0 ? lv / rv : null;
    case '%': return rv !== 0 ? lv % rv : null;
    case '<<': return lv << rv;
    case '>>': return lv >> rv;
    case '&':  return lv & rv;
    case '|':  return lv | rv;
    case '^':  return lv ^ rv;
    case '==': return lv === rv ? 1 : 0;
    case '!=': return lv !== rv ? 1 : 0;
    case '<':  return lv < rv   ? 1 : 0;
    case '>':  return lv > rv   ? 1 : 0;
    case '<=': return lv <= rv  ? 1 : 0;
    case '>=': return lv >= rv  ? 1 : 0;
    case '&&': return (lv && rv) ? 1 : 0;
    case '||': return (lv || rv) ? 1 : 0;
    default: return null;
  }
}

// ── Instruction parser ────────────────────────────────────────────────────────
// Parses "t1 = L op R" style TAC instructions
function parseTAC(instr) {
  // t1 = a op b
  const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|\^\<\>\=\!]{1,3})\s+(\S+)$/.exec(instr);
  if (binMatch) return { kind: 'assign_bin', dst: binMatch[1], left: binMatch[2], op: binMatch[3], right: binMatch[4] };

  // t1 = a  (copy)
  const copyMatch = /^(\S+)\s*=\s*(\S+)$/.exec(instr);
  if (copyMatch) return { kind: 'assign_copy', dst: copyMatch[1], src: copyMatch[2] };

  // t1 = op a (unary)
  const unMatch = /^(\S+)\s*=\s*([!~\-])(\S+)$/.exec(instr);
  if (unMatch) return { kind: 'assign_unary', dst: unMatch[1], op: unMatch[2], src: unMatch[3] };

  return { kind: 'other', raw: instr };
}

// ── Pass: Constant Folding ────────────────────────────────────────────────────
function constantFolding(instructions) {
  let changed = false;
  const result = instructions.map(instr => {
    const p = parseTAC(instr);
    if (p.kind === 'assign_bin' && isNumStr(p.left) && isNumStr(p.right)) {
      const val = evalBinOp(p.op, numOf(p.left), numOf(p.right));
      if (val !== null) {
        const folded = Number.isInteger(val) ? String(val) : val.toFixed(6).replace(/0+$/, '');
        changed = true;
        return `${p.dst} = ${folded}  ; folded: ${p.left} ${p.op} ${p.right}`;
      }
    }
    return instr;
  });
  return { instructions: result, changed };
}

// ── Pass: Constant Propagation ────────────────────────────────────────────────
// If we see "x = 5" we replace later uses of x with 5 (while x is not reassigned)
function constantPropagation(instructions) {
  let changed = false;
  const constMap = new Map(); // var → constant string value

  const result = instructions.map(instr => {
    const p = parseTAC(instr);

    // Update const map when a variable is assigned a constant
    if ((p.kind === 'assign_copy' || p.kind === 'assign_bin') && p.dst) {
      if (p.kind === 'assign_copy' && isNumStr(p.src)) {
        constMap.set(p.dst, p.src);
      } else {
        // dst gets a non-const value — invalidate
        constMap.delete(p.dst);
      }
    }

    if (p.kind === 'assign_bin') {
      let newLeft  = constMap.has(p.left)  ? constMap.get(p.left)  : p.left;
      let newRight = constMap.has(p.right) ? constMap.get(p.right) : p.right;
      if (newLeft !== p.left || newRight !== p.right) {
        changed = true;
        return `${p.dst} = ${newLeft} ${p.op} ${newRight}`;
      }
    }
    if (p.kind === 'assign_copy') {
      const newSrc = constMap.has(p.src) ? constMap.get(p.src) : p.src;
      if (newSrc !== p.src) {
        changed = true;
        constMap.set(p.dst, newSrc);
        return `${p.dst} = ${newSrc}`;
      }
    }
    return instr;
  });
  return { instructions: result, changed };
}

// ── Pass: Copy Propagation ────────────────────────────────────────────────────
// "t1 = x; t2 = t1 + 3" → "t2 = x + 3"
function copyPropagation(instructions) {
  let changed = false;
  const copyMap = new Map();

  const result = instructions.map(instr => {
    const p = parseTAC(instr);

    if (p.kind === 'assign_copy') {
      // t1 = t2 — record copy if both are non-constants
      if (!isNumStr(p.src)) {
        const resolved = copyMap.get(p.src) ?? p.src;
        copyMap.set(p.dst, resolved);
      } else {
        copyMap.delete(p.dst);
      }
    }

    if (p.kind === 'assign_bin') {
      copyMap.delete(p.dst);
      let newL = copyMap.get(p.left)  ?? p.left;
      let newR = copyMap.get(p.right) ?? p.right;
      if (newL !== p.left || newR !== p.right) {
        changed = true;
        return `${p.dst} = ${newL} ${p.op} ${newR}`;
      }
    }

    return instr;
  });
  return { instructions: result, changed };
}

// ── Pass: Dead Code Elimination ───────────────────────────────────────────────
// Remove instructions after an unconditional return within a function
function deadCodeElimination(instructions) {
  let changed = false;
  const result = [];
  let dead = false;

  for (const instr of instructions) {
    // Reset dead zone when we enter a new function or label
    if (/^func_begin\s/.test(instr) || /^func_end\s/.test(instr) || /^\w+:$/.test(instr)) {
      dead = false;
    }
    if (dead) { changed = true; continue; }  // skip dead instruction
    result.push(instr);
    // After unconditional return or goto, subsequent code is dead
    if (/^return\b/.test(instr)) dead = true;
  }
  return { instructions: result, changed };
}

// ── Pass: Algebraic Simplification ───────────────────────────────────────────
// e.g. t1 = x * 1 → t1 = x, t1 = x + 0 → t1 = x, t1 = x * 0 → t1 = 0
function algebraicSimplification(instructions) {
  let changed = false;
  const result = instructions.map(instr => {
    const p = parseTAC(instr);
    if (p.kind !== 'assign_bin') return instr;
    const { dst, left, op, right } = p;
    if (op === '+' && right === '0') { changed = true; return `${dst} = ${left}  ; simplified: x + 0`; }
    if (op === '+' && left  === '0') { changed = true; return `${dst} = ${right}  ; simplified: 0 + x`; }
    if (op === '-' && right === '0') { changed = true; return `${dst} = ${left}  ; simplified: x - 0`; }
    if (op === '*' && right === '1') { changed = true; return `${dst} = ${left}  ; simplified: x * 1`; }
    if (op === '*' && left  === '1') { changed = true; return `${dst} = ${right}  ; simplified: 1 * x`; }
    if (op === '*' && (right === '0' || left === '0')) { changed = true; return `${dst} = 0  ; simplified: x * 0`; }
    if (op === '/' && right === '1') { changed = true; return `${dst} = ${left}  ; simplified: x / 1`; }
    return instr;
  });
  return { instructions: result, changed };
}

// ── Main optimizer entry ──────────────────────────────────────────────────────
export function optimize(instructions) {
  const before = [...instructions];
  const passLog = [];
  let current = [...instructions];

  // Run passes iteratively until no more changes (max 5 iterations)
  let anyChange = false;
  for (let i = 0; i < 5; i++) {
    let iterChange = false;
    const passes = [
      { name: 'Constant Folding',          fn: constantFolding },
      { name: 'Constant Propagation',      fn: constantPropagation },
      { name: 'Copy Propagation',          fn: copyPropagation },
      { name: 'Algebraic Simplification',  fn: algebraicSimplification },
      { name: 'Dead Code Elimination',     fn: deadCodeElimination },
    ];
    for (const { name, fn } of passes) {
      const { instructions: next, changed } = fn(current);
      if (changed) {
        if (!passLog.includes(name)) passLog.push(name);
        current = next;
        iterChange = true;
        anyChange  = true;
      }
    }
    if (!iterChange) break;
  }

  let note = '';
  if (passLog.length === 0) {
    note = 'No optimization opportunities were found. All operands are runtime values or the code is already optimal.';
  } else {
    note = passLog.map(p => {
      switch (p) {
        case 'Constant Folding':        return 'Constant folding: expressions with only literal operands were evaluated at compile time.';
        case 'Constant Propagation':    return 'Constant propagation: variables holding known constants were replaced with their values.';
        case 'Copy Propagation':        return 'Copy propagation: redundant variable copies were eliminated.';
        case 'Algebraic Simplification': return 'Algebraic simplification: identity operations (x*1, x+0, x*0) were reduced.';
        case 'Dead Code Elimination':   return 'Dead code elimination: unreachable instructions after unconditional returns were removed.';
        default: return p;
      }
    }).join(' ');
  }

  return { before, after: current, passes: passLog, note };
}
