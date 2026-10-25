// ─── Java Language Module ─────────────────────────────────────────────────────
// Full Java lexer + parser + semantic + IR/optimizer/codegen (JVM bytecode style)

import { LexerError, ParseError, SemanticError } from '../../core/errors.js';
import * as cOptimizer from '../c/optimizer.js';

export const id = 'java';
export const label = 'Java';

// ─── Java Keywords ────────────────────────────────────────────────────────────
const JAVA_KEYWORDS = new Set([
  'abstract','assert','boolean','break','byte','case','catch','char','class',
  'const','continue','default','do','double','else','enum','extends','final',
  'finally','float','for','goto','if','implements','import','instanceof','int',
  'interface','long','native','new','package','private','protected','public',
  'return','short','static','strictfp','super','switch','synchronized','this',
  'throw','throws','transient','try','void','volatile','while',
  'true','false','null','var','record','sealed','permits',
]);

const JAVA_TYPES = new Set(['int','float','double','char','boolean','byte','short','long','void','String','Object']);

// ─── Examples ─────────────────────────────────────────────────────────────────
export const examples = [
  {
    label: 'A · Hello World class',
    code: `public class HelloWorld {
    public static void main(String[] args) {
        int x = 10;
        int y = 20;
        int sum = x + y;
        System.out.println(sum);
    }
}`
  },
  {
    label: 'B · Fibonacci method',
    code: `public class Fibonacci {
    public static int fib(int n) {
        if (n <= 1) return n;
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        int result = fib(10);
        System.out.println(result);
    }
}`
  },
  {
    label: 'C · Type error (incompatible types)',
    code: `public class TypeError {
    public static void main(String[] args) {
        int x;
        x = "hello";
    }
}`
  },
  {
    label: 'D · Constant folding',
    code: `public class ConstFold {
    public static void main(String[] args) {
        int result = 100 * 5 + 50;
        System.out.println(result);
    }
}`
  },
];

// ─── Lexer ────────────────────────────────────────────────────────────────────
export const lexer = {
  tokenize(source) {
    const tokens = [];
    const errors = [];
    let pos = 0, line = 1, col = 1;

    const cur  = () => source[pos] ?? '';
    const peek = (n=1) => source[pos+n] ?? '';
    const at   = () => pos >= source.length;
    const adv  = () => {
      const c = source[pos++];
      if (c === '\n') { line++; col = 1; } else col++;
      return c;
    };
    const emit = (type, lexeme, l, c) => tokens.push({ type, lexeme, line: l, col: c });
    const isD  = c => c >= '0' && c <= '9';
    const isA  = c => /[a-zA-Z_$]/.test(c);
    const isAN = c => /[a-zA-Z0-9_$]/.test(c);

    while (!at()) {
      // Whitespace
      if (' \t\r\n'.includes(cur())) { adv(); continue; }
      const l = line, c = col;
      // Line comment
      if (cur() === '/' && peek() === '/') { while (!at() && cur() !== '\n') adv(); continue; }
      // Block comment
      if (cur() === '/' && peek() === '*') {
        adv(); adv();
        while (!at() && !(cur() === '*' && peek() === '/')) adv();
        if (!at()) { adv(); adv(); }
        continue;
      }
      // String
      if (cur() === '"') {
        adv(); let s = '"';
        while (!at() && cur() !== '"') { if (cur() === '\\') { s += adv(); } s += adv(); }
        if (!at()) { s += '"'; adv(); }
        emit('STRING_LITERAL', s, l, c); continue;
      }
      // Char
      if (cur() === "'") {
        adv(); let s = "'";
        while (!at() && cur() !== "'") { if (cur() === '\\') { s += adv(); } s += adv(); }
        if (!at()) { s += "'"; adv(); }
        emit('CHAR_LITERAL', s, l, c); continue;
      }
      // Annotation
      if (cur() === '@') {
        let s = adv();
        while (!at() && isAN(cur())) s += adv();
        emit('ANNOTATION', s, l, c); continue;
      }
      // Number
      if (isD(cur())) {
        let s = '';
        while (!at() && isD(cur())) s += adv();
        if (!at() && cur() === '.' && isD(peek())) {
          s += adv();
          while (!at() && isD(cur())) s += adv();
          if (!at() && (cur() === 'f' || cur() === 'F' || cur() === 'd' || cur() === 'D')) s += adv();
          emit('FLOAT_LITERAL', s, l, c);
        } else {
          if (!at() && (cur() === 'L' || cur() === 'l')) s += adv();
          emit('INT_LITERAL', s, l, c);
        }
        continue;
      }
      // Identifier / keyword
      if (isA(cur())) {
        let s = '';
        while (!at() && isAN(cur())) s += adv();
        const type = JAVA_KEYWORDS.has(s) ? 'KEYWORD' : (JAVA_TYPES.has(s) ? 'TYPE' : 'IDENTIFIER');
        emit(type, s, l, c); continue;
      }
      // Multi-char ops
      const multi = ['>>>=','<<=','>>=','>>>','<<','>>','++','--','+=','-=','*=','/=','%=',
                     '&=','|=','^=','==','!=','<=','>=','&&','||','->','::','...'];
      let found = false;
      for (const op of multi) {
        if (source.startsWith(op, pos)) {
          for (let i = 0; i < op.length; i++) adv();
          emit('OPERATOR', op, l, c); found = true; break;
        }
      }
      if (found) continue;
      // Single char
      const sc = adv();
      if (';,(){}[].<>?:!~&|^%*/+-='.includes(sc)) {
        emit(/[;,(){}\[\].]/.test(sc) ? 'PUNCT' : 'OPERATOR', sc, l, c);
      } else {
        errors.push(new LexerError(`Unexpected character '${sc}'`, l, c));
      }
    }
    emit('EOF', '', line, col);
    if (errors.length) throw errors[0];
    return { tokens };
  }
};

