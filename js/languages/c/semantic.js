// ─── C Semantic Analyzer ──────────────────────────────────────────────────────
// Builds a symbol table and performs type checking on the AST.

import { SemanticError } from '../../core/errors.js';

// ── Type compatibility ────────────────────────────────────────────────────────
const NUMERIC_TYPES = new Set(['int','long','short','unsigned','char','float','double','bool','unsigned int','long long','signed int']);
const INT_TYPES     = new Set(['int','long','short','char','bool','unsigned','unsigned int','long long','signed int']);
const FLOAT_TYPES   = new Set(['float','double','long double']);

function baseType(t) { return (t || '').replace(/\*/g,'').replace(/\[.*\]/,'').trim().split(' ').pop(); }
function isNumeric(t) { return NUMERIC_TYPES.has(baseType(t)); }
function isPointer(t) { return (t || '').includes('*') || (t || '').includes('['); }
function isString(t)  { return (t || '').includes('char*') || (t || '').includes('char [') || baseType(t) === 'char*'; }

function typesCompatible(declared, rhs) {
  if (!declared || !rhs) return true;        // unknown → assume OK
  if (declared === rhs)  return true;
  const d = baseType(declared), r = baseType(rhs);
  if (isNumeric(declared) && isNumeric(rhs)) return true;
  if ((isPointer(declared) || isString(declared)) && rhs === 'string') return true;
  if (declared === 'void*' || rhs === 'void*') return true;
  return false;
}

// ── Scope / Symbol table ──────────────────────────────────────────────────────
class Scope {
  constructor(name, parent = null) {
    this.name   = name;
    this.parent = parent;
    this.syms   = new Map();
  }
  define(sym) { this.syms.set(sym.name, sym); }
  lookupOwn(name) { return this.syms.get(name); }
  lookup(name) {
    return this.syms.get(name) ?? (this.parent ? this.parent.lookup(name) : null);
  }
  scopeLabel() { return this.name; }
}

// ── Analyzer ──────────────────────────────────────────────────────────────────
class SemanticAnalyzer {
  constructor() {
    this.global   = new Scope('global');
    this.current  = this.global;
    this.symbols  = [];      // flat list for display
    this.checks   = [];      // passing checks list
    this.warnings = [];
    this.currentFuncRetType = null;
  }

  enter(name) {
    this.current = new Scope(name, this.current);
  }
  exit() {
    // collect symbols from this scope
    for (const sym of this.current.syms.values()) {
      this.symbols.push({
        name:  sym.name,
        kind:  sym.kind,
        type:  sym.type,
        scope: sym.scope,
        value: sym.value ?? '—'
      });
    }
    this.current = this.current.parent;
  }

  define(name, kind, type, value = null) {
    const scope = this.current.scopeLabel();
    const sym = { name, kind, type, scope, value };
    this.current.define(sym);
    return sym;
  }

  analyze(ast) {
    // Pre-define common C stdlib functions
    ['printf','scanf','puts','gets','malloc','free','calloc','realloc',
     'strlen','strcpy','strcat','strcmp','memcpy','memset','exit','abs','sqrt','pow']
      .forEach(fn => this.global.define({ name: fn, kind: 'function', type: 'void', scope: 'global', value: null }));

    this.visitNode(ast);

    // Collect global symbols
    for (const sym of this.global.syms.values()) {
      if (!['printf','scanf','puts','gets','malloc','free','calloc','realloc',
             'strlen','strcpy','strcat','strcmp','memcpy','memset','exit','abs','sqrt','pow'].includes(sym.name)) {
        this.symbols.push({
          name: sym.name, kind: sym.kind, type: sym.type,
          scope: sym.scope, value: sym.value ?? '—'
        });
      }
    }

    return {
      symbolTable: this.symbols,
      checks:      this.checks,
      warnings:    this.warnings,
    };
  }

