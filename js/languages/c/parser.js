// ─── C Recursive-Descent Parser ───────────────────────────────────────────────
// Produces an AST from a C token stream.

import { ParseError } from '../../core/errors.js';

// ── AST node helpers ──────────────────────────────────────────────────────────
const node = (type, fields) => ({ type, ...fields });

// ── AST → indented text representation ───────────────────────────────────────
function astToText(n, prefix = '', isLast = true) {
  if (!n || typeof n !== 'object') return String(n ?? '');
  const connector  = isLast ? '└─ ' : '├─ ';
  const childPfx   = prefix + (isLast ? '   ' : '│  ');

  let lines = '';
  switch (n.type) {
    case 'Program':
      lines = 'Program\n';
      n.body.forEach((d, i) => { lines += astToText(d, '', i === n.body.length - 1); });
      return lines;

    case 'FuncDecl': {
      const params = (n.params || []).map(p => `${p.ptype} ${p.name}`).join(', ');
      lines = `${prefix}${connector}FuncDecl ${n.name} : ${n.retType}(${params})\n`;
      lines += astToText(n.body, childPfx, true);
      return lines;
    }

    case 'Block':
      lines = `${prefix}${connector}Block\n`;
      (n.stmts || []).forEach((s, i) => {
        lines += astToText(s, childPfx, i === n.stmts.length - 1);
      });
      return lines;

    case 'VarDecl':
      lines = `${prefix}${connector}VarDecl ${n.name} : ${n.vtype}`;
      if (n.init) {
        lines += '\n';
        lines += astToText(n.init, childPfx, true);
      } else {
        lines += '\n';
      }
      return lines;

    case 'Assign':
      lines = `${prefix}${connector}Assign\n`;
      lines += astToText(n.target, childPfx, false);
      lines += astToText(n.value,  childPfx, true);
      return lines;

    case 'Return':
      lines = `${prefix}${connector}Return\n`;
      if (n.value) lines += astToText(n.value, childPfx, true);
      return lines;

    case 'If':
      lines = `${prefix}${connector}If\n`;
      lines += astToText(n.cond,   childPfx, false);
      lines += astToText(n.then,   childPfx, !n.else_);
      if (n.else_) lines += astToText(n.else_, childPfx, true);
      return lines;

    case 'While':
      lines = `${prefix}${connector}While\n`;
      lines += astToText(n.cond, childPfx, false);
      lines += astToText(n.body, childPfx, true);
      return lines;

    case 'For':
      lines = `${prefix}${connector}For\n`;
      lines += astToText(n.init,   childPfx, false);
      lines += astToText(n.cond,   childPfx, false);
      lines += astToText(n.update, childPfx, false);
      lines += astToText(n.body,   childPfx, true);
      return lines;

    case 'BinOp':
      lines = `${prefix}${connector}BinOp (${n.op})\n`;
      lines += astToText(n.left,  childPfx, false);
      lines += astToText(n.right, childPfx, true);
      return lines;

    case 'UnaryOp':
      lines = `${prefix}${connector}UnaryOp (${n.op})\n`;
      lines += astToText(n.operand, childPfx, true);
      return lines;

    case 'PostfixOp':
      lines = `${prefix}${connector}PostfixOp (${n.op})\n`;
      lines += astToText(n.operand, childPfx, true);
      return lines;

    case 'Call':
      lines = `${prefix}${connector}Call ${n.name}\n`;
      (n.args || []).forEach((a, i) => { lines += astToText(a, childPfx, i === n.args.length - 1); });
      return lines;

    case 'Ident':
      return `${prefix}${connector}Ident ${n.name}\n`;
    case 'IntLit':
      return `${prefix}${connector}IntLit ${n.value}\n`;
    case 'FloatLit':
      return `${prefix}${connector}FloatLit ${n.value}\n`;
    case 'StringLit':
      return `${prefix}${connector}StringLit ${n.value}\n`;
    case 'CharLit':
      return `${prefix}${connector}CharLit ${n.value}\n`;
    case 'ExprStmt':
      return astToText(n.expr, prefix, isLast);
    case 'Break':
      return `${prefix}${connector}Break\n`;
    case 'Continue':
      return `${prefix}${connector}Continue\n`;
    case 'StructDecl':
      lines = `${prefix}${connector}StructDecl ${n.name}\n`;
      (n.fields || []).forEach((f, i) => { lines += `${childPfx}${i === n.fields.length-1?'└─':'├─'} Field ${f.name} : ${f.ftype}\n`; });
      return lines;
    default:
      return `${prefix}${connector}${n.type}\n`;
  }
}