// ─── Parser ───────────────────────────────────────────────────────────────────
// Simplified Java parser — handles classes, methods, statements, expressions
export const parser = {
  parse(tokens) {
    const p = new JavaParser(tokens);
    const ast = p.parseCompilationUnit();
    const astText = javaAstToText(ast).trimEnd();
    return { ast, astText };
  }
};

class JavaParser {
  constructor(tokens) {
    this.tokens = tokens.filter(t => t.type !== 'EOF');
    this.eof = tokens.find(t => t.type === 'EOF') ?? { type:'EOF', lexeme:'', line:0, col:0 };
    this.pos = 0;
  }
  cur()  { return this.tokens[this.pos] ?? this.eof; }
  peek(n=1) { return this.tokens[this.pos+n] ?? this.eof; }
  at()   { return this.pos >= this.tokens.length; }
  adv()  { const t = this.cur(); if (!this.at()) this.pos++; return t; }
  check(type, lex) {
    const t = this.cur();
    return (!type || t.type === type) && (lex === undefined || t.lexeme === lex);
  }
  match(type, lex) { if (this.check(type, lex)) { this.adv(); return true; } return false; }
  expect(type, lex, msg) {
    if (this.check(type, lex)) return this.adv();
    const t = this.cur();
    throw new ParseError(msg ?? `Expected '${lex ?? type}' but got '${t.lexeme}'`, t.line, t.col);
  }

  parseCompilationUnit() {
    const imports = [];
    const classes = [];
    // Package declaration
    if (this.cur().lexeme === 'package') { while (!this.at() && !this.check('PUNCT',';')) this.adv(); this.match('PUNCT',';'); }
    // Import declarations
    while (!this.at() && this.cur().lexeme === 'import') {
      this.adv();
      let imp = '';
      while (!this.at() && !this.check('PUNCT',';')) imp += this.adv().lexeme;
      this.match('PUNCT',';');
      imports.push(imp);
    }
    // Class declarations
    while (!this.at()) {
      classes.push(this.parseClassDecl());
    }
    return { type: 'CompilationUnit', imports, classes };
  }

  parseModifiers() {
    const mods = [];
    const MOD = new Set(['public','private','protected','static','final','abstract','native','synchronized','volatile','transient','strictfp']);
    while (!this.at()) {
      if (this.cur().type === 'ANNOTATION') { mods.push(this.adv().lexeme); continue; }
      if (MOD.has(this.cur().lexeme))       { mods.push(this.adv().lexeme); continue; }
      break;
    }
    return mods;
  }

  parseClassDecl() {
    const mods = this.parseModifiers();
    if (!this.check('KEYWORD','class') && !this.check('KEYWORD','interface') && !this.check('KEYWORD','enum') && !this.check('KEYWORD','record')) {
      throw new ParseError(`Expected 'class' or 'interface'`, this.cur().line, this.cur().col);
    }
    const kw = this.adv().lexeme;
    const name = this.expect('IDENTIFIER', undefined, `Expected class name`).lexeme;
    // generics stub
    if (this.check('OPERATOR','<')) { let d=1; this.adv(); while (!this.at()&&d>0){if(this.cur().lexeme==='<')d++;if(this.cur().lexeme==='>'){d--;if(d===0){this.adv();break;}}this.adv();} }
    // extends
    let superclass = null;
    if (this.match('KEYWORD','extends')) { superclass = this.expect('IDENTIFIER').lexeme; }
    // implements
    const interfaces = [];
    if (this.match('KEYWORD','implements')) { do { interfaces.push(this.expect('IDENTIFIER').lexeme); } while(this.match('PUNCT',',')); }
    this.expect('PUNCT','{');
    const members = [];
    while (!this.at() && !this.check('PUNCT','}')) {
      members.push(this.parseMember());
    }
    this.expect('PUNCT','}');
    return { type: 'ClassDecl', modifiers: mods, kind: kw, name, superclass, interfaces, members };
  }