  visitNode(n) {
    if (!n || typeof n !== 'object') return null;
    switch (n.type) {
      case 'Program':    return this.visitProgram(n);
      case 'FuncDecl':   return this.visitFuncDecl(n);
      case 'FuncProto':  return this.visitFuncProto(n);
      case 'VarDecl':    return this.visitVarDecl(n);
      case 'Block':      return this.visitBlock(n);
      case 'Assign':     return this.visitAssign(n);
      case 'Return':     return this.visitReturn(n);
      case 'If':         return this.visitIf(n);
      case 'While':      return this.visitWhile(n);
      case 'DoWhile':    return this.visitDoWhile(n);
      case 'For':        return this.visitFor(n);
      case 'ExprStmt':   return this.visitNode(n.expr);
      case 'BinOp':      return this.visitBinOp(n);
      case 'UnaryOp':    return this.visitUnaryOp(n);
      case 'PostfixOp':  return this.visitPostfix(n);
      case 'Call':       return this.visitCall(n);
      case 'Ident':      return this.visitIdent(n);
      case 'IntLit':     return 'int';
      case 'FloatLit':   return 'float';
      case 'StringLit':  return 'char*';
      case 'CharLit':    return 'char';
      case 'BoolLit':    return 'bool';
      case 'NullLit':    return 'void*';
      case 'Cast':       return n.castType;
      case 'ArrayInit':  return 'array';
      case 'Index':      return this.visitIndex(n);
      case 'MemberAccess': return 'unknown';
      case 'Sizeof':     return 'unsigned long';
      case 'Ternary':    return this.visitTernary(n);
      case 'StructDecl': return this.visitStructDecl(n);
      case 'Typedef':    return null;
      case 'Break': case 'Continue': return null;
      default:           return null;
    }
  }

  visitProgram(n) { (n.body || []).forEach(d => this.visitNode(d)); }

  visitFuncDecl(n) {
    const existing = this.global.lookupOwn(n.name);
    if (existing && existing.kind === 'function') {
      // Redefinition
      this.warnings.push(`Function '${n.name}' redefined.`);
    }
    this.define(n.name, 'function', `${n.retType} (${(n.params||[]).map(p=>p.ptype).join(',')})`, null);
    this.enter(n.name + '()');
    const prevRet = this.currentFuncRetType;
    this.currentFuncRetType = n.retType;
    // Define params
    (n.params || []).forEach(p => { if (p.name && p.name !== '...') this.define(p.name, 'parameter', p.ptype); });
    this.visitNode(n.body);
    this.currentFuncRetType = prevRet;
    this.exit();
    this.checks.push(`Function '${n.name}' declared with return type '${n.retType}'.`);
  }

  visitFuncProto(n) {
    this.define(n.name, 'function', `${n.retType}`, null);
  }

  visitVarDecl(n) {
    // Check duplicate in current scope
    if (this.current.lookupOwn(n.name)) {
      throw new SemanticError(
        `Variable '${n.name}' is already declared in this scope.`,
        n.line, n.col,
        `Each variable name must be unique within its scope. Rename one of the declarations.`
      );
    }
    let initType = null;
    let initVal  = null;
    if (n.init) {
      initType = this.visitNode(n.init);
      initVal  = this.exprValue(n.init);
      if (initType && !typesCompatible(n.vtype, initType)) {
        throw new SemanticError(
          `Cannot initialize '${n.name}' (type '${n.vtype}') with a value of type '${initType}' — incompatible types.`,
          n.line, n.col,
          `In C, implicit conversion is only allowed between compatible numeric types. Assigning a string literal to an integer variable is not valid.`
        );
      }
      this.checks.push(`Variable '${n.name}' (${n.vtype}) initialized — types are compatible.`);
    }
    this.define(n.name, 'variable', n.vtype, initVal ?? (n.init ? '(expr)' : null));
  }

  visitBlock(n) { (n.stmts || []).forEach(s => this.visitNode(s)); }

  visitAssign(n) {
    const targetType = this.visitNode(n.target);
    const valueType  = this.visitNode(n.value);
    if (targetType && valueType && !typesCompatible(targetType, valueType)) {
      const tName = n.target.name ?? '(expr)';
      throw new SemanticError(
        `Cannot assign value of type '${valueType}' to '${tName}' of type '${targetType}' — incompatible types.`,
        n.target?.line, n.target?.col,
        `Implicit conversion is not valid between these types in C. You may need an explicit cast.`
      );
    }
    // Update symbol value if simple ident assignment
    if (n.target?.type === 'Ident') {
      const sym = this.current.lookup(n.target.name);
      if (sym) sym.value = this.exprValue(n.value) ?? '(expr)';
    }
    return targetType;
  }

  visitReturn(n) {
    const retType = n.value ? this.visitNode(n.value) : 'void';
    if (this.currentFuncRetType && this.currentFuncRetType !== 'void' && retType) {
      if (!typesCompatible(this.currentFuncRetType, retType)) {
        throw new SemanticError(
          `Return type mismatch: function declares '${this.currentFuncRetType}' but returns '${retType}'.`,
          n.line, n.col
        );
      }
      this.checks.push(`Return type '${retType}' is compatible with declared return type '${this.currentFuncRetType}'.`);
    }
    return retType;
  }