// ── Parser class ──────────────────────────────────────────────────────────────
class Parser {
  constructor(tokens) {
    // Filter out EOF for general use, keep it as sentinel
    this.tokens = tokens.filter(t => t.type !== 'EOF');
    this.eof    = tokens.find(t => t.type === 'EOF') ?? { type:'EOF', lexeme:'', line:0, col:0 };
    this.pos    = 0;
  }

  cur()   { return this.tokens[this.pos] ?? this.eof; }
  peek(n=1){ return this.tokens[this.pos + n] ?? this.eof; }
  atEnd() { return this.pos >= this.tokens.length; }

  advance() {
    const t = this.cur();
    if (!this.atEnd()) this.pos++;
    return t;
  }

  check(type, lexeme) {
    const t = this.cur();
    if (type && t.type !== type) return false;
    if (lexeme !== undefined && t.lexeme !== lexeme) return false;
    return true;
  }

  match(type, lexeme) {
    if (this.check(type, lexeme)) { this.advance(); return true; }
    return false;
  }

  expect(type, lexeme, errMsg) {
    if (this.check(type, lexeme)) return this.advance();
    const t = this.cur();
    throw new ParseError(
      errMsg ?? `Expected '${lexeme ?? type}' but got '${t.lexeme || t.type}' (${t.type})`,
      t.line, t.col
    );
  }

  // ── Type specifier ──────────────────────────────────────────────────────────
  parseTypeSpec() {
    const qualifiers = [];
    const TYPE_QUALS = new Set(['const','volatile','signed','unsigned','long','short','inline','static','extern']);
    while (!this.atEnd() && TYPE_QUALS.has(this.cur().lexeme)) {
      qualifiers.push(this.advance().lexeme);
    }
    // Base type
    const BASE_TYPES = new Set(['void','int','char','float','double','bool','auto']);
    let base = 'int';
    if (!this.atEnd()) {
      if (BASE_TYPES.has(this.cur().lexeme)) {
        base = this.advance().lexeme;
      } else if (this.cur().lexeme === 'struct' || this.cur().lexeme === 'union' || this.cur().lexeme === 'enum') {
        const kw = this.advance().lexeme;
        const name = this.check('IDENTIFIER') ? this.advance().lexeme : '';
        base = `${kw} ${name}`.trim();
      } else if (this.check('IDENTIFIER')) {
        // Possibly typedef'd type
        base = this.advance().lexeme;
      }
    }
    // Pointer stars
    let pointers = '';
    while (!this.atEnd() && this.cur().lexeme === '*') { pointers += '*'; this.advance(); }
    const full = [...qualifiers, base].join(' ') + pointers;
    return full;
  }

  // ── Top-level ───────────────────────────────────────────────────────────────
  parseProgram() {
    const body = [];
    while (!this.atEnd()) {
      try {
        body.push(this.parseTopLevel());
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        throw e; // surface first parse error
      }
    }
    return node('Program', { body });
  }

  parseTopLevel() {
    // using namespace ...;
    if (this.check('KEYWORD', 'using')) {
      while (!this.atEnd() && !this.check('PUNCT', ';')) this.advance();
      this.match('PUNCT', ';');
      return node('UsingDecl', {});
    }
    // template <typename T> ...
    if (this.check('KEYWORD', 'template')) {
      while (!this.atEnd() && !this.check('OPERATOR', '>')) this.advance();
      this.match('OPERATOR', '>');
      return this.parseTopLevel();
    }
    // struct / union / class declaration at top level
    if (this.check('KEYWORD', 'struct') || this.check('KEYWORD', 'union') || this.check('KEYWORD', 'class')) {
      return this.parseStructDecl();
    }
    // typedef
    if (this.check('KEYWORD', 'typedef')) {
      return this.parseTypedef();
    }
    // variable or function declaration
    return this.parseDeclaration();
  }