  parseMember() {
    const mods = this.parseModifiers();
    // Inner class
    if (this.check('KEYWORD','class') || this.check('KEYWORD','interface') || this.check('KEYWORD','enum')) {
      const inner = this.parseClassDecl();
      inner.modifiers = [...mods, ...inner.modifiers];
      return inner;
    }
    const retType = this.parseTypeRef();
    const name = this.expect('IDENTIFIER', undefined, `Expected method/field name`).lexeme;
    // Method
    if (this.check('PUNCT','(')) {
      this.adv();
      const params = this.parseParams();
      this.expect('PUNCT',')');
      // throws
      if (this.match('KEYWORD','throws')) { while (!this.at() && !this.check('PUNCT','{') && !this.check('PUNCT',';')) this.adv(); }
      if (this.check('PUNCT','{')) {
        const body = this.parseBlock();
        return { type: 'MethodDecl', modifiers: mods, retType, name, params, body };
      }
      this.match('PUNCT',';');
      return { type: 'MethodDecl', modifiers: mods, retType, name, params, body: null };
    }
    // Field
    let init = null;
    // Array declarator
    while (this.match('PUNCT','[')) this.match('PUNCT',']');
    if (this.match('OPERATOR','=')) { init = this.parseExpr(); }
    this.match('PUNCT',';');
    return { type: 'FieldDecl', modifiers: mods, fieldType: retType, name, init };
  }

  parseTypeRef() {
    let t = '';
    const PRIMS = new Set(['void','int','long','double','float','char','boolean','byte','short']);
    if (PRIMS.has(this.cur().lexeme) || this.cur().type === 'TYPE' || this.cur().type === 'IDENTIFIER' || this.cur().type === 'KEYWORD') {
      t += this.adv().lexeme;
    }
    // Generics
    if (this.check('OPERATOR','<')) {
      t += '<';
      this.adv();
      let d = 1;
      while (!this.at() && d > 0) {
        if (this.cur().lexeme === '<') d++;
        if (this.cur().lexeme === '>') d--;
        t += this.adv().lexeme;
      }
    }
    // Pointer stars / array brackets
    while (this.match('PUNCT','[')) { this.match('PUNCT',']'); t += '[]'; }
    // varargs
    if (this.check('OPERATOR','...')) { this.adv(); t += '...'; }
    return t || 'unknown';
  }

  parseParams() {
    const params = [];
    if (this.check('PUNCT',')')) return params;
    do {
      const mods = this.parseModifiers();
      const ptype = this.parseTypeRef();
      const pname = this.check('IDENTIFIER') ? this.adv().lexeme : '';
      params.push({ ptype, name: pname });
    } while (this.match('PUNCT',','));
    return params;
  }

  parseBlock() {
    this.expect('PUNCT','{');
    const stmts = [];
    while (!this.at() && !this.check('PUNCT','}')) { stmts.push(this.parseStmt()); }
    this.expect('PUNCT','}');
    return { type: 'Block', stmts };
  }

  parseStmt() {
    const t = this.cur();
    if (t.lexeme === '{')        return this.parseBlock();
    if (t.lexeme === 'if')       return this.parseIf();
    if (t.lexeme === 'while')    return this.parseWhile();
    if (t.lexeme === 'for')      return this.parseFor();
    if (t.lexeme === 'return')   return this.parseReturn();
    if (t.lexeme === 'break')    { this.adv(); this.match('PUNCT',';'); return { type:'Break' }; }
    if (t.lexeme === 'continue') { this.adv(); this.match('PUNCT',';'); return { type:'Continue' }; }
    if (t.lexeme === 'try')      return this.parseTryCatch();
    if (t.lexeme === 'throw')    { this.adv(); const e = this.parseExpr(); this.match('PUNCT',';'); return { type:'Throw', expr: e }; }
    if (this.isTypeStart())      return this.parseLocalVarDecl();
    const expr = this.parseExpr();
    this.match('PUNCT',';');
    return { type:'ExprStmt', expr };
  }

  isTypeStart() {
    const PRIMS = new Set(['int','long','double','float','char','boolean','byte','short','var']);
    const t = this.cur(), n = this.peek();
    if (t.type === 'TYPE' || PRIMS.has(t.lexeme)) {
      // next should be identifier (after possible [] or generics)
      return true;
    }
    if (t.type === 'IDENTIFIER' && (n.type === 'IDENTIFIER' || n.lexeme === '[' || n.lexeme === '<')) return true;
    return false;
  }

  parseLocalVarDecl() {
    const vtype = this.parseTypeRef();
    const name  = this.expect('IDENTIFIER').lexeme;
    while (this.match('PUNCT','[')) this.match('PUNCT',']');
    let init = null;
    if (this.match('OPERATOR','=')) { init = this.parseExpr(); }
    this.match('PUNCT',';');
    return { type:'VarDecl', vtype, name, init };
  }

