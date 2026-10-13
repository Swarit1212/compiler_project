// ─── C IR Generator (Three-Address Code) ─────────────────────────────────────
// Converts the AST to TAC (Three-Address Code) instructions.

import { IRError } from '../../core/errors.js';

class TACGenerator {
  constructor() {
    this.instructions = [];
    this._tempCount   = 0;
    this._labelCount  = 0;
  }

  newTemp()  { return `t${++this._tempCount}`; }
  newLabel() { return `L${++this._labelCount}`; }
  emit(instr) { this.instructions.push(instr); }

  generate(ast) {
    if (!ast) return { instructions: [] };
    this.visitNode(ast);
    return { instructions: this.instructions };
  }

  visitNode(n) {
    if (!n || typeof n !== 'object') return null;
    switch (n.type) {
      case 'Program':    (n.body || []).forEach(d => this.visitNode(d)); return null;
      case 'FuncDecl':   return this.visitFuncDecl(n);
      case 'FuncProto':  return null;
      case 'Typedef':    return null;
      case 'StructDecl': return null;
      case 'Block':      (n.stmts || []).forEach(s => this.visitNode(s)); return null;
      case 'VarDecl':    return this.visitVarDecl(n);
      case 'Assign':     return this.visitAssign(n);
      case 'Return':     return this.visitReturn(n);
      case 'If':         return this.visitIf(n);
      case 'While':      return this.visitWhile(n);
      case 'DoWhile':    return this.visitDoWhile(n);
      case 'For':        return this.visitFor(n);
      case 'ExprStmt':   this.visitExpr(n.expr); return null;
      case 'Break':      this.emit(`goto ${this._breakLabel ?? 'L_break'}`); return null;
      case 'Continue':   this.emit(`goto ${this._continueLabel ?? 'L_continue'}`); return null;
      default:           return null;
    }
  }

  visitFuncDecl(n) {
    this.emit(`func_begin ${n.name}`);
    const prevTemp = this._tempCount;
    this._tempCount = 0;
    // Receive params
    (n.params || []).forEach(p => { if (p.name && p.name !== '...') this.emit(`param_receive ${p.name}`); });
    this.visitNode(n.body);
    if (n.retType === 'void') this.emit(`return`);
    this.emit(`func_end ${n.name}`);
    this._tempCount = prevTemp;
  }

  visitVarDecl(n) {
    if (n.init) {
      const rhs = this.visitExpr(n.init);
      this.emit(`${n.name} = ${rhs}`);
    }
  }

  visitAssign(n) {
    const rhs = this.visitExpr(n.value);
    const lhs = this.lvalName(n.target);
    if (n.op !== '=') {
      // compound: x += rhs  →  x = x + rhs
      const binOp = n.op.slice(0, -1);
      const tmp = this.newTemp();
      this.emit(`${tmp} = ${lhs} ${binOp} ${rhs}`);
      this.emit(`${lhs} = ${tmp}`);
    } else {
      this.emit(`${lhs} = ${rhs}`);
    }
    return lhs;
  }

  lvalName(n) {
    if (!n) return '_';
    if (n.type === 'Ident')  return n.name;
    if (n.type === 'Index')  { const a = this.lvalName(n.array); const i = this.visitExpr(n.index); return `${a}[${i}]`; }
    if (n.type === 'MemberAccess') { const o = this.lvalName(n.object); return `${o}${n.op}${n.member}`; }
    if (n.type === 'UnaryOp' && n.op === '*') { return `*${this.lvalName(n.operand)}`; }
    return this.visitExpr(n);
  }

  visitReturn(n) {
    if (n.value) {
      const v = this.visitExpr(n.value);
      this.emit(`return ${v}`);
    } else {
      this.emit(`return`);
    }
  }

  visitIf(n) {
    const cond   = this.visitExpr(n.cond);
    const labelT = this.newLabel();
    const labelF = this.newLabel();
    const labelE = n.else_ ? this.newLabel() : null;

    this.emit(`if ${cond} goto ${labelT}`);
    this.emit(`goto ${labelF}`);
    this.emit(`${labelT}:`);
    this.visitNode(n.then);
    if (n.else_) {
      this.emit(`goto ${labelE}`);
      this.emit(`${labelF}:`);
      this.visitNode(n.else_);
      this.emit(`${labelE}:`);
    } else {
      this.emit(`${labelF}:`);
    }
  }

  visitWhile(n) {
    const top  = this.newLabel();
    const exit = this.newLabel();
    const prevBreak    = this._breakLabel;
    const prevContinue = this._continueLabel;
    this._breakLabel    = exit;
    this._continueLabel = top;

    this.emit(`${top}:`);
    const cond = this.visitExpr(n.cond);
    this.emit(`if_false ${cond} goto ${exit}`);
    this.visitNode(n.body);
    this.emit(`goto ${top}`);
    this.emit(`${exit}:`);

    this._breakLabel    = prevBreak;
    this._continueLabel = prevContinue;
  }