  parseStructDecl() {
    const kw = this.advance().lexeme; // struct | union | class
    let name = '';
    if (this.check('IDENTIFIER')) name = this.advance().lexeme;
    this.expect('PUNCT', '{');
    const fields = [];
    while (!this.atEnd() && !this.check('PUNCT', '}')) {
      // access specifiers: public:, private:, protected:
      if (this.check('KEYWORD', 'public') || this.check('KEYWORD', 'private') || this.check('KEYWORD', 'protected')) {
        this.advance();
        this.match('PUNCT', ':');
        continue;
      }
      // constructor: ClassName(...) { ... }
      if (name && this.check('IDENTIFIER', name)) {
        const cname = this.advance().lexeme;
        if (this.check('PUNCT', '(')) {
          this.expect('PUNCT', '(');
          while (!this.atEnd() && !this.check('PUNCT', ')')) this.advance();
          this.expect('PUNCT', ')');
          const body = this.parseBlock();
          fields.push({ ftype: 'constructor', name: cname, body });
          continue;
        }
      }
      const ftype = this.parseTypeSpec();
      const fname = this.expect('IDENTIFIER', undefined, `Expected field name`).lexeme;
      // method: int area() { ... }
      if (this.check('PUNCT', '(')) {
        this.expect('PUNCT', '(');
        while (!this.atEnd() && !this.check('PUNCT', ')')) this.advance();
        this.expect('PUNCT', ')');
        const body = this.parseBlock();
        fields.push({ ftype, name: fname, body });
        continue;
      }
      // array declarator
      if (this.check('PUNCT', '[')) {
        this.advance();
        let sz = '';
        while (!this.atEnd() && !this.check('PUNCT', ']')) sz += this.advance().lexeme;
        this.expect('PUNCT', ']');
        fields.push({ ftype: `${ftype}[${sz}]`, name: fname });
      } else {
        fields.push({ ftype, name: fname });
      }
      this.expect('PUNCT', ';');
    }
    this.expect('PUNCT', '}');
    this.match('PUNCT', ';');
    return node('StructDecl', { name: `${kw} ${name}`.trim(), fields });
  }

  parseTypedef() {
    this.advance(); // consume 'typedef'
    const base = this.parseTypeSpec();
    const alias = this.check('IDENTIFIER') ? this.advance().lexeme : '';
    this.match('PUNCT', ';');
    return node('Typedef', { base, alias });
  }

  parseDeclaration() {
    const retType = this.parseTypeSpec();
    const name = this.expect('IDENTIFIER', undefined, `Expected identifier after type '${retType}'`).lexeme;

    // Function definition
    if (this.check('PUNCT', '(')) {
      return this.parseFuncDecl(retType, name);
    }

    // Variable declaration
    return this.parseVarDeclRest(retType, name);
  }

  parseFuncDecl(retType, name) {
    this.expect('PUNCT', '(');
    const params = this.parseParams();
    this.expect('PUNCT', ')');

    // Function prototype (no body)
    if (this.check('PUNCT', ';')) { this.advance(); return node('FuncProto', { retType, name, params }); }

    const body = this.parseBlock();
    return node('FuncDecl', { retType, name, params, body });
  }

  parseParams() {
    const params = [];
    if (this.check('PUNCT', ')')) return params;
    if (this.check('KEYWORD', 'void') && this.peek().lexeme === ')') { this.advance(); return params; }

    do {
      if (this.check('OPERATOR', '...')) { this.advance(); params.push({ ptype: '...', name: '...' }); break; }
      const ptype = this.parseTypeSpec();
      let pname = '';
      if (this.check('IDENTIFIER')) pname = this.advance().lexeme;
      params.push({ ptype, name: pname });
    } while (!this.atEnd() && this.match('PUNCT', ','));
    return params;
  }