  parseIf() {
    this.adv();
    this.expect('PUNCT','(');
    const cond = this.parseExpr();
    this.expect('PUNCT',')');
    const then = this.parseStmt();
    let else_ = null;
    if (!this.at() && this.cur().lexeme === 'else') { this.adv(); else_ = this.parseStmt(); }
    return { type:'If', cond, then, else_ };
  }
  parseWhile() {
    this.adv();
    this.expect('PUNCT','(');
    const cond = this.parseExpr();
    this.expect('PUNCT',')');
    const body = this.parseStmt();
    return { type:'While', cond, body };
  }
  parseFor() {
    this.adv();
    this.expect('PUNCT','(');
    let init = null;
    if (!this.check('PUNCT',';')) {
      if (this.isTypeStart()) init = this.parseLocalVarDecl();
      else { init = { type:'ExprStmt', expr: this.parseExpr() }; this.match('PUNCT',';'); }
    } else this.adv();
    let cond = null;
    if (!this.check('PUNCT',';')) cond = this.parseExpr();
    this.match('PUNCT',';');
    let update = null;
    if (!this.check('PUNCT',')')) update = this.parseExpr();
    this.expect('PUNCT',')');
    const body = this.parseStmt();
    return { type:'For', init, cond, update, body };
  }
  parseReturn() {
    this.adv();
    let val = null;
    if (!this.check('PUNCT',';')) val = this.parseExpr();
    this.match('PUNCT',';');
    return { type:'Return', value: val };
  }
  parseTryCatch() {
    this.adv();
    const tryBlock = this.parseBlock();
    const catches = [];
    while (!this.at() && this.cur().lexeme === 'catch') {
      this.adv();
      this.expect('PUNCT','(');
      const eType = this.parseTypeRef();
      const eName = this.check('IDENTIFIER') ? this.adv().lexeme : 'e';
      this.expect('PUNCT',')');
      const body = this.parseBlock();
      catches.push({ eType, eName, body });
    }
    let finally_ = null;
    if (!this.at() && this.cur().lexeme === 'finally') { this.adv(); finally_ = this.parseBlock(); }
    return { type:'TryCatch', tryBlock, catches, finally_ };
  }

