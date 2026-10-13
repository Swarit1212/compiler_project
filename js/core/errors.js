// ─── Error hierarchy ──────────────────────────────────────────────────────────

export class CompilerError extends Error {
  constructor(message, phase, line = null, col = null) {
    super(message);
    this.name = 'CompilerError';
    this.phase = phase;
    this.line = line;
    this.col = col;
  }
  toDiagnostic() {
    return {
      id: `${this.phase}-${this.line ?? 0}-${this.col ?? 0}`,
      phase: this.phase,
      category: 'error',
      message: this.message,
      line: this.line,
      col: this.col,
      explanation: ''
    };
  }
}

export class LexerError extends CompilerError {
  constructor(message, line, col) {
    super(message, 'lexical', line, col);
    this.name = 'LexerError';
  }
}

export class ParseError extends CompilerError {
  constructor(message, line, col) {
    super(message, 'syntax', line, col);
    this.name = 'ParseError';
  }
}

export class SemanticError extends CompilerError {
  constructor(message, line = null, col = null, explanation = '') {
    super(message, 'semantic', line, col);
    this.name = 'SemanticError';
    this.explanation = explanation;
  }
  toDiagnostic() {
    const d = super.toDiagnostic();
    d.explanation = this.explanation;
    return d;
  }
}

export class IRError extends CompilerError {
  constructor(message) {
    super(message, 'intermediate');
    this.name = 'IRError';
  }
}

export class CodeGenError extends CompilerError {
  constructor(message) {
    super(message, 'target');
    this.name = 'CodeGenError';
  }
}