  parseVarDeclRest(vtype, name) {
    // Direct initialization / constructor call: Type var(args...);
    if (this.match('PUNCT', '(')) {
      const args = [];
      while (!this.atEnd() && !this.check('PUNCT', ')')) {
        args.push(this.parseAssignment());
        this.match('PUNCT', ',');
      }
      this.expect('PUNCT', ')');
      this.expect('PUNCT', ';', `Expected ';' after constructor call`);
      return node('VarDecl', { vtype, name, init: node('Call', { callee: name, args }) });
    }

    // Array
    while (this.match('PUNCT', '[')) {
      let sz = '';
      while (!this.atEnd() && !this.check('PUNCT', ']')) sz += this.advance().lexeme;
      this.expect('PUNCT', ']');
      vtype = `${vtype}[${sz || ''}]`;
    }

    let init = null;
    if (this.match('OPERATOR', '=')) {
      // Array initializer
      if (this.check('PUNCT', '{')) {
        init = this.parseArrayInitializer();
      } else {
        init = this.parseAssignment();
      }
    }
    this.expect('PUNCT', ';', `Expected ';' after variable declaration`);
    return node('VarDecl', { vtype, name, init });
  }

  parseArrayInitializer() {
    this.expect('PUNCT', '{');
    const elements = [];
    while (!this.atEnd() && !this.check('PUNCT', '}')) {
      elements.push(this.parseAssignment());
      this.match('PUNCT', ',');
    }
    this.expect('PUNCT', '}');
    return node('ArrayInit', { elements });
  }

  parseBlock() {
    this.expect('PUNCT', '{');
    const stmts = [];
    while (!this.atEnd() && !this.check('PUNCT', '}')) {
      stmts.push(this.parseStatement());
    }
    this.expect('PUNCT', '}');
    return node('Block', { stmts });
  }

  parseStatement() {
    const t = this.cur();
    // Block
    if (t.lexeme === '{')      return this.parseBlock();
    // If
    if (t.lexeme === 'if')     return this.parseIf();
    // While
    if (t.lexeme === 'while')  return this.parseWhile();
    // For
    if (t.lexeme === 'for')    return this.parseFor();
    // Do-while
    if (t.lexeme === 'do')     return this.parseDoWhile();
    // Return
    if (t.lexeme === 'return') return this.parseReturn();
    // Break / continue
    if (t.lexeme === 'break')  { this.advance(); this.match('PUNCT', ';'); return node('Break', {}); }
    if (t.lexeme === 'continue') { this.advance(); this.match('PUNCT', ';'); return node('Continue', {}); }

    // Variable declaration (starts with a type keyword or known type identifier)
    if (this.looksLikeDeclaration()) return this.parseLocalVarDecl();

    // Expression statement
    const expr = this.parseExpression();
    this.match('PUNCT', ';');
    return node('ExprStmt', { expr });
  }

  looksLikeDeclaration() {
    const TYPE_STARTERS = new Set([
      'int','float','char','double','void','bool','long','short','unsigned',
      'signed','const','static','extern','struct','union','enum','auto','inline','register'
    ]);
    const t = this.cur();
    if (t.type !== 'KEYWORD' && t.type !== 'IDENTIFIER') return false;
    if (TYPE_STARTERS.has(t.lexeme)) {
      // Make sure next non-type token is an identifier (not an operator)
      let i = this.pos + 1;
      while (i < this.tokens.length && TYPE_STARTERS.has(this.tokens[i].lexeme)) i++;
      // Skip pointer stars
      while (i < this.tokens.length && this.tokens[i].lexeme === '*') i++;
      return i < this.tokens.length && this.tokens[i].type === 'IDENTIFIER';
    }
    return false;
  }

  parseLocalVarDecl() {
    const vtype = this.parseTypeSpec();
    const name  = this.expect('IDENTIFIER', undefined, `Expected variable name`).lexeme;
    return this.parseVarDeclRest(vtype, name);
  }

  parseIf() {
    const t = this.advance(); // consume 'if'
    this.expect('PUNCT', '(', `Expected '(' after 'if'`);
    const cond = this.parseExpression();
    this.expect('PUNCT', ')', `Expected ')' after if condition`);
    const then = this.parseStatement();
    let else_ = null;
    if (!this.atEnd() && this.cur().lexeme === 'else') {
      this.advance();
      else_ = this.parseStatement();
    }
    return node('If', { cond, then, else_, line: t.line, col: t.col });
  }

  parseWhile() {
    const t = this.advance();
    this.expect('PUNCT', '(');
    const cond = this.parseExpression();
    this.expect('PUNCT', ')');
    const body = this.parseStatement();
    return node('While', { cond, body, line: t.line });
  }