  parseExpr() { return this.parseAssign(); }
  parseAssign() {
    let l = this.parseTernary();
    const AOPS = new Set(['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>=','>>>=']);
    if (!this.at() && AOPS.has(this.cur().lexeme)) {
      const op = this.adv().lexeme;
      const r  = this.parseAssign();
      return { type:'Assign', target:l, op, value:r };
    }
    return l;
  }
  parseTernary() {
    let c = this.parseOr();
    if (!this.at() && this.cur().lexeme === '?') {
      this.adv();
      const t = this.parseExpr();
      this.expect('PUNCT',':');
      const e = this.parseTernary();
      return { type:'Ternary', cond:c, then:t, else_:e };
    }
    return c;
  }
  parseOr()    { return this._la(this.parseAnd.bind(this), ['||']); }
  parseAnd()   { return this._la(this.parseBitOr.bind(this), ['&&']); }
  parseBitOr() { return this._la(this.parseBitXor.bind(this), ['|']); }
  parseBitXor(){ return this._la(this.parseBitAnd.bind(this), ['^']); }
  parseBitAnd(){ return this._la(this.parseEq.bind(this), ['&']); }
  parseEq()    { return this._la(this.parseRel.bind(this), ['==','!=']); }
  parseRel() {
    let l = this.parseShift();
    while (!this.at()) {
      if (['<','>','<=','>='].includes(this.cur().lexeme)) {
        const op = this.adv().lexeme; l = { type:'BinOp', op, left:l, right:this.parseShift() };
      } else if (this.cur().lexeme === 'instanceof') {
        this.adv(); const tp = this.parseTypeRef();
        l = { type:'Instanceof', left:l, checkType:tp };
      } else break;
    }
    return l;
  }
  parseShift() { return this._la(this.parseAdd.bind(this), ['<<','>>','>>>']); }
  parseAdd()   { return this._la(this.parseMul.bind(this), ['+','-']); }
  parseMul()   { return this._la(this.parseUnary.bind(this), ['*','/','%']); }
  _la(next, ops) {
    let l = next();
    while (!this.at() && ops.includes(this.cur().lexeme)) {
      const op = this.adv().lexeme;
      l = { type:'BinOp', op, left:l, right:next() };
    }
    return l;
  }
  parseUnary() {
    const UOPS = new Set(['-','!','~','++','--']);
    if (!this.at() && UOPS.has(this.cur().lexeme)) {
      const op = this.adv().lexeme;
      return { type:'UnaryOp', op, operand:this.parseUnary() };
    }
    if (!this.at() && this.cur().lexeme === '(') {
      // Could be cast
      const saved = this.pos;
      try {
        this.adv();
        if (this.isTypeStart()) {
          const ct = this.parseTypeRef();
          this.expect('PUNCT',')');
          const operand = this.parseUnary();
          return { type:'Cast', castType:ct, operand };
        }
      } catch {}
      this.pos = saved;
    }
    return this.parsePostfix();
  }
  parsePostfix() {
    let e = this.parsePrimary();
    while (true) {
      if (!this.at() && ['++','--'].includes(this.cur().lexeme)) {
        e = { type:'PostfixOp', op:this.adv().lexeme, operand:e };
      } else if (!this.at() && this.cur().lexeme === '[') {
        this.adv();
        const idx = this.parseExpr();
        this.expect('PUNCT',']');
        e = { type:'Index', array:e, index:idx };
      } else if (!this.at() && (this.cur().lexeme === '.' || this.cur().lexeme === '::')) {
        const op = this.adv().lexeme;
        const mem = this.expect('IDENTIFIER').lexeme;
        if (this.check('PUNCT','(')) {
          this.adv();
          const args = [];
          if (!this.check('PUNCT',')')) { do { args.push(this.parseExpr()); } while(this.match('PUNCT',',')); }
          this.expect('PUNCT',')');
          e = { type:'MethodCall', object:e, op, method:mem, args };
        } else {
          e = { type:'MemberAccess', object:e, op, member:mem };
        }
      } else break;
    }
    return e;
  }
  parsePrimary() {
    const t = this.cur();
    if (!t || t.type === 'EOF') throw new ParseError(`Unexpected end of input`, t?.line, t?.col);
    if (t.lexeme === '(') {
      this.adv();
      const e = this.parseExpr();
      this.expect('PUNCT',')');
      return e;
    }
    if (t.type === 'INT_LITERAL')    { this.adv(); return { type:'IntLit', value:t.lexeme, line:t.line }; }
    if (t.type === 'FLOAT_LITERAL')  { this.adv(); return { type:'FloatLit', value:t.lexeme, line:t.line }; }
    if (t.type === 'STRING_LITERAL') { this.adv(); return { type:'StringLit', value:t.lexeme, line:t.line }; }
    if (t.type === 'CHAR_LITERAL')   { this.adv(); return { type:'CharLit', value:t.lexeme, line:t.line }; }
    if (t.lexeme === 'true' || t.lexeme === 'false') { this.adv(); return { type:'BoolLit', value:t.lexeme==='true' }; }
    if (t.lexeme === 'null')  { this.adv(); return { type:'NullLit' }; }
    if (t.lexeme === 'this')  { this.adv(); return { type:'This' }; }
    if (t.lexeme === 'super') { this.adv(); return { type:'Super' }; }
    if (t.lexeme === 'new') {
      this.adv();
      const newType = this.parseTypeRef();
      if (this.check('PUNCT','(')) {
        this.adv();
        const args = [];
        if (!this.check('PUNCT',')')) { do { args.push(this.parseExpr()); } while(this.match('PUNCT',',')); }
        this.expect('PUNCT',')');
        return { type:'NewObject', newType, args };
      }
      if (this.check('PUNCT','[')) {
        this.adv(); const sz = this.parseExpr(); this.expect('PUNCT',']');
        return { type:'NewArray', newType, size:sz };
      }
    }
    if (t.type === 'IDENTIFIER') {
      this.adv();
      if (this.check('PUNCT','(')) {
        this.adv();
        const args = [];
        if (!this.check('PUNCT',')')) { do { args.push(this.parseExpr()); } while(this.match('PUNCT',',')); }
        this.expect('PUNCT',')');
        return { type:'Call', name:t.lexeme, args, line:t.line };
      }
      return { type:'Ident', name:t.lexeme, line:t.line };
    }
    if (t.type === 'KEYWORD' && t.lexeme === 'void') { this.adv(); return { type:'Ident', name:'void' }; }
    throw new ParseError(`Unexpected token '${t.lexeme}' (${t.type})`, t.line, t.col);
  }
}