  visitIf(n) {
    this.visitNode(n.cond);
    this.enter('if');
    this.visitNode(n.then);
    this.exit();
    if (n.else_) {
      this.enter('else');
      this.visitNode(n.else_);
      this.exit();
    }
  }

  visitWhile(n)   { this.visitNode(n.cond); this.enter('while'); this.visitNode(n.body); this.exit(); }
  visitDoWhile(n) { this.enter('do-while'); this.visitNode(n.body); this.exit(); this.visitNode(n.cond); }

  visitFor(n) {
    this.enter('for');
    if (n.init) this.visitNode(n.init);
    if (n.cond) this.visitNode(n.cond);
    if (n.update) this.visitNode(n.update);
    if (n.body) {
      // body may not be a block; create sub-scope anyway
      if (n.body.type !== 'Block') this.visitNode(n.body);
      else this.visitNode(n.body);
    }
    this.exit();
  }

  visitBinOp(n) {
    const lt = this.visitNode(n.left);
    const rt = this.visitNode(n.right);
    const compOps = new Set(['==','!=','<','>','<=','>=','&&','||']);
    if (compOps.has(n.op)) return 'bool';
    // Numeric promotion
    if (lt && rt) {
      if (FLOAT_TYPES.has(baseType(lt)) || FLOAT_TYPES.has(baseType(rt))) return 'double';
      if (isNumeric(lt) && isNumeric(rt)) return 'int';
    }
    return lt ?? rt ?? 'int';
  }

  visitUnaryOp(n)  { return this.visitNode(n.operand); }
  visitPostfix(n)  { return this.visitNode(n.operand); }
  visitTernary(n)  { this.visitNode(n.cond); const t = this.visitNode(n.then); this.visitNode(n.else_); return t; }

  visitIndex(n) {
    const arrType = this.visitNode(n.array);
    this.visitNode(n.index);
    // Dereference one level of pointer/array
    return (arrType || '').replace('*','').replace(/\[.*\]/,'').trim() || 'int';
  }

  visitUsingDecl(n) {}

  visitMemberAccess(n) {
    this.visitNode(n.object);
    return 'int';
  }

  visitCall(n) {
    const callName = n.name || (typeof n.callee === 'string' ? n.callee : n.callee?.name || n.callee?.member || 'func');
    const sym = this.current.lookup(callName);
    if (!sym) {
      this.warnings.push(`Function/Method '${callName}' called — assuming valid in scope.`);
    } else {
      this.checks.push(`Call '${callName}' resolved in scope.`);
    }
    (n.args || []).forEach(a => this.visitNode(a));
    return sym ? sym.type : 'int';
  }

  visitIdent(n) {
    if (['cout', 'cin', 'endl', 'this'].includes(n.name)) {
      return 'ostream';
    }
    const sym = this.current.lookup(n.name);
    if (!sym) {
      throw new SemanticError(
        `Undeclared identifier '${n.name}' — used before declaration.`,
        n.line, n.col,
        `All variables and functions must be declared before they are used in C. Check for typos or missing declarations.`
      );
    }
    this.checks.push(`Identifier '${n.name}' resolved to '${sym.type}' in scope '${sym.scope}'.`);
    return sym.type;
  }

  visitStructDecl(n) {
    this.define(n.name, 'struct', 'type', null);
    const bare = n.name.replace(/^(struct|class|union)\s+/, '');
    if (bare !== n.name) {
      this.define(bare, 'class', bare, null);
    }
  }

  // Attempt to extract a literal value string for display
  exprValue(n) {
    if (!n) return null;
    if (n.type === 'IntLit')   return n.value;
    if (n.type === 'FloatLit') return n.value;
    if (n.type === 'StringLit') return n.value;
    if (n.type === 'CharLit')  return n.value;
    if (n.type === 'BoolLit')  return String(n.value);
    if (n.type === 'Ident')    return n.name;
    if (n.type === 'BinOp') {
      try {
        const l = parseFloat(this.exprValue(n.left));
        const r = parseFloat(this.exprValue(n.right));
        if (!isNaN(l) && !isNaN(r)) {
          const ops = {'+':l+r,'-':l-r,'*':l*r,'/':r?l/r:NaN,'%':r?l%r:NaN};
          const v = ops[n.op];
          if (v != null && !isNaN(v)) return String(Number.isInteger(v) ? v : v.toFixed(4));
        }
      } catch {}
      return `${this.exprValue(n.left) ?? '?'} ${n.op} ${this.exprValue(n.right) ?? '?'}`;
    }
    return null;
  }
}

export function analyze(ast, source) {
  const analyzer = new SemanticAnalyzer();
  const result   = analyzer.analyze(ast);
  return result;
}