  parseDoWhile() {
    this.advance(); // do
    const body = this.parseStatement();
    this.expect('KEYWORD', 'while');
    this.expect('PUNCT', '(');
    const cond = this.parseExpression();
    this.expect('PUNCT', ')');
    this.match('PUNCT', ';');
    return node('DoWhile', { body, cond });
  }

  parseFor() {
    const t = this.advance();
    this.expect('PUNCT', '(');

    let init = null;
    if (!this.check('PUNCT', ';')) {
      if (this.looksLikeDeclaration()) {
        init = this.parseLocalVarDecl();
      } else {
        init = node('ExprStmt', { expr: this.parseExpression() });
        this.match('PUNCT', ';');
      }
    } else {
      this.advance();
    }

    let cond = null;
    if (!this.check('PUNCT', ';')) cond = this.parseExpression();
    this.match('PUNCT', ';');

    let update = null;
    if (!this.check('PUNCT', ')')) update = this.parseExpression();
    this.expect('PUNCT', ')');

    const body = this.parseStatement();
    return node('For', { init, cond, update, body, line: t.line });
  }

  parseReturn() {
    const t = this.advance();
    let value = null;
    if (!this.check('PUNCT', ';')) value = this.parseExpression();
    this.match('PUNCT', ';');
    return node('Return', { value, line: t.line, col: t.col });
  }

  // ── Expression hierarchy ────────────────────────────────────────────────────
  parseExpression()  { return this.parseAssignment(); }

  parseAssignment() {
    let left = this.parseTernary();
    const ASSIGN_OPS = new Set(['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>=']);
    if (!this.atEnd() && ASSIGN_OPS.has(this.cur().lexeme)) {
      const op = this.advance().lexeme;
      const right = this.parseAssignment();
      return node('Assign', { target: left, op, value: right });
    }
    return left;
  }

  parseTernary() {
    let cond = this.parseLogicalOr();
    if (!this.atEnd() && this.cur().lexeme === '?') {
      this.advance();
      const then = this.parseExpression();
      this.expect('PUNCT', ':', `Expected ':' in ternary`);
      const else_ = this.parseTernary();
      return node('Ternary', { cond, then, else_ });
    }
    return cond;
  }

  parseLogicalOr()  { return this._leftAssoc(this.parseLogicalAnd.bind(this), ['||']); }
  parseLogicalAnd() { return this._leftAssoc(this.parseBitOr.bind(this), ['&&']); }
  parseBitOr()      { return this._leftAssoc(this.parseBitXor.bind(this), ['|']); }
  parseBitXor()     { return this._leftAssoc(this.parseBitAnd.bind(this), ['^']); }
  parseBitAnd()     { return this._leftAssoc(this.parseEquality.bind(this), ['&']); }
  parseEquality()   { return this._leftAssoc(this.parseRelational.bind(this), ['==','!=']); }
  parseRelational() { return this._leftAssoc(this.parseShift.bind(this), ['<','>','<=','>=']); }
  parseShift()      { return this._leftAssoc(this.parseAdditive.bind(this), ['<<','>>']); }
  parseAdditive()   { return this._leftAssoc(this.parseMult.bind(this), ['+','-']); }
  parseMult()       { return this._leftAssoc(this.parseUnary.bind(this), ['*','/','%']); }

  _leftAssoc(next, ops) {
    let left = next();
    while (!this.atEnd() && ops.includes(this.cur().lexeme)) {
      const op = this.advance().lexeme;
      const right = next();
      left = node('BinOp', { op, left, right });
    }
    return left;
  }