// ─── AST → text ───────────────────────────────────────────────────────────────
function javaAstToText(n, prefix='', isLast=true) {
  if (!n || typeof n !== 'object') return '';
  const con = isLast ? '└─ ' : '├─ ';
  const cp  = prefix + (isLast ? '   ' : '│  ');
  switch (n.type) {
    case 'CompilationUnit':
      return `CompilationUnit\n` + n.classes.map((c,i)=>javaAstToText(c,'',i===n.classes.length-1)).join('');
    case 'ClassDecl': {
      const head = `${prefix}${con}${n.kind} ${n.name}${n.superclass ? ` extends ${n.superclass}` : ''}\n`;
      return head + (n.members||[]).map((m,i)=>javaAstToText(m,cp,i===n.members.length-1)).join('');
    }
    case 'MethodDecl': {
      const params = (n.params||[]).map(p=>`${p.ptype} ${p.name}`).join(', ');
      const head = `${prefix}${con}Method ${n.name}(${params}) : ${n.retType}\n`;
      return head + (n.body ? javaAstToText(n.body,cp,true) : '');
    }
    case 'FieldDecl':
      return `${prefix}${con}Field ${n.name} : ${n.fieldType}${n.init?' = (expr)':''}\n`;
    case 'Block':
      return `${prefix}${con}Block\n` + (n.stmts||[]).map((s,i)=>javaAstToText(s,cp,i===n.stmts.length-1)).join('');
    case 'VarDecl':
      return `${prefix}${con}VarDecl ${n.name} : ${n.vtype}${n.init?' = (expr)':''}\n`;
    case 'If':
      return `${prefix}${con}If\n${javaAstToText(n.cond,cp,false)}${javaAstToText(n.then,cp,!n.else_)}${n.else_?javaAstToText(n.else_,cp,true):''}`;
    case 'While':
      return `${prefix}${con}While\n${javaAstToText(n.cond,cp,false)}${javaAstToText(n.body,cp,true)}`;
    case 'For':
      return `${prefix}${con}For\n${javaAstToText(n.init,cp,false)}${javaAstToText(n.cond,cp,false)}${javaAstToText(n.update,cp,false)}${javaAstToText(n.body,cp,true)}`;
    case 'Return':
      return `${prefix}${con}Return\n${n.value?javaAstToText(n.value,cp,true):''}`;
    case 'Assign':
      return `${prefix}${con}Assign (${n.op})\n${javaAstToText(n.target,cp,false)}${javaAstToText(n.value,cp,true)}`;
    case 'BinOp':
      return `${prefix}${con}BinOp (${n.op})\n${javaAstToText(n.left,cp,false)}${javaAstToText(n.right,cp,true)}`;
    case 'UnaryOp':
      return `${prefix}${con}UnaryOp (${n.op})\n${javaAstToText(n.operand,cp,true)}`;
    case 'Call':
    case 'MethodCall':
      return `${prefix}${con}Call ${n.name??n.method}\n${(n.args||[]).map((a,i)=>javaAstToText(a,cp,i===n.args.length-1)).join('')}`;
    case 'NewObject':
      return `${prefix}${con}New ${n.newType}\n`;
    case 'Ident':   return `${prefix}${con}Ident ${n.name}\n`;
    case 'IntLit':  return `${prefix}${con}IntLit ${n.value}\n`;
    case 'FloatLit':return `${prefix}${con}FloatLit ${n.value}\n`;
    case 'StringLit':return `${prefix}${con}StringLit ${n.value}\n`;
    case 'BoolLit': return `${prefix}${con}BoolLit ${n.value}\n`;
    case 'NullLit': return `${prefix}${con}null\n`;
    case 'ExprStmt':return javaAstToText(n.expr,prefix,isLast);
    default:        return `${prefix}${con}${n.type}\n`;
  }
}

// ─── Semantic ──────────────────────────────────────────────────────────────────
export const semantic = {
  analyze(ast) {
    const symbolTable = [];
    const checks = [];
    const warnings = [];

    function visitCompUnit(n) {
      (n.classes||[]).forEach(visitClass);
    }
    function visitClass(cls) {
      symbolTable.push({ name: cls.name, kind: cls.kind, type: cls.name, scope: 'package', value: '—' });
      (cls.members||[]).forEach(m => visitMember(m, cls.name));
    }
    function visitMember(m, className) {
      if (m.type === 'FieldDecl') {
        symbolTable.push({ name: m.name, kind: 'field', type: m.fieldType, scope: className, value: m.init ? '(expr)' : '—' });
      } else if (m.type === 'MethodDecl') {
        symbolTable.push({ name: m.name, kind: 'method', type: `${m.retType}`, scope: className, value: '—' });
        checks.push(`Method '${m.name}' declared with return type '${m.retType}'.`);
        (m.params||[]).forEach(p => symbolTable.push({ name: p.name||'?', kind: 'parameter', type: p.ptype, scope: `${className}.${m.name}`, value: '—' }));
        if (m.body) visitBlock(m.body, `${className}.${m.name}`, m.retType);
      } else if (m.type === 'ClassDecl') {
        visitClass(m);
      }
    }
    function visitBlock(block, scope, retType) {
      (block.stmts||[]).forEach(s => visitStmt(s, scope, retType));
    }
    function visitStmt(s, scope, retType) {
      if (!s) return;
      if (s.type === 'VarDecl') {
        // Type check init
        if (s.init) {
          const initType = inferType(s.init);
          if (!typesCompat(s.vtype, initType)) {
            throw new SemanticError(
              `Cannot initialize '${s.name}' (type '${s.vtype}') with value of type '${initType}' — incompatible types.`,
              s.init?.line, s.init?.col,
              `Java does not allow implicit conversion between incompatible types. An explicit cast or correct type is required.`
            );
          }
        }
        symbolTable.push({ name: s.name, kind: 'variable', type: s.vtype, scope, value: s.init ? inferLit(s.init) ?? '(expr)' : '—' });
        checks.push(`Variable '${s.name}' (${s.vtype}) declared in scope '${scope}'.`);
      } else if (s.type === 'Assign') {
        const tType = inferType(s.target);
        const vType = inferType(s.value);
        if (tType && vType && !typesCompat(tType, vType)) {
          throw new SemanticError(
            `Incompatible types: cannot assign '${vType}' to '${tType}'.`,
            s.target?.line, s.target?.col
          );
        }
      } else if (s.type === 'Return') {
        if (retType && retType !== 'void' && s.value) {
          const vType = inferType(s.value);
          if (!typesCompat(retType, vType)) {
            throw new SemanticError(`Return type mismatch: expected '${retType}', got '${vType}'.`, s.value?.line);
          }
          checks.push(`Return type '${vType}' matches declared '${retType}'.`);
        }
      } else if (s.type === 'Block')       visitBlock(s, scope, retType);
      else if (s.type === 'If')       { visitStmt(s.then,scope,retType); if(s.else_) visitStmt(s.else_,scope,retType); }
      else if (s.type === 'While')    visitStmt(s.body,scope,retType);
      else if (s.type === 'For')      { if(s.init)visitStmt(s.init,scope,retType); visitStmt(s.body,scope,retType); }
      else if (s.type === 'ExprStmt') {}
    }
    function inferType(n) {
      if (!n) return null;
      if (n.type === 'IntLit')   return 'int';
      if (n.type === 'FloatLit') return 'double';
      if (n.type === 'BoolLit')  return 'boolean';
      if (n.type === 'StringLit') return 'String';
      if (n.type === 'CharLit')  return 'char';
      if (n.type === 'NullLit')  return 'null';
      if (n.type === 'BinOp') {
        const l = inferType(n.left), r = inferType(n.right);
        if (['==','!=','<','>','<=','>=','&&','||'].includes(n.op)) return 'boolean';
        if (l==='double'||r==='double') return 'double';
        if (l==='String'||r==='String') return 'String';
        return 'int';
      }
      return null;
    }
    function inferLit(n) {
      if (!n) return null;
      if (n.type==='IntLit'||n.type==='FloatLit'||n.type==='BoolLit') return String(n.value);
      if (n.type==='StringLit'||n.type==='CharLit') return n.value;
      return null;
    }
    function typesCompat(declared, rhs) {
      if (!declared || !rhs || rhs==='null') return true;
      if (declared === rhs) return true;
      const NUM = new Set(['int','long','double','float','short','byte','char']);
      if (NUM.has(declared) && NUM.has(rhs)) return true;
      if (declared === 'String' && rhs === 'String') return true;
      return false;
    }

    visitCompUnit(ast);
    return { symbolTable, checks, warnings };
  }
};