  visitDoWhile(n) {
    const top  = this.newLabel();
    const exit = this.newLabel();
    const prevBreak    = this._breakLabel;
    const prevContinue = this._continueLabel;
    this._breakLabel    = exit;
    this._continueLabel = top;

    this.emit(`${top}:`);
    this.visitNode(n.body);
    const cond = this.visitExpr(n.cond);
    this.emit(`if ${cond} goto ${top}`);
    this.emit(`${exit}:`);

    this._breakLabel    = prevBreak;
    this._continueLabel = prevContinue;
  }

  visitFor(n) {
    const top    = this.newLabel();
    const exit   = this.newLabel();
    const update = this.newLabel();
    const prevBreak    = this._breakLabel;
    const prevContinue = this._continueLabel;
    this._breakLabel    = exit;
    this._continueLabel = update;

    if (n.init) this.visitNode(n.init);
    this.emit(`${top}:`);
    if (n.cond) {
      const c = this.visitExpr(n.cond);
      this.emit(`if_false ${c} goto ${exit}`);
    }
    this.visitNode(n.body);
    this.emit(`${update}:`);
    if (n.update) this.visitExpr(n.update);
    this.emit(`goto ${top}`);
    this.emit(`${exit}:`);

    this._breakLabel    = prevBreak;
    this._continueLabel = prevContinue;
  }

  // ── Expression → temp var ────────────────────────────────────────────────────
  visitExpr(n) {
    if (!n) return '_';
    switch (n.type) {
      case 'IntLit':    return n.value;
      case 'FloatLit':  return n.value;
      case 'StringLit': return n.value;
      case 'CharLit':   return n.value;
      case 'BoolLit':   return n.value ? '1' : '0';
      case 'NullLit':   return 'NULL';
      case 'Ident':     return n.name;

      case 'BinOp': {
        const l = this.visitExpr(n.left);
        const r = this.visitExpr(n.right);
        const t = this.newTemp();
        this.emit(`${t} = ${l} ${n.op} ${r}`);
        return t;
      }

      case 'UnaryOp': {
        const operand = this.visitExpr(n.operand);
        const t = this.newTemp();
        this.emit(`${t} = ${n.op}${operand}`);
        return t;
      }

      case 'PostfixOp': {
        const v = this.lvalName(n.operand);
        const t = this.newTemp();
        this.emit(`${t} = ${v}`);
        const op = n.op === '++' ? '+' : '-';
        this.emit(`${v} = ${v} ${op} 1`);
        return t;
      }

      case 'Assign': return this.visitAssign(n);

      case 'Call': {
        (n.args || []).forEach(a => {
          const av = this.visitExpr(a);
          this.emit(`param ${av}`);
        });
        const t = this.newTemp();
        this.emit(`${t} = call ${n.name}, ${n.args?.length ?? 0}`);
        return t;
      }

      case 'Cast': {
        const v = this.visitExpr(n.operand);
        const t = this.newTemp();
        this.emit(`${t} = (${n.castType}) ${v}`);
        return t;
      }

      case 'Index': {
        const a = this.visitExpr(n.array);
        const i = this.visitExpr(n.index);
        const t = this.newTemp();
        this.emit(`${t} = ${a}[${i}]`);
        return t;
      }

      case 'MemberAccess': {
        const o = this.visitExpr(n.object);
        const t = this.newTemp();
        this.emit(`${t} = ${o}${n.op}${n.member}`);
        return t;
      }

      case 'Sizeof': {
        if (typeof n.arg === 'string') return `sizeof(${n.arg})`;
        const v = this.visitExpr(n.arg);
        return `sizeof(${v})`;
      }

      case 'Ternary': {
        const c  = this.visitExpr(n.cond);
        const t  = this.newTemp();
        const l1 = this.newLabel();
        const l2 = this.newLabel();
        this.emit(`if_false ${c} goto ${l1}`);
        const tv = this.visitExpr(n.then);
        this.emit(`${t} = ${tv}`);
        this.emit(`goto ${l2}`);
        this.emit(`${l1}:`);
        const fv = this.visitExpr(n.else_);
        this.emit(`${t} = ${fv}`);
        this.emit(`${l2}:`);
        return t;
      }

      case 'ArrayInit': {
        const t = this.newTemp();
        (n.elements || []).forEach((el, i) => {
          const v = this.visitExpr(el);
          this.emit(`${t}[${i}] = ${v}`);
        });
        return t;
      }

      default:
        return '_';
    }
  }
}

export function generate(ast, symbolTable) {
  const gen = new TACGenerator();
  const result = gen.generate(ast);
  return result;
}