  parseUnary() {
    const UNARY_OPS = new Set(['-','!','~','*','&','++','--']);
    if (!this.atEnd() && UNARY_OPS.has(this.cur().lexeme)) {
      const op = this.advance().lexeme;
      const operand = this.parseUnary();
      return node('UnaryOp', { op, operand });
    }
    if (!this.atEnd() && this.cur().lexeme === 'sizeof') {
      this.advance();
      if (this.check('PUNCT', '(')) {
        this.advance();
        // Could be sizeof(type) or sizeof(expr)
        let inner;
        if (this.looksLikeDeclaration()) {
          inner = this.parseTypeSpec();
          this.expect('PUNCT', ')');
          return node('Sizeof', { arg: inner });
        }
        inner = this.parseExpression();
        this.expect('PUNCT', ')');
        return node('Sizeof', { arg: inner });
      }
      return node('Sizeof', { arg: this.parseUnary() });
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();
    while (!this.atEnd()) {
      if (this.check('OPERATOR', '++') || this.check('OPERATOR', '--')) {
        const op = this.advance().lexeme;
        expr = node('PostfixOp', { op, operand: expr });
      } else if (this.check('PUNCT', '[')) {
        this.advance();
        const idx = this.parseExpression();
        this.expect('PUNCT', ']');
        expr = node('Index', { array: expr, index: idx });
      } else if (this.cur().lexeme === '.' || this.cur().lexeme === '->') {
        const op = this.advance().lexeme;
        const member = this.expect('IDENTIFIER', undefined, `Expected member name after '${op}'`).lexeme;
        expr = node('MemberAccess', { object: expr, op, member });
      } else if (this.cur().lexeme === '(') {
        this.advance();
        const args = [];
        if (!this.check('PUNCT', ')')) {
          do { args.push(this.parseAssignment()); } while (this.match('PUNCT', ','));
        }
        this.expect('PUNCT', ')');
        expr = node('Call', { callee: expr, args });
      } else {
        break;
      }
    }
    return expr;
  }

  parsePrimary() {
    const t = this.cur();
    if (!t || t.type === 'EOF') {
      throw new ParseError(`Unexpected end of input — expected an expression`, t?.line, t?.col);
    }

    // Parenthesized expression or cast
    if (t.type === 'PUNCT' && t.lexeme === '(') {
      this.advance();
      // Cast: (type) expr
      if (this.looksLikeDeclaration()) {
        const castType = this.parseTypeSpec();
        this.expect('PUNCT', ')');
        const operand = this.parseUnary();
        return node('Cast', { castType, operand });
      }
      const expr = this.parseExpression();
      this.expect('PUNCT', ')', `Expected ')' after expression`);
      return expr;
    }

    // Integer literal
    if (t.type === 'INT_LITERAL') {
      this.advance();
      return node('IntLit', { value: t.lexeme, line: t.line, col: t.col });
    }

    // Float literal
    if (t.type === 'FLOAT_LITERAL') {
      this.advance();
      return node('FloatLit', { value: t.lexeme, line: t.line, col: t.col });
    }

    // String literal
    if (t.type === 'STRING_LITERAL') {
      this.advance();
      return node('StringLit', { value: t.lexeme, line: t.line, col: t.col });
    }

    // Char literal
    if (t.type === 'CHAR_LITERAL') {
      this.advance();
      return node('CharLit', { value: t.lexeme, line: t.line, col: t.col });
    }

    // NULL / true / false
    if (t.type === 'IDENTIFIER' && (t.lexeme === 'NULL' || t.lexeme === 'nullptr')) {
      this.advance();
      return node('NullLit', { line: t.line });
    }
    if (t.type === 'KEYWORD' && (t.lexeme === 'true' || t.lexeme === 'false')) {
      this.advance();
      return node('BoolLit', { value: t.lexeme === 'true', line: t.line });
    }

    // Identifier or function call
    if (t.type === 'IDENTIFIER' || ['cout', 'cin', 'endl', 'this'].includes(t.lexeme)) {
      this.advance();
      if (!this.atEnd() && this.cur().lexeme === '(') {
        return this.parseFuncCall(t);
      }
      return node('Ident', { name: t.lexeme, line: t.line, col: t.col });
    }

    throw new ParseError(
      `Unexpected token '${t.lexeme}' (${t.type}) — expected an expression`,
      t.line, t.col
    );
  }

  parseFuncCall(nameTok) {
    this.expect('PUNCT', '(');
    const args = [];
    if (!this.check('PUNCT', ')')) {
      do { args.push(this.parseAssignment()); } while (this.match('PUNCT', ','));
    }
    this.expect('PUNCT', ')', `Expected ')' to close function call`);
    return node('Call', { name: nameTok.lexeme, args, line: nameTok.line, col: nameTok.col });
  }
}

// ── Public entry point ────────────────────────────────────────────────────────
export function parse(tokens) {
  const parser = new Parser(tokens);
  const ast    = parser.parseProgram();
  const astText = astToText(ast).trimEnd();
  return { ast, astText };
}
