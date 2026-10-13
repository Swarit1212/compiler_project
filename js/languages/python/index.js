// ─── Python Language Module ───────────────────────────────────────────────────
// Python tokenizer with INDENT/DEDENT, recursive-descent parser, and full pipeline.

import { LexerError, ParseError, SemanticError } from '../../core/errors.js';
import * as cOptimizer from '../c/optimizer.js';

export const id = 'python';
export const label = 'Python';

const PY_KEYWORDS = new Set([
  'and','as','assert','async','await','break','class','continue','def',
  'del','elif','else','except','False','finally','for','from','global',
  'if','import','in','is','lambda','None','nonlocal','not','or','pass',
  'raise','return','True','try','while','with','yield',
]);

// ─── Examples ─────────────────────────────────────────────────────────────────
export const examples = [
  {
    label: 'A · Fibonacci function',
    code: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(10)
print(result)
`
  },
  {
    label: 'B · Class definition',
    code: `class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

rect = Rectangle(5, 3)
a = rect.area()
`
  },
  {
    label: 'C · Indentation error (syntax)',
    code: `def foo():
    x = 1
  y = 2
    return x + y
`
  },
  {
    label: 'D · Constant folding',
    code: `x = 100 * 25 + 50
y = x * 2
print(y)
`
  },
];

// ─── Lexer with INDENT/DEDENT ─────────────────────────────────────────────────
export const lexer = {
  tokenize(source) {
    const lines   = source.split('\n');
    const tokens  = [];
    const errors  = [];
    const indentStack = [0];
    let lineNum = 0;

    for (const rawLine of lines) {
      lineNum++;
      // Blank or comment-only line
      const stripped = rawLine.trimEnd();
      if (stripped === '' || stripped.trimStart().startsWith('#')) continue;

      // Measure indent
      let indent = 0;
      for (const ch of rawLine) {
        if (ch === ' ')  { indent++; }
        else if (ch === '\t') { indent += 4; }
        else break;
      }

      const top = indentStack[indentStack.length - 1];
      if (indent > top) {
        indentStack.push(indent);
        tokens.push({ type: 'INDENT', lexeme: 'INDENT', line: lineNum, col: 1 });
      } else {
        while (indent < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          tokens.push({ type: 'DEDENT', lexeme: 'DEDENT', line: lineNum, col: 1 });
        }
        if (indent !== indentStack[indentStack.length - 1]) {
          errors.push(new LexerError(`Indentation error: unexpected indent level (${indent} spaces).`, lineNum, 1));
        }
      }

      // Tokenize the content of the line (after stripping comment)
      let content = stripped.replace(/#.*$/, '').trimEnd();
      let pos = indent, col = indent + 1;
      const isD  = c => c >= '0' && c <= '9';
      const isA  = c => /[a-zA-Z_]/.test(c);
      const isAN = c => /[a-zA-Z0-9_]/.test(c);

      while (pos < content.length) {
        // Skip whitespace (within line)
        if (' \t'.includes(content[pos])) { pos++; col++; continue; }
        const c = content[pos];
        const l = lineNum;

        // String
        if (c === '"' || c === "'") {
          const q = c;
          let s = q, i = pos + 1;
          // Triple quote
          if (content.slice(pos, pos+3) === q+q+q) {
            s = q+q+q; i = pos+3;
            while (i < content.length && content.slice(i,i+3) !== q+q+q) s += content[i++];
            s += q+q+q; i += 3;
          } else {
            while (i < content.length && content[i] !== q) { if (content[i]==='\\') {s+=content[i++];} s+=content[i++]; }
            s += q; i++;
          }
          tokens.push({ type:'STRING_LITERAL', lexeme:s, line:l, col });
          col += i - pos; pos = i; continue;
        }
        // f-string prefix
        if ((c === 'f' || c === 'F' || c === 'b' || c === 'r') && pos+1 < content.length && (content[pos+1]==='"'||content[pos+1]==="'")) {
          const p = content[pos]; pos++; col++;
          continue; // simplify: just skip prefix, next iter will handle string
        }
        // Number
        if (isD(c) || (c==='.' && isD(content[pos+1]??''))) {
          let s='', fp=false;
          while (pos<content.length && (isD(content[pos])||content[pos]==='_')) s+=content[pos++];
          if (pos<content.length && content[pos]==='.' && isD(content[pos+1]??'')) { fp=true; s+=content[pos++]; while(pos<content.length&&isD(content[pos]))s+=content[pos++]; }
          if (pos<content.length && (content[pos]==='e'||content[pos]==='E')) { s+=content[pos++]; if(content[pos]==='+'||content[pos]==='-')s+=content[pos++]; while(isD(content[pos]))s+=content[pos++]; fp=true; }
          tokens.push({ type: fp?'FLOAT_LITERAL':'INT_LITERAL', lexeme:s, line:l, col });
          col += s.length; continue;
        }
        // Identifier / keyword
        if (isA(c)) {
          let s=''; const sc=col;
          while (pos<content.length && isAN(content[pos])) { s+=content[pos++]; }
          const type = PY_KEYWORDS.has(s) ? 'KEYWORD' : 'IDENTIFIER';
          tokens.push({ type, lexeme:s, line:l, col:sc });
          col += s.length; continue;
        }
        // Multi-char ops
        const multi = ['**=','//=','>>=','<<=','**','//','>>','<<','==','!=','<=','>=','+=','-=','*=','/=','%=','&=','|=','^=','->','...','~=','@='];
        let found=false;
        for (const op of multi) {
          if (content.startsWith(op, pos)) {
            tokens.push({ type:'OPERATOR', lexeme:op, line:l, col });
            col+=op.length; pos+=op.length; found=true; break;
          }
        }
        if (found) continue;
        // Single char
        const sc = content[pos++];
        if ('+-*/%=<>&|^~!@'.includes(sc)) { tokens.push({ type:'OPERATOR', lexeme:sc, line:l, col }); col++; }
        else if (':,()[]{}.\n;'.includes(sc)) { tokens.push({ type:'PUNCT', lexeme:sc, line:l, col }); col++; }
        else { errors.push(new LexerError(`Unexpected character '${sc}'`, l, col)); col++; }
      }

      // Newline token at end of logical line
      tokens.push({ type: 'NEWLINE', lexeme: '\n', line: lineNum, col: content.length + 1 });
    }

    // Close open indents
    while (indentStack.length > 1) {
      indentStack.pop();
      tokens.push({ type: 'DEDENT', lexeme: 'DEDENT', line: lineNum + 1, col: 1 });
    }
    tokens.push({ type: 'EOF', lexeme: '', line: lineNum, col: 1 });

    if (errors.length) throw errors[0];
    return { tokens };
  }
};

// ─── Parser ───────────────────────────────────────────────────────────────────
export const parser = {
  parse(tokens) {
    const p = new PythonParser(tokens);
    const ast = p.parseModule();
    const astText = pyAstToText(ast).trimEnd();
    return { ast, astText };
  }
};

class PythonParser {
  constructor(tokens) {
    this.tokens = tokens.filter(t => !['NEWLINE','INDENT','DEDENT','EOF'].includes(t.type) ? false : true).length ?
      tokens : tokens;
    // Actually keep all tokens, navigate carefully
    this.all = tokens;
    // Filter to meaningful tokens for expression parsing
    this.flat = tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF');
    this.pos = 0;
    // We'll work with all tokens for block detection
    this.allPos = 0;
  }

  // Simple approach: work with all tokens
  cur()  { return this.all[this.allPos] ?? { type:'EOF', lexeme:'' }; }
  peek(n=1) { return this.all[this.allPos+n] ?? { type:'EOF', lexeme:'' }; }
  adv()  { const t=this.cur(); if(this.allPos<this.all.length)this.allPos++; return t; }
  at()   { return this.allPos >= this.all.length || this.cur().type==='EOF'; }
  skip(type) { while(!this.at()&&this.cur().type===type)this.adv(); }
  match(type, lex) { if(this.cur().type===type&&(lex===undefined||this.cur().lexeme===lex)){this.adv();return true;}return false; }
  expect(type, lex, msg) {
    if(this.cur().type===type&&(lex===undefined||this.cur().lexeme===lex))return this.adv();
    const t=this.cur();
    throw new ParseError(msg??`Expected ${lex??type}, got '${t.lexeme}'`, t.line, t.col);
  }

  parseModule() {
    const stmts = [];
    this.skip('NEWLINE');
    while (!this.at()) {
      if (this.cur().type==='INDENT'||this.cur().type==='DEDENT'||this.cur().type==='NEWLINE') { this.adv(); continue; }
      stmts.push(this.parseStmt());
    }
    return { type:'Module', body: stmts };
  }

  parseStmt() {
    const t = this.cur();
    if (t.lexeme==='def')    return this.parseDef();
    if (t.lexeme==='class')  return this.parseClass();
    if (t.lexeme==='if')     return this.parseIf();
    if (t.lexeme==='while')  return this.parseWhile();
    if (t.lexeme==='for')    return this.parseFor();
    if (t.lexeme==='return') return this.parseReturn();
    if (t.lexeme==='import'||t.lexeme==='from') { while(!this.at()&&this.cur().type!=='NEWLINE')this.adv(); this.skip('NEWLINE'); return {type:'Import'}; }
    if (t.lexeme==='pass')   { this.adv(); this.skip('NEWLINE'); return {type:'Pass'}; }
    if (t.lexeme==='break')  { this.adv(); this.skip('NEWLINE'); return {type:'Break'}; }
    if (t.lexeme==='continue'){this.adv();this.skip('NEWLINE'); return {type:'Continue'}; }
    if (t.lexeme==='global') { this.adv(); while(!this.at()&&this.cur().type!=='NEWLINE')this.adv(); this.skip('NEWLINE'); return {type:'Global'}; }
    if (t.lexeme==='raise')  { this.adv(); const e=this.parseExpr(); this.skip('NEWLINE'); return {type:'Raise',expr:e}; }
    if (t.lexeme==='assert') { this.adv(); const e=this.parseExpr(); this.skip('NEWLINE'); return {type:'Assert',expr:e}; }
    if (t.lexeme==='try')    return this.parseTry();
    if (t.lexeme==='with')   return this.parseWith();
    return this.parseExprStmt();
  }

  parseDef() {
    this.expect('KEYWORD','def');
    const name = this.expect('IDENTIFIER').lexeme;
    this.expect('PUNCT','(');
    const params = this.parseParams();
    this.expect('PUNCT',')');
    // Return annotation
    if (this.match('OPERATOR','->')) { while(!this.at()&&this.cur().lexeme!==':')this.adv(); }
    this.expect('PUNCT',':');
    this.skip('NEWLINE');
    const body = this.parseIndentedBlock();
    return { type:'FuncDef', name, params, body };
  }

  parseParams() {
    const params = [];
    while (!this.at() && !this.check('PUNCT',')')) {
      if (this.cur().lexeme==='*'||this.cur().lexeme==='**') {
        const star=this.adv().lexeme;
        const n=this.check('IDENTIFIER')?this.adv().lexeme:'';
        params.push({ name: star+n, default_: null });
      } else {
        const n=this.expect('IDENTIFIER').lexeme;
        let ann=null, def_=null;
        if (this.match('PUNCT',':')) { while(!this.at()&&!['=',',',')'].includes(this.cur().lexeme))this.adv(); }
        if (this.match('OPERATOR','=')) { def_=this.parseExpr(); }
        params.push({ name:n, default_: def_ });
      }
      if (!this.match('PUNCT',',')) break;
    }
    return params;
  }

  parseClass() {
    this.expect('KEYWORD','class');
    const name = this.expect('IDENTIFIER').lexeme;
    const bases = [];
    if (this.match('PUNCT','(')) {
      while (!this.at()&&!this.check('PUNCT',')')) { bases.push(this.parseExpr()); if(!this.match('PUNCT',','))break; }
      this.match('PUNCT',')');
    }
    this.expect('PUNCT',':');
    this.skip('NEWLINE');
    const body = this.parseIndentedBlock();
    return { type:'ClassDef', name, bases, body };
  }

  parseIndentedBlock() {
    const stmts = [];
    this.expect('INDENT','INDENT',`Expected indented block`);
    while (!this.at() && this.cur().type!=='DEDENT') {
      if (this.cur().type==='NEWLINE') { this.adv(); continue; }
      stmts.push(this.parseStmt());
    }
    this.match('DEDENT','DEDENT');
    return { type:'Block', stmts };
  }

  parseIf() {
    this.expect('KEYWORD','if');
    const cond = this.parseExpr();
    this.expect('PUNCT',':');
    this.skip('NEWLINE');
    const then = this.parseIndentedBlock();
    const elifs = [];
    let else_ = null;
    while (!this.at() && this.cur().lexeme==='elif') {
      this.adv();
      const ec=this.parseExpr(); this.expect('PUNCT',':'); this.skip('NEWLINE');
      elifs.push({ cond:ec, body:this.parseIndentedBlock() });
    }
    if (!this.at() && this.cur().lexeme==='else') {
      this.adv(); this.expect('PUNCT',':'); this.skip('NEWLINE');
      else_ = this.parseIndentedBlock();
    }
    return { type:'If', cond, then, elifs, else_ };
  }

  parseWhile() {
    this.expect('KEYWORD','while');
    const cond = this.parseExpr();
    this.expect('PUNCT',':');
    this.skip('NEWLINE');
    const body = this.parseIndentedBlock();
    return { type:'While', cond, body };
  }

  parseFor() {
    this.expect('KEYWORD','for');
    const target = this.parseExpr();
    this.expect('KEYWORD','in');
    const iter = this.parseExpr();
    this.expect('PUNCT',':');
    this.skip('NEWLINE');
    const body = this.parseIndentedBlock();
    return { type:'For', target, iter, body };
  }

  parseReturn() {
    this.adv();
    let value = null;
    if (!this.at() && this.cur().type!=='NEWLINE' && this.cur().type!=='DEDENT') {
      value = this.parseExpr();
    }
    this.skip('NEWLINE');
    return { type:'Return', value };
  }

  parseTry() {
    this.adv();
    this.expect('PUNCT',':');
    this.skip('NEWLINE');
    const tryBlock = this.parseIndentedBlock();
    const handlers = [];
    while (!this.at() && this.cur().lexeme==='except') {
      this.adv();
      let excType=null, excVar=null;
      if (!this.check('PUNCT',':')) {
        excType = this.parseExpr();
        if (this.match('KEYWORD','as')) excVar=this.expect('IDENTIFIER').lexeme;
      }
      this.expect('PUNCT',':'); this.skip('NEWLINE');
      handlers.push({ excType, excVar, body:this.parseIndentedBlock() });
    }
    let finally_=null;
    if (!this.at() && this.cur().lexeme==='finally') { this.adv(); this.expect('PUNCT',':'); this.skip('NEWLINE'); finally_=this.parseIndentedBlock(); }
    return { type:'Try', tryBlock, handlers, finally_ };
  }

  parseWith() {
    this.adv();
    const ctx = this.parseExpr();
    let asVar = null;
    if (this.match('KEYWORD','as')) asVar=this.expect('IDENTIFIER').lexeme;
    this.expect('PUNCT',':'); this.skip('NEWLINE');
    const body = this.parseIndentedBlock();
    return { type:'With', ctx, asVar, body };
  }

  parseExprStmt() {
    const expr = this.parseExpr();
    // Check for assignment
    if (!this.at() && this.cur().type==='OPERATOR' && ['=','+=','-=','*=','/=','//=','**=','%=','&=','|=','^=','>>=','<<='].includes(this.cur().lexeme)) {
      const op = this.adv().lexeme;
      const value = this.parseExpr();
      this.skip('NEWLINE');
      return { type:'Assign', target:expr, op, value };
    }
    this.skip('NEWLINE');
    return { type:'ExprStmt', expr };
  }

  check(type,lex) { const t=this.cur(); return t.type===type&&(lex===undefined||t.lexeme===lex); }

  // ── Expression parsing ───────────────────────────────────────────────────────
  parseExpr()    { return this.parseLambda(); }
  parseLambda() {
    if (this.cur().lexeme==='lambda') {
      this.adv();
      const params=[];
      while(!this.at()&&!this.check('PUNCT',':')){ const n=this.adv().lexeme; params.push(n); this.match('PUNCT',','); }
      this.expect('PUNCT',':');
      const body=this.parseTernary();
      return { type:'Lambda', params, body };
    }
    return this.parseTernary();
  }
  parseTernary() {
    let v=this.parseOr();
    if (!this.at()&&this.cur().lexeme==='if') {
      this.adv(); const c=this.parseOr(); this.expect('KEYWORD','else'); const e=this.parseTernary();
      v={ type:'Ternary', value:v, cond:c, else_:e };
    }
    return v;
  }
  parseOr()  { return this._la(this.parseAnd.bind(this),['or']); }
  parseAnd() { return this._la(this.parseNot.bind(this),['and']); }
  parseNot() {
    if (this.cur().lexeme==='not') { this.adv(); return { type:'UnaryOp', op:'not', operand:this.parseNot() }; }
    return this.parseComp();
  }
  parseComp() {
    let l=this.parseBitOr();
    while (!this.at()) {
      const lex=this.cur().lexeme;
      if (['==','!=','<','>','<=','>='].includes(lex)) { const op=this.adv().lexeme; l={ type:'BinOp',op,left:l,right:this.parseBitOr() }; }
      else if (lex==='in'||lex==='is') {
        let op=this.adv().lexeme;
        if (this.cur().lexeme==='not') { this.adv(); op+=' not'; }
        l={ type:'BinOp',op,left:l,right:this.parseBitOr() };
      }
      else if (lex==='not'&&this.peek().lexeme==='in') { this.adv();this.adv(); l={ type:'BinOp',op:'not in',left:l,right:this.parseBitOr() }; }
      else break;
    }
    return l;
  }
  parseBitOr()  { return this._la(this.parseBitXor.bind(this)  ,['|']); }
  parseBitXor() { return this._la(this.parseBitAnd.bind(this)  ,['^']); }
  parseBitAnd() { return this._la(this.parseShift.bind(this)   ,['&']); }
  parseShift()  { return this._la(this.parseAdd.bind(this)     ,['<<','>>']); }
  parseAdd()    { return this._la(this.parseMul.bind(this)     ,['+','-']); }
  parseMul()    { return this._la(this.parseUnary.bind(this)   ,['*','/','//','%','@']); }
  _la(next,ops) {
    let l=next();
    while(!this.at()&&ops.includes(this.cur().lexeme)){const op=this.adv().lexeme;l={type:'BinOp',op,left:l,right:next()};}
    return l;
  }
  parseUnary() {
    if (['-','~','+'].includes(this.cur().lexeme)) { const op=this.adv().lexeme; return {type:'UnaryOp',op,operand:this.parseUnary()}; }
    return this.parsePower();
  }
  parsePower() {
    let base=this.parsePostfix();
    if (!this.at()&&this.cur().lexeme==='**') { this.adv(); const exp=this.parseUnary(); base={type:'BinOp',op:'**',left:base,right:exp}; }
    return base;
  }
  parsePostfix() {
    let e=this.parsePrimary();
    while (true) {
      if (!this.at()&&this.cur().lexeme==='(') {
        this.adv(); const args=[];
        while (!this.at()&&!this.check('PUNCT',')')) { args.push(this.parseExpr()); if(!this.match('PUNCT',','))break; }
        this.match('PUNCT',')');
        e={type:'Call',callee:e,args};
      } else if (!this.at()&&this.cur().lexeme==='[') {
        this.adv(); const idx=this.parseExpr(); this.match('PUNCT',']');
        e={type:'Index',array:e,index:idx};
      } else if (!this.at()&&this.cur().lexeme==='.') {
        this.adv(); const attr=this.expect('IDENTIFIER').lexeme;
        e={type:'Attr',object:e,attr};
      } else break;
    }
    return e;
  }
  parsePrimary() {
    const t=this.cur();
    if (!t||t.type==='EOF'||t.type==='NEWLINE'||t.type==='DEDENT') throw new ParseError(`Unexpected end of expression`,t?.line,t?.col);
    if (t.lexeme==='(') {
      this.adv(); const e=this.parseExpr(); this.match('PUNCT',')'); return e;
    }
    if (t.lexeme==='[') {
      this.adv(); const items=[];
      while (!this.at()&&!this.check('PUNCT',']')) { items.push(this.parseExpr()); if(!this.match('PUNCT',','))break; }
      this.match('PUNCT',']');
      return { type:'List', items };
    }
    if (t.lexeme==='{') {
      this.adv(); const pairs=[];
      while (!this.at()&&!this.check('PUNCT','}')) {
        const k=this.parseExpr(); this.match('PUNCT',':'); const v=this.parseExpr();
        pairs.push([k,v]); if(!this.match('PUNCT',','))break;
      }
      this.match('PUNCT','}');
      return { type:'Dict', pairs };
    }
    if (t.type==='INT_LITERAL')    { this.adv(); return {type:'IntLit',   value:t.lexeme, line:t.line}; }
    if (t.type==='FLOAT_LITERAL')  { this.adv(); return {type:'FloatLit', value:t.lexeme, line:t.line}; }
    if (t.type==='STRING_LITERAL') { this.adv(); return {type:'StringLit',value:t.lexeme, line:t.line}; }
    if (t.lexeme==='True'||t.lexeme==='False') { this.adv(); return {type:'BoolLit', value:t.lexeme==='True'}; }
    if (t.lexeme==='None') { this.adv(); return {type:'NoneLit'}; }
    if (t.type==='IDENTIFIER') {
      this.adv(); return {type:'Ident',name:t.lexeme,line:t.line,col:t.col};
    }
    if (t.type==='KEYWORD') {
      this.adv(); return {type:'Ident',name:t.lexeme,line:t.line};
    }
    throw new ParseError(`Unexpected token '${t.lexeme}' (${t.type})`,t.line,t.col);
  }
}

// ─── AST text ─────────────────────────────────────────────────────────────────
function pyAstToText(n, prefix='', isLast=true) {
  if (!n||typeof n!=='object') return '';
  const con=isLast?'└─ ':'├─ ', cp=prefix+(isLast?'   ':'│  ');
  switch (n.type) {
    case 'Module':
      return `Module\n`+(n.body||[]).map((s,i)=>pyAstToText(s,'',i===n.body.length-1)).join('');
    case 'FuncDef': {
      const ps=(n.params||[]).map(p=>p.name).join(', ');
      return `${prefix}${con}FuncDef ${n.name}(${ps})\n`+pyAstToText(n.body,cp,true);
    }
    case 'ClassDef':
      return `${prefix}${con}ClassDef ${n.name}\n`+pyAstToText(n.body,cp,true);
    case 'Block':
      return `${prefix}${con}Block\n`+(n.stmts||[]).map((s,i)=>pyAstToText(s,cp,i===n.stmts.length-1)).join('');
    case 'Assign':
      return `${prefix}${con}Assign (${n.op})\n${pyAstToText(n.target,cp,false)}${pyAstToText(n.value,cp,true)}`;
    case 'ExprStmt': return pyAstToText(n.expr,prefix,isLast);
    case 'If':
      return `${prefix}${con}If\n${pyAstToText(n.cond,cp,false)}${pyAstToText(n.then,cp,!n.else_&&!n.elifs?.length)}${n.else_?pyAstToText(n.else_,cp,true):''}`;
    case 'While':
      return `${prefix}${con}While\n${pyAstToText(n.cond,cp,false)}${pyAstToText(n.body,cp,true)}`;
    case 'For':
      return `${prefix}${con}For ${n.target?.name??'?'} in (iter)\n${pyAstToText(n.body,cp,true)}`;
    case 'Return':
      return `${prefix}${con}Return\n${n.value?pyAstToText(n.value,cp,true):''}`;
    case 'BinOp':
      return `${prefix}${con}BinOp (${n.op})\n${pyAstToText(n.left,cp,false)}${pyAstToText(n.right,cp,true)}`;
    case 'UnaryOp':
      return `${prefix}${con}UnaryOp (${n.op})\n${pyAstToText(n.operand,cp,true)}`;
    case 'Call':
      return `${prefix}${con}Call ${n.callee?.name??'(expr)'}\n`+(n.args||[]).map((a,i)=>pyAstToText(a,cp,i===n.args.length-1)).join('');
    case 'Attr':
      return `${prefix}${con}Attr .${n.attr}\n${pyAstToText(n.object,cp,true)}`;
    case 'Ident':     return `${prefix}${con}Ident ${n.name}\n`;
    case 'IntLit':    return `${prefix}${con}IntLit ${n.value}\n`;
    case 'FloatLit':  return `${prefix}${con}FloatLit ${n.value}\n`;
    case 'StringLit': return `${prefix}${con}StringLit ${n.value}\n`;
    case 'BoolLit':   return `${prefix}${con}BoolLit ${n.value}\n`;
    case 'NoneLit':   return `${prefix}${con}None\n`;
    case 'List':      return `${prefix}${con}List[${n.items?.length??0}]\n`;
    case 'Dict':      return `${prefix}${con}Dict{${n.pairs?.length??0}}\n`;
    default:          return `${prefix}${con}${n.type}\n`;
  }
}

// ─── Semantic ──────────────────────────────────────────────────────────────────
export const semantic = {
  analyze(ast) {
    const symbolTable=[], checks=[], warnings=[];
    const scopes = [{ name:'module', syms:new Map() }];
    const cur = ()=>scopes[scopes.length-1];
    const define = (name,kind,type,scope,value=null)=>{
      cur().syms.set(name,{name,kind,type,scope,value});
    };
    const lookup = name => {
      for (let i=scopes.length-1;i>=0;i--) { if(scopes[i].syms.has(name))return scopes[i].syms.get(name); }
      return null;
    };
    const inferType = n=>{
      if(!n)return null;
      if(n.type==='IntLit')return 'int';
      if(n.type==='FloatLit')return 'float';
      if(n.type==='StringLit')return 'str';
      if(n.type==='BoolLit')return 'bool';
      if(n.type==='NoneLit')return 'None';
      if(n.type==='List')return 'list';
      if(n.type==='Dict')return 'dict';
      if(n.type==='BinOp'){
        const l=inferType(n.left),r=inferType(n.right);
        if(['==','!=','<','>','<=','>=','and','or','not','in','is'].includes(n.op))return 'bool';
        if(l==='float'||r==='float')return 'float';
        if(l==='str'&&n.op==='+')return 'str';
        return l||r||'unknown';
      }
      if(n.type==='Ident'){const s=lookup(n.name);return s?.type??'unknown';}
      return null;
    };

    function visitNode(n,scope) {
      if(!n||typeof n!=='object')return;
      switch(n.type){
        case 'Module': (n.body||[]).forEach(s=>visitNode(s,'module')); collectSymbols('module'); break;
        case 'FuncDef':
          define(n.name,'function',`function`,scope);
          scopes.push({name:n.name,syms:new Map()});
          (n.params||[]).forEach(p=>{ if(!p.name.startsWith('*'))define(p.name,'parameter','unknown',n.name); });
          visitNode(n.body,n.name);
          checks.push(`Function '${n.name}' defined with ${n.params?.length??0} parameter(s).`);
          collectSymbols(n.name);
          scopes.pop();
          break;
        case 'ClassDef':
          define(n.name,'class',n.name,scope);
          scopes.push({name:n.name,syms:new Map()});
          visitNode(n.body,n.name);
          collectSymbols(n.name);
          scopes.pop();
          break;
        case 'Block': (n.stmts||[]).forEach(s=>visitNode(s,scope)); break;
        case 'Assign': {
          const vType=inferType(n.value);
          const targetName=n.target?.name??n.target?.attr;
          if(targetName){
            const existing=lookup(targetName);
            if(existing&&existing.type!=='unknown'&&vType&&existing.type!==vType&&!['unknown',null].includes(vType)){
              warnings.push(`Variable '${targetName}' previously inferred as '${existing.type}', now assigned '${vType}'.`);
            }
            define(targetName,'variable',vType??'unknown',scope,inferLit(n.value));
            checks.push(`Variable '${targetName}' assigned type '${vType??'unknown'}' in scope '${scope}'.`);
          }
          break;
        }
        case 'ExprStmt': visitNode(n.expr,scope); break;
        case 'If': visitNode(n.then,scope); (n.elifs||[]).forEach(e=>visitNode(e.body,scope)); if(n.else_)visitNode(n.else_,scope); break;
        case 'While': visitNode(n.body,scope); break;
        case 'For': {
          const tname=n.target?.name;
          if(tname)define(tname,'variable','unknown',scope);
          visitNode(n.body,scope);
          break;
        }
        default: break;
      }
    }
    function collectSymbols(scope) {
      const s=scopes[scopes.length-1];
      for(const sym of s.syms.values()){
        symbolTable.push({name:sym.name,kind:sym.kind,type:sym.type,scope:sym.scope,value:sym.value??'—'});
      }
    }
    function inferLit(n) {
      if(!n)return null;
      if(n.type==='IntLit'||n.type==='FloatLit')return String(n.value);
      if(n.type==='BoolLit')return String(n.value);
      if(n.type==='StringLit')return n.value;
      return null;
    }

    visitNode(ast,'module');
    return {symbolTable,checks,warnings};
  }
};

// ─── IR ───────────────────────────────────────────────────────────────────────
export const ir = {
  generate(ast) {
    const instrs=[]; let tc=0,lc=0;
    const tmp=()=>`t${++tc}`, lbl=()=>`L${++lc}`;
    const emit=s=>instrs.push(s);

    function visitNode(n) {
      if(!n)return '_';
      switch(n.type){
        case 'Module': (n.body||[]).forEach(visitStmt); return null;
        case 'FuncDef':
          emit(`func_begin ${n.name}`);
          (n.params||[]).forEach(p=>{if(!p.name.startsWith('*'))emit(`param_receive ${p.name}`);});
          visitStmt(n.body);
          emit(`return`);
          emit(`func_end ${n.name}`);
          return null;
        case 'ClassDef': (n.body?.stmts||[]).filter(s=>s.type==='FuncDef').forEach(visitNode); return null;
        default: return visitStmt(n);
      }
    }
    function visitStmt(s) {
      if(!s)return;
      if(s.type==='Block'){(s.stmts||[]).forEach(visitStmt);return;}
      if(s.type==='Assign'){const r=visitExpr(s.value);const tgt=s.target?.name??s.target?.attr??'_';emit(`${tgt} = ${r}`);return;}
      if(s.type==='ExprStmt'){visitExpr(s.expr);return;}
      if(s.type==='Return'){if(s.value){const v=visitExpr(s.value);emit(`return ${v}`);}else emit('return');return;}
      if(s.type==='If'){
        const c=visitExpr(s.cond),lt=lbl(),lf=lbl();
        emit(`if ${c} goto ${lt}`);emit(`goto ${lf}`);emit(`${lt}:`);visitStmt(s.then);
        if(s.else_){const le=lbl();emit(`goto ${le}`);emit(`${lf}:`);visitStmt(s.else_);emit(`${le}:`);}else emit(`${lf}:`);
      }
      if(s.type==='While'){
        const top=lbl(),ex=lbl();
        emit(`${top}:`);const c=visitExpr(s.cond);emit(`if_false ${c} goto ${ex}`);visitStmt(s.body);emit(`goto ${top}`);emit(`${ex}:`);
      }
      if(s.type==='For'){
        const it=visitExpr(s.iter),idx=tmp(),top=lbl(),ex=lbl();
        emit(`${idx} = 0`);emit(`${top}:`);
        const len=tmp();emit(`${len} = len(${it})`);
        const cond=tmp();emit(`${cond} = ${idx} < ${len}`);
        emit(`if_false ${cond} goto ${ex}`);
        const tgt=s.target?.name??'_';emit(`${tgt} = ${it}[${idx}]`);
        visitStmt(s.body);emit(`${idx} = ${idx} + 1`);emit(`goto ${top}`);emit(`${ex}:`);
      }
    }
    function visitExpr(n) {
      if(!n)return '_';
      if(n.type==='IntLit'||n.type==='FloatLit')return n.value;
      if(n.type==='BoolLit')return n.value?'True':'False';
      if(n.type==='StringLit')return n.value;
      if(n.type==='NoneLit')return 'None';
      if(n.type==='Ident')return n.name;
      if(n.type==='BinOp'){const l=visitExpr(n.left),r=visitExpr(n.right),t=tmp();emit(`${t} = ${l} ${n.op} ${r}`);return t;}
      if(n.type==='UnaryOp'){const v=visitExpr(n.operand),t=tmp();emit(`${t} = ${n.op} ${v}`);return t;}
      if(n.type==='Call'){
        const callee=n.callee?.name??visitExpr(n.callee);
        (n.args||[]).forEach(a=>{const v=visitExpr(a);emit(`param ${v}`);});
        const t=tmp();emit(`${t} = call ${callee}, ${n.args?.length??0}`);return t;
      }
      if(n.type==='Attr'){const o=visitExpr(n.object),t=tmp();emit(`${t} = ${o}.${n.attr}`);return t;}
      if(n.type==='Index'){const a=visitExpr(n.array),i=visitExpr(n.index),t=tmp();emit(`${t} = ${a}[${i}]`);return t;}
      if(n.type==='List'){const t=tmp();emit(`${t} = []`);(n.items||[]).forEach(i=>{const v=visitExpr(i);emit(`${t}.append(${v})`);});return t;}
      return '_';
    }

    visitNode(ast);
    return { instructions: instrs };
  }
};

export const optimizer = { optimize: instrs=>cOptimizer.optimize(instrs) };

export const codegen = {
  generate(tac) {
    const out=[]; out.push('; CPython-style educational bytecode');out.push('');
    for(const instr of tac){
      if(/^func_begin\s/.test(instr)){out.push(`\nCODE ${instr.replace('func_begin ','')}`);continue;}
      if(/^func_end/.test(instr)){out.push(`  RETURN_VALUE`);out.push('');continue;}
      if(/^param_receive\s/.test(instr)){out.push(`  STORE_NAME  '${instr.split(' ')[1]}'`);continue;}
      if(/^param\s/.test(instr)){const v=instr.split(' ')[1];out.push(`  LOAD_${/^['"]/.test(v)?'CONST':'NAME'} ${v}`);continue;}
      if(/^return\s+/.test(instr)){out.push(`  LOAD_NAME   ${instr.split(' ')[1]}`);out.push(`  RETURN_VALUE`);continue;}
      if(/^return$/.test(instr)){out.push(`  LOAD_CONST  None`);out.push(`  RETURN_VALUE`);continue;}
      if(/^if_false\s/.test(instr)){const[,c,,l]=instr.split(' ');out.push(`  LOAD_NAME   ${c}`);out.push(`  POP_JUMP_IF_FALSE ${l}`);continue;}
      if(/^if\s/.test(instr)){const[,c,,l]=instr.split(' ');out.push(`  LOAD_NAME   ${c}`);out.push(`  POP_JUMP_IF_TRUE ${l}`);continue;}
      if(/^goto\s/.test(instr)){out.push(`  JUMP_ABSOLUTE ${instr.split(' ')[1]}`);continue;}
      if(/^\w+:$/.test(instr)){out.push(`${instr}`);continue;}
      const bm=/^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|<>=!]+)\s+(\S+)$/.exec(instr);
      if(bm){
        const[,dst,l,op,r]=bm;
        const load=v=>/^-?\d/.test(v)?`  LOAD_CONST  ${v}`:`  LOAD_NAME   ${v}`;
        const opMap={'+':'BINARY_ADD','-':'BINARY_SUBTRACT','*':'BINARY_MULTIPLY','/':'BINARY_TRUE_DIVIDE','//':'BINARY_FLOOR_DIVIDE','%':'BINARY_MODULO','**':'BINARY_POWER','&':'BINARY_AND','|':'BINARY_OR','^':'BINARY_XOR','<<':'BINARY_LSHIFT','>>':'BINARY_RSHIFT'};
        out.push(load(l));out.push(load(r));out.push(`  ${opMap[op]??'BINARY_OP'}`);out.push(`  STORE_NAME  ${dst}`);
        continue;
      }
      const cm=/^(\S+)\s*=\s*(\S+)$/.exec(instr);
      if(cm){out.push(`  LOAD_${/^-?\d|^['"]/.test(cm[2])?'CONST':'NAME'}  ${cm[2]}`);out.push(`  STORE_NAME  ${cm[1]}`);continue;}
      out.push(`  ; ${instr}`);
    }
    return { targetLabel:'CPython-style educational bytecode', instructions:out };
  }
};