// ─── IR, Optimizer, Codegen ───────────────────────────────────────────────────
export const ir = {
  generate(ast, symbolTable) {
    const instrs = [];
    let tc = 0, lc = 0;
    const tmp = () => `t${++tc}`;
    const lbl = () => `L${++lc}`;
    const emit = s => instrs.push(s);

    function visitCompUnit(n) { (n.classes||[]).forEach(visitClass); }
    function visitClass(cls) {
      (cls.members||[]).filter(m=>m.type==='MethodDecl'&&m.body).forEach(visitMethod.bind(null,cls.name));
    }
    function visitMethod(className, m) {
      emit(`func_begin ${className}.${m.name}`);
      (m.params||[]).forEach(p=>{ if(p.name) emit(`param_receive ${p.name}`); });
      visitBlock(m.body);
      if (m.retType==='void') emit(`return`);
      emit(`func_end ${className}.${m.name}`);
    }
    function visitBlock(b) { (b?.stmts||[]).forEach(visitStmt); }
    function visitStmt(s) {
      if (!s) return;
      if (s.type==='VarDecl') { if(s.init){ const v=visitExpr(s.init); emit(`${s.name} = ${v}`); } }
      else if (s.type==='Assign') { const r=visitExpr(s.value); emit(`${s.target?.name??'_'} = ${r}`); }
      else if (s.type==='Return') { if(s.value){const v=visitExpr(s.value);emit(`return ${v}`);}else emit('return'); }
      else if (s.type==='Block')  visitBlock(s);
      else if (s.type==='If') {
        const c=visitExpr(s.cond),lt=lbl(),lf=lbl();
        emit(`if ${c} goto ${lt}`); emit(`goto ${lf}`); emit(`${lt}:`);
        visitStmt(s.then);
        if (s.else_) { const le=lbl(); emit(`goto ${le}`); emit(`${lf}:`); visitStmt(s.else_); emit(`${le}:`); }
        else emit(`${lf}:`);
      }
      else if (s.type==='While') {
        const top=lbl(),ex=lbl();
        emit(`${top}:`); const c=visitExpr(s.cond); emit(`if_false ${c} goto ${ex}`);
        visitStmt(s.body); emit(`goto ${top}`); emit(`${ex}:`);
      }
      else if (s.type==='For') {
        if(s.init)visitStmt(s.init);
        const top=lbl(),ex=lbl();
        emit(`${top}:`);
        if(s.cond){const c=visitExpr(s.cond);emit(`if_false ${c} goto ${ex}`);}
        visitStmt(s.body);
        if(s.update)visitExpr(s.update);
        emit(`goto ${top}`); emit(`${ex}:`);
      }
      else if (s.type==='ExprStmt') visitExpr(s.expr);
    }
    function visitExpr(n) {
      if (!n) return '_';
      if (n.type==='IntLit'||n.type==='FloatLit') return n.value;
      if (n.type==='BoolLit') return n.value?'1':'0';
      if (n.type==='StringLit'||n.type==='CharLit') return n.value;
      if (n.type==='NullLit') return 'null';
      if (n.type==='Ident') return n.name;
      if (n.type==='BinOp') { const l=visitExpr(n.left),r=visitExpr(n.right),t=tmp(); emit(`${t} = ${l} ${n.op} ${r}`); return t; }
      if (n.type==='UnaryOp') { const v=visitExpr(n.operand),t=tmp(); emit(`${t} = ${n.op}${v}`); return t; }
      if (n.type==='Assign') { const r=visitExpr(n.value); emit(`${n.target?.name??'_'} = ${r}`); return n.target?.name??'_'; }
      if (n.type==='Call'||n.type==='MethodCall') {
        (n.args||[]).forEach(a=>{ const v=visitExpr(a); emit(`param ${v}`); });
        const t=tmp(); emit(`${t} = call ${n.name??n.method}, ${n.args?.length??0}`); return t;
      }
      if (n.type==='MemberAccess') { const o=visitExpr(n.object),t=tmp(); emit(`${t} = ${o}.${n.member}`); return t; }
      if (n.type==='NewObject') { (n.args||[]).forEach(a=>{const v=visitExpr(a);emit(`param ${v}`);}); const t=tmp(); emit(`${t} = new ${n.newType}`); return t; }
      if (n.type==='Index') { const a=visitExpr(n.array),i=visitExpr(n.index),t=tmp(); emit(`${t} = ${a}[${i}]`); return t; }
      return '_';
    }

    visitCompUnit(ast);
    return { instructions: instrs };
  }
};

