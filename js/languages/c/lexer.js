// ─── C Lexer ──────────────────────────────────────────────────────────────────
// Full character-by-character tokenizer for C source code.

import { LexerError } from '../../core/errors.js';

export const C_KEYWORDS = new Set([
  'auto','break','case','char','const','continue','default','do','double',
  'else','enum','extern','float','for','goto','if','inline','int','long',
  'register','restrict','return','short','signed','sizeof','static','struct',
  'switch','typedef','union','unsigned','void','volatile','while',
  // Common C standard
  'NULL','true','false','bool',
]);

const isDigit  = c => c >= '0' && c <= '9';
const isAlpha  = c => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
const isAlNum  = c => isAlpha(c) || isDigit(c);
const isHexDig = c => isDigit(c) || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F');

// Multi-character operators (sorted longest first for greedy matching)
const MULTI_OPS = [
  '>>>=','<<=','>>=',
  '&&=','||=',
  '===','!==',
  '<<','>>','++','--','+=','-=','*=','/=','%=','&=','|=','^=',
  '==','!=','<=','>=','&&','||','->','...',
];
const SINGLE_PUNCTS = new Set(['+','-','*','/','%','=','<','>','&','|','^','~','!','?',
                                '(',')','{','}','[',']',';',',','.',':', '#']);

class Lexer {
  constructor(source) {
    this.src   = source;
    this.pos   = 0;
    this.line  = 1;
    this.col   = 1;
    this.tokens = [];
    this.errors = [];
  }

  cur()         { return this.src[this.pos] ?? ''; }
  peek(n = 1)   { return this.src[this.pos + n] ?? ''; }
  atEnd()       { return this.pos >= this.src.length; }

  advance() {
    const c = this.src[this.pos++];
    if (c === '\n') { this.line++; this.col = 1; } else { this.col++; }
    return c;
  }

  emit(type, lexeme, line, col) {
    this.tokens.push({ type, lexeme, line, col });
  }

  tokenize() {
    while (!this.atEnd()) {
      this.skipWhitespace();
      if (this.atEnd()) break;
      const line = this.line, col = this.col;
      const c = this.cur();

      // Line comment
      if (c === '/' && this.peek() === '/') { this.skipLineComment(); continue; }
      // Block comment
      if (c === '/' && this.peek() === '*') { this.skipBlockComment(); continue; }
      // Preprocessor directive
      if (c === '#') { this.skipPreprocessor(); continue; }
      // String literal
      if (c === '"')  { this.readString(line, col); continue; }
      // Char literal
      if (c === "'")  { this.readChar(line, col); continue; }
      // Hex literal
      if (c === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
        this.readHex(line, col); continue;
      }
      // Number
      if (isDigit(c)) { this.readNumber(line, col); continue; }
      // Identifier / keyword
      if (isAlpha(c)) { this.readIdentifier(line, col); continue; }
      // Operators & punctuation
      this.readOperator(line, col);
    }

    this.emit('EOF', '', this.line, this.col);
    return { tokens: this.tokens, errors: this.errors };
  }

  skipWhitespace() {
    while (!this.atEnd() && ' \t\r\n'.includes(this.cur())) this.advance();
  }

  skipLineComment() {
    while (!this.atEnd() && this.cur() !== '\n') this.advance();
  }

  skipBlockComment() {
    this.advance(); this.advance(); // consume /*
    const startLine = this.line, startCol = this.col;
    while (!this.atEnd()) {
      if (this.cur() === '*' && this.peek() === '/') { this.advance(); this.advance(); return; }
      this.advance();
    }
    this.errors.push(new LexerError('Unterminated block comment', startLine, startCol));
  }

  skipPreprocessor() {
    while (!this.atEnd() && this.cur() !== '\n') this.advance();
  }

  readString(line, col) {
    this.advance(); // consume "
    let s = '"';
    while (!this.atEnd() && this.cur() !== '"') {
      if (this.cur() === '\n') {
        this.errors.push(new LexerError('Unterminated string literal', line, col));
        break;
      }
      if (this.cur() === '\\') { s += this.advance(); }
      s += this.advance();
    }
    if (!this.atEnd()) { s += '"'; this.advance(); }
    this.emit('STRING_LITERAL', s, line, col);
  }

  readChar(line, col) {
    this.advance(); // consume '
    let s = "'";
    while (!this.atEnd() && this.cur() !== "'") {
      if (this.cur() === '\\') { s += this.advance(); }
      s += this.advance();
    }
    if (!this.atEnd()) { s += "'"; this.advance(); }
    this.emit('CHAR_LITERAL', s, line, col);
  }

  readHex(line, col) {
    let s = this.advance() + this.advance(); // 0x
    while (!this.atEnd() && isHexDig(this.cur())) s += this.advance();
    this.emit('INT_LITERAL', s, line, col);
  }

  readNumber(line, col) {
    let s = '';
    while (!this.atEnd() && isDigit(this.cur())) s += this.advance();
    if (!this.atEnd() && this.cur() === '.' && isDigit(this.peek())) {
      s += this.advance();
      while (!this.atEnd() && isDigit(this.cur())) s += this.advance();
      // Scientific notation
      if (!this.atEnd() && (this.cur() === 'e' || this.cur() === 'E')) {
        s += this.advance();
        if (!this.atEnd() && (this.cur() === '+' || this.cur() === '-')) s += this.advance();
        while (!this.atEnd() && isDigit(this.cur())) s += this.advance();
      }
      // Suffixes
      if (!this.atEnd() && (this.cur() === 'f' || this.cur() === 'F')) s += this.advance();
      this.emit('FLOAT_LITERAL', s, line, col);
    } else {
      // Integer suffixes: u, l, ul, ll, ull
      while (!this.atEnd() && 'uUlL'.includes(this.cur())) s += this.advance();
      this.emit('INT_LITERAL', s, line, col);
    }
  }

  readIdentifier(line, col) {
    let s = '';
    while (!this.atEnd() && isAlNum(this.cur())) s += this.advance();
    const type = C_KEYWORDS.has(s) ? 'KEYWORD' : 'IDENTIFIER';
    this.emit(type, s, line, col);
  }

  readOperator(line, col) {
    // Try multi-char operators first
    for (const op of MULTI_OPS) {
      if (this.src.startsWith(op, this.pos)) {
        for (let i = 0; i < op.length; i++) this.advance();
        const type = '+-*/%=<>&|^~!?'.includes(op[0]) ? 'OPERATOR' : 'PUNCT';
        this.emit(/[;,.()\[\]{}:]/.test(op) ? 'PUNCT' : 'OPERATOR', op, line, col);
        return;
      }
    }
    // Single character
    const c = this.advance();
    if (SINGLE_PUNCTS.has(c)) {
      const type = /[;,()\[\]{}:]/.test(c) ? 'PUNCT' : 'OPERATOR';
      this.emit(type, c, line, col);
    } else {
      this.errors.push(new LexerError(`Unexpected character '${c}'`, line, col));
    }
  }
}

export function tokenize(source) {
  const lex = new Lexer(source);
  const { tokens, errors } = lex.tokenize();
  if (errors.length > 0) throw errors[0]; // surface first error
  return { tokens };
}