export const optimizer = { optimize: (instrs) => cOptimizer.optimize(instrs) };

export const codegen = {
  generate(tac, sym) {
    const out = [];
    out.push('; JVM-style educational bytecode (not real .class bytecode)');
    out.push('');
    for (const instr of tac) {
      if (/^func_begin\s/.test(instr)) { out.push(`\n.method ${instr.replace('func_begin ','')}`); continue; }
      if (/^func_end\s/.test(instr))   { out.push(`  return`); out.push(`.end method`); continue; }
      if (/^param_receive\s/.test(instr)) { out.push(`  ; receives param: ${instr.split(' ')[1]}`); continue; }
      if (/^param\s/.test(instr)) { out.push(`  ${/^-?\d/.test(instr.split(' ')[1]) ? 'ldc' : 'aload'} ${instr.split(' ')[1]}`); continue; }
      if (/^return\s+/.test(instr)) { const v=instr.split(' ')[1]; out.push(`  ${/^-?\d/.test(v)?'iload':'aload'} ${v}`); out.push(`  ireturn`); continue; }
      if (/^return$/.test(instr)) { out.push(`  return`); continue; }
      if (/^if_false\s/.test(instr)) { const [,c,,l]=instr.split(' '); out.push(`  iload ${c}`); out.push(`  ifeq ${l}`); continue; }
      if (/^if\s/.test(instr)) { const [,c,,l]=instr.split(' '); out.push(`  iload ${c}`); out.push(`  ifne ${l}`); continue; }
      if (/^goto\s/.test(instr)) { out.push(`  goto ${instr.split(' ')[1]}`); continue; }
      if (/^\w+:$/.test(instr)) { out.push(`${instr}`); continue; }
      // t1 = a op b
      const bm = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|<>=!]+)\s+(\S+)$/.exec(instr);
      if (bm) {
        const [,dst,l,op,r] = bm;
        const load = v => /^-?\d/.test(v) ? `  ldc ${v}` : `  iload ${v}`;
        const opMap = {'+':'iadd','-':'isub','*':'imul','/':'idiv','%':'irem','&':'iand','|':'ior','^':'ixor','<<':'ishl','>>':'ishr','==':'if_icmpeq','<':'if_icmplt','>':'if_icmpgt'};
        out.push(load(l)); out.push(load(r));
        out.push(`  ${opMap[op]??'iadd'}`);
        out.push(`  istore ${dst}`);
        continue;
      }
      // t1 = a (copy/const)
      const cm = /^(\S+)\s*=\s*(\S+)$/.exec(instr);
      if (cm) { out.push(`  ${/^-?\d/.test(cm[2])?'ldc':'iload'} ${cm[2]}`); out.push(`  istore ${cm[1]}`); continue; }
      out.push(`  ; ${instr}`);
    }
    return { targetLabel: 'JVM-style educational bytecode', instructions: out };
  }
};

// Backend using javac/javap via local server
export const backend = {
  /**
   * Run the Java backend analysis.
   * @param {string} source - The source code to analyze
   * @returns {Promise<Object>} The backend response with phases
   */
  run: async (source) => {
    try {
      const response = await fetch('http://localhost:4174/api/analyze/java', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language: 'java',
          source,
          options: { target: 'jvm', standard: 'java17' }
        })
      });

      if (!response.ok) {
        throw new Error(`Backend request failed with status ${response.status}`);
      }

      return response.json();
    } catch (err) {
      console.error('Java backend error:', err);
      throw err;
    }
  }
};
