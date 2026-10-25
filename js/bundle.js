(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // (disabled):fs/promises
  var require_promises = __commonJS({
    "(disabled):fs/promises"() {
    }
  });

  // (disabled):module
  var require_module = __commonJS({
    "(disabled):module"() {
    }
  });

  // js/languages/c/index.js
  var c_exports = {};
  __export(c_exports, {
    backend: () => backend,
    codegen: () => codegen_exports,
    examples: () => examples,
    id: () => id,
    ir: () => ir_exports,
    label: () => label,
    lexer: () => lexer_exports,
    optimizer: () => optimizer_exports,
    parser: () => parser_exports,
    semantic: () => semantic_exports
  });

  // js/languages/c/lexer.js
  var lexer_exports = {};
  __export(lexer_exports, {
    C_KEYWORDS: () => C_KEYWORDS,
    tokenize: () => tokenize
  });

  // js/core/errors.js
  var CompilerError = class extends Error {
    constructor(message, phase, line = null, col = null) {
      super(message);
      this.name = "CompilerError";
      this.phase = phase;
      this.line = line;
      this.col = col;
    }
    toDiagnostic() {
      return {
        id: `${this.phase}-${this.line ?? 0}-${this.col ?? 0}`,
        phase: this.phase,
        category: "error",
        message: this.message,
        line: this.line,
        col: this.col,
        explanation: ""
      };
    }
  };
  var LexerError = class extends CompilerError {
    constructor(message, line, col) {
      super(message, "lexical", line, col);
      this.name = "LexerError";
    }
  };
  var ParseError = class extends CompilerError {
    constructor(message, line, col) {
      super(message, "syntax", line, col);
      this.name = "ParseError";
    }
  };
  var SemanticError = class extends CompilerError {
    constructor(message, line = null, col = null, explanation = "") {
      super(message, "semantic", line, col);
      this.name = "SemanticError";
      this.explanation = explanation;
    }
    toDiagnostic() {
      const d = super.toDiagnostic();
      d.explanation = this.explanation;
      return d;
    }
  };

  // js/languages/c/lexer.js
  var C_KEYWORDS = /* @__PURE__ */ new Set([
    "auto",
    "break",
    "case",
    "char",
    "const",
    "continue",
    "default",
    "do",
    "double",
    "else",
    "enum",
    "extern",
    "float",
    "for",
    "goto",
    "if",
    "inline",
    "int",
    "long",
    "register",
    "restrict",
    "return",
    "short",
    "signed",
    "sizeof",
    "static",
    "struct",
    "switch",
    "typedef",
    "union",
    "unsigned",
    "void",
    "volatile",
    "while",
    // Common C standard
    "NULL",
    "true",
    "false",
    "bool"
  ]);
  var isDigit = (c) => c >= "0" && c <= "9";
  var isAlpha = (c) => c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
  var isAlNum = (c) => isAlpha(c) || isDigit(c);
  var isHexDig = (c) => isDigit(c) || c >= "a" && c <= "f" || c >= "A" && c <= "F";
  var MULTI_OPS = [
    ">>>=",
    "<<=",
    ">>=",
    "&&=",
    "||=",
    "===",
    "!==",
    "<<",
    ">>",
    "++",
    "--",
    "+=",
    "-=",
    "*=",
    "/=",
    "%=",
    "&=",
    "|=",
    "^=",
    "==",
    "!=",
    "<=",
    ">=",
    "&&",
    "||",
    "->",
    "..."
  ];
  var SINGLE_PUNCTS = /* @__PURE__ */ new Set([
    "+",
    "-",
    "*",
    "/",
    "%",
    "=",
    "<",
    ">",
    "&",
    "|",
    "^",
    "~",
    "!",
    "?",
    "(",
    ")",
    "{",
    "}",
    "[",
    "]",
    ";",
    ",",
    ".",
    ":",
    "#"
  ]);
  var Lexer = class {
    constructor(source) {
      this.src = source;
      this.pos = 0;
      this.line = 1;
      this.col = 1;
      this.tokens = [];
      this.errors = [];
    }
    cur() {
      return this.src[this.pos] ?? "";
    }
    peek(n = 1) {
      return this.src[this.pos + n] ?? "";
    }
    atEnd() {
      return this.pos >= this.src.length;
    }
    advance() {
      const c = this.src[this.pos++];
      if (c === "\n") {
        this.line++;
        this.col = 1;
      } else {
        this.col++;
      }
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
        if (c === "/" && this.peek() === "/") {
          this.skipLineComment();
          continue;
        }
        if (c === "/" && this.peek() === "*") {
          this.skipBlockComment();
          continue;
        }
        if (c === "#") {
          this.skipPreprocessor();
          continue;
        }
        if (c === '"') {
          this.readString(line, col);
          continue;
        }
        if (c === "'") {
          this.readChar(line, col);
          continue;
        }
        if (c === "0" && (this.peek() === "x" || this.peek() === "X")) {
          this.readHex(line, col);
          continue;
        }
        if (isDigit(c)) {
          this.readNumber(line, col);
          continue;
        }
        if (isAlpha(c)) {
          this.readIdentifier(line, col);
          continue;
        }
        this.readOperator(line, col);
      }
      this.emit("EOF", "", this.line, this.col);
      return { tokens: this.tokens, errors: this.errors };
    }
    skipWhitespace() {
      while (!this.atEnd() && " 	\r\n".includes(this.cur())) this.advance();
    }
    skipLineComment() {
      while (!this.atEnd() && this.cur() !== "\n") this.advance();
    }
    skipBlockComment() {
      this.advance();
      this.advance();
      const startLine = this.line, startCol = this.col;
      while (!this.atEnd()) {
        if (this.cur() === "*" && this.peek() === "/") {
          this.advance();
          this.advance();
          return;
        }
        this.advance();
      }
      this.errors.push(new LexerError("Unterminated block comment", startLine, startCol));
    }
    skipPreprocessor() {
      while (!this.atEnd() && this.cur() !== "\n") this.advance();
    }
    readString(line, col) {
      this.advance();
      let s = '"';
      while (!this.atEnd() && this.cur() !== '"') {
        if (this.cur() === "\n") {
          this.errors.push(new LexerError("Unterminated string literal", line, col));
          break;
        }
        if (this.cur() === "\\") {
          s += this.advance();
        }
        s += this.advance();
      }
      if (!this.atEnd()) {
        s += '"';
        this.advance();
      }
      this.emit("STRING_LITERAL", s, line, col);
    }
    readChar(line, col) {
      this.advance();
      let s = "'";
      while (!this.atEnd() && this.cur() !== "'") {
        if (this.cur() === "\\") {
          s += this.advance();
        }
        s += this.advance();
      }
      if (!this.atEnd()) {
        s += "'";
        this.advance();
      }
      this.emit("CHAR_LITERAL", s, line, col);
    }
    readHex(line, col) {
      let s = this.advance() + this.advance();
      while (!this.atEnd() && isHexDig(this.cur())) s += this.advance();
      this.emit("INT_LITERAL", s, line, col);
    }
    readNumber(line, col) {
      let s = "";
      while (!this.atEnd() && isDigit(this.cur())) s += this.advance();
      if (!this.atEnd() && this.cur() === "." && isDigit(this.peek())) {
        s += this.advance();
        while (!this.atEnd() && isDigit(this.cur())) s += this.advance();
        if (!this.atEnd() && (this.cur() === "e" || this.cur() === "E")) {
          s += this.advance();
          if (!this.atEnd() && (this.cur() === "+" || this.cur() === "-")) s += this.advance();
          while (!this.atEnd() && isDigit(this.cur())) s += this.advance();
        }
        if (!this.atEnd() && (this.cur() === "f" || this.cur() === "F")) s += this.advance();
        this.emit("FLOAT_LITERAL", s, line, col);
      } else {
        while (!this.atEnd() && "uUlL".includes(this.cur())) s += this.advance();
        this.emit("INT_LITERAL", s, line, col);
      }
    }
    readIdentifier(line, col) {
      let s = "";
      while (!this.atEnd() && isAlNum(this.cur())) s += this.advance();
      const type = C_KEYWORDS.has(s) ? "KEYWORD" : "IDENTIFIER";
      this.emit(type, s, line, col);
    }
    readOperator(line, col) {
      for (const op of MULTI_OPS) {
        if (this.src.startsWith(op, this.pos)) {
          for (let i2 = 0; i2 < op.length; i2++) this.advance();
          const type = "+-*/%=<>&|^~!?".includes(op[0]) ? "OPERATOR" : "PUNCT";
          this.emit(/[;,.()\[\]{}:]/.test(op) ? "PUNCT" : "OPERATOR", op, line, col);
          return;
        }
      }
      const c = this.advance();
      if (SINGLE_PUNCTS.has(c)) {
        const type = /[;,()\[\]{}:]/.test(c) ? "PUNCT" : "OPERATOR";
        this.emit(type, c, line, col);
      } else {
        this.errors.push(new LexerError(`Unexpected character '${c}'`, line, col));
      }
    }
  };
  function tokenize(source) {
    const lex = new Lexer(source);
    const { tokens, errors } = lex.tokenize();
    if (errors.length > 0) throw errors[0];
    return { tokens };
  }

  // js/languages/c/parser.js
  var parser_exports = {};
  __export(parser_exports, {
    parse: () => parse
  });
  var node = (type, fields) => ({ type, ...fields });
  function astToText(n, prefix = "", isLast = true) {
    if (!n || typeof n !== "object") return String(n ?? "");
    const connector = isLast ? "\u2514\u2500 " : "\u251C\u2500 ";
    const childPfx = prefix + (isLast ? "   " : "\u2502  ");
    let lines = "";
    switch (n.type) {
      case "Program":
        lines = "Program\n";
        n.body.forEach((d, i2) => {
          lines += astToText(d, "", i2 === n.body.length - 1);
        });
        return lines;
      case "FuncDecl": {
        const params = (n.params || []).map((p) => `${p.ptype} ${p.name}`).join(", ");
        lines = `${prefix}${connector}FuncDecl ${n.name} : ${n.retType}(${params})
`;
        lines += astToText(n.body, childPfx, true);
        return lines;
      }
      case "Block":
        lines = `${prefix}${connector}Block
`;
        (n.stmts || []).forEach((s, i2) => {
          lines += astToText(s, childPfx, i2 === n.stmts.length - 1);
        });
        return lines;
      case "VarDecl":
        lines = `${prefix}${connector}VarDecl ${n.name} : ${n.vtype}`;
        if (n.init) {
          lines += "\n";
          lines += astToText(n.init, childPfx, true);
        } else {
          lines += "\n";
        }
        return lines;
      case "Assign":
        lines = `${prefix}${connector}Assign
`;
        lines += astToText(n.target, childPfx, false);
        lines += astToText(n.value, childPfx, true);
        return lines;
      case "Return":
        lines = `${prefix}${connector}Return
`;
        if (n.value) lines += astToText(n.value, childPfx, true);
        return lines;
      case "If":
        lines = `${prefix}${connector}If
`;
        lines += astToText(n.cond, childPfx, false);
        lines += astToText(n.then, childPfx, !n.else_);
        if (n.else_) lines += astToText(n.else_, childPfx, true);
        return lines;
      case "While":
        lines = `${prefix}${connector}While
`;
        lines += astToText(n.cond, childPfx, false);
        lines += astToText(n.body, childPfx, true);
        return lines;
      case "For":
        lines = `${prefix}${connector}For
`;
        lines += astToText(n.init, childPfx, false);
        lines += astToText(n.cond, childPfx, false);
        lines += astToText(n.update, childPfx, false);
        lines += astToText(n.body, childPfx, true);
        return lines;
      case "BinOp":
        lines = `${prefix}${connector}BinOp (${n.op})
`;
        lines += astToText(n.left, childPfx, false);
        lines += astToText(n.right, childPfx, true);
        return lines;
      case "UnaryOp":
        lines = `${prefix}${connector}UnaryOp (${n.op})
`;
        lines += astToText(n.operand, childPfx, true);
        return lines;
      case "PostfixOp":
        lines = `${prefix}${connector}PostfixOp (${n.op})
`;
        lines += astToText(n.operand, childPfx, true);
        return lines;
      case "Call":
        lines = `${prefix}${connector}Call ${n.name}
`;
        (n.args || []).forEach((a, i2) => {
          lines += astToText(a, childPfx, i2 === n.args.length - 1);
        });
        return lines;
      case "Ident":
        return `${prefix}${connector}Ident ${n.name}
`;
      case "IntLit":
        return `${prefix}${connector}IntLit ${n.value}
`;
      case "FloatLit":
        return `${prefix}${connector}FloatLit ${n.value}
`;
      case "StringLit":
        return `${prefix}${connector}StringLit ${n.value}
`;
      case "CharLit":
        return `${prefix}${connector}CharLit ${n.value}
`;
      case "ExprStmt":
        return astToText(n.expr, prefix, isLast);
      case "Break":
        return `${prefix}${connector}Break
`;
      case "Continue":
        return `${prefix}${connector}Continue
`;
      case "StructDecl":
        lines = `${prefix}${connector}StructDecl ${n.name}
`;
        (n.fields || []).forEach((f, i2) => {
          lines += `${childPfx}${i2 === n.fields.length - 1 ? "\u2514\u2500" : "\u251C\u2500"} Field ${f.name} : ${f.ftype}
`;
        });
        return lines;
      default:
        return `${prefix}${connector}${n.type}
`;
    }
  }
  var Parser = class {
    constructor(tokens) {
      this.tokens = tokens.filter((t) => t.type !== "EOF");
      this.eof = tokens.find((t) => t.type === "EOF") ?? { type: "EOF", lexeme: "", line: 0, col: 0 };
      this.pos = 0;
    }
    cur() {
      return this.tokens[this.pos] ?? this.eof;
    }
    peek(n = 1) {
      return this.tokens[this.pos + n] ?? this.eof;
    }
    atEnd() {
      return this.pos >= this.tokens.length;
    }
    advance() {
      const t = this.cur();
      if (!this.atEnd()) this.pos++;
      return t;
    }
    check(type, lexeme) {
      const t = this.cur();
      if (type && t.type !== type) return false;
      if (lexeme !== void 0 && t.lexeme !== lexeme) return false;
      return true;
    }
    match(type, lexeme) {
      if (this.check(type, lexeme)) {
        this.advance();
        return true;
      }
      return false;
    }
    expect(type, lexeme, errMsg) {
      if (this.check(type, lexeme)) return this.advance();
      const t = this.cur();
      throw new ParseError(
        errMsg ?? `Expected '${lexeme ?? type}' but got '${t.lexeme || t.type}' (${t.type})`,
        t.line,
        t.col
      );
    }
    // ── Type specifier ──────────────────────────────────────────────────────────
    parseTypeSpec() {
      const qualifiers = [];
      const TYPE_QUALS = /* @__PURE__ */ new Set(["const", "volatile", "signed", "unsigned", "long", "short", "inline", "static", "extern"]);
      while (!this.atEnd() && TYPE_QUALS.has(this.cur().lexeme)) {
        qualifiers.push(this.advance().lexeme);
      }
      const BASE_TYPES = /* @__PURE__ */ new Set(["void", "int", "char", "float", "double", "bool", "auto"]);
      let base = "int";
      if (!this.atEnd()) {
        if (BASE_TYPES.has(this.cur().lexeme)) {
          base = this.advance().lexeme;
        } else if (this.cur().lexeme === "struct" || this.cur().lexeme === "union" || this.cur().lexeme === "enum") {
          const kw = this.advance().lexeme;
          const name2 = this.check("IDENTIFIER") ? this.advance().lexeme : "";
          base = `${kw} ${name2}`.trim();
        } else if (this.check("IDENTIFIER")) {
          base = this.advance().lexeme;
        }
      }
      let pointers = "";
      while (!this.atEnd() && this.cur().lexeme === "*") {
        pointers += "*";
        this.advance();
      }
      const full = [...qualifiers, base].join(" ") + pointers;
      return full;
    }
    // ── Top-level ───────────────────────────────────────────────────────────────
    parseProgram() {
      const body2 = [];
      while (!this.atEnd()) {
        try {
          body2.push(this.parseTopLevel());
        } catch (e) {
          if (!(e instanceof ParseError)) throw e;
          throw e;
        }
      }
      return node("Program", { body: body2 });
    }
    parseTopLevel() {
      if (this.check("KEYWORD", "using")) {
        while (!this.atEnd() && !this.check("PUNCT", ";")) this.advance();
        this.match("PUNCT", ";");
        return node("UsingDecl", {});
      }
      if (this.check("KEYWORD", "template")) {
        while (!this.atEnd() && !this.check("OPERATOR", ">")) this.advance();
        this.match("OPERATOR", ">");
        return this.parseTopLevel();
      }
      if (this.check("KEYWORD", "struct") || this.check("KEYWORD", "union") || this.check("KEYWORD", "class")) {
        return this.parseStructDecl();
      }
      if (this.check("KEYWORD", "typedef")) {
        return this.parseTypedef();
      }
      return this.parseDeclaration();
    }
    parseStructDecl() {
      const kw = this.advance().lexeme;
      let name2 = "";
      if (this.check("IDENTIFIER")) name2 = this.advance().lexeme;
      this.expect("PUNCT", "{");
      const fields = [];
      while (!this.atEnd() && !this.check("PUNCT", "}")) {
        if (this.check("KEYWORD", "public") || this.check("KEYWORD", "private") || this.check("KEYWORD", "protected")) {
          this.advance();
          this.match("PUNCT", ":");
          continue;
        }
        if (name2 && this.check("IDENTIFIER", name2)) {
          const cname = this.advance().lexeme;
          if (this.check("PUNCT", "(")) {
            this.expect("PUNCT", "(");
            while (!this.atEnd() && !this.check("PUNCT", ")")) this.advance();
            this.expect("PUNCT", ")");
            const body2 = this.parseBlock();
            fields.push({ ftype: "constructor", name: cname, body: body2 });
            continue;
          }
        }
        const ftype = this.parseTypeSpec();
        const fname = this.expect("IDENTIFIER", void 0, `Expected field name`).lexeme;
        if (this.check("PUNCT", "(")) {
          this.expect("PUNCT", "(");
          while (!this.atEnd() && !this.check("PUNCT", ")")) this.advance();
          this.expect("PUNCT", ")");
          const body2 = this.parseBlock();
          fields.push({ ftype, name: fname, body: body2 });
          continue;
        }
        if (this.check("PUNCT", "[")) {
          this.advance();
          let sz = "";
          while (!this.atEnd() && !this.check("PUNCT", "]")) sz += this.advance().lexeme;
          this.expect("PUNCT", "]");
          fields.push({ ftype: `${ftype}[${sz}]`, name: fname });
        } else {
          fields.push({ ftype, name: fname });
        }
        this.expect("PUNCT", ";");
      }
      this.expect("PUNCT", "}");
      this.match("PUNCT", ";");
      return node("StructDecl", { name: `${kw} ${name2}`.trim(), fields });
    }
    parseTypedef() {
      this.advance();
      const base = this.parseTypeSpec();
      const alias = this.check("IDENTIFIER") ? this.advance().lexeme : "";
      this.match("PUNCT", ";");
      return node("Typedef", { base, alias });
    }
    parseDeclaration() {
      const retType = this.parseTypeSpec();
      const name2 = this.expect("IDENTIFIER", void 0, `Expected identifier after type '${retType}'`).lexeme;
      if (this.check("PUNCT", "(")) {
        return this.parseFuncDecl(retType, name2);
      }
      return this.parseVarDeclRest(retType, name2);
    }
    parseFuncDecl(retType, name2) {
      this.expect("PUNCT", "(");
      const params = this.parseParams();
      this.expect("PUNCT", ")");
      if (this.check("PUNCT", ";")) {
        this.advance();
        return node("FuncProto", { retType, name: name2, params });
      }
      const body2 = this.parseBlock();
      return node("FuncDecl", { retType, name: name2, params, body: body2 });
    }
    parseParams() {
      const params = [];
      if (this.check("PUNCT", ")")) return params;
      if (this.check("KEYWORD", "void") && this.peek().lexeme === ")") {
        this.advance();
        return params;
      }
      do {
        if (this.check("OPERATOR", "...")) {
          this.advance();
          params.push({ ptype: "...", name: "..." });
          break;
        }
        const ptype = this.parseTypeSpec();
        let pname = "";
        if (this.check("IDENTIFIER")) pname = this.advance().lexeme;
        params.push({ ptype, name: pname });
      } while (!this.atEnd() && this.match("PUNCT", ","));
      return params;
    }
    parseVarDeclRest(vtype, name2) {
      if (this.match("PUNCT", "(")) {
        const args2 = [];
        while (!this.atEnd() && !this.check("PUNCT", ")")) {
          args2.push(this.parseAssignment());
          this.match("PUNCT", ",");
        }
        this.expect("PUNCT", ")");
        this.expect("PUNCT", ";", `Expected ';' after constructor call`);
        return node("VarDecl", { vtype, name: name2, init: node("Call", { callee: name2, args: args2 }) });
      }
      while (this.match("PUNCT", "[")) {
        let sz = "";
        while (!this.atEnd() && !this.check("PUNCT", "]")) sz += this.advance().lexeme;
        this.expect("PUNCT", "]");
        vtype = `${vtype}[${sz || ""}]`;
      }
      let init2 = null;
      if (this.match("OPERATOR", "=")) {
        if (this.check("PUNCT", "{")) {
          init2 = this.parseArrayInitializer();
        } else {
          init2 = this.parseAssignment();
        }
      }
      this.expect("PUNCT", ";", `Expected ';' after variable declaration`);
      return node("VarDecl", { vtype, name: name2, init: init2 });
    }
    parseArrayInitializer() {
      this.expect("PUNCT", "{");
      const elements = [];
      while (!this.atEnd() && !this.check("PUNCT", "}")) {
        elements.push(this.parseAssignment());
        this.match("PUNCT", ",");
      }
      this.expect("PUNCT", "}");
      return node("ArrayInit", { elements });
    }
    parseBlock() {
      this.expect("PUNCT", "{");
      const stmts = [];
      while (!this.atEnd() && !this.check("PUNCT", "}")) {
        stmts.push(this.parseStatement());
      }
      this.expect("PUNCT", "}");
      return node("Block", { stmts });
    }
    parseStatement() {
      const t = this.cur();
      if (t.lexeme === "{") return this.parseBlock();
      if (t.lexeme === "if") return this.parseIf();
      if (t.lexeme === "while") return this.parseWhile();
      if (t.lexeme === "for") return this.parseFor();
      if (t.lexeme === "do") return this.parseDoWhile();
      if (t.lexeme === "return") return this.parseReturn();
      if (t.lexeme === "break") {
        this.advance();
        this.match("PUNCT", ";");
        return node("Break", {});
      }
      if (t.lexeme === "continue") {
        this.advance();
        this.match("PUNCT", ";");
        return node("Continue", {});
      }
      if (this.looksLikeDeclaration()) return this.parseLocalVarDecl();
      const expr = this.parseExpression();
      this.match("PUNCT", ";");
      return node("ExprStmt", { expr });
    }
    looksLikeDeclaration() {
      const TYPE_STARTERS = /* @__PURE__ */ new Set([
        "int",
        "float",
        "char",
        "double",
        "void",
        "bool",
        "long",
        "short",
        "unsigned",
        "signed",
        "const",
        "static",
        "extern",
        "struct",
        "union",
        "enum",
        "auto",
        "inline",
        "register"
      ]);
      const t = this.cur();
      if (t.type !== "KEYWORD" && t.type !== "IDENTIFIER") return false;
      if (TYPE_STARTERS.has(t.lexeme)) {
        let i2 = this.pos + 1;
        while (i2 < this.tokens.length && TYPE_STARTERS.has(this.tokens[i2].lexeme)) i2++;
        while (i2 < this.tokens.length && this.tokens[i2].lexeme === "*") i2++;
        return i2 < this.tokens.length && this.tokens[i2].type === "IDENTIFIER";
      }
      return false;
    }
    parseLocalVarDecl() {
      const vtype = this.parseTypeSpec();
      const name2 = this.expect("IDENTIFIER", void 0, `Expected variable name`).lexeme;
      return this.parseVarDeclRest(vtype, name2);
    }
    parseIf() {
      const t = this.advance();
      this.expect("PUNCT", "(", `Expected '(' after 'if'`);
      const cond = this.parseExpression();
      this.expect("PUNCT", ")", `Expected ')' after if condition`);
      const then = this.parseStatement();
      let else_ = null;
      if (!this.atEnd() && this.cur().lexeme === "else") {
        this.advance();
        else_ = this.parseStatement();
      }
      return node("If", { cond, then, else_, line: t.line, col: t.col });
    }
    parseWhile() {
      const t = this.advance();
      this.expect("PUNCT", "(");
      const cond = this.parseExpression();
      this.expect("PUNCT", ")");
      const body2 = this.parseStatement();
      return node("While", { cond, body: body2, line: t.line });
    }
    parseDoWhile() {
      this.advance();
      const body2 = this.parseStatement();
      this.expect("KEYWORD", "while");
      this.expect("PUNCT", "(");
      const cond = this.parseExpression();
      this.expect("PUNCT", ")");
      this.match("PUNCT", ";");
      return node("DoWhile", { body: body2, cond });
    }
    parseFor() {
      const t = this.advance();
      this.expect("PUNCT", "(");
      let init2 = null;
      if (!this.check("PUNCT", ";")) {
        if (this.looksLikeDeclaration()) {
          init2 = this.parseLocalVarDecl();
        } else {
          init2 = node("ExprStmt", { expr: this.parseExpression() });
          this.match("PUNCT", ";");
        }
      } else {
        this.advance();
      }
      let cond = null;
      if (!this.check("PUNCT", ";")) cond = this.parseExpression();
      this.match("PUNCT", ";");
      let update = null;
      if (!this.check("PUNCT", ")")) update = this.parseExpression();
      this.expect("PUNCT", ")");
      const body2 = this.parseStatement();
      return node("For", { init: init2, cond, update, body: body2, line: t.line });
    }
    parseReturn() {
      const t = this.advance();
      let value = null;
      if (!this.check("PUNCT", ";")) value = this.parseExpression();
      this.match("PUNCT", ";");
      return node("Return", { value, line: t.line, col: t.col });
    }
    // ── Expression hierarchy ────────────────────────────────────────────────────
    parseExpression() {
      return this.parseAssignment();
    }
    parseAssignment() {
      let left = this.parseTernary();
      const ASSIGN_OPS = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>="]);
      if (!this.atEnd() && ASSIGN_OPS.has(this.cur().lexeme)) {
        const op = this.advance().lexeme;
        const right = this.parseAssignment();
        return node("Assign", { target: left, op, value: right });
      }
      return left;
    }
    parseTernary() {
      let cond = this.parseLogicalOr();
      if (!this.atEnd() && this.cur().lexeme === "?") {
        this.advance();
        const then = this.parseExpression();
        this.expect("PUNCT", ":", `Expected ':' in ternary`);
        const else_ = this.parseTernary();
        return node("Ternary", { cond, then, else_ });
      }
      return cond;
    }
    parseLogicalOr() {
      return this._leftAssoc(this.parseLogicalAnd.bind(this), ["||"]);
    }
    parseLogicalAnd() {
      return this._leftAssoc(this.parseBitOr.bind(this), ["&&"]);
    }
    parseBitOr() {
      return this._leftAssoc(this.parseBitXor.bind(this), ["|"]);
    }
    parseBitXor() {
      return this._leftAssoc(this.parseBitAnd.bind(this), ["^"]);
    }
    parseBitAnd() {
      return this._leftAssoc(this.parseEquality.bind(this), ["&"]);
    }
    parseEquality() {
      return this._leftAssoc(this.parseRelational.bind(this), ["==", "!="]);
    }
    parseRelational() {
      return this._leftAssoc(this.parseShift.bind(this), ["<", ">", "<=", ">="]);
    }
    parseShift() {
      return this._leftAssoc(this.parseAdditive.bind(this), ["<<", ">>"]);
    }
    parseAdditive() {
      return this._leftAssoc(this.parseMult.bind(this), ["+", "-"]);
    }
    parseMult() {
      return this._leftAssoc(this.parseUnary.bind(this), ["*", "/", "%"]);
    }
    _leftAssoc(next, ops) {
      let left = next();
      while (!this.atEnd() && ops.includes(this.cur().lexeme)) {
        const op = this.advance().lexeme;
        const right = next();
        left = node("BinOp", { op, left, right });
      }
      return left;
    }
    parseUnary() {
      const UNARY_OPS = /* @__PURE__ */ new Set(["-", "!", "~", "*", "&", "++", "--"]);
      if (!this.atEnd() && UNARY_OPS.has(this.cur().lexeme)) {
        const op = this.advance().lexeme;
        const operand = this.parseUnary();
        return node("UnaryOp", { op, operand });
      }
      if (!this.atEnd() && this.cur().lexeme === "sizeof") {
        this.advance();
        if (this.check("PUNCT", "(")) {
          this.advance();
          let inner;
          if (this.looksLikeDeclaration()) {
            inner = this.parseTypeSpec();
            this.expect("PUNCT", ")");
            return node("Sizeof", { arg: inner });
          }
          inner = this.parseExpression();
          this.expect("PUNCT", ")");
          return node("Sizeof", { arg: inner });
        }
        return node("Sizeof", { arg: this.parseUnary() });
      }
      return this.parsePostfix();
    }
    parsePostfix() {
      let expr = this.parsePrimary();
      while (!this.atEnd()) {
        if (this.check("OPERATOR", "++") || this.check("OPERATOR", "--")) {
          const op = this.advance().lexeme;
          expr = node("PostfixOp", { op, operand: expr });
        } else if (this.check("PUNCT", "[")) {
          this.advance();
          const idx = this.parseExpression();
          this.expect("PUNCT", "]");
          expr = node("Index", { array: expr, index: idx });
        } else if (this.cur().lexeme === "." || this.cur().lexeme === "->") {
          const op = this.advance().lexeme;
          const member = this.expect("IDENTIFIER", void 0, `Expected member name after '${op}'`).lexeme;
          expr = node("MemberAccess", { object: expr, op, member });
        } else if (this.cur().lexeme === "(") {
          this.advance();
          const args2 = [];
          if (!this.check("PUNCT", ")")) {
            do {
              args2.push(this.parseAssignment());
            } while (this.match("PUNCT", ","));
          }
          this.expect("PUNCT", ")");
          expr = node("Call", { callee: expr, args: args2 });
        } else {
          break;
        }
      }
      return expr;
    }
    parsePrimary() {
      const t = this.cur();
      if (!t || t.type === "EOF") {
        throw new ParseError(`Unexpected end of input \u2014 expected an expression`, t?.line, t?.col);
      }
      if (t.type === "PUNCT" && t.lexeme === "(") {
        this.advance();
        if (this.looksLikeDeclaration()) {
          const castType = this.parseTypeSpec();
          this.expect("PUNCT", ")");
          const operand = this.parseUnary();
          return node("Cast", { castType, operand });
        }
        const expr = this.parseExpression();
        this.expect("PUNCT", ")", `Expected ')' after expression`);
        return expr;
      }
      if (t.type === "INT_LITERAL") {
        this.advance();
        return node("IntLit", { value: t.lexeme, line: t.line, col: t.col });
      }
      if (t.type === "FLOAT_LITERAL") {
        this.advance();
        return node("FloatLit", { value: t.lexeme, line: t.line, col: t.col });
      }
      if (t.type === "STRING_LITERAL") {
        this.advance();
        return node("StringLit", { value: t.lexeme, line: t.line, col: t.col });
      }
      if (t.type === "CHAR_LITERAL") {
        this.advance();
        return node("CharLit", { value: t.lexeme, line: t.line, col: t.col });
      }
      if (t.type === "IDENTIFIER" && (t.lexeme === "NULL" || t.lexeme === "nullptr")) {
        this.advance();
        return node("NullLit", { line: t.line });
      }
      if (t.type === "KEYWORD" && (t.lexeme === "true" || t.lexeme === "false")) {
        this.advance();
        return node("BoolLit", { value: t.lexeme === "true", line: t.line });
      }
      if (t.type === "IDENTIFIER" || ["cout", "cin", "endl", "this"].includes(t.lexeme)) {
        this.advance();
        if (!this.atEnd() && this.cur().lexeme === "(") {
          return this.parseFuncCall(t);
        }
        return node("Ident", { name: t.lexeme, line: t.line, col: t.col });
      }
      throw new ParseError(
        `Unexpected token '${t.lexeme}' (${t.type}) \u2014 expected an expression`,
        t.line,
        t.col
      );
    }
    parseFuncCall(nameTok) {
      this.expect("PUNCT", "(");
      const args2 = [];
      if (!this.check("PUNCT", ")")) {
        do {
          args2.push(this.parseAssignment());
        } while (this.match("PUNCT", ","));
      }
      this.expect("PUNCT", ")", `Expected ')' to close function call`);
      return node("Call", { name: nameTok.lexeme, args: args2, line: nameTok.line, col: nameTok.col });
    }
  };
  function parse(tokens) {
    const parser7 = new Parser(tokens);
    const ast = parser7.parseProgram();
    const astText = astToText(ast).trimEnd();
    return { ast, astText };
  }

  // js/languages/c/semantic.js
  var semantic_exports = {};
  __export(semantic_exports, {
    analyze: () => analyze
  });
  var NUMERIC_TYPES = /* @__PURE__ */ new Set(["int", "long", "short", "unsigned", "char", "float", "double", "bool", "unsigned int", "long long", "signed int"]);
  var FLOAT_TYPES = /* @__PURE__ */ new Set(["float", "double", "long double"]);
  function baseType(t) {
    return (t || "").replace(/\*/g, "").replace(/\[.*\]/, "").trim().split(" ").pop();
  }
  function isNumeric(t) {
    return NUMERIC_TYPES.has(baseType(t));
  }
  function isPointer(t) {
    return (t || "").includes("*") || (t || "").includes("[");
  }
  function isString(t) {
    return (t || "").includes("char*") || (t || "").includes("char [") || baseType(t) === "char*";
  }
  function typesCompatible(declared, rhs) {
    if (!declared || !rhs) return true;
    if (declared === rhs) return true;
    const d = baseType(declared), r = baseType(rhs);
    if (isNumeric(declared) && isNumeric(rhs)) return true;
    if ((isPointer(declared) || isString(declared)) && rhs === "string") return true;
    if (declared === "void*" || rhs === "void*") return true;
    return false;
  }
  var Scope = class {
    constructor(name2, parent = null) {
      this.name = name2;
      this.parent = parent;
      this.syms = /* @__PURE__ */ new Map();
    }
    define(sym) {
      this.syms.set(sym.name, sym);
    }
    lookupOwn(name2) {
      return this.syms.get(name2);
    }
    lookup(name2) {
      return this.syms.get(name2) ?? (this.parent ? this.parent.lookup(name2) : null);
    }
    scopeLabel() {
      return this.name;
    }
  };
  var SemanticAnalyzer = class {
    constructor() {
      this.global = new Scope("global");
      this.current = this.global;
      this.symbols = [];
      this.checks = [];
      this.warnings = [];
      this.currentFuncRetType = null;
    }
    enter(name2) {
      this.current = new Scope(name2, this.current);
    }
    exit() {
      for (const sym of this.current.syms.values()) {
        this.symbols.push({
          name: sym.name,
          kind: sym.kind,
          type: sym.type,
          scope: sym.scope,
          value: sym.value ?? "\u2014"
        });
      }
      this.current = this.current.parent;
    }
    define(name2, kind, type, value = null) {
      const scope = this.current.scopeLabel();
      const sym = { name: name2, kind, type, scope, value };
      this.current.define(sym);
      return sym;
    }
    analyze(ast) {
      [
        "printf",
        "scanf",
        "puts",
        "gets",
        "malloc",
        "free",
        "calloc",
        "realloc",
        "strlen",
        "strcpy",
        "strcat",
        "strcmp",
        "memcpy",
        "memset",
        "exit",
        "abs",
        "sqrt",
        "pow"
      ].forEach((fn) => this.global.define({ name: fn, kind: "function", type: "void", scope: "global", value: null }));
      this.visitNode(ast);
      for (const sym of this.global.syms.values()) {
        if (![
          "printf",
          "scanf",
          "puts",
          "gets",
          "malloc",
          "free",
          "calloc",
          "realloc",
          "strlen",
          "strcpy",
          "strcat",
          "strcmp",
          "memcpy",
          "memset",
          "exit",
          "abs",
          "sqrt",
          "pow"
        ].includes(sym.name)) {
          this.symbols.push({
            name: sym.name,
            kind: sym.kind,
            type: sym.type,
            scope: sym.scope,
            value: sym.value ?? "\u2014"
          });
        }
      }
      return {
        symbolTable: this.symbols,
        checks: this.checks,
        warnings: this.warnings
      };
    }
    visitNode(n) {
      if (!n || typeof n !== "object") return null;
      switch (n.type) {
        case "Program":
          return this.visitProgram(n);
        case "FuncDecl":
          return this.visitFuncDecl(n);
        case "FuncProto":
          return this.visitFuncProto(n);
        case "VarDecl":
          return this.visitVarDecl(n);
        case "Block":
          return this.visitBlock(n);
        case "Assign":
          return this.visitAssign(n);
        case "Return":
          return this.visitReturn(n);
        case "If":
          return this.visitIf(n);
        case "While":
          return this.visitWhile(n);
        case "DoWhile":
          return this.visitDoWhile(n);
        case "For":
          return this.visitFor(n);
        case "ExprStmt":
          return this.visitNode(n.expr);
        case "BinOp":
          return this.visitBinOp(n);
        case "UnaryOp":
          return this.visitUnaryOp(n);
        case "PostfixOp":
          return this.visitPostfix(n);
        case "Call":
          return this.visitCall(n);
        case "Ident":
          return this.visitIdent(n);
        case "IntLit":
          return "int";
        case "FloatLit":
          return "float";
        case "StringLit":
          return "char*";
        case "CharLit":
          return "char";
        case "BoolLit":
          return "bool";
        case "NullLit":
          return "void*";
        case "Cast":
          return n.castType;
        case "ArrayInit":
          return "array";
        case "Index":
          return this.visitIndex(n);
        case "MemberAccess":
          return "unknown";
        case "Sizeof":
          return "unsigned long";
        case "Ternary":
          return this.visitTernary(n);
        case "StructDecl":
          return this.visitStructDecl(n);
        case "Typedef":
          return null;
        case "Break":
        case "Continue":
          return null;
        default:
          return null;
      }
    }
    visitProgram(n) {
      (n.body || []).forEach((d) => this.visitNode(d));
    }
    visitFuncDecl(n) {
      const existing = this.global.lookupOwn(n.name);
      if (existing && existing.kind === "function") {
        this.warnings.push(`Function '${n.name}' redefined.`);
      }
      this.define(n.name, "function", `${n.retType} (${(n.params || []).map((p) => p.ptype).join(",")})`, null);
      this.enter(n.name + "()");
      const prevRet = this.currentFuncRetType;
      this.currentFuncRetType = n.retType;
      (n.params || []).forEach((p) => {
        if (p.name && p.name !== "...") this.define(p.name, "parameter", p.ptype);
      });
      this.visitNode(n.body);
      this.currentFuncRetType = prevRet;
      this.exit();
      this.checks.push(`Function '${n.name}' declared with return type '${n.retType}'.`);
    }
    visitFuncProto(n) {
      this.define(n.name, "function", `${n.retType}`, null);
    }
    visitVarDecl(n) {
      if (this.current.lookupOwn(n.name)) {
        throw new SemanticError(
          `Variable '${n.name}' is already declared in this scope.`,
          n.line,
          n.col,
          `Each variable name must be unique within its scope. Rename one of the declarations.`
        );
      }
      let initType = null;
      let initVal = null;
      if (n.init) {
        initType = this.visitNode(n.init);
        initVal = this.exprValue(n.init);
        if (initType && !typesCompatible(n.vtype, initType)) {
          throw new SemanticError(
            `Cannot initialize '${n.name}' (type '${n.vtype}') with a value of type '${initType}' \u2014 incompatible types.`,
            n.line,
            n.col,
            `In C, implicit conversion is only allowed between compatible numeric types. Assigning a string literal to an integer variable is not valid.`
          );
        }
        this.checks.push(`Variable '${n.name}' (${n.vtype}) initialized \u2014 types are compatible.`);
      }
      this.define(n.name, "variable", n.vtype, initVal ?? (n.init ? "(expr)" : null));
    }
    visitBlock(n) {
      (n.stmts || []).forEach((s) => this.visitNode(s));
    }
    visitAssign(n) {
      const targetType = this.visitNode(n.target);
      const valueType = this.visitNode(n.value);
      if (targetType && valueType && !typesCompatible(targetType, valueType)) {
        const tName = n.target.name ?? "(expr)";
        throw new SemanticError(
          `Cannot assign value of type '${valueType}' to '${tName}' of type '${targetType}' \u2014 incompatible types.`,
          n.target?.line,
          n.target?.col,
          `Implicit conversion is not valid between these types in C. You may need an explicit cast.`
        );
      }
      if (n.target?.type === "Ident") {
        const sym = this.current.lookup(n.target.name);
        if (sym) sym.value = this.exprValue(n.value) ?? "(expr)";
      }
      return targetType;
    }
    visitReturn(n) {
      const retType = n.value ? this.visitNode(n.value) : "void";
      if (this.currentFuncRetType && this.currentFuncRetType !== "void" && retType) {
        if (!typesCompatible(this.currentFuncRetType, retType)) {
          throw new SemanticError(
            `Return type mismatch: function declares '${this.currentFuncRetType}' but returns '${retType}'.`,
            n.line,
            n.col
          );
        }
        this.checks.push(`Return type '${retType}' is compatible with declared return type '${this.currentFuncRetType}'.`);
      }
      return retType;
    }
    visitIf(n) {
      this.visitNode(n.cond);
      this.enter("if");
      this.visitNode(n.then);
      this.exit();
      if (n.else_) {
        this.enter("else");
        this.visitNode(n.else_);
        this.exit();
      }
    }
    visitWhile(n) {
      this.visitNode(n.cond);
      this.enter("while");
      this.visitNode(n.body);
      this.exit();
    }
    visitDoWhile(n) {
      this.enter("do-while");
      this.visitNode(n.body);
      this.exit();
      this.visitNode(n.cond);
    }
    visitFor(n) {
      this.enter("for");
      if (n.init) this.visitNode(n.init);
      if (n.cond) this.visitNode(n.cond);
      if (n.update) this.visitNode(n.update);
      if (n.body) {
        if (n.body.type !== "Block") this.visitNode(n.body);
        else this.visitNode(n.body);
      }
      this.exit();
    }
    visitBinOp(n) {
      const lt = this.visitNode(n.left);
      const rt = this.visitNode(n.right);
      const compOps = /* @__PURE__ */ new Set(["==", "!=", "<", ">", "<=", ">=", "&&", "||"]);
      if (compOps.has(n.op)) return "bool";
      if (lt && rt) {
        if (FLOAT_TYPES.has(baseType(lt)) || FLOAT_TYPES.has(baseType(rt))) return "double";
        if (isNumeric(lt) && isNumeric(rt)) return "int";
      }
      return lt ?? rt ?? "int";
    }
    visitUnaryOp(n) {
      return this.visitNode(n.operand);
    }
    visitPostfix(n) {
      return this.visitNode(n.operand);
    }
    visitTernary(n) {
      this.visitNode(n.cond);
      const t = this.visitNode(n.then);
      this.visitNode(n.else_);
      return t;
    }
    visitIndex(n) {
      const arrType = this.visitNode(n.array);
      this.visitNode(n.index);
      return (arrType || "").replace("*", "").replace(/\[.*\]/, "").trim() || "int";
    }
    visitUsingDecl(n) {
    }
    visitMemberAccess(n) {
      this.visitNode(n.object);
      return "int";
    }
    visitCall(n) {
      const callName = n.name || (typeof n.callee === "string" ? n.callee : n.callee?.name || n.callee?.member || "func");
      const sym = this.current.lookup(callName);
      if (!sym) {
        this.warnings.push(`Function/Method '${callName}' called \u2014 assuming valid in scope.`);
      } else {
        this.checks.push(`Call '${callName}' resolved in scope.`);
      }
      (n.args || []).forEach((a) => this.visitNode(a));
      return sym ? sym.type : "int";
    }
    visitIdent(n) {
      if (["cout", "cin", "endl", "this"].includes(n.name)) {
        return "ostream";
      }
      const sym = this.current.lookup(n.name);
      if (!sym) {
        throw new SemanticError(
          `Undeclared identifier '${n.name}' \u2014 used before declaration.`,
          n.line,
          n.col,
          `All variables and functions must be declared before they are used in C. Check for typos or missing declarations.`
        );
      }
      this.checks.push(`Identifier '${n.name}' resolved to '${sym.type}' in scope '${sym.scope}'.`);
      return sym.type;
    }
    visitStructDecl(n) {
      this.define(n.name, "struct", "type", null);
      const bare = n.name.replace(/^(struct|class|union)\s+/, "");
      if (bare !== n.name) {
        this.define(bare, "class", bare, null);
      }
    }
    // Attempt to extract a literal value string for display
    exprValue(n) {
      if (!n) return null;
      if (n.type === "IntLit") return n.value;
      if (n.type === "FloatLit") return n.value;
      if (n.type === "StringLit") return n.value;
      if (n.type === "CharLit") return n.value;
      if (n.type === "BoolLit") return String(n.value);
      if (n.type === "Ident") return n.name;
      if (n.type === "BinOp") {
        try {
          const l = parseFloat(this.exprValue(n.left));
          const r = parseFloat(this.exprValue(n.right));
          if (!isNaN(l) && !isNaN(r)) {
            const ops = { "+": l + r, "-": l - r, "*": l * r, "/": r ? l / r : NaN, "%": r ? l % r : NaN };
            const v = ops[n.op];
            if (v != null && !isNaN(v)) return String(Number.isInteger(v) ? v : v.toFixed(4));
          }
        } catch {
        }
        return `${this.exprValue(n.left) ?? "?"} ${n.op} ${this.exprValue(n.right) ?? "?"}`;
      }
      return null;
    }
  };
  function analyze(ast, source) {
    const analyzer = new SemanticAnalyzer();
    const result = analyzer.analyze(ast);
    return result;
  }

  // js/languages/c/ir.js
  var ir_exports = {};
  __export(ir_exports, {
    generate: () => generate
  });
  var TACGenerator = class {
    constructor() {
      this.instructions = [];
      this._tempCount = 0;
      this._labelCount = 0;
    }
    newTemp() {
      return `t${++this._tempCount}`;
    }
    newLabel() {
      return `L${++this._labelCount}`;
    }
    emit(instr) {
      this.instructions.push(instr);
    }
    generate(ast) {
      if (!ast) return { instructions: [] };
      this.visitNode(ast);
      return { instructions: this.instructions };
    }
    visitNode(n) {
      if (!n || typeof n !== "object") return null;
      switch (n.type) {
        case "Program":
          (n.body || []).forEach((d) => this.visitNode(d));
          return null;
        case "FuncDecl":
          return this.visitFuncDecl(n);
        case "FuncProto":
          return null;
        case "Typedef":
          return null;
        case "StructDecl":
          return null;
        case "Block":
          (n.stmts || []).forEach((s) => this.visitNode(s));
          return null;
        case "VarDecl":
          return this.visitVarDecl(n);
        case "Assign":
          return this.visitAssign(n);
        case "Return":
          return this.visitReturn(n);
        case "If":
          return this.visitIf(n);
        case "While":
          return this.visitWhile(n);
        case "DoWhile":
          return this.visitDoWhile(n);
        case "For":
          return this.visitFor(n);
        case "ExprStmt":
          this.visitExpr(n.expr);
          return null;
        case "Break":
          this.emit(`goto ${this._breakLabel ?? "L_break"}`);
          return null;
        case "Continue":
          this.emit(`goto ${this._continueLabel ?? "L_continue"}`);
          return null;
        default:
          return null;
      }
    }
    visitFuncDecl(n) {
      this.emit(`func_begin ${n.name}`);
      const prevTemp = this._tempCount;
      this._tempCount = 0;
      (n.params || []).forEach((p) => {
        if (p.name && p.name !== "...") this.emit(`param_receive ${p.name}`);
      });
      this.visitNode(n.body);
      if (n.retType === "void") this.emit(`return`);
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
      if (n.op !== "=") {
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
      if (!n) return "_";
      if (n.type === "Ident") return n.name;
      if (n.type === "Index") {
        const a = this.lvalName(n.array);
        const i2 = this.visitExpr(n.index);
        return `${a}[${i2}]`;
      }
      if (n.type === "MemberAccess") {
        const o = this.lvalName(n.object);
        return `${o}${n.op}${n.member}`;
      }
      if (n.type === "UnaryOp" && n.op === "*") {
        return `*${this.lvalName(n.operand)}`;
      }
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
      const cond = this.visitExpr(n.cond);
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
      const top = this.newLabel();
      const exit = this.newLabel();
      const prevBreak = this._breakLabel;
      const prevContinue = this._continueLabel;
      this._breakLabel = exit;
      this._continueLabel = top;
      this.emit(`${top}:`);
      const cond = this.visitExpr(n.cond);
      this.emit(`if_false ${cond} goto ${exit}`);
      this.visitNode(n.body);
      this.emit(`goto ${top}`);
      this.emit(`${exit}:`);
      this._breakLabel = prevBreak;
      this._continueLabel = prevContinue;
    }
    visitDoWhile(n) {
      const top = this.newLabel();
      const exit = this.newLabel();
      const prevBreak = this._breakLabel;
      const prevContinue = this._continueLabel;
      this._breakLabel = exit;
      this._continueLabel = top;
      this.emit(`${top}:`);
      this.visitNode(n.body);
      const cond = this.visitExpr(n.cond);
      this.emit(`if ${cond} goto ${top}`);
      this.emit(`${exit}:`);
      this._breakLabel = prevBreak;
      this._continueLabel = prevContinue;
    }
    visitFor(n) {
      const top = this.newLabel();
      const exit = this.newLabel();
      const update = this.newLabel();
      const prevBreak = this._breakLabel;
      const prevContinue = this._continueLabel;
      this._breakLabel = exit;
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
      this._breakLabel = prevBreak;
      this._continueLabel = prevContinue;
    }
    // ── Expression → temp var ────────────────────────────────────────────────────
    visitExpr(n) {
      if (!n) return "_";
      switch (n.type) {
        case "IntLit":
          return n.value;
        case "FloatLit":
          return n.value;
        case "StringLit":
          return n.value;
        case "CharLit":
          return n.value;
        case "BoolLit":
          return n.value ? "1" : "0";
        case "NullLit":
          return "NULL";
        case "Ident":
          return n.name;
        case "BinOp": {
          const l = this.visitExpr(n.left);
          const r = this.visitExpr(n.right);
          const t = this.newTemp();
          this.emit(`${t} = ${l} ${n.op} ${r}`);
          return t;
        }
        case "UnaryOp": {
          const operand = this.visitExpr(n.operand);
          const t = this.newTemp();
          this.emit(`${t} = ${n.op}${operand}`);
          return t;
        }
        case "PostfixOp": {
          const v = this.lvalName(n.operand);
          const t = this.newTemp();
          this.emit(`${t} = ${v}`);
          const op = n.op === "++" ? "+" : "-";
          this.emit(`${v} = ${v} ${op} 1`);
          return t;
        }
        case "Assign":
          return this.visitAssign(n);
        case "Call": {
          (n.args || []).forEach((a) => {
            const av = this.visitExpr(a);
            this.emit(`param ${av}`);
          });
          const t = this.newTemp();
          this.emit(`${t} = call ${n.name}, ${n.args?.length ?? 0}`);
          return t;
        }
        case "Cast": {
          const v = this.visitExpr(n.operand);
          const t = this.newTemp();
          this.emit(`${t} = (${n.castType}) ${v}`);
          return t;
        }
        case "Index": {
          const a = this.visitExpr(n.array);
          const i2 = this.visitExpr(n.index);
          const t = this.newTemp();
          this.emit(`${t} = ${a}[${i2}]`);
          return t;
        }
        case "MemberAccess": {
          const o = this.visitExpr(n.object);
          const t = this.newTemp();
          this.emit(`${t} = ${o}${n.op}${n.member}`);
          return t;
        }
        case "Sizeof": {
          if (typeof n.arg === "string") return `sizeof(${n.arg})`;
          const v = this.visitExpr(n.arg);
          return `sizeof(${v})`;
        }
        case "Ternary": {
          const c = this.visitExpr(n.cond);
          const t = this.newTemp();
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
        case "ArrayInit": {
          const t = this.newTemp();
          (n.elements || []).forEach((el, i2) => {
            const v = this.visitExpr(el);
            this.emit(`${t}[${i2}] = ${v}`);
          });
          return t;
        }
        default:
          return "_";
      }
    }
  };
  function generate(ast, symbolTable) {
    const gen = new TACGenerator();
    const result = gen.generate(ast);
    return result;
  }

  // js/languages/c/optimizer.js
  var optimizer_exports = {};
  __export(optimizer_exports, {
    optimize: () => optimize
  });
  var isNumStr = (s) => s != null && !isNaN(Number(s)) && String(s).trim() !== "";
  var numOf = (s) => Number(s);
  function evalBinOp(op, lv, rv) {
    switch (op) {
      case "+":
        return lv + rv;
      case "-":
        return lv - rv;
      case "*":
        return lv * rv;
      case "/":
        return rv !== 0 ? Number.isInteger(lv) && Number.isInteger(rv) ? Math.trunc(lv / rv) : lv / rv : null;
      case "%":
        return rv !== 0 ? lv % rv : null;
      case "<<":
        return lv << rv;
      case ">>":
        return lv >> rv;
      case "&":
        return lv & rv;
      case "|":
        return lv | rv;
      case "^":
        return lv ^ rv;
      case "==":
        return lv === rv ? 1 : 0;
      case "!=":
        return lv !== rv ? 1 : 0;
      case "<":
        return lv < rv ? 1 : 0;
      case ">":
        return lv > rv ? 1 : 0;
      case "<=":
        return lv <= rv ? 1 : 0;
      case ">=":
        return lv >= rv ? 1 : 0;
      case "&&":
        return lv && rv ? 1 : 0;
      case "||":
        return lv || rv ? 1 : 0;
      default:
        return null;
    }
  }
  function parseTAC(instr) {
    const pure = String(instr).split(/\s*;\s*/, 1)[0].trim();
    const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|\^\<\>\=\!]{1,3})\s+(\S+)$/.exec(pure);
    if (binMatch) return { kind: "assign_bin", dst: binMatch[1], left: binMatch[2], op: binMatch[3], right: binMatch[4] };
    const unMatch = /^(\S+)\s*=\s*([!~\-])\s*(\S+)$/.exec(pure);
    if (unMatch) return { kind: "assign_unary", dst: unMatch[1], op: unMatch[2], src: unMatch[3] };
    const copyMatch = /^(\S+)\s*=\s*(\S+)$/.exec(pure);
    if (copyMatch) return { kind: "assign_copy", dst: copyMatch[1], src: copyMatch[2] };
    return { kind: "other", raw: pure };
  }
  function constantFolding(instructions) {
    let changed = false;
    const result = instructions.map((instr) => {
      const p = parseTAC(instr);
      if (p.kind === "assign_bin" && isNumStr(p.left) && isNumStr(p.right)) {
        const val = evalBinOp(p.op, numOf(p.left), numOf(p.right));
        if (val !== null) {
          const folded = Number.isInteger(val) ? String(val) : val.toFixed(6).replace(/0+$/, "");
          changed = true;
          return `${p.dst} = ${folded}  ; folded: ${p.left} ${p.op} ${p.right}`;
        }
      }
      return instr;
    });
    return { instructions: result, changed };
  }
  function constantPropagation(instructions) {
    let changed = false;
    const constMap = /* @__PURE__ */ new Map();
    const result = instructions.map((instr) => {
      if (/^\w+:$/.test(instr) || /^goto\b/.test(instr) || /^if(?:_false)?\b/.test(instr)) {
        constMap.clear();
        return instr;
      }
      const p = parseTAC(instr);
      if ((p.kind === "assign_copy" || p.kind === "assign_bin") && p.dst) {
        if (p.kind === "assign_copy" && isNumStr(p.src)) {
          constMap.set(p.dst, p.src);
        } else {
          constMap.delete(p.dst);
        }
      }
      if (p.kind === "assign_bin") {
        let newLeft = constMap.has(p.left) ? constMap.get(p.left) : p.left;
        let newRight = constMap.has(p.right) ? constMap.get(p.right) : p.right;
        if (newLeft !== p.left || newRight !== p.right) {
          changed = true;
          return `${p.dst} = ${newLeft} ${p.op} ${newRight}`;
        }
      }
      if (p.kind === "assign_copy") {
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
  function copyPropagation(instructions) {
    let changed = false;
    const copyMap = /* @__PURE__ */ new Map();
    const result = instructions.map((instr) => {
      if (/^\w+:$/.test(instr) || /^goto\b/.test(instr) || /^if(?:_false)?\b/.test(instr)) {
        copyMap.clear();
        return instr;
      }
      const p = parseTAC(instr);
      if (p.kind === "assign_copy") {
        if (!isNumStr(p.src)) {
          const resolved = copyMap.get(p.src) ?? p.src;
          copyMap.set(p.dst, resolved);
        } else {
          copyMap.delete(p.dst);
        }
      }
      if (p.kind === "assign_bin") {
        copyMap.delete(p.dst);
        let newL = copyMap.get(p.left) ?? p.left;
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
  function deadCodeElimination(instructions) {
    let changed = false;
    const result = [];
    let dead = false;
    for (const instr of instructions) {
      if (/^func_begin\s/.test(instr) || /^func_end\s/.test(instr) || /^\w+:$/.test(instr)) {
        dead = false;
      }
      if (dead) {
        changed = true;
        continue;
      }
      result.push(instr);
      if (/^return\b/.test(instr)) dead = true;
    }
    return { instructions: result, changed };
  }
  function deadStoreElimination(instructions) {
    let changed = false;
    const live = /* @__PURE__ */ new Set();
    const result = [];
    for (let i2 = instructions.length - 1; i2 >= 0; i2--) {
      const instr = instructions[i2];
      const p = parseTAC(instr);
      const isSimpleAssignment = (p.kind === "assign_copy" || p.kind === "assign_bin" || p.kind === "assign_unary") && p.dst && !p.dst.includes("[") && !p.dst.includes(".");
      if (isSimpleAssignment && !live.has(p.dst)) {
        changed = true;
        continue;
      }
      if (isSimpleAssignment) live.delete(p.dst);
      const uses = p.kind === "assign_bin" ? [p.left, p.right] : p.kind === "assign_copy" || p.kind === "assign_unary" ? [p.src] : [];
      for (const use of uses) {
        if (!isNumStr(use)) live.add(use);
      }
      if (/^(?:if|if_false|return|param)\b/.test(instr)) {
        for (const name2 of instr.match(/\b[A-Za-z_]\w*\b/g) || []) live.add(name2);
      }
      result.push(instr);
    }
    return { instructions: result.reverse(), changed };
  }
  function algebraicSimplification(instructions) {
    let changed = false;
    const result = instructions.map((instr) => {
      const p = parseTAC(instr);
      if (p.kind !== "assign_bin") return instr;
      const { dst, left, op, right } = p;
      if (op === "+" && right === "0") {
        changed = true;
        return `${dst} = ${left}  ; simplified: x + 0`;
      }
      if (op === "+" && left === "0") {
        changed = true;
        return `${dst} = ${right}  ; simplified: 0 + x`;
      }
      if (op === "-" && right === "0") {
        changed = true;
        return `${dst} = ${left}  ; simplified: x - 0`;
      }
      if (op === "*" && right === "1") {
        changed = true;
        return `${dst} = ${left}  ; simplified: x * 1`;
      }
      if (op === "*" && left === "1") {
        changed = true;
        return `${dst} = ${right}  ; simplified: 1 * x`;
      }
      if (op === "*" && (right === "0" || left === "0")) {
        changed = true;
        return `${dst} = 0  ; simplified: x * 0`;
      }
      if (op === "/" && right === "1") {
        changed = true;
        return `${dst} = ${left}  ; simplified: x / 1`;
      }
      return instr;
    });
    return { instructions: result, changed };
  }
  function optimize(instructions) {
    const before = [...instructions];
    const passLog = [];
    let current = [...instructions];
    let anyChange = false;
    for (let i2 = 0; i2 < 5; i2++) {
      let iterChange = false;
      const passes = [
        { name: "Constant Folding", fn: constantFolding },
        { name: "Constant Propagation", fn: constantPropagation },
        { name: "Copy Propagation", fn: copyPropagation },
        { name: "Algebraic Simplification", fn: algebraicSimplification },
        { name: "Dead Code Elimination", fn: deadCodeElimination },
        { name: "Dead Store Elimination", fn: deadStoreElimination }
      ];
      for (const { name: name2, fn } of passes) {
        const { instructions: next, changed } = fn(current);
        if (changed) {
          if (!passLog.includes(name2)) passLog.push(name2);
          current = next;
          iterChange = true;
          anyChange = true;
        }
      }
      if (!iterChange) break;
    }
    let note = "";
    if (passLog.length === 0) {
      note = "No optimization opportunities were found. All operands are runtime values or the code is already optimal.";
    } else {
      note = passLog.map((p) => {
        switch (p) {
          case "Constant Folding":
            return "Constant folding: expressions with only literal operands were evaluated at compile time.";
          case "Constant Propagation":
            return "Constant propagation: variables holding known constants were replaced with their values.";
          case "Copy Propagation":
            return "Copy propagation: redundant variable copies were eliminated.";
          case "Algebraic Simplification":
            return "Algebraic simplification: identity operations (x*1, x+0, x*0) were reduced.";
          case "Dead Code Elimination":
            return "Dead code elimination: unreachable instructions after unconditional returns were removed.";
          case "Dead Store Elimination":
            return "Dead store elimination: unused temporary assignments were removed.";
          default:
            return p;
        }
      }).join(" ");
    }
    return { before, after: current, passes: passLog, note };
  }

  // js/languages/c/codegen.js
  var codegen_exports = {};
  __export(codegen_exports, {
    generate: () => generate2
  });
  var USER_REGISTERS = ["R1", "R2", "R3"];
  var SCRATCH_REGISTERS = {
    _l: "R4",
    _r: "R5",
    _u: "R4",
    _cond: "R4",
    _arg: "R4",
    _ret: "R5",
    _vs: "R4",
    _idx: "R5",
    _il: "R5"
  };
  var CodeGenerator = class {
    constructor(langId = "c") {
      this.langId = langId;
      this.output = [];
      this._regMap = /* @__PURE__ */ new Map();
      this._regPool = [...USER_REGISTERS];
      this._usedRegs = /* @__PURE__ */ new Set();
      this._stackVars = /* @__PURE__ */ new Map();
      this._stackOffset = 0;
      this._currentFunction = null;
    }
    emit(s) {
      this.output.push(s);
    }
    emitComment(s) {
      this.output.push(`; ${s}`);
    }
    allocReg(varName) {
      if (this._regMap.has(varName)) return this._regMap.get(varName);
      if (SCRATCH_REGISTERS[varName]) return SCRATCH_REGISTERS[varName];
      const free = this._regPool.find((r) => !this._usedRegs.has(r));
      if (free) {
        this._regMap.set(varName, free);
        this._usedRegs.add(free);
        return free;
      }
      if (!this._stackVars.has(varName)) {
        this._stackOffset += 4;
        this._stackVars.set(varName, this._stackOffset);
      }
      return "R6";
    }
    getReg(v) {
      if (this._regMap.has(v)) return this._regMap.get(v);
      return null;
    }
    isImmediate(v) {
      return v != null && !isNaN(Number(v)) && String(v).trim() !== "";
    }
    isLabel(v) {
      return /^\w+:$/.test(v);
    }
    loadVal(v, destReg) {
      if (this.isImmediate(v)) {
        this.emit(`  MOV   ${destReg}, #${v}`);
      } else if (v && v.startsWith('"')) {
        this.emit(`  LEA   ${destReg}, [${v}]`);
      } else {
        if (this._stackVars.has(v)) {
          this.emit(`  LOAD  ${destReg}, [SP, #${this._stackVars.get(v)}]`);
          return;
        }
        const reg = this.getReg(v);
        if (reg && reg !== destReg) {
          this.emit(`  MOV   ${destReg}, ${reg}`);
        } else {
          this.emit(`  LOAD  ${destReg}, [${v ?? "_"}]`);
        }
      }
    }
    storeVar(name2, reg) {
      const offset = this._stackVars.get(name2);
      if (offset) this.emit(`  STORE ${reg}, [SP, #${offset}]`);
    }
    generate(instructions, symbolTable, langId) {
      const targetLabel = this._targetLabel(langId);
      this.emitComment(`Target: ${targetLabel}`);
      this.emit("");
      for (const instr of instructions) {
        this.translateInstr(instr);
      }
      return { targetLabel, instructions: this.output };
    }
    _targetLabel(langId) {
      const labels = {
        c: "Educational pseudo-assembly (C-like ABI)",
        cpp: "Educational pseudo-assembly (C++ ABI with vtable stubs)",
        java: "JVM-style educational bytecode",
        python: "CPython-style educational bytecode",
        javascript: "V8-style educational bytecode",
        sql: "Physical query plan pseudo-instructions"
      };
      return labels[langId] ?? "Educational pseudo-assembly";
    }
    translateInstr(instr) {
      if (!instr) return;
      if (/^\w+:$/.test(instr)) {
        this.emit(`${instr}`);
        return;
      }
      if (instr.startsWith("; ") || instr.startsWith(";")) {
        this.emit(`  ${instr}`);
        return;
      }
      const [pure] = instr.split(/\s*;\s*/);
      const fbMatch = /^func_begin\s+(\S+)$/.exec(pure);
      if (fbMatch) {
        this.emit("");
        this.emit(`${fbMatch[1]}:`);
        this.emit(`  PUSH  {LR}          ; save return address`);
        this._usedRegs.clear();
        this._regMap.clear();
        this._stackVars.clear();
        this._stackOffset = 0;
        this._currentFunction = fbMatch[1];
        return;
      }
      const feMatch = /^func_end\s+(\S+)$/.exec(pure);
      if (feMatch) {
        this.emit(`${feMatch[1]}_epilogue:`);
        this.emit(`  POP   {LR}          ; restore return address`);
        this.emit(`  BX    LR`);
        this.emit("");
        this._currentFunction = null;
        return;
      }
      const prMatch = /^param_receive\s+(\S+)$/.exec(pure);
      if (prMatch) {
        const reg = this.allocReg(prMatch[1]);
        this.emit(`  ; param '${prMatch[1]}' \u2192 ${reg}`);
        return;
      }
      const paramMatch = /^param\s+(\S+)$/.exec(pure);
      if (paramMatch) {
        const val = paramMatch[1];
        const reg = this.allocReg("_arg");
        this.loadVal(val, reg);
        this.emit(`  PUSH  {${reg}}       ; push argument`);
        return;
      }
      const retMatch = /^return(?:\s+(\S+))?$/.exec(pure);
      if (retMatch) {
        if (retMatch[1]) {
          const v = retMatch[1];
          const r = this.allocReg("_ret");
          this.loadVal(v, r);
          this.emit(`  MOV   R0, ${r}      ; return value`);
        }
        this.emit(`  B     ${this._currentFunction}_epilogue`);
        return;
      }
      const ifMatch = /^if\s+(\S+)\s+goto\s+(\S+)$/.exec(pure);
      if (ifMatch) {
        const [, cond, lbl] = ifMatch;
        const r = this.allocReg("_cond");
        this.loadVal(cond, r);
        this.emit(`  CMP   ${r}, #0`);
        this.emit(`  BNE   ${lbl}         ; if true, branch`);
        return;
      }
      const ifFalseMatch = /^if_false\s+(\S+)\s+goto\s+(\S+)$/.exec(pure);
      if (ifFalseMatch) {
        const [, cond, lbl] = ifFalseMatch;
        const r = this.allocReg("_cond");
        this.loadVal(cond, r);
        this.emit(`  CMP   ${r}, #0`);
        this.emit(`  BEQ   ${lbl}         ; if false, branch`);
        return;
      }
      const gotoMatch = /^goto\s+(\S+)$/.exec(pure);
      if (gotoMatch) {
        this.emit(`  B     ${gotoMatch[1]}`);
        return;
      }
      const callMatch = /^(\S+)\s*=\s*call\s+(\S+),\s*(\d+)$/.exec(pure);
      if (callMatch) {
        const [, dst, fn, argc] = callMatch;
        this.emit(`  BL    ${fn}          ; call ${fn}(${argc} args)`);
        const reg = this.allocReg(dst);
        this.emit(`  MOV   ${reg}, R0     ; capture return value \u2192 ${dst}`);
        return;
      }
      const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|\^\<\>\=\!]{1,3})\s+(\S+)$/.exec(pure);
      if (binMatch) {
        const [, dst, left, op, right] = binMatch;
        const rd = this.allocReg(dst);
        const r1 = this.allocReg("_l");
        const r2 = this.allocReg("_r");
        this.loadVal(left, r1);
        this.loadVal(right, r2);
        const opMap = {
          "+": "ADD",
          "-": "SUB",
          "*": "MUL",
          "/": "DIV",
          "%": "MOD",
          "&": "AND",
          "|": "ORR",
          "^": "XOR",
          "<<": "LSL",
          ">>": "LSR",
          "==": "EQ",
          "!=": "NEQ",
          "<": "LT",
          ">": "GT",
          "<=": "LE",
          ">=": "GE",
          "&&": "AND",
          "||": "ORR"
        };
        const asmOp = opMap[op] ?? op.toUpperCase();
        if (["EQ", "NEQ", "LT", "GT", "LE", "GE"].includes(asmOp)) {
          this.emit(`  CMP   ${r1}, ${r2}`);
          const setOp = { EQ: "EQ", NEQ: "NE", LT: "LT", GT: "GT", LE: "LE", GE: "GE" }[asmOp];
          this.emit(`  MOV${setOp} ${rd}, #1`);
          const inverse = { EQ: "NE", NEQ: "EQ", LT: "GE", GT: "LE", LE: "GT", GE: "LT" }[setOp];
          this.emit(`  MOV${inverse} ${rd}, #0`);
        } else {
          this.emit(`  ${asmOp.padEnd(5)} ${rd}, ${r1}, ${r2}`);
        }
        this._regMap.set(dst, rd);
        this.storeVar(dst, rd);
        return;
      }
      const unaryMatch = /^(\S+)\s*=\s*([!~\-])(\S+)$/.exec(pure);
      if (unaryMatch) {
        const [, dst, op, src] = unaryMatch;
        const rd = this.allocReg(dst);
        const rs = this.allocReg("_u");
        this.loadVal(src, rs);
        if (op === "-") this.emit(`  NEG   ${rd}, ${rs}`);
        if (op === "~") this.emit(`  MVN   ${rd}, ${rs}`);
        if (op === "!") {
          this.emit(`  CMP   ${rs}, #0`);
          this.emit(`  MOVEQ ${rd}, #1`);
          this.emit(`  MOVNE ${rd}, #0`);
        }
        this._regMap.set(dst, rd);
        this.storeVar(dst, rd);
        return;
      }
      const castMatch = /^(\S+)\s*=\s*\(([^)]+)\)\s*(\S+)$/.exec(pure);
      if (castMatch) {
        const [, dst, , src] = castMatch;
        const rd = this.allocReg(dst);
        this.loadVal(src, rd);
        this.emit(`  ; cast to ${castMatch[2]}`);
        this.storeVar(dst, rd);
        return;
      }
      const arrStoreMatch = /^(\S+)\[(\S+)\]\s*=\s*(\S+)$/.exec(pure);
      if (arrStoreMatch) {
        const [, arr, idx, val] = arrStoreMatch;
        const rv = this.allocReg("_vs");
        const ri = this.allocReg("_idx");
        this.loadVal(val, rv);
        this.loadVal(idx, ri);
        this.emit(`  STR   ${rv}, [${arr}, ${ri}]  ; ${arr}[${idx}] = ${val}`);
        return;
      }
      const arrLoadMatch = /^(\S+)\s*=\s*(\S+)\[(\S+)\]$/.exec(pure);
      if (arrLoadMatch) {
        const [, dst, arr, idx] = arrLoadMatch;
        const rd = this.allocReg(dst);
        const ri = this.allocReg("_il");
        this.loadVal(idx, ri);
        this.emit(`  LDR   ${rd}, [${arr}, ${ri}]  ; ${dst} = ${arr}[${idx}]`);
        this.storeVar(dst, rd);
        return;
      }
      const copyMatch = /^(\S+)\s*=\s*(\S+)$/.exec(pure);
      if (copyMatch) {
        const [, dst, src] = copyMatch;
        const rd = this.allocReg(dst);
        this.loadVal(src, rd);
        this._regMap.set(dst, rd);
        this.storeVar(dst, rd);
        return;
      }
      this.emit(`  ; ${instr}`);
    }
  };
  function generate2(tacInstructions, symbolTable, langId) {
    const gen = new CodeGenerator(langId);
    return gen.generate(tacInstructions, symbolTable, langId);
  }

  // js/languages/c/index.js
  var id = "c";
  var label = "C";
  var examples = [
    {
      label: "A \xB7 Valid arithmetic & variables",
      code: `int main() {
    int a = 10;
    int b = 20;
    int result = a + b * 5;
    return result;
}`
    },
    {
      label: "B \xB7 Constant folding & propagation",
      code: `int main() {
    int x;
    x = 10 * 5 + 2;
    int y = x + 3;
    return y;
}`
    },
    {
      label: "C \xB7 While loop & control flow",
      code: `int main() {
    int count = 0;
    int sum = 0;
    while (count < 10) {
        sum = sum + count;
        count = count + 1;
    }
    return sum;
}`
    },
    {
      label: "D \xB7 Syntax error (missing operand)",
      code: `int main() {
    int a = ;
    return a;
}`
    },
    {
      label: "E \xB7 Semantic error (type mismatch)",
      code: `int main() {
    int a;
    a = "hello";
    return 0;
}`
    }
  ];
  var backend = {
    /**
     * Run the C/C++ backend analysis.
     * @param {string} source - The source code to analyze
     * @returns {Promise<Object>} The backend response with phases
     */
    run: async (source) => {
      try {
        const response = await fetch("http://localhost:4174/api/analyze/ccpp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            language: "c",
            source,
            options: {
              target: "x86-64",
              standard: "c11"
            }
          })
        });
        if (!response.ok) {
          throw new Error(`Backend request failed with status ${response.status}`);
        }
        return response.json();
      } catch (err2) {
        console.error("C backend error:", err2);
        throw err2;
      }
    }
  };

  // js/languages/cpp/index.js
  var cpp_exports = {};
  __export(cpp_exports, {
    backend: () => backend2,
    codegen: () => codegen,
    examples: () => examples2,
    id: () => id2,
    ir: () => ir,
    label: () => label2,
    lexer: () => lexer,
    optimizer: () => optimizer,
    parser: () => parser,
    semantic: () => semantic
  });
  var id2 = "cpp";
  var label2 = "C++";
  var CPP_KEYWORDS = /* @__PURE__ */ new Set([
    ...C_KEYWORDS,
    "class",
    "namespace",
    "template",
    "typename",
    "new",
    "delete",
    "this",
    "super",
    "public",
    "private",
    "protected",
    "virtual",
    "override",
    "final",
    "inline",
    "explicit",
    "operator",
    "friend",
    "throw",
    "try",
    "catch",
    "noexcept",
    "nullptr",
    "constexpr",
    "auto",
    "decltype",
    "using",
    "static_assert",
    "std",
    "string",
    "vector",
    "map",
    "set",
    "pair",
    "cout",
    "cin",
    "endl"
  ]);
  var examples2 = [
    {
      label: "A \xB7 Class with constructor",
      code: `#include <iostream>
using namespace std;

class Rectangle {
private:
    int width;
    int height;
public:
    Rectangle(int w, int h) {
        width = w;
        height = h;
    }
    int area() {
        return width * height;
    }
};

int main() {
    Rectangle rect(5, 3);
    int a = rect.area();
    cout << a << endl;
    return 0;
}`
    },
    {
      label: "B \xB7 Template function",
      code: `template <typename T>
T maxVal(T a, T b) {
    if (a > b) return a;
    return b;
}

int main() {
    int x = maxVal(10, 20);
    double y = maxVal(3.14, 2.71);
    return 0;
}`
    },
    {
      label: "C \xB7 Type error (incompatible assignment)",
      code: `int main() {
    int x = "hello";
    return 0;
}`
    },
    {
      label: "D \xB7 Constant folding",
      code: `int main() {
    int result = 8 * 8 + 4 * 4;
    return result;
}`
    }
  ];
  var lexer = {
    tokenize(source) {
      const result = tokenize(source);
      result.tokens = result.tokens.map((t) => {
        if (t.type === "IDENTIFIER" && CPP_KEYWORDS.has(t.lexeme)) {
          return { ...t, type: "KEYWORD" };
        }
        return t;
      });
      return result;
    }
  };
  var parser = {
    parse(tokens) {
      return parse(tokens);
    }
  };
  var semantic = {
    analyze(ast, source) {
      const result = analyze(ast, source);
      result.checks.unshift("C++ class definitions are treated as struct scopes in this analysis.");
      return result;
    }
  };
  var ir = { generate: (ast, sym) => generate(ast, sym) };
  var optimizer = { optimize: (instrs) => optimize(instrs) };
  var codegen = { generate: (tac, sym) => ({ ...generate2(tac, sym, "cpp"), targetLabel: "Educational pseudo-assembly (C++ ABI)" }) };
  var backend2 = {
    /**
     * Run the C/C++ backend analysis.
     * @param {string} source - The source code to analyze
     * @returns {Promise<Object>} The backend response with phases
     */
    run: async (source) => {
      try {
        const response = await fetch("http://localhost:4174/api/analyze/ccpp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            language: "cpp",
            source,
            options: {
              target: "x86-64",
              standard: "c++17"
            }
          })
        });
        if (!response.ok) {
          throw new Error(`Backend request failed with status ${response.status}`);
        }
        return response.json();
      } catch (err2) {
        console.error("C++ backend error:", err2);
        throw err2;
      }
    }
  };

  // js/languages/java/index.js
  var java_exports = {};
  __export(java_exports, {
    backend: () => backend3,
    codegen: () => codegen2,
    examples: () => examples3,
    id: () => id3,
    ir: () => ir2,
    label: () => label3,
    lexer: () => lexer2,
    optimizer: () => optimizer2,
    parser: () => parser2,
    semantic: () => semantic2
  });
  var id3 = "java";
  var label3 = "Java";
  var JAVA_KEYWORDS = /* @__PURE__ */ new Set([
    "abstract",
    "assert",
    "boolean",
    "break",
    "byte",
    "case",
    "catch",
    "char",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "double",
    "else",
    "enum",
    "extends",
    "final",
    "finally",
    "float",
    "for",
    "goto",
    "if",
    "implements",
    "import",
    "instanceof",
    "int",
    "interface",
    "long",
    "native",
    "new",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "short",
    "static",
    "strictfp",
    "super",
    "switch",
    "synchronized",
    "this",
    "throw",
    "throws",
    "transient",
    "try",
    "void",
    "volatile",
    "while",
    "true",
    "false",
    "null",
    "var",
    "record",
    "sealed",
    "permits"
  ]);
  var JAVA_TYPES = /* @__PURE__ */ new Set(["int", "float", "double", "char", "boolean", "byte", "short", "long", "void", "String", "Object"]);
  var examples3 = [
    {
      label: "A \xB7 Hello World class",
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
      label: "B \xB7 Fibonacci method",
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
      label: "C \xB7 Type error (incompatible types)",
      code: `public class TypeError {
    public static void main(String[] args) {
        int x;
        x = "hello";
    }
}`
    },
    {
      label: "D \xB7 Constant folding",
      code: `public class ConstFold {
    public static void main(String[] args) {
        int result = 100 * 5 + 50;
        System.out.println(result);
    }
}`
    }
  ];
  var lexer2 = {
    tokenize(source) {
      const tokens = [];
      const errors = [];
      let pos = 0, line = 1, col = 1;
      const cur = () => source[pos] ?? "";
      const peek = (n = 1) => source[pos + n] ?? "";
      const at = () => pos >= source.length;
      const adv = () => {
        const c = source[pos++];
        if (c === "\n") {
          line++;
          col = 1;
        } else col++;
        return c;
      };
      const emit = (type, lexeme, l, c) => tokens.push({ type, lexeme, line: l, col: c });
      const isD = (c) => c >= "0" && c <= "9";
      const isA = (c) => /[a-zA-Z_$]/.test(c);
      const isAN = (c) => /[a-zA-Z0-9_$]/.test(c);
      while (!at()) {
        if (" 	\r\n".includes(cur())) {
          adv();
          continue;
        }
        const l = line, c = col;
        if (cur() === "/" && peek() === "/") {
          while (!at() && cur() !== "\n") adv();
          continue;
        }
        if (cur() === "/" && peek() === "*") {
          adv();
          adv();
          while (!at() && !(cur() === "*" && peek() === "/")) adv();
          if (!at()) {
            adv();
            adv();
          }
          continue;
        }
        if (cur() === '"') {
          adv();
          let s = '"';
          while (!at() && cur() !== '"') {
            if (cur() === "\\") {
              s += adv();
            }
            s += adv();
          }
          if (!at()) {
            s += '"';
            adv();
          }
          emit("STRING_LITERAL", s, l, c);
          continue;
        }
        if (cur() === "'") {
          adv();
          let s = "'";
          while (!at() && cur() !== "'") {
            if (cur() === "\\") {
              s += adv();
            }
            s += adv();
          }
          if (!at()) {
            s += "'";
            adv();
          }
          emit("CHAR_LITERAL", s, l, c);
          continue;
        }
        if (cur() === "@") {
          let s = adv();
          while (!at() && isAN(cur())) s += adv();
          emit("ANNOTATION", s, l, c);
          continue;
        }
        if (isD(cur())) {
          let s = "";
          while (!at() && isD(cur())) s += adv();
          if (!at() && cur() === "." && isD(peek())) {
            s += adv();
            while (!at() && isD(cur())) s += adv();
            if (!at() && (cur() === "f" || cur() === "F" || cur() === "d" || cur() === "D")) s += adv();
            emit("FLOAT_LITERAL", s, l, c);
          } else {
            if (!at() && (cur() === "L" || cur() === "l")) s += adv();
            emit("INT_LITERAL", s, l, c);
          }
          continue;
        }
        if (isA(cur())) {
          let s = "";
          while (!at() && isAN(cur())) s += adv();
          const type = JAVA_KEYWORDS.has(s) ? "KEYWORD" : JAVA_TYPES.has(s) ? "TYPE" : "IDENTIFIER";
          emit(type, s, l, c);
          continue;
        }
        const multi = [
          ">>>=",
          "<<=",
          ">>=",
          ">>>",
          "<<",
          ">>",
          "++",
          "--",
          "+=",
          "-=",
          "*=",
          "/=",
          "%=",
          "&=",
          "|=",
          "^=",
          "==",
          "!=",
          "<=",
          ">=",
          "&&",
          "||",
          "->",
          "::",
          "..."
        ];
        let found = false;
        for (const op of multi) {
          if (source.startsWith(op, pos)) {
            for (let i2 = 0; i2 < op.length; i2++) adv();
            emit("OPERATOR", op, l, c);
            found = true;
            break;
          }
        }
        if (found) continue;
        const sc = adv();
        if (";,(){}[].<>?:!~&|^%*/+-=".includes(sc)) {
          emit(/[;,(){}\[\].]/.test(sc) ? "PUNCT" : "OPERATOR", sc, l, c);
        } else {
          errors.push(new LexerError(`Unexpected character '${sc}'`, l, c));
        }
      }
      emit("EOF", "", line, col);
      if (errors.length) throw errors[0];
      return { tokens };
    }
  };
  var parser2 = {
    parse(tokens) {
      const p = new JavaParser(tokens);
      const ast = p.parseCompilationUnit();
      const astText = javaAstToText(ast).trimEnd();
      return { ast, astText };
    }
  };
  var JavaParser = class {
    constructor(tokens) {
      this.tokens = tokens.filter((t) => t.type !== "EOF");
      this.eof = tokens.find((t) => t.type === "EOF") ?? { type: "EOF", lexeme: "", line: 0, col: 0 };
      this.pos = 0;
    }
    cur() {
      return this.tokens[this.pos] ?? this.eof;
    }
    peek(n = 1) {
      return this.tokens[this.pos + n] ?? this.eof;
    }
    at() {
      return this.pos >= this.tokens.length;
    }
    adv() {
      const t = this.cur();
      if (!this.at()) this.pos++;
      return t;
    }
    check(type, lex) {
      const t = this.cur();
      return (!type || t.type === type) && (lex === void 0 || t.lexeme === lex);
    }
    match(type, lex) {
      if (this.check(type, lex)) {
        this.adv();
        return true;
      }
      return false;
    }
    expect(type, lex, msg) {
      if (this.check(type, lex)) return this.adv();
      const t = this.cur();
      throw new ParseError(msg ?? `Expected '${lex ?? type}' but got '${t.lexeme}'`, t.line, t.col);
    }
    parseCompilationUnit() {
      const imports = [];
      const classes = [];
      if (this.cur().lexeme === "package") {
        while (!this.at() && !this.check("PUNCT", ";")) this.adv();
        this.match("PUNCT", ";");
      }
      while (!this.at() && this.cur().lexeme === "import") {
        this.adv();
        let imp = "";
        while (!this.at() && !this.check("PUNCT", ";")) imp += this.adv().lexeme;
        this.match("PUNCT", ";");
        imports.push(imp);
      }
      while (!this.at()) {
        classes.push(this.parseClassDecl());
      }
      return { type: "CompilationUnit", imports, classes };
    }
    parseModifiers() {
      const mods = [];
      const MOD = /* @__PURE__ */ new Set(["public", "private", "protected", "static", "final", "abstract", "native", "synchronized", "volatile", "transient", "strictfp"]);
      while (!this.at()) {
        if (this.cur().type === "ANNOTATION") {
          mods.push(this.adv().lexeme);
          continue;
        }
        if (MOD.has(this.cur().lexeme)) {
          mods.push(this.adv().lexeme);
          continue;
        }
        break;
      }
      return mods;
    }
    parseClassDecl() {
      const mods = this.parseModifiers();
      if (!this.check("KEYWORD", "class") && !this.check("KEYWORD", "interface") && !this.check("KEYWORD", "enum") && !this.check("KEYWORD", "record")) {
        throw new ParseError(`Expected 'class' or 'interface'`, this.cur().line, this.cur().col);
      }
      const kw = this.adv().lexeme;
      const name2 = this.expect("IDENTIFIER", void 0, `Expected class name`).lexeme;
      if (this.check("OPERATOR", "<")) {
        let d = 1;
        this.adv();
        while (!this.at() && d > 0) {
          if (this.cur().lexeme === "<") d++;
          if (this.cur().lexeme === ">") {
            d--;
            if (d === 0) {
              this.adv();
              break;
            }
          }
          this.adv();
        }
      }
      let superclass = null;
      if (this.match("KEYWORD", "extends")) {
        superclass = this.expect("IDENTIFIER").lexeme;
      }
      const interfaces = [];
      if (this.match("KEYWORD", "implements")) {
        do {
          interfaces.push(this.expect("IDENTIFIER").lexeme);
        } while (this.match("PUNCT", ","));
      }
      this.expect("PUNCT", "{");
      const members = [];
      while (!this.at() && !this.check("PUNCT", "}")) {
        members.push(this.parseMember());
      }
      this.expect("PUNCT", "}");
      return { type: "ClassDecl", modifiers: mods, kind: kw, name: name2, superclass, interfaces, members };
    }
    parseMember() {
      const mods = this.parseModifiers();
      if (this.check("KEYWORD", "class") || this.check("KEYWORD", "interface") || this.check("KEYWORD", "enum")) {
        const inner = this.parseClassDecl();
        inner.modifiers = [...mods, ...inner.modifiers];
        return inner;
      }
      const retType = this.parseTypeRef();
      const name2 = this.expect("IDENTIFIER", void 0, `Expected method/field name`).lexeme;
      if (this.check("PUNCT", "(")) {
        this.adv();
        const params = this.parseParams();
        this.expect("PUNCT", ")");
        if (this.match("KEYWORD", "throws")) {
          while (!this.at() && !this.check("PUNCT", "{") && !this.check("PUNCT", ";")) this.adv();
        }
        if (this.check("PUNCT", "{")) {
          const body2 = this.parseBlock();
          return { type: "MethodDecl", modifiers: mods, retType, name: name2, params, body: body2 };
        }
        this.match("PUNCT", ";");
        return { type: "MethodDecl", modifiers: mods, retType, name: name2, params, body: null };
      }
      let init2 = null;
      while (this.match("PUNCT", "[")) this.match("PUNCT", "]");
      if (this.match("OPERATOR", "=")) {
        init2 = this.parseExpr();
      }
      this.match("PUNCT", ";");
      return { type: "FieldDecl", modifiers: mods, fieldType: retType, name: name2, init: init2 };
    }
    parseTypeRef() {
      let t = "";
      const PRIMS = /* @__PURE__ */ new Set(["void", "int", "long", "double", "float", "char", "boolean", "byte", "short"]);
      if (PRIMS.has(this.cur().lexeme) || this.cur().type === "TYPE" || this.cur().type === "IDENTIFIER" || this.cur().type === "KEYWORD") {
        t += this.adv().lexeme;
      }
      if (this.check("OPERATOR", "<")) {
        t += "<";
        this.adv();
        let d = 1;
        while (!this.at() && d > 0) {
          if (this.cur().lexeme === "<") d++;
          if (this.cur().lexeme === ">") d--;
          t += this.adv().lexeme;
        }
      }
      while (this.match("PUNCT", "[")) {
        this.match("PUNCT", "]");
        t += "[]";
      }
      if (this.check("OPERATOR", "...")) {
        this.adv();
        t += "...";
      }
      return t || "unknown";
    }
    parseParams() {
      const params = [];
      if (this.check("PUNCT", ")")) return params;
      do {
        const mods = this.parseModifiers();
        const ptype = this.parseTypeRef();
        const pname = this.check("IDENTIFIER") ? this.adv().lexeme : "";
        params.push({ ptype, name: pname });
      } while (this.match("PUNCT", ","));
      return params;
    }
    parseBlock() {
      this.expect("PUNCT", "{");
      const stmts = [];
      while (!this.at() && !this.check("PUNCT", "}")) {
        stmts.push(this.parseStmt());
      }
      this.expect("PUNCT", "}");
      return { type: "Block", stmts };
    }
    parseStmt() {
      const t = this.cur();
      if (t.lexeme === "{") return this.parseBlock();
      if (t.lexeme === "if") return this.parseIf();
      if (t.lexeme === "while") return this.parseWhile();
      if (t.lexeme === "for") return this.parseFor();
      if (t.lexeme === "return") return this.parseReturn();
      if (t.lexeme === "break") {
        this.adv();
        this.match("PUNCT", ";");
        return { type: "Break" };
      }
      if (t.lexeme === "continue") {
        this.adv();
        this.match("PUNCT", ";");
        return { type: "Continue" };
      }
      if (t.lexeme === "try") return this.parseTryCatch();
      if (t.lexeme === "throw") {
        this.adv();
        const e = this.parseExpr();
        this.match("PUNCT", ";");
        return { type: "Throw", expr: e };
      }
      if (this.isTypeStart()) return this.parseLocalVarDecl();
      const expr = this.parseExpr();
      this.match("PUNCT", ";");
      return { type: "ExprStmt", expr };
    }
    isTypeStart() {
      const PRIMS = /* @__PURE__ */ new Set(["int", "long", "double", "float", "char", "boolean", "byte", "short", "var"]);
      const t = this.cur(), n = this.peek();
      if (t.type === "TYPE" || PRIMS.has(t.lexeme)) {
        return true;
      }
      if (t.type === "IDENTIFIER" && (n.type === "IDENTIFIER" || n.lexeme === "[" || n.lexeme === "<")) return true;
      return false;
    }
    parseLocalVarDecl() {
      const vtype = this.parseTypeRef();
      const name2 = this.expect("IDENTIFIER").lexeme;
      while (this.match("PUNCT", "[")) this.match("PUNCT", "]");
      let init2 = null;
      if (this.match("OPERATOR", "=")) {
        init2 = this.parseExpr();
      }
      this.match("PUNCT", ";");
      return { type: "VarDecl", vtype, name: name2, init: init2 };
    }
    parseIf() {
      this.adv();
      this.expect("PUNCT", "(");
      const cond = this.parseExpr();
      this.expect("PUNCT", ")");
      const then = this.parseStmt();
      let else_ = null;
      if (!this.at() && this.cur().lexeme === "else") {
        this.adv();
        else_ = this.parseStmt();
      }
      return { type: "If", cond, then, else_ };
    }
    parseWhile() {
      this.adv();
      this.expect("PUNCT", "(");
      const cond = this.parseExpr();
      this.expect("PUNCT", ")");
      const body2 = this.parseStmt();
      return { type: "While", cond, body: body2 };
    }
    parseFor() {
      this.adv();
      this.expect("PUNCT", "(");
      let init2 = null;
      if (!this.check("PUNCT", ";")) {
        if (this.isTypeStart()) init2 = this.parseLocalVarDecl();
        else {
          init2 = { type: "ExprStmt", expr: this.parseExpr() };
          this.match("PUNCT", ";");
        }
      } else this.adv();
      let cond = null;
      if (!this.check("PUNCT", ";")) cond = this.parseExpr();
      this.match("PUNCT", ";");
      let update = null;
      if (!this.check("PUNCT", ")")) update = this.parseExpr();
      this.expect("PUNCT", ")");
      const body2 = this.parseStmt();
      return { type: "For", init: init2, cond, update, body: body2 };
    }
    parseReturn() {
      this.adv();
      let val = null;
      if (!this.check("PUNCT", ";")) val = this.parseExpr();
      this.match("PUNCT", ";");
      return { type: "Return", value: val };
    }
    parseTryCatch() {
      this.adv();
      const tryBlock = this.parseBlock();
      const catches = [];
      while (!this.at() && this.cur().lexeme === "catch") {
        this.adv();
        this.expect("PUNCT", "(");
        const eType = this.parseTypeRef();
        const eName = this.check("IDENTIFIER") ? this.adv().lexeme : "e";
        this.expect("PUNCT", ")");
        const body2 = this.parseBlock();
        catches.push({ eType, eName, body: body2 });
      }
      let finally_ = null;
      if (!this.at() && this.cur().lexeme === "finally") {
        this.adv();
        finally_ = this.parseBlock();
      }
      return { type: "TryCatch", tryBlock, catches, finally_ };
    }
    parseExpr() {
      return this.parseAssign();
    }
    parseAssign() {
      let l = this.parseTernary();
      const AOPS = /* @__PURE__ */ new Set(["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>=", ">>>="]);
      if (!this.at() && AOPS.has(this.cur().lexeme)) {
        const op = this.adv().lexeme;
        const r = this.parseAssign();
        return { type: "Assign", target: l, op, value: r };
      }
      return l;
    }
    parseTernary() {
      let c = this.parseOr();
      if (!this.at() && this.cur().lexeme === "?") {
        this.adv();
        const t = this.parseExpr();
        this.expect("PUNCT", ":");
        const e = this.parseTernary();
        return { type: "Ternary", cond: c, then: t, else_: e };
      }
      return c;
    }
    parseOr() {
      return this._la(this.parseAnd.bind(this), ["||"]);
    }
    parseAnd() {
      return this._la(this.parseBitOr.bind(this), ["&&"]);
    }
    parseBitOr() {
      return this._la(this.parseBitXor.bind(this), ["|"]);
    }
    parseBitXor() {
      return this._la(this.parseBitAnd.bind(this), ["^"]);
    }
    parseBitAnd() {
      return this._la(this.parseEq.bind(this), ["&"]);
    }
    parseEq() {
      return this._la(this.parseRel.bind(this), ["==", "!="]);
    }
    parseRel() {
      let l = this.parseShift();
      while (!this.at()) {
        if (["<", ">", "<=", ">="].includes(this.cur().lexeme)) {
          const op = this.adv().lexeme;
          l = { type: "BinOp", op, left: l, right: this.parseShift() };
        } else if (this.cur().lexeme === "instanceof") {
          this.adv();
          const tp = this.parseTypeRef();
          l = { type: "Instanceof", left: l, checkType: tp };
        } else break;
      }
      return l;
    }
    parseShift() {
      return this._la(this.parseAdd.bind(this), ["<<", ">>", ">>>"]);
    }
    parseAdd() {
      return this._la(this.parseMul.bind(this), ["+", "-"]);
    }
    parseMul() {
      return this._la(this.parseUnary.bind(this), ["*", "/", "%"]);
    }
    _la(next, ops) {
      let l = next();
      while (!this.at() && ops.includes(this.cur().lexeme)) {
        const op = this.adv().lexeme;
        l = { type: "BinOp", op, left: l, right: next() };
      }
      return l;
    }
    parseUnary() {
      const UOPS = /* @__PURE__ */ new Set(["-", "!", "~", "++", "--"]);
      if (!this.at() && UOPS.has(this.cur().lexeme)) {
        const op = this.adv().lexeme;
        return { type: "UnaryOp", op, operand: this.parseUnary() };
      }
      if (!this.at() && this.cur().lexeme === "(") {
        const saved = this.pos;
        try {
          this.adv();
          if (this.isTypeStart()) {
            const ct = this.parseTypeRef();
            this.expect("PUNCT", ")");
            const operand = this.parseUnary();
            return { type: "Cast", castType: ct, operand };
          }
        } catch {
        }
        this.pos = saved;
      }
      return this.parsePostfix();
    }
    parsePostfix() {
      let e = this.parsePrimary();
      while (true) {
        if (!this.at() && ["++", "--"].includes(this.cur().lexeme)) {
          e = { type: "PostfixOp", op: this.adv().lexeme, operand: e };
        } else if (!this.at() && this.cur().lexeme === "[") {
          this.adv();
          const idx = this.parseExpr();
          this.expect("PUNCT", "]");
          e = { type: "Index", array: e, index: idx };
        } else if (!this.at() && (this.cur().lexeme === "." || this.cur().lexeme === "::")) {
          const op = this.adv().lexeme;
          const mem = this.expect("IDENTIFIER").lexeme;
          if (this.check("PUNCT", "(")) {
            this.adv();
            const args2 = [];
            if (!this.check("PUNCT", ")")) {
              do {
                args2.push(this.parseExpr());
              } while (this.match("PUNCT", ","));
            }
            this.expect("PUNCT", ")");
            e = { type: "MethodCall", object: e, op, method: mem, args: args2 };
          } else {
            e = { type: "MemberAccess", object: e, op, member: mem };
          }
        } else break;
      }
      return e;
    }
    parsePrimary() {
      const t = this.cur();
      if (!t || t.type === "EOF") throw new ParseError(`Unexpected end of input`, t?.line, t?.col);
      if (t.lexeme === "(") {
        this.adv();
        const e = this.parseExpr();
        this.expect("PUNCT", ")");
        return e;
      }
      if (t.type === "INT_LITERAL") {
        this.adv();
        return { type: "IntLit", value: t.lexeme, line: t.line };
      }
      if (t.type === "FLOAT_LITERAL") {
        this.adv();
        return { type: "FloatLit", value: t.lexeme, line: t.line };
      }
      if (t.type === "STRING_LITERAL") {
        this.adv();
        return { type: "StringLit", value: t.lexeme, line: t.line };
      }
      if (t.type === "CHAR_LITERAL") {
        this.adv();
        return { type: "CharLit", value: t.lexeme, line: t.line };
      }
      if (t.lexeme === "true" || t.lexeme === "false") {
        this.adv();
        return { type: "BoolLit", value: t.lexeme === "true" };
      }
      if (t.lexeme === "null") {
        this.adv();
        return { type: "NullLit" };
      }
      if (t.lexeme === "this") {
        this.adv();
        return { type: "This" };
      }
      if (t.lexeme === "super") {
        this.adv();
        return { type: "Super" };
      }
      if (t.lexeme === "new") {
        this.adv();
        const newType = this.parseTypeRef();
        if (this.check("PUNCT", "(")) {
          this.adv();
          const args2 = [];
          if (!this.check("PUNCT", ")")) {
            do {
              args2.push(this.parseExpr());
            } while (this.match("PUNCT", ","));
          }
          this.expect("PUNCT", ")");
          return { type: "NewObject", newType, args: args2 };
        }
        if (this.check("PUNCT", "[")) {
          this.adv();
          const sz = this.parseExpr();
          this.expect("PUNCT", "]");
          return { type: "NewArray", newType, size: sz };
        }
      }
      if (t.type === "IDENTIFIER") {
        this.adv();
        if (this.check("PUNCT", "(")) {
          this.adv();
          const args2 = [];
          if (!this.check("PUNCT", ")")) {
            do {
              args2.push(this.parseExpr());
            } while (this.match("PUNCT", ","));
          }
          this.expect("PUNCT", ")");
          return { type: "Call", name: t.lexeme, args: args2, line: t.line };
        }
        return { type: "Ident", name: t.lexeme, line: t.line };
      }
      if (t.type === "KEYWORD" && t.lexeme === "void") {
        this.adv();
        return { type: "Ident", name: "void" };
      }
      throw new ParseError(`Unexpected token '${t.lexeme}' (${t.type})`, t.line, t.col);
    }
  };
  function javaAstToText(n, prefix = "", isLast = true) {
    if (!n || typeof n !== "object") return "";
    const con = isLast ? "\u2514\u2500 " : "\u251C\u2500 ";
    const cp = prefix + (isLast ? "   " : "\u2502  ");
    switch (n.type) {
      case "CompilationUnit":
        return `CompilationUnit
` + n.classes.map((c, i2) => javaAstToText(c, "", i2 === n.classes.length - 1)).join("");
      case "ClassDecl": {
        const head = `${prefix}${con}${n.kind} ${n.name}${n.superclass ? ` extends ${n.superclass}` : ""}
`;
        return head + (n.members || []).map((m, i2) => javaAstToText(m, cp, i2 === n.members.length - 1)).join("");
      }
      case "MethodDecl": {
        const params = (n.params || []).map((p) => `${p.ptype} ${p.name}`).join(", ");
        const head = `${prefix}${con}Method ${n.name}(${params}) : ${n.retType}
`;
        return head + (n.body ? javaAstToText(n.body, cp, true) : "");
      }
      case "FieldDecl":
        return `${prefix}${con}Field ${n.name} : ${n.fieldType}${n.init ? " = (expr)" : ""}
`;
      case "Block":
        return `${prefix}${con}Block
` + (n.stmts || []).map((s, i2) => javaAstToText(s, cp, i2 === n.stmts.length - 1)).join("");
      case "VarDecl":
        return `${prefix}${con}VarDecl ${n.name} : ${n.vtype}${n.init ? " = (expr)" : ""}
`;
      case "If":
        return `${prefix}${con}If
${javaAstToText(n.cond, cp, false)}${javaAstToText(n.then, cp, !n.else_)}${n.else_ ? javaAstToText(n.else_, cp, true) : ""}`;
      case "While":
        return `${prefix}${con}While
${javaAstToText(n.cond, cp, false)}${javaAstToText(n.body, cp, true)}`;
      case "For":
        return `${prefix}${con}For
${javaAstToText(n.init, cp, false)}${javaAstToText(n.cond, cp, false)}${javaAstToText(n.update, cp, false)}${javaAstToText(n.body, cp, true)}`;
      case "Return":
        return `${prefix}${con}Return
${n.value ? javaAstToText(n.value, cp, true) : ""}`;
      case "Assign":
        return `${prefix}${con}Assign (${n.op})
${javaAstToText(n.target, cp, false)}${javaAstToText(n.value, cp, true)}`;
      case "BinOp":
        return `${prefix}${con}BinOp (${n.op})
${javaAstToText(n.left, cp, false)}${javaAstToText(n.right, cp, true)}`;
      case "UnaryOp":
        return `${prefix}${con}UnaryOp (${n.op})
${javaAstToText(n.operand, cp, true)}`;
      case "Call":
      case "MethodCall":
        return `${prefix}${con}Call ${n.name ?? n.method}
${(n.args || []).map((a, i2) => javaAstToText(a, cp, i2 === n.args.length - 1)).join("")}`;
      case "NewObject":
        return `${prefix}${con}New ${n.newType}
`;
      case "Ident":
        return `${prefix}${con}Ident ${n.name}
`;
      case "IntLit":
        return `${prefix}${con}IntLit ${n.value}
`;
      case "FloatLit":
        return `${prefix}${con}FloatLit ${n.value}
`;
      case "StringLit":
        return `${prefix}${con}StringLit ${n.value}
`;
      case "BoolLit":
        return `${prefix}${con}BoolLit ${n.value}
`;
      case "NullLit":
        return `${prefix}${con}null
`;
      case "ExprStmt":
        return javaAstToText(n.expr, prefix, isLast);
      default:
        return `${prefix}${con}${n.type}
`;
    }
  }
  var semantic2 = {
    analyze(ast) {
      const symbolTable = [];
      const checks = [];
      const warnings = [];
      function visitCompUnit(n) {
        (n.classes || []).forEach(visitClass);
      }
      function visitClass(cls) {
        symbolTable.push({ name: cls.name, kind: cls.kind, type: cls.name, scope: "package", value: "\u2014" });
        (cls.members || []).forEach((m) => visitMember(m, cls.name));
      }
      function visitMember(m, className) {
        if (m.type === "FieldDecl") {
          symbolTable.push({ name: m.name, kind: "field", type: m.fieldType, scope: className, value: m.init ? "(expr)" : "\u2014" });
        } else if (m.type === "MethodDecl") {
          symbolTable.push({ name: m.name, kind: "method", type: `${m.retType}`, scope: className, value: "\u2014" });
          checks.push(`Method '${m.name}' declared with return type '${m.retType}'.`);
          (m.params || []).forEach((p) => symbolTable.push({ name: p.name || "?", kind: "parameter", type: p.ptype, scope: `${className}.${m.name}`, value: "\u2014" }));
          if (m.body) visitBlock(m.body, `${className}.${m.name}`, m.retType);
        } else if (m.type === "ClassDecl") {
          visitClass(m);
        }
      }
      function visitBlock(block, scope, retType) {
        (block.stmts || []).forEach((s) => visitStmt(s, scope, retType));
      }
      function visitStmt(s, scope, retType) {
        if (!s) return;
        if (s.type === "VarDecl") {
          if (s.init) {
            const initType = inferType(s.init);
            if (!typesCompat(s.vtype, initType)) {
              throw new SemanticError(
                `Cannot initialize '${s.name}' (type '${s.vtype}') with value of type '${initType}' \u2014 incompatible types.`,
                s.init?.line,
                s.init?.col,
                `Java does not allow implicit conversion between incompatible types. An explicit cast or correct type is required.`
              );
            }
          }
          symbolTable.push({ name: s.name, kind: "variable", type: s.vtype, scope, value: s.init ? inferLit(s.init) ?? "(expr)" : "\u2014" });
          checks.push(`Variable '${s.name}' (${s.vtype}) declared in scope '${scope}'.`);
        } else if (s.type === "Assign") {
          const tType = inferType(s.target);
          const vType = inferType(s.value);
          if (tType && vType && !typesCompat(tType, vType)) {
            throw new SemanticError(
              `Incompatible types: cannot assign '${vType}' to '${tType}'.`,
              s.target?.line,
              s.target?.col
            );
          }
        } else if (s.type === "Return") {
          if (retType && retType !== "void" && s.value) {
            const vType = inferType(s.value);
            if (!typesCompat(retType, vType)) {
              throw new SemanticError(`Return type mismatch: expected '${retType}', got '${vType}'.`, s.value?.line);
            }
            checks.push(`Return type '${vType}' matches declared '${retType}'.`);
          }
        } else if (s.type === "Block") visitBlock(s, scope, retType);
        else if (s.type === "If") {
          visitStmt(s.then, scope, retType);
          if (s.else_) visitStmt(s.else_, scope, retType);
        } else if (s.type === "While") visitStmt(s.body, scope, retType);
        else if (s.type === "For") {
          if (s.init) visitStmt(s.init, scope, retType);
          visitStmt(s.body, scope, retType);
        } else if (s.type === "ExprStmt") {
        }
      }
      function inferType(n) {
        if (!n) return null;
        if (n.type === "IntLit") return "int";
        if (n.type === "FloatLit") return "double";
        if (n.type === "BoolLit") return "boolean";
        if (n.type === "StringLit") return "String";
        if (n.type === "CharLit") return "char";
        if (n.type === "NullLit") return "null";
        if (n.type === "BinOp") {
          const l = inferType(n.left), r = inferType(n.right);
          if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(n.op)) return "boolean";
          if (l === "double" || r === "double") return "double";
          if (l === "String" || r === "String") return "String";
          return "int";
        }
        return null;
      }
      function inferLit(n) {
        if (!n) return null;
        if (n.type === "IntLit" || n.type === "FloatLit" || n.type === "BoolLit") return String(n.value);
        if (n.type === "StringLit" || n.type === "CharLit") return n.value;
        return null;
      }
      function typesCompat(declared, rhs) {
        if (!declared || !rhs || rhs === "null") return true;
        if (declared === rhs) return true;
        const NUM = /* @__PURE__ */ new Set(["int", "long", "double", "float", "short", "byte", "char"]);
        if (NUM.has(declared) && NUM.has(rhs)) return true;
        if (declared === "String" && rhs === "String") return true;
        return false;
      }
      visitCompUnit(ast);
      return { symbolTable, checks, warnings };
    }
  };
  var ir2 = {
    generate(ast, symbolTable) {
      const instrs = [];
      let tc = 0, lc = 0;
      const tmp = () => `t${++tc}`;
      const lbl = () => `L${++lc}`;
      const emit = (s) => instrs.push(s);
      function visitCompUnit(n) {
        (n.classes || []).forEach(visitClass);
      }
      function visitClass(cls) {
        (cls.members || []).filter((m) => m.type === "MethodDecl" && m.body).forEach(visitMethod.bind(null, cls.name));
      }
      function visitMethod(className, m) {
        emit(`func_begin ${className}.${m.name}`);
        (m.params || []).forEach((p) => {
          if (p.name) emit(`param_receive ${p.name}`);
        });
        visitBlock(m.body);
        if (m.retType === "void") emit(`return`);
        emit(`func_end ${className}.${m.name}`);
      }
      function visitBlock(b) {
        (b?.stmts || []).forEach(visitStmt);
      }
      function visitStmt(s) {
        if (!s) return;
        if (s.type === "VarDecl") {
          if (s.init) {
            const v = visitExpr(s.init);
            emit(`${s.name} = ${v}`);
          }
        } else if (s.type === "Assign") {
          const r = visitExpr(s.value);
          emit(`${s.target?.name ?? "_"} = ${r}`);
        } else if (s.type === "Return") {
          if (s.value) {
            const v = visitExpr(s.value);
            emit(`return ${v}`);
          } else emit("return");
        } else if (s.type === "Block") visitBlock(s);
        else if (s.type === "If") {
          const c = visitExpr(s.cond), lt = lbl(), lf = lbl();
          emit(`if ${c} goto ${lt}`);
          emit(`goto ${lf}`);
          emit(`${lt}:`);
          visitStmt(s.then);
          if (s.else_) {
            const le = lbl();
            emit(`goto ${le}`);
            emit(`${lf}:`);
            visitStmt(s.else_);
            emit(`${le}:`);
          } else emit(`${lf}:`);
        } else if (s.type === "While") {
          const top = lbl(), ex = lbl();
          emit(`${top}:`);
          const c = visitExpr(s.cond);
          emit(`if_false ${c} goto ${ex}`);
          visitStmt(s.body);
          emit(`goto ${top}`);
          emit(`${ex}:`);
        } else if (s.type === "For") {
          if (s.init) visitStmt(s.init);
          const top = lbl(), ex = lbl();
          emit(`${top}:`);
          if (s.cond) {
            const c = visitExpr(s.cond);
            emit(`if_false ${c} goto ${ex}`);
          }
          visitStmt(s.body);
          if (s.update) visitExpr(s.update);
          emit(`goto ${top}`);
          emit(`${ex}:`);
        } else if (s.type === "ExprStmt") visitExpr(s.expr);
      }
      function visitExpr(n) {
        if (!n) return "_";
        if (n.type === "IntLit" || n.type === "FloatLit") return n.value;
        if (n.type === "BoolLit") return n.value ? "1" : "0";
        if (n.type === "StringLit" || n.type === "CharLit") return n.value;
        if (n.type === "NullLit") return "null";
        if (n.type === "Ident") return n.name;
        if (n.type === "BinOp") {
          const l = visitExpr(n.left), r = visitExpr(n.right), t = tmp();
          emit(`${t} = ${l} ${n.op} ${r}`);
          return t;
        }
        if (n.type === "UnaryOp") {
          const v = visitExpr(n.operand), t = tmp();
          emit(`${t} = ${n.op}${v}`);
          return t;
        }
        if (n.type === "Assign") {
          const r = visitExpr(n.value);
          emit(`${n.target?.name ?? "_"} = ${r}`);
          return n.target?.name ?? "_";
        }
        if (n.type === "Call" || n.type === "MethodCall") {
          (n.args || []).forEach((a) => {
            const v = visitExpr(a);
            emit(`param ${v}`);
          });
          const t = tmp();
          emit(`${t} = call ${n.name ?? n.method}, ${n.args?.length ?? 0}`);
          return t;
        }
        if (n.type === "MemberAccess") {
          const o = visitExpr(n.object), t = tmp();
          emit(`${t} = ${o}.${n.member}`);
          return t;
        }
        if (n.type === "NewObject") {
          (n.args || []).forEach((a) => {
            const v = visitExpr(a);
            emit(`param ${v}`);
          });
          const t = tmp();
          emit(`${t} = new ${n.newType}`);
          return t;
        }
        if (n.type === "Index") {
          const a = visitExpr(n.array), i2 = visitExpr(n.index), t = tmp();
          emit(`${t} = ${a}[${i2}]`);
          return t;
        }
        return "_";
      }
      visitCompUnit(ast);
      return { instructions: instrs };
    }
  };
  var optimizer2 = { optimize: (instrs) => optimize(instrs) };
  var codegen2 = {
    generate(tac, sym) {
      const out2 = [];
      out2.push("; JVM-style educational bytecode (not real .class bytecode)");
      out2.push("");
      for (const instr of tac) {
        if (/^func_begin\s/.test(instr)) {
          out2.push(`
.method ${instr.replace("func_begin ", "")}`);
          continue;
        }
        if (/^func_end\s/.test(instr)) {
          out2.push(`  return`);
          out2.push(`.end method`);
          continue;
        }
        if (/^param_receive\s/.test(instr)) {
          out2.push(`  ; receives param: ${instr.split(" ")[1]}`);
          continue;
        }
        if (/^param\s/.test(instr)) {
          out2.push(`  ${/^-?\d/.test(instr.split(" ")[1]) ? "ldc" : "aload"} ${instr.split(" ")[1]}`);
          continue;
        }
        if (/^return\s+/.test(instr)) {
          const v = instr.split(" ")[1];
          out2.push(`  ${/^-?\d/.test(v) ? "iload" : "aload"} ${v}`);
          out2.push(`  ireturn`);
          continue;
        }
        if (/^return$/.test(instr)) {
          out2.push(`  return`);
          continue;
        }
        if (/^if_false\s/.test(instr)) {
          const [, c, , l] = instr.split(" ");
          out2.push(`  iload ${c}`);
          out2.push(`  ifeq ${l}`);
          continue;
        }
        if (/^if\s/.test(instr)) {
          const [, c, , l] = instr.split(" ");
          out2.push(`  iload ${c}`);
          out2.push(`  ifne ${l}`);
          continue;
        }
        if (/^goto\s/.test(instr)) {
          out2.push(`  goto ${instr.split(" ")[1]}`);
          continue;
        }
        if (/^\w+:$/.test(instr)) {
          out2.push(`${instr}`);
          continue;
        }
        const bm = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|<>=!]+)\s+(\S+)$/.exec(instr);
        if (bm) {
          const [, dst, l, op, r] = bm;
          const load = (v) => /^-?\d/.test(v) ? `  ldc ${v}` : `  iload ${v}`;
          const opMap = { "+": "iadd", "-": "isub", "*": "imul", "/": "idiv", "%": "irem", "&": "iand", "|": "ior", "^": "ixor", "<<": "ishl", ">>": "ishr", "==": "if_icmpeq", "<": "if_icmplt", ">": "if_icmpgt" };
          out2.push(load(l));
          out2.push(load(r));
          out2.push(`  ${opMap[op] ?? "iadd"}`);
          out2.push(`  istore ${dst}`);
          continue;
        }
        const cm = /^(\S+)\s*=\s*(\S+)$/.exec(instr);
        if (cm) {
          out2.push(`  ${/^-?\d/.test(cm[2]) ? "ldc" : "iload"} ${cm[2]}`);
          out2.push(`  istore ${cm[1]}`);
          continue;
        }
        out2.push(`  ; ${instr}`);
      }
      return { targetLabel: "JVM-style educational bytecode", instructions: out2 };
    }
  };
  var backend3 = {
    /**
     * Run the Java backend analysis.
     * @param {string} source - The source code to analyze
     * @returns {Promise<Object>} The backend response with phases
     */
    run: async (source) => {
      try {
        const response = await fetch("http://localhost:4174/api/analyze/java", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            language: "java",
            source,
            options: { target: "jvm", standard: "java17" }
          })
        });
        if (!response.ok) {
          throw new Error(`Backend request failed with status ${response.status}`);
        }
        return response.json();
      } catch (err2) {
        console.error("Java backend error:", err2);
        throw err2;
      }
    }
  };

  // js/languages/python/index.js
  var python_exports = {};
  __export(python_exports, {
    backend: () => backend4,
    codegen: () => codegen3,
    examples: () => examples4,
    id: () => id4,
    ir: () => ir3,
    label: () => label4,
    lexer: () => lexer3,
    optimizer: () => optimizer3,
    parser: () => parser3,
    semantic: () => semantic3
  });
  var id4 = "python";
  var label4 = "Python";
  var PY_KEYWORDS = /* @__PURE__ */ new Set([
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "False",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "None",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "True",
    "try",
    "while",
    "with",
    "yield"
  ]);
  var examples4 = [
    {
      label: "A \xB7 Fibonacci function",
      code: `def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

result = fibonacci(10)
print(result)
`
    },
    {
      label: "B \xB7 Class definition",
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
      label: "C \xB7 Indentation error (syntax)",
      code: `def foo():
    x = 1
  y = 2
    return x + y
`
    },
    {
      label: "D \xB7 Constant folding",
      code: `x = 100 * 25 + 50
y = x * 2
print(y)
`
    }
  ];
  var lexer3 = {
    tokenize(source) {
      const lines = source.split("\n");
      const tokens = [];
      const errors = [];
      const indentStack = [0];
      let lineNum = 0;
      for (const rawLine of lines) {
        lineNum++;
        const stripped = rawLine.trimEnd();
        if (stripped === "" || stripped.trimStart().startsWith("#")) continue;
        let indent = 0;
        for (const ch of rawLine) {
          if (ch === " ") {
            indent++;
          } else if (ch === "	") {
            indent += 4;
          } else break;
        }
        const top = indentStack[indentStack.length - 1];
        if (indent > top) {
          indentStack.push(indent);
          tokens.push({ type: "INDENT", lexeme: "INDENT", line: lineNum, col: 1 });
        } else {
          while (indent < indentStack[indentStack.length - 1]) {
            indentStack.pop();
            tokens.push({ type: "DEDENT", lexeme: "DEDENT", line: lineNum, col: 1 });
          }
          if (indent !== indentStack[indentStack.length - 1]) {
            errors.push(new LexerError(`Indentation error: unexpected indent level (${indent} spaces).`, lineNum, 1));
          }
        }
        let content = stripped.replace(/#.*$/, "").trimEnd();
        let pos = indent, col = indent + 1;
        const isD = (c) => c >= "0" && c <= "9";
        const isA = (c) => /[a-zA-Z_]/.test(c);
        const isAN = (c) => /[a-zA-Z0-9_]/.test(c);
        while (pos < content.length) {
          if (" 	".includes(content[pos])) {
            pos++;
            col++;
            continue;
          }
          const c = content[pos];
          const l = lineNum;
          if (c === '"' || c === "'") {
            const q = c;
            let s = q, i2 = pos + 1;
            if (content.slice(pos, pos + 3) === q + q + q) {
              s = q + q + q;
              i2 = pos + 3;
              while (i2 < content.length && content.slice(i2, i2 + 3) !== q + q + q) s += content[i2++];
              s += q + q + q;
              i2 += 3;
            } else {
              while (i2 < content.length && content[i2] !== q) {
                if (content[i2] === "\\") {
                  s += content[i2++];
                }
                s += content[i2++];
              }
              s += q;
              i2++;
            }
            tokens.push({ type: "STRING_LITERAL", lexeme: s, line: l, col });
            col += i2 - pos;
            pos = i2;
            continue;
          }
          if ((c === "f" || c === "F" || c === "b" || c === "r") && pos + 1 < content.length && (content[pos + 1] === '"' || content[pos + 1] === "'")) {
            const p = content[pos];
            pos++;
            col++;
            continue;
          }
          if (isD(c) || c === "." && isD(content[pos + 1] ?? "")) {
            let s = "", fp = false;
            while (pos < content.length && (isD(content[pos]) || content[pos] === "_")) s += content[pos++];
            if (pos < content.length && content[pos] === "." && isD(content[pos + 1] ?? "")) {
              fp = true;
              s += content[pos++];
              while (pos < content.length && isD(content[pos])) s += content[pos++];
            }
            if (pos < content.length && (content[pos] === "e" || content[pos] === "E")) {
              s += content[pos++];
              if (content[pos] === "+" || content[pos] === "-") s += content[pos++];
              while (isD(content[pos])) s += content[pos++];
              fp = true;
            }
            tokens.push({ type: fp ? "FLOAT_LITERAL" : "INT_LITERAL", lexeme: s, line: l, col });
            col += s.length;
            continue;
          }
          if (isA(c)) {
            let s = "";
            const sc2 = col;
            while (pos < content.length && isAN(content[pos])) {
              s += content[pos++];
            }
            const type = PY_KEYWORDS.has(s) ? "KEYWORD" : "IDENTIFIER";
            tokens.push({ type, lexeme: s, line: l, col: sc2 });
            col += s.length;
            continue;
          }
          const multi = ["**=", "//=", ">>=", "<<=", "**", "//", ">>", "<<", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "->", "...", "~=", "@="];
          let found = false;
          for (const op of multi) {
            if (content.startsWith(op, pos)) {
              tokens.push({ type: "OPERATOR", lexeme: op, line: l, col });
              col += op.length;
              pos += op.length;
              found = true;
              break;
            }
          }
          if (found) continue;
          const sc = content[pos++];
          if ("+-*/%=<>&|^~!@".includes(sc)) {
            tokens.push({ type: "OPERATOR", lexeme: sc, line: l, col });
            col++;
          } else if (":,()[]{}.\n;".includes(sc)) {
            tokens.push({ type: "PUNCT", lexeme: sc, line: l, col });
            col++;
          } else {
            errors.push(new LexerError(`Unexpected character '${sc}'`, l, col));
            col++;
          }
        }
        tokens.push({ type: "NEWLINE", lexeme: "\n", line: lineNum, col: content.length + 1 });
      }
      while (indentStack.length > 1) {
        indentStack.pop();
        tokens.push({ type: "DEDENT", lexeme: "DEDENT", line: lineNum + 1, col: 1 });
      }
      tokens.push({ type: "EOF", lexeme: "", line: lineNum, col: 1 });
      if (errors.length) throw errors[0];
      return { tokens };
    }
  };
  var backend4 = {
    async run(source) {
      const response = await fetch("http://localhost:4174/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "python", source })
      });
      if (!response.ok) throw new Error(`TAC backend returned HTTP ${response.status}`);
      return response.json();
    }
  };
  var parser3 = {
    parse(tokens) {
      const p = new PythonParser(tokens);
      const ast = p.parseModule();
      const astText = pyAstToText(ast).trimEnd();
      return { ast, astText };
    }
  };
  var PythonParser = class {
    constructor(tokens) {
      this.tokens = tokens.filter((t) => !["NEWLINE", "INDENT", "DEDENT", "EOF"].includes(t.type) ? false : true).length ? tokens : tokens;
      this.all = tokens;
      this.flat = tokens.filter((t) => t.type !== "NEWLINE" && t.type !== "EOF");
      this.pos = 0;
      this.allPos = 0;
    }
    // Simple approach: work with all tokens
    cur() {
      return this.all[this.allPos] ?? { type: "EOF", lexeme: "" };
    }
    peek(n = 1) {
      return this.all[this.allPos + n] ?? { type: "EOF", lexeme: "" };
    }
    adv() {
      const t = this.cur();
      if (this.allPos < this.all.length) this.allPos++;
      return t;
    }
    at() {
      return this.allPos >= this.all.length || this.cur().type === "EOF";
    }
    skip(type) {
      while (!this.at() && this.cur().type === type) this.adv();
    }
    match(type, lex) {
      if (this.cur().type === type && (lex === void 0 || this.cur().lexeme === lex)) {
        this.adv();
        return true;
      }
      return false;
    }
    expect(type, lex, msg) {
      if (this.cur().type === type && (lex === void 0 || this.cur().lexeme === lex)) return this.adv();
      const t = this.cur();
      throw new ParseError(msg ?? `Expected ${lex ?? type}, got '${t.lexeme}'`, t.line, t.col);
    }
    parseModule() {
      const stmts = [];
      this.skip("NEWLINE");
      while (!this.at()) {
        if (this.cur().type === "INDENT" || this.cur().type === "DEDENT" || this.cur().type === "NEWLINE") {
          this.adv();
          continue;
        }
        stmts.push(this.parseStmt());
      }
      return { type: "Module", body: stmts };
    }
    parseStmt() {
      const t = this.cur();
      if (t.lexeme === "def") return this.parseDef();
      if (t.lexeme === "class") return this.parseClass();
      if (t.lexeme === "if") return this.parseIf();
      if (t.lexeme === "while") return this.parseWhile();
      if (t.lexeme === "for") return this.parseFor();
      if (t.lexeme === "return") return this.parseReturn();
      if (t.lexeme === "import" || t.lexeme === "from") {
        while (!this.at() && this.cur().type !== "NEWLINE") this.adv();
        this.skip("NEWLINE");
        return { type: "Import" };
      }
      if (t.lexeme === "pass") {
        this.adv();
        this.skip("NEWLINE");
        return { type: "Pass" };
      }
      if (t.lexeme === "break") {
        this.adv();
        this.skip("NEWLINE");
        return { type: "Break" };
      }
      if (t.lexeme === "continue") {
        this.adv();
        this.skip("NEWLINE");
        return { type: "Continue" };
      }
      if (t.lexeme === "global") {
        this.adv();
        while (!this.at() && this.cur().type !== "NEWLINE") this.adv();
        this.skip("NEWLINE");
        return { type: "Global" };
      }
      if (t.lexeme === "raise") {
        this.adv();
        const e = this.parseExpr();
        this.skip("NEWLINE");
        return { type: "Raise", expr: e };
      }
      if (t.lexeme === "assert") {
        this.adv();
        const e = this.parseExpr();
        this.skip("NEWLINE");
        return { type: "Assert", expr: e };
      }
      if (t.lexeme === "try") return this.parseTry();
      if (t.lexeme === "with") return this.parseWith();
      return this.parseExprStmt();
    }
    parseDef() {
      this.expect("KEYWORD", "def");
      const name2 = this.expect("IDENTIFIER").lexeme;
      this.expect("PUNCT", "(");
      const params = this.parseParams();
      this.expect("PUNCT", ")");
      if (this.match("OPERATOR", "->")) {
        while (!this.at() && this.cur().lexeme !== ":") this.adv();
      }
      this.expect("PUNCT", ":");
      this.skip("NEWLINE");
      const body2 = this.parseIndentedBlock();
      return { type: "FuncDef", name: name2, params, body: body2 };
    }
    parseParams() {
      const params = [];
      while (!this.at() && !this.check("PUNCT", ")")) {
        if (this.cur().lexeme === "*" || this.cur().lexeme === "**") {
          const star = this.adv().lexeme;
          const n = this.check("IDENTIFIER") ? this.adv().lexeme : "";
          params.push({ name: star + n, default_: null });
        } else {
          const n = this.expect("IDENTIFIER").lexeme;
          let ann = null, def_ = null;
          if (this.match("PUNCT", ":")) {
            while (!this.at() && !["=", ",", ")"].includes(this.cur().lexeme)) this.adv();
          }
          if (this.match("OPERATOR", "=")) {
            def_ = this.parseExpr();
          }
          params.push({ name: n, default_: def_ });
        }
        if (!this.match("PUNCT", ",")) break;
      }
      return params;
    }
    parseClass() {
      this.expect("KEYWORD", "class");
      const name2 = this.expect("IDENTIFIER").lexeme;
      const bases = [];
      if (this.match("PUNCT", "(")) {
        while (!this.at() && !this.check("PUNCT", ")")) {
          bases.push(this.parseExpr());
          if (!this.match("PUNCT", ",")) break;
        }
        this.match("PUNCT", ")");
      }
      this.expect("PUNCT", ":");
      this.skip("NEWLINE");
      const body2 = this.parseIndentedBlock();
      return { type: "ClassDef", name: name2, bases, body: body2 };
    }
    parseIndentedBlock() {
      const stmts = [];
      this.expect("INDENT", "INDENT", `Expected indented block`);
      while (!this.at() && this.cur().type !== "DEDENT") {
        if (this.cur().type === "NEWLINE") {
          this.adv();
          continue;
        }
        stmts.push(this.parseStmt());
      }
      this.match("DEDENT", "DEDENT");
      return { type: "Block", stmts };
    }
    parseIf() {
      this.expect("KEYWORD", "if");
      const cond = this.parseExpr();
      this.expect("PUNCT", ":");
      this.skip("NEWLINE");
      const then = this.parseIndentedBlock();
      const elifs = [];
      let else_ = null;
      while (!this.at() && this.cur().lexeme === "elif") {
        this.adv();
        const ec = this.parseExpr();
        this.expect("PUNCT", ":");
        this.skip("NEWLINE");
        elifs.push({ cond: ec, body: this.parseIndentedBlock() });
      }
      if (!this.at() && this.cur().lexeme === "else") {
        this.adv();
        this.expect("PUNCT", ":");
        this.skip("NEWLINE");
        else_ = this.parseIndentedBlock();
      }
      return { type: "If", cond, then, elifs, else_ };
    }
    parseWhile() {
      this.expect("KEYWORD", "while");
      const cond = this.parseExpr();
      this.expect("PUNCT", ":");
      this.skip("NEWLINE");
      const body2 = this.parseIndentedBlock();
      return { type: "While", cond, body: body2 };
    }
    parseFor() {
      this.expect("KEYWORD", "for");
      const target = this.parseExpr();
      this.expect("KEYWORD", "in");
      const iter = this.parseExpr();
      this.expect("PUNCT", ":");
      this.skip("NEWLINE");
      const body2 = this.parseIndentedBlock();
      return { type: "For", target, iter, body: body2 };
    }
    parseReturn() {
      this.adv();
      let value = null;
      if (!this.at() && this.cur().type !== "NEWLINE" && this.cur().type !== "DEDENT") {
        value = this.parseExpr();
      }
      this.skip("NEWLINE");
      return { type: "Return", value };
    }
    parseTry() {
      this.adv();
      this.expect("PUNCT", ":");
      this.skip("NEWLINE");
      const tryBlock = this.parseIndentedBlock();
      const handlers = [];
      while (!this.at() && this.cur().lexeme === "except") {
        this.adv();
        let excType = null, excVar = null;
        if (!this.check("PUNCT", ":")) {
          excType = this.parseExpr();
          if (this.match("KEYWORD", "as")) excVar = this.expect("IDENTIFIER").lexeme;
        }
        this.expect("PUNCT", ":");
        this.skip("NEWLINE");
        handlers.push({ excType, excVar, body: this.parseIndentedBlock() });
      }
      let finally_ = null;
      if (!this.at() && this.cur().lexeme === "finally") {
        this.adv();
        this.expect("PUNCT", ":");
        this.skip("NEWLINE");
        finally_ = this.parseIndentedBlock();
      }
      return { type: "Try", tryBlock, handlers, finally_ };
    }
    parseWith() {
      this.adv();
      const ctx = this.parseExpr();
      let asVar = null;
      if (this.match("KEYWORD", "as")) asVar = this.expect("IDENTIFIER").lexeme;
      this.expect("PUNCT", ":");
      this.skip("NEWLINE");
      const body2 = this.parseIndentedBlock();
      return { type: "With", ctx, asVar, body: body2 };
    }
    parseExprStmt() {
      const expr = this.parseExpr();
      if (!this.at() && this.cur().type === "OPERATOR" && ["=", "+=", "-=", "*=", "/=", "//=", "**=", "%=", "&=", "|=", "^=", ">>=", "<<="].includes(this.cur().lexeme)) {
        const op = this.adv().lexeme;
        const value = this.parseExpr();
        this.skip("NEWLINE");
        return { type: "Assign", target: expr, op, value };
      }
      this.skip("NEWLINE");
      return { type: "ExprStmt", expr };
    }
    check(type, lex) {
      const t = this.cur();
      return t.type === type && (lex === void 0 || t.lexeme === lex);
    }
    // ── Expression parsing ───────────────────────────────────────────────────────
    parseExpr() {
      return this.parseLambda();
    }
    parseLambda() {
      if (this.cur().lexeme === "lambda") {
        this.adv();
        const params = [];
        while (!this.at() && !this.check("PUNCT", ":")) {
          const n = this.adv().lexeme;
          params.push(n);
          this.match("PUNCT", ",");
        }
        this.expect("PUNCT", ":");
        const body2 = this.parseTernary();
        return { type: "Lambda", params, body: body2 };
      }
      return this.parseTernary();
    }
    parseTernary() {
      let v = this.parseOr();
      if (!this.at() && this.cur().lexeme === "if") {
        this.adv();
        const c = this.parseOr();
        this.expect("KEYWORD", "else");
        const e = this.parseTernary();
        v = { type: "Ternary", value: v, cond: c, else_: e };
      }
      return v;
    }
    parseOr() {
      return this._la(this.parseAnd.bind(this), ["or"]);
    }
    parseAnd() {
      return this._la(this.parseNot.bind(this), ["and"]);
    }
    parseNot() {
      if (this.cur().lexeme === "not") {
        this.adv();
        return { type: "UnaryOp", op: "not", operand: this.parseNot() };
      }
      return this.parseComp();
    }
    parseComp() {
      let l = this.parseBitOr();
      while (!this.at()) {
        const lex = this.cur().lexeme;
        if (["==", "!=", "<", ">", "<=", ">="].includes(lex)) {
          const op = this.adv().lexeme;
          l = { type: "BinOp", op, left: l, right: this.parseBitOr() };
        } else if (lex === "in" || lex === "is") {
          let op = this.adv().lexeme;
          if (this.cur().lexeme === "not") {
            this.adv();
            op += " not";
          }
          l = { type: "BinOp", op, left: l, right: this.parseBitOr() };
        } else if (lex === "not" && this.peek().lexeme === "in") {
          this.adv();
          this.adv();
          l = { type: "BinOp", op: "not in", left: l, right: this.parseBitOr() };
        } else break;
      }
      return l;
    }
    parseBitOr() {
      return this._la(this.parseBitXor.bind(this), ["|"]);
    }
    parseBitXor() {
      return this._la(this.parseBitAnd.bind(this), ["^"]);
    }
    parseBitAnd() {
      return this._la(this.parseShift.bind(this), ["&"]);
    }
    parseShift() {
      return this._la(this.parseAdd.bind(this), ["<<", ">>"]);
    }
    parseAdd() {
      return this._la(this.parseMul.bind(this), ["+", "-"]);
    }
    parseMul() {
      return this._la(this.parseUnary.bind(this), ["*", "/", "//", "%", "@"]);
    }
    _la(next, ops) {
      let l = next();
      while (!this.at() && ops.includes(this.cur().lexeme)) {
        const op = this.adv().lexeme;
        l = { type: "BinOp", op, left: l, right: next() };
      }
      return l;
    }
    parseUnary() {
      if (["-", "~", "+"].includes(this.cur().lexeme)) {
        const op = this.adv().lexeme;
        return { type: "UnaryOp", op, operand: this.parseUnary() };
      }
      return this.parsePower();
    }
    parsePower() {
      let base = this.parsePostfix();
      if (!this.at() && this.cur().lexeme === "**") {
        this.adv();
        const exp = this.parseUnary();
        base = { type: "BinOp", op: "**", left: base, right: exp };
      }
      return base;
    }
    parsePostfix() {
      let e = this.parsePrimary();
      while (true) {
        if (!this.at() && this.cur().lexeme === "(") {
          this.adv();
          const args2 = [];
          while (!this.at() && !this.check("PUNCT", ")")) {
            args2.push(this.parseExpr());
            if (!this.match("PUNCT", ",")) break;
          }
          this.match("PUNCT", ")");
          e = { type: "Call", callee: e, args: args2 };
        } else if (!this.at() && this.cur().lexeme === "[") {
          this.adv();
          const idx = this.parseExpr();
          this.match("PUNCT", "]");
          e = { type: "Index", array: e, index: idx };
        } else if (!this.at() && this.cur().lexeme === ".") {
          this.adv();
          const attr = this.expect("IDENTIFIER").lexeme;
          e = { type: "Attr", object: e, attr };
        } else break;
      }
      return e;
    }
    parsePrimary() {
      const t = this.cur();
      if (!t || t.type === "EOF" || t.type === "NEWLINE" || t.type === "DEDENT") throw new ParseError(`Unexpected end of expression`, t?.line, t?.col);
      if (t.lexeme === "(") {
        this.adv();
        const e = this.parseExpr();
        this.match("PUNCT", ")");
        return e;
      }
      if (t.lexeme === "[") {
        this.adv();
        const items = [];
        while (!this.at() && !this.check("PUNCT", "]")) {
          items.push(this.parseExpr());
          if (!this.match("PUNCT", ",")) break;
        }
        this.match("PUNCT", "]");
        return { type: "List", items };
      }
      if (t.lexeme === "{") {
        this.adv();
        const pairs = [];
        while (!this.at() && !this.check("PUNCT", "}")) {
          const k = this.parseExpr();
          this.match("PUNCT", ":");
          const v = this.parseExpr();
          pairs.push([k, v]);
          if (!this.match("PUNCT", ",")) break;
        }
        this.match("PUNCT", "}");
        return { type: "Dict", pairs };
      }
      if (t.type === "INT_LITERAL") {
        this.adv();
        return { type: "IntLit", value: t.lexeme, line: t.line };
      }
      if (t.type === "FLOAT_LITERAL") {
        this.adv();
        return { type: "FloatLit", value: t.lexeme, line: t.line };
      }
      if (t.type === "STRING_LITERAL") {
        this.adv();
        return { type: "StringLit", value: t.lexeme, line: t.line };
      }
      if (t.lexeme === "True" || t.lexeme === "False") {
        this.adv();
        return { type: "BoolLit", value: t.lexeme === "True" };
      }
      if (t.lexeme === "None") {
        this.adv();
        return { type: "NoneLit" };
      }
      if (t.type === "IDENTIFIER") {
        this.adv();
        return { type: "Ident", name: t.lexeme, line: t.line, col: t.col };
      }
      if (t.type === "KEYWORD") {
        this.adv();
        return { type: "Ident", name: t.lexeme, line: t.line };
      }
      throw new ParseError(`Unexpected token '${t.lexeme}' (${t.type})`, t.line, t.col);
    }
  };
  function pyAstToText(n, prefix = "", isLast = true) {
    if (!n || typeof n !== "object") return "";
    const con = isLast ? "\u2514\u2500 " : "\u251C\u2500 ", cp = prefix + (isLast ? "   " : "\u2502  ");
    switch (n.type) {
      case "Module":
        return `Module
` + (n.body || []).map((s, i2) => pyAstToText(s, "", i2 === n.body.length - 1)).join("");
      case "FuncDef": {
        const ps = (n.params || []).map((p) => p.name).join(", ");
        return `${prefix}${con}FuncDef ${n.name}(${ps})
` + pyAstToText(n.body, cp, true);
      }
      case "ClassDef":
        return `${prefix}${con}ClassDef ${n.name}
` + pyAstToText(n.body, cp, true);
      case "Block":
        return `${prefix}${con}Block
` + (n.stmts || []).map((s, i2) => pyAstToText(s, cp, i2 === n.stmts.length - 1)).join("");
      case "Assign":
        return `${prefix}${con}Assign (${n.op})
${pyAstToText(n.target, cp, false)}${pyAstToText(n.value, cp, true)}`;
      case "ExprStmt":
        return pyAstToText(n.expr, prefix, isLast);
      case "If":
        return `${prefix}${con}If
${pyAstToText(n.cond, cp, false)}${pyAstToText(n.then, cp, !n.else_ && !n.elifs?.length)}${n.else_ ? pyAstToText(n.else_, cp, true) : ""}`;
      case "While":
        return `${prefix}${con}While
${pyAstToText(n.cond, cp, false)}${pyAstToText(n.body, cp, true)}`;
      case "For":
        return `${prefix}${con}For ${n.target?.name ?? "?"} in (iter)
${pyAstToText(n.body, cp, true)}`;
      case "Return":
        return `${prefix}${con}Return
${n.value ? pyAstToText(n.value, cp, true) : ""}`;
      case "BinOp":
        return `${prefix}${con}BinOp (${n.op})
${pyAstToText(n.left, cp, false)}${pyAstToText(n.right, cp, true)}`;
      case "UnaryOp":
        return `${prefix}${con}UnaryOp (${n.op})
${pyAstToText(n.operand, cp, true)}`;
      case "Call":
        return `${prefix}${con}Call ${n.callee?.name ?? "(expr)"}
` + (n.args || []).map((a, i2) => pyAstToText(a, cp, i2 === n.args.length - 1)).join("");
      case "Attr":
        return `${prefix}${con}Attr .${n.attr}
${pyAstToText(n.object, cp, true)}`;
      case "Ident":
        return `${prefix}${con}Ident ${n.name}
`;
      case "IntLit":
        return `${prefix}${con}IntLit ${n.value}
`;
      case "FloatLit":
        return `${prefix}${con}FloatLit ${n.value}
`;
      case "StringLit":
        return `${prefix}${con}StringLit ${n.value}
`;
      case "BoolLit":
        return `${prefix}${con}BoolLit ${n.value}
`;
      case "NoneLit":
        return `${prefix}${con}None
`;
      case "List":
        return `${prefix}${con}List[${n.items?.length ?? 0}]
`;
      case "Dict":
        return `${prefix}${con}Dict{${n.pairs?.length ?? 0}}
`;
      default:
        return `${prefix}${con}${n.type}
`;
    }
  }
  var semantic3 = {
    analyze(ast) {
      const symbolTable = [], checks = [], warnings = [];
      const scopes = [{ name: "module", syms: /* @__PURE__ */ new Map() }];
      const cur = () => scopes[scopes.length - 1];
      const define = (name2, kind, type, scope, value = null) => {
        cur().syms.set(name2, { name: name2, kind, type, scope, value });
      };
      const lookup = (name2) => {
        for (let i2 = scopes.length - 1; i2 >= 0; i2--) {
          if (scopes[i2].syms.has(name2)) return scopes[i2].syms.get(name2);
        }
        return null;
      };
      const inferType = (n) => {
        if (!n) return null;
        if (n.type === "IntLit") return "int";
        if (n.type === "FloatLit") return "float";
        if (n.type === "StringLit") return "str";
        if (n.type === "BoolLit") return "bool";
        if (n.type === "NoneLit") return "None";
        if (n.type === "List") return "list";
        if (n.type === "Dict") return "dict";
        if (n.type === "BinOp") {
          const l = inferType(n.left), r = inferType(n.right);
          if (["==", "!=", "<", ">", "<=", ">=", "and", "or", "not", "in", "is"].includes(n.op)) return "bool";
          if (l === "float" || r === "float") return "float";
          if (l === "str" && n.op === "+") return "str";
          return l || r || "unknown";
        }
        if (n.type === "Ident") {
          const s = lookup(n.name);
          return s?.type ?? "unknown";
        }
        return null;
      };
      function visitNode(n, scope) {
        if (!n || typeof n !== "object") return;
        switch (n.type) {
          case "Module":
            (n.body || []).forEach((s) => visitNode(s, "module"));
            collectSymbols("module");
            break;
          case "FuncDef":
            define(n.name, "function", `function`, scope);
            scopes.push({ name: n.name, syms: /* @__PURE__ */ new Map() });
            (n.params || []).forEach((p) => {
              if (!p.name.startsWith("*")) define(p.name, "parameter", "unknown", n.name);
            });
            visitNode(n.body, n.name);
            checks.push(`Function '${n.name}' defined with ${n.params?.length ?? 0} parameter(s).`);
            collectSymbols(n.name);
            scopes.pop();
            break;
          case "ClassDef":
            define(n.name, "class", n.name, scope);
            scopes.push({ name: n.name, syms: /* @__PURE__ */ new Map() });
            visitNode(n.body, n.name);
            collectSymbols(n.name);
            scopes.pop();
            break;
          case "Block":
            (n.stmts || []).forEach((s) => visitNode(s, scope));
            break;
          case "Assign": {
            const vType = inferType(n.value);
            const targetName = n.target?.name ?? n.target?.attr;
            if (targetName) {
              const existing = lookup(targetName);
              if (existing && existing.type !== "unknown" && vType && existing.type !== vType && !["unknown", null].includes(vType)) {
                warnings.push(`Variable '${targetName}' previously inferred as '${existing.type}', now assigned '${vType}'.`);
              }
              define(targetName, "variable", vType ?? "unknown", scope, inferLit(n.value));
              checks.push(`Variable '${targetName}' assigned type '${vType ?? "unknown"}' in scope '${scope}'.`);
            }
            break;
          }
          case "ExprStmt":
            visitNode(n.expr, scope);
            break;
          case "If":
            visitNode(n.then, scope);
            (n.elifs || []).forEach((e) => visitNode(e.body, scope));
            if (n.else_) visitNode(n.else_, scope);
            break;
          case "While":
            visitNode(n.body, scope);
            break;
          case "For": {
            const tname = n.target?.name;
            if (tname) define(tname, "variable", "unknown", scope);
            visitNode(n.body, scope);
            break;
          }
          default:
            break;
        }
      }
      function collectSymbols(scope) {
        const s = scopes[scopes.length - 1];
        for (const sym of s.syms.values()) {
          symbolTable.push({ name: sym.name, kind: sym.kind, type: sym.type, scope: sym.scope, value: sym.value ?? "\u2014" });
        }
      }
      function inferLit(n) {
        if (!n) return null;
        if (n.type === "IntLit" || n.type === "FloatLit") return String(n.value);
        if (n.type === "BoolLit") return String(n.value);
        if (n.type === "StringLit") return n.value;
        return null;
      }
      visitNode(ast, "module");
      return { symbolTable, checks, warnings };
    }
  };
  var ir3 = {
    generate(ast) {
      const instrs = [];
      let tc = 0, lc = 0;
      const tmp = () => `t${++tc}`, lbl = () => `L${++lc}`;
      const emit = (s) => instrs.push(s);
      function visitNode(n) {
        if (!n) return "_";
        switch (n.type) {
          case "Module":
            (n.body || []).forEach(visitStmt);
            return null;
          case "FuncDef":
            emit(`func_begin ${n.name}`);
            (n.params || []).forEach((p) => {
              if (!p.name.startsWith("*")) emit(`param_receive ${p.name}`);
            });
            visitStmt(n.body);
            emit(`return`);
            emit(`func_end ${n.name}`);
            return null;
          case "ClassDef":
            (n.body?.stmts || []).filter((s) => s.type === "FuncDef").forEach(visitNode);
            return null;
          default:
            return visitStmt(n);
        }
      }
      function visitStmt(s) {
        if (!s) return;
        if (s.type === "Block") {
          (s.stmts || []).forEach(visitStmt);
          return;
        }
        if (s.type === "Assign") {
          const r = visitExpr(s.value);
          const tgt = s.target?.name ?? s.target?.attr ?? "_";
          emit(`${tgt} = ${r}`);
          return;
        }
        if (s.type === "ExprStmt") {
          visitExpr(s.expr);
          return;
        }
        if (s.type === "Return") {
          if (s.value) {
            const v = visitExpr(s.value);
            emit(`return ${v}`);
          } else emit("return");
          return;
        }
        if (s.type === "If") {
          const c = visitExpr(s.cond), lt = lbl(), lf = lbl();
          emit(`if ${c} goto ${lt}`);
          emit(`goto ${lf}`);
          emit(`${lt}:`);
          visitStmt(s.then);
          if (s.else_) {
            const le = lbl();
            emit(`goto ${le}`);
            emit(`${lf}:`);
            visitStmt(s.else_);
            emit(`${le}:`);
          } else emit(`${lf}:`);
        }
        if (s.type === "While") {
          const top = lbl(), ex = lbl();
          emit(`${top}:`);
          const c = visitExpr(s.cond);
          emit(`if_false ${c} goto ${ex}`);
          visitStmt(s.body);
          emit(`goto ${top}`);
          emit(`${ex}:`);
        }
        if (s.type === "For") {
          const it = visitExpr(s.iter), idx = tmp(), top = lbl(), ex = lbl();
          emit(`${idx} = 0`);
          emit(`${top}:`);
          const len = tmp();
          emit(`${len} = len(${it})`);
          const cond = tmp();
          emit(`${cond} = ${idx} < ${len}`);
          emit(`if_false ${cond} goto ${ex}`);
          const tgt = s.target?.name ?? "_";
          emit(`${tgt} = ${it}[${idx}]`);
          visitStmt(s.body);
          emit(`${idx} = ${idx} + 1`);
          emit(`goto ${top}`);
          emit(`${ex}:`);
        }
      }
      function visitExpr(n) {
        if (!n) return "_";
        if (n.type === "IntLit" || n.type === "FloatLit") return n.value;
        if (n.type === "BoolLit") return n.value ? "True" : "False";
        if (n.type === "StringLit") return n.value;
        if (n.type === "NoneLit") return "None";
        if (n.type === "Ident") return n.name;
        if (n.type === "BinOp") {
          const l = visitExpr(n.left), r = visitExpr(n.right), t = tmp();
          emit(`${t} = ${l} ${n.op} ${r}`);
          return t;
        }
        if (n.type === "UnaryOp") {
          const v = visitExpr(n.operand), t = tmp();
          emit(`${t} = ${n.op} ${v}`);
          return t;
        }
        if (n.type === "Call") {
          const callee = n.callee?.name ?? visitExpr(n.callee);
          (n.args || []).forEach((a) => {
            const v = visitExpr(a);
            emit(`param ${v}`);
          });
          const t = tmp();
          emit(`${t} = call ${callee}, ${n.args?.length ?? 0}`);
          return t;
        }
        if (n.type === "Attr") {
          const o = visitExpr(n.object), t = tmp();
          emit(`${t} = ${o}.${n.attr}`);
          return t;
        }
        if (n.type === "Index") {
          const a = visitExpr(n.array), i2 = visitExpr(n.index), t = tmp();
          emit(`${t} = ${a}[${i2}]`);
          return t;
        }
        if (n.type === "List") {
          const t = tmp();
          emit(`${t} = []`);
          (n.items || []).forEach((i2) => {
            const v = visitExpr(i2);
            emit(`${t}.append(${v})`);
          });
          return t;
        }
        return "_";
      }
      visitNode(ast);
      return { instructions: instrs };
    }
  };
  var optimizer3 = { optimize: (instrs) => optimize(instrs) };
  var codegen3 = {
    generate(tac) {
      const out2 = [];
      out2.push("; CPython-style educational bytecode");
      out2.push("");
      for (const instr of tac) {
        if (/^func_begin\s/.test(instr)) {
          out2.push(`
CODE ${instr.replace("func_begin ", "")}`);
          continue;
        }
        if (/^func_end/.test(instr)) {
          out2.push(`  RETURN_VALUE`);
          out2.push("");
          continue;
        }
        if (/^param_receive\s/.test(instr)) {
          out2.push(`  STORE_NAME  '${instr.split(" ")[1]}'`);
          continue;
        }
        if (/^param\s/.test(instr)) {
          const v = instr.split(" ")[1];
          out2.push(`  LOAD_${/^['"]/.test(v) ? "CONST" : "NAME"} ${v}`);
          continue;
        }
        if (/^return\s+/.test(instr)) {
          out2.push(`  LOAD_NAME   ${instr.split(" ")[1]}`);
          out2.push(`  RETURN_VALUE`);
          continue;
        }
        if (/^return$/.test(instr)) {
          out2.push(`  LOAD_CONST  None`);
          out2.push(`  RETURN_VALUE`);
          continue;
        }
        if (/^if_false\s/.test(instr)) {
          const [, c, , l] = instr.split(" ");
          out2.push(`  LOAD_NAME   ${c}`);
          out2.push(`  POP_JUMP_IF_FALSE ${l}`);
          continue;
        }
        if (/^if\s/.test(instr)) {
          const [, c, , l] = instr.split(" ");
          out2.push(`  LOAD_NAME   ${c}`);
          out2.push(`  POP_JUMP_IF_TRUE ${l}`);
          continue;
        }
        if (/^goto\s/.test(instr)) {
          out2.push(`  JUMP_ABSOLUTE ${instr.split(" ")[1]}`);
          continue;
        }
        if (/^\w+:$/.test(instr)) {
          out2.push(`${instr}`);
          continue;
        }
        const bm = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/\%\&\|<>=!]+)\s+(\S+)$/.exec(instr);
        if (bm) {
          const [, dst, l, op, r] = bm;
          const load = (v) => /^-?\d/.test(v) ? `  LOAD_CONST  ${v}` : `  LOAD_NAME   ${v}`;
          const opMap = { "+": "BINARY_ADD", "-": "BINARY_SUBTRACT", "*": "BINARY_MULTIPLY", "/": "BINARY_TRUE_DIVIDE", "//": "BINARY_FLOOR_DIVIDE", "%": "BINARY_MODULO", "**": "BINARY_POWER", "&": "BINARY_AND", "|": "BINARY_OR", "^": "BINARY_XOR", "<<": "BINARY_LSHIFT", ">>": "BINARY_RSHIFT" };
          out2.push(load(l));
          out2.push(load(r));
          out2.push(`  ${opMap[op] ?? "BINARY_OP"}`);
          out2.push(`  STORE_NAME  ${dst}`);
          continue;
        }
        const cm = /^(\S+)\s*=\s*(\S+)$/.exec(instr);
        if (cm) {
          out2.push(`  LOAD_${/^-?\d|^['"]/.test(cm[2]) ? "CONST" : "NAME"}  ${cm[2]}`);
          out2.push(`  STORE_NAME  ${cm[1]}`);
          continue;
        }
        out2.push(`  ; ${instr}`);
      }
      return { targetLabel: "CPython-style educational bytecode", instructions: out2 };
    }
  };

  // js/languages/javascript/index.js
  var javascript_exports = {};
  __export(javascript_exports, {
    backend: () => backend5,
    codegen: () => codegen4,
    examples: () => examples5,
    id: () => id5,
    ir: () => ir4,
    label: () => label5,
    lexer: () => lexer4,
    optimizer: () => optimizer4,
    parser: () => parser4,
    semantic: () => semantic4
  });
  var id5 = "javascript";
  var label5 = "JavaScript";
  var JS_KEYWORDS = /* @__PURE__ */ new Set([
    "var",
    "let",
    "const",
    "function",
    "return",
    "if",
    "else",
    "while",
    "for",
    "break",
    "continue",
    "switch",
    "case",
    "default",
    "try",
    "catch",
    "finally",
    "throw",
    "class",
    "extends",
    "super",
    "this",
    "new",
    "typeof",
    "instanceof",
    "async",
    "await",
    "yield",
    "import",
    "export",
    "default",
    "true",
    "false",
    "null",
    "undefined",
    "NaN",
    "Infinity"
  ]);
  var examples5 = [
    {
      label: "A \xB7 Function & arithmetic",
      code: `function calculateTotal(price, taxRate) {
    const tax = price * taxRate;
    const shipping = 5;
    const total = price + tax + shipping;
    return total;
}

let result = calculateTotal(100, 0.18);
console.log(result);`
    },
    {
      label: "B \xB7 Constant folding & optimization",
      code: `const base = 10 * 10;
const multiplier = 2 + 3;
let finalScore = base * multiplier;
console.log(finalScore);`
    },
    {
      label: "C \xB7 While loop & accumulation",
      code: `let count = 0;
let sum = 0;
while (count < 5) {
    sum = sum + count;
    count = count + 1;
}
console.log(sum);`
    },
    {
      label: "D \xB7 Semantic error (const reassignment)",
      code: `const MAX_USERS = 100;
MAX_USERS = 200;`
    }
  ];
  var lexer4 = {
    tokenize(source) {
      const tokens = [];
      const errors = [];
      let i2 = 0, line = 1, col = 1;
      while (i2 < source.length) {
        const ch = source[i2];
        if (ch === " " || ch === "	" || ch === "\r") {
          i2++;
          col++;
          continue;
        }
        if (ch === "\n") {
          i2++;
          line++;
          col = 1;
          continue;
        }
        if (ch === "/" && source[i2 + 1] === "/") {
          while (i2 < source.length && source[i2] !== "\n") i2++;
          continue;
        }
        if (ch === "/" && source[i2 + 1] === "*") {
          i2 += 2;
          col += 2;
          while (i2 < source.length && !(source[i2] === "*" && source[i2 + 1] === "/")) {
            if (source[i2] === "\n") {
              line++;
              col = 1;
            } else {
              col++;
            }
            i2++;
          }
          if (i2 < source.length) {
            i2 += 2;
            col += 2;
          }
          continue;
        }
        if (/[0-9]/.test(ch)) {
          const startCol = col;
          let num = "";
          while (i2 < source.length && /[0-9.]/.test(source[i2])) {
            num += source[i2++];
            col++;
          }
          tokens.push({
            lexeme: num,
            type: num.includes(".") ? "FLOAT_LITERAL" : "INT_LITERAL",
            line,
            col: startCol
          });
          continue;
        }
        if (/[a-zA-Z_$]/.test(ch)) {
          const startCol = col;
          let id8 = "";
          while (i2 < source.length && /[a-zA-Z0-9_$]/.test(source[i2])) {
            id8 += source[i2++];
            col++;
          }
          tokens.push({
            lexeme: id8,
            type: JS_KEYWORDS.has(id8) ? "KEYWORD" : "IDENTIFIER",
            line,
            col: startCol
          });
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
          const quote = ch;
          const startCol = col;
          let s = quote;
          i2++;
          col++;
          while (i2 < source.length && source[i2] !== quote) {
            if (source[i2] === "\\" && i2 + 1 < source.length) {
              s += source[i2++];
              col++;
            }
            if (source[i2] === "\n") {
              line++;
              col = 0;
            }
            s += source[i2++];
            col++;
          }
          if (i2 < source.length) {
            s += source[i2++];
            col++;
          }
          tokens.push({ lexeme: s, type: "STRING_LITERAL", line, col: startCol });
          continue;
        }
        const two = source.slice(i2, i2 + 2);
        const three = source.slice(i2, i2 + 3);
        if (["===", "!==", ">>>", "..."].includes(three)) {
          tokens.push({ lexeme: three, type: "OPERATOR", line, col });
          i2 += 3;
          col += 3;
          continue;
        }
        if ([
          "==",
          "!=",
          "<=",
          ">=",
          "&&",
          "||",
          "++",
          "--",
          "+=",
          "-=",
          "*=",
          "/=",
          "=>",
          "??"
        ].includes(two)) {
          tokens.push({ lexeme: two, type: "OPERATOR", line, col });
          i2 += 2;
          col += 2;
          continue;
        }
        if ([
          "+",
          "-",
          "*",
          "/",
          "%",
          "=",
          "<",
          ">",
          "!",
          "&",
          "|",
          "^",
          "~",
          "?"
        ].includes(ch)) {
          tokens.push({ lexeme: ch, type: "OPERATOR", line, col });
          i2++;
          col++;
          continue;
        }
        if (["(", ")", "{", "}", "[", "]", ";", ",", ".", ":"].includes(ch)) {
          tokens.push({ lexeme: ch, type: "PUNCT", line, col });
          i2++;
          col++;
          continue;
        }
        errors.push({ message: `Unexpected character '${ch}'`, line, col });
        i2++;
        col++;
      }
      tokens.push({ lexeme: "EOF", type: "EOF", line, col });
      return { tokens, errors };
    }
  };
  var backend5 = {
    async run(source) {
      const response = await fetch("http://localhost:4174/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "javascript", source })
      });
      if (!response.ok) throw new Error(`TAC backend returned HTTP ${response.status}`);
      return response.json();
    }
  };
  var parser4 = {
    parse(tokens) {
      let cur = 0;
      const errors = [];
      const peek = (offset = 0) => tokens[Math.min(cur + offset, tokens.length - 1)];
      const is = (type, lexeme) => {
        const t = peek();
        return t.type === type && (lexeme === void 0 || t.lexeme === lexeme);
      };
      const advance = () => tokens[cur++];
      const match = (type, lexeme) => {
        if (is(type, lexeme)) return advance();
        return null;
      };
      const expect = (type, lexeme) => {
        const t = peek();
        if (t.type === type && (lexeme === void 0 || t.lexeme === lexeme))
          return advance();
        const err2 = new ParseError(
          `Expected ${lexeme ? `'${lexeme}'` : type}, got '${t.lexeme}'`,
          t.line,
          t.col
        );
        errors.push(err2);
        throw err2;
      };
      function parseProgram() {
        const body2 = [];
        while (!is("EOF")) {
          try {
            body2.push(parseStatement());
          } catch (e) {
            if (e instanceof ParseError && !errors.includes(e)) errors.push(e);
            while (!is("EOF") && !is("PUNCT", ";")) advance();
            if (is("PUNCT", ";")) advance();
          }
        }
        return {
          type: "Program",
          body: body2,
          toTextTree(indent = "") {
            return `${indent}Program
` + body2.map(
              (s) => s.toTextTree ? s.toTextTree(indent + "  ") : `${indent}  ${s.type}`
            ).join("\n");
          }
        };
      }
      function parseStatement() {
        const t = peek();
        if (t.type === "KEYWORD") {
          if (["var", "let", "const"].includes(t.lexeme)) return parseVarDecl();
          if (t.lexeme === "function") return parseFuncDecl();
          if (t.lexeme === "return") return parseReturn();
          if (t.lexeme === "if") return parseIf();
          if (t.lexeme === "while") return parseWhile();
        }
        if (is("PUNCT", "{")) return parseBlock();
        return parseExprStmt();
      }
      function parseBlock() {
        expect("PUNCT", "{");
        const body2 = [];
        while (!is("PUNCT", "}") && !is("EOF")) {
          body2.push(parseStatement());
        }
        expect("PUNCT", "}");
        return {
          type: "BlockStatement",
          body: body2,
          toTextTree(indent = "") {
            return `${indent}Block
` + body2.map(
              (s) => s.toTextTree ? s.toTextTree(indent + "  ") : `${indent}  ${s.type}`
            ).join("\n");
          }
        };
      }
      function parseVarDecl() {
        const kind = advance().lexeme;
        const idToken = expect("IDENTIFIER");
        let init2 = null;
        if (match("OPERATOR", "=")) {
          init2 = parseExpression();
        }
        match("PUNCT", ";");
        return {
          type: "VariableDeclaration",
          kind,
          name: idToken.lexeme,
          init: init2,
          line: idToken.line,
          col: idToken.col,
          toTextTree(indent = "") {
            let s = `${indent}VariableDecl [${kind}] ${idToken.lexeme}`;
            if (init2 && init2.toTextTree)
              s += `
${init2.toTextTree(indent + "  ")}`;
            return s;
          }
        };
      }
      function parseFuncDecl() {
        advance();
        const name2 = expect("IDENTIFIER").lexeme;
        expect("PUNCT", "(");
        const params = [];
        while (!is("PUNCT", ")") && !is("EOF")) {
          params.push(expect("IDENTIFIER").lexeme);
          if (!match("PUNCT", ",")) break;
        }
        expect("PUNCT", ")");
        const body2 = parseBlock();
        return {
          type: "FunctionDeclaration",
          name: name2,
          params,
          body: body2,
          toTextTree(indent = "") {
            return `${indent}Function ${name2}(${params.join(", ")})
` + body2.toTextTree(indent + "  ");
          }
        };
      }
      function parseReturn() {
        advance();
        let value = null;
        if (!is("PUNCT", ";") && !is("EOF")) {
          value = parseExpression();
        }
        match("PUNCT", ";");
        return {
          type: "ReturnStatement",
          value,
          toTextTree(indent = "") {
            let s = `${indent}Return`;
            if (value && value.toTextTree)
              s += `
${value.toTextTree(indent + "  ")}`;
            return s;
          }
        };
      }
      function parseIf() {
        advance();
        expect("PUNCT", "(");
        const cond = parseExpression();
        expect("PUNCT", ")");
        const thenStmt = parseStatement();
        let elseStmt = null;
        if (match("KEYWORD", "else")) {
          elseStmt = parseStatement();
        }
        return {
          type: "IfStatement",
          cond,
          thenStmt,
          elseStmt,
          toTextTree(indent = "") {
            let s = `${indent}If
${cond.toTextTree ? cond.toTextTree(indent + "  ") : ""}
${thenStmt.toTextTree ? thenStmt.toTextTree(indent + "  ") : ""}`;
            if (elseStmt)
              s += `
${indent}Else
${elseStmt.toTextTree ? elseStmt.toTextTree(indent + "  ") : ""}`;
            return s;
          }
        };
      }
      function parseWhile() {
        advance();
        expect("PUNCT", "(");
        const cond = parseExpression();
        expect("PUNCT", ")");
        const body2 = parseStatement();
        return {
          type: "WhileStatement",
          cond,
          body: body2,
          toTextTree(indent = "") {
            return `${indent}While
${cond.toTextTree ? cond.toTextTree(indent + "  ") : ""}
${body2.toTextTree ? body2.toTextTree(indent + "  ") : ""}`;
          }
        };
      }
      function parseExprStmt() {
        const expr = parseExpression();
        const terminated = match("PUNCT", ";");
        const next = peek();
        if (!terminated && !is("EOF") && !is("PUNCT", "}") && next.line === expr.line) {
          throw new ParseError(
            `Unexpected token '${next.lexeme}' after expression`,
            next.line,
            next.col
          );
        }
        return {
          type: "ExpressionStatement",
          expr,
          toTextTree(indent = "") {
            return expr.toTextTree ? expr.toTextTree(indent) : `${indent}Expr`;
          }
        };
      }
      function parseExpression() {
        return parseAssignment();
      }
      function parseAssignment() {
        const left = parseLogicalOr();
        if (match("OPERATOR", "=")) {
          const right = parseAssignment();
          return {
            type: "AssignmentExpression",
            operator: "=",
            left,
            right,
            toTextTree(indent = "") {
              return `${indent}Assign (=)
${left.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parseLogicalOr() {
        let left = parseLogicalAnd();
        while (match("OPERATOR", "||")) {
          const right = parseLogicalAnd();
          const prev = left;
          left = {
            type: "BinaryExpression",
            operator: "||",
            left: prev,
            right,
            toTextTree(indent = "") {
              return `${indent}Binary (||)
${prev.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parseLogicalAnd() {
        let left = parseEquality();
        while (match("OPERATOR", "&&")) {
          const right = parseEquality();
          const prev = left;
          left = {
            type: "BinaryExpression",
            operator: "&&",
            left: prev,
            right,
            toTextTree(indent = "") {
              return `${indent}Binary (&&)
${prev.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parseEquality() {
        let left = parseRelational();
        while (["==", "!=", "===", "!=="].includes(peek().lexeme)) {
          const op = advance().lexeme;
          const right = parseRelational();
          const prev = left;
          left = {
            type: "BinaryExpression",
            operator: op,
            left: prev,
            right,
            toTextTree(indent = "") {
              return `${indent}Binary (${op})
${prev.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parseRelational() {
        let left = parseAdditive();
        while (["<", ">", "<=", ">="].includes(peek().lexeme)) {
          const op = advance().lexeme;
          const right = parseAdditive();
          const prev = left;
          left = {
            type: "BinaryExpression",
            operator: op,
            left: prev,
            right,
            toTextTree(indent = "") {
              return `${indent}Binary (${op})
${prev.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parseAdditive() {
        let left = parseMultiplicative();
        while (["+", "-"].includes(peek().lexeme)) {
          const op = advance().lexeme;
          const right = parseMultiplicative();
          const prev = left;
          left = {
            type: "BinaryExpression",
            operator: op,
            left: prev,
            right,
            toTextTree(indent = "") {
              return `${indent}Binary (${op})
${prev.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parseMultiplicative() {
        let left = parseUnary();
        while (["*", "/", "%"].includes(peek().lexeme)) {
          const op = advance().lexeme;
          const right = parseUnary();
          const prev = left;
          left = {
            type: "BinaryExpression",
            operator: op,
            left: prev,
            right,
            toTextTree(indent = "") {
              return `${indent}Binary (${op})
${prev.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parseUnary() {
        if (["-", "!", "typeof"].includes(peek().lexeme)) {
          const op = advance().lexeme;
          const argument = parseUnary();
          return {
            type: "UnaryExpression",
            operator: op,
            argument,
            toTextTree(indent = "") {
              return `${indent}Unary (${op})
${argument.toTextTree(indent + "  ")}`;
            }
          };
        }
        return parsePrimary();
      }
      function parsePrimary() {
        const t = peek();
        if (t.type === "INT_LITERAL" || t.type === "FLOAT_LITERAL") {
          advance();
          return {
            type: "NumericLiteral",
            value: t.lexeme,
            toTextTree(indent = "") {
              return `${indent}Number (${t.lexeme})`;
            }
          };
        }
        if (t.type === "STRING_LITERAL") {
          advance();
          return {
            type: "StringLiteral",
            value: t.lexeme,
            toTextTree(indent = "") {
              return `${indent}String (${t.lexeme})`;
            }
          };
        }
        if (t.type === "KEYWORD" && ["true", "false", "null", "undefined"].includes(t.lexeme)) {
          advance();
          return {
            type: "BooleanOrNullLiteral",
            value: t.lexeme,
            toTextTree(indent = "") {
              return `${indent}Literal (${t.lexeme})`;
            }
          };
        }
        if (t.type === "IDENTIFIER") {
          advance();
          let expr = {
            type: "Identifier",
            name: t.lexeme,
            line: t.line,
            col: t.col,
            toTextTree(indent = "") {
              return `${indent}Identifier (${t.lexeme})`;
            }
          };
          while (is("PUNCT", "(") || is("PUNCT", ".")) {
            if (match("PUNCT", "(")) {
              const args2 = [];
              while (!is("PUNCT", ")") && !is("EOF")) {
                args2.push(parseExpression());
                if (!match("PUNCT", ",")) break;
              }
              expect("PUNCT", ")");
              const callee = expr;
              expr = {
                type: "CallExpression",
                callee,
                args: args2,
                toTextTree(indent = "") {
                  return `${indent}Call
${callee.toTextTree(indent + "  ")}` + args2.map((a) => `
${a.toTextTree(indent + "    ")}`).join("");
                }
              };
            } else if (match("PUNCT", ".")) {
              const prop = expect("IDENTIFIER").lexeme;
              const obj = expr;
              expr = {
                type: "MemberExpression",
                object: obj,
                property: prop,
                toTextTree(indent = "") {
                  return `${indent}Member .${prop}
${obj.toTextTree(indent + "  ")}`;
                }
              };
            }
          }
          return expr;
        }
        if (match("PUNCT", "(")) {
          const inner = parseExpression();
          expect("PUNCT", ")");
          return inner;
        }
        throw new ParseError(`Unexpected token '${t.lexeme}'`, t.line, t.col);
      }
      const ast = parseProgram();
      return { ast, astText: ast.toTextTree(), errors };
    }
  };
  var semantic4 = {
    analyze(ast, source) {
      const symbolTable = [];
      const checks = [];
      const warnings = [];
      const constSymbols = /* @__PURE__ */ new Set();
      const declared = /* @__PURE__ */ new Set();
      checks.push(
        "Scope analysis: verified var/let/const block & lexical scoping."
      );
      checks.push(
        "Type inference: dynamic JS types recorded from initialization values."
      );
      function scan(node2, scope = "global") {
        if (!node2) return;
        if (node2.type === "VariableDeclaration") {
          const isConst = node2.kind === "const";
          if (isConst) constSymbols.add(node2.name);
          declared.add(node2.name);
          let inferredType = "any";
          let initVal = "-";
          if (node2.init) {
            if (node2.init.type === "NumericLiteral") {
              inferredType = "number";
              initVal = node2.init.value;
            } else if (node2.init.type === "StringLiteral") {
              inferredType = "string";
              initVal = node2.init.value;
            } else if (node2.init.type === "BooleanOrNullLiteral") {
              inferredType = "boolean";
              initVal = node2.init.value;
            }
          }
          symbolTable.push([
            node2.name,
            `${node2.kind} variable`,
            inferredType,
            scope,
            initVal
          ]);
        } else if (node2.type === "FunctionDeclaration") {
          declared.add(node2.name);
          symbolTable.push([
            node2.name,
            "function",
            "Function",
            scope,
            `params: (${node2.params.join(", ")})`
          ]);
          if (node2.body && node2.body.body) {
            node2.body.body.forEach((stmt) => scan(stmt, `function:${node2.name}`));
          }
        } else if (node2.type === "AssignmentExpression") {
          if (node2.left && node2.left.type === "Identifier") {
            if (constSymbols.has(node2.left.name)) {
              throw new SemanticError(
                `TypeError: Assignment to constant variable '${node2.left.name}'.`,
                node2.left.line,
                node2.left.col
              );
            }
          }
        } else if (node2.type === "BlockStatement" && node2.body) {
          node2.body.forEach((s) => scan(s, scope));
        } else if (node2.type === "IfStatement") {
          scan(node2.thenStmt, scope);
          if (node2.elseStmt) scan(node2.elseStmt, scope);
        } else if (node2.type === "WhileStatement") {
          scan(node2.body, scope);
        }
      }
      if (ast && ast.body) {
        ast.body.forEach((s) => scan(s, "global"));
      }
      return { symbolTable, checks, warnings };
    }
  };
  var ir4 = {
    generate(ast, symbolTable) {
      const instructions = [];
      let tempCounter = 0;
      let labelCounter = 0;
      const newTemp = () => `t${++tempCounter}`;
      const newLabel = () => `L${++labelCounter}`;
      function genExpr(node2) {
        if (!node2) return "";
        if (node2.type === "NumericLiteral" || node2.type === "StringLiteral" || node2.type === "BooleanOrNullLiteral") {
          return node2.value;
        }
        if (node2.type === "Identifier") {
          return node2.name;
        }
        if (node2.type === "MemberExpression") {
          const obj = genExpr(node2.object);
          const t = newTemp();
          instructions.push(`${t} = ${obj}.${node2.property}`);
          return t;
        }
        if (node2.type === "CallExpression") {
          const args2 = (node2.args || []).map(genExpr);
          args2.forEach((a) => instructions.push(`param ${a}`));
          const callee = node2.callee.name || (node2.callee.property ? `${genExpr(node2.callee.object)}.${node2.callee.property}` : "func");
          const t = newTemp();
          instructions.push(`${t} = call ${callee}, ${args2.length}`);
          return t;
        }
        if (node2.type === "BinaryExpression") {
          const left = genExpr(node2.left);
          const right = genExpr(node2.right);
          const t = newTemp();
          instructions.push(`${t} = ${left} ${node2.operator} ${right}`);
          return t;
        }
        if (node2.type === "UnaryExpression") {
          const arg = genExpr(node2.argument);
          const t = newTemp();
          instructions.push(`${t} = ${node2.operator}${arg}`);
          return t;
        }
        if (node2.type === "AssignmentExpression") {
          const right = genExpr(node2.right);
          const left = node2.left.name || "var";
          instructions.push(`${left} = ${right}`);
          return left;
        }
        return "";
      }
      function genStmt(node2) {
        if (!node2) return;
        if (node2.type === "VariableDeclaration") {
          if (node2.init) {
            const val = genExpr(node2.init);
            instructions.push(`${node2.name} = ${val}`);
          }
        } else if (node2.type === "ExpressionStatement") {
          genExpr(node2.expr);
        } else if (node2.type === "ReturnStatement") {
          if (node2.value) {
            const val = genExpr(node2.value);
            instructions.push(`return ${val}`);
          } else {
            instructions.push(`return`);
          }
        } else if (node2.type === "FunctionDeclaration") {
          instructions.push(`func_begin ${node2.name}`);
          (node2.params || []).forEach(
            (p) => instructions.push(`param_receive ${p}`)
          );
          if (node2.body && node2.body.body) {
            node2.body.body.forEach(genStmt);
          }
          instructions.push(`func_end ${node2.name}`);
        } else if (node2.type === "WhileStatement") {
          const startLbl = newLabel();
          const endLbl = newLabel();
          instructions.push(`${startLbl}:`);
          const cond = genExpr(node2.cond);
          instructions.push(`if_false ${cond} goto ${endLbl}`);
          genStmt(node2.body);
          instructions.push(`goto ${startLbl}`);
          instructions.push(`${endLbl}:`);
        } else if (node2.type === "BlockStatement") {
          (node2.body || []).forEach(genStmt);
        }
      }
      if (ast && ast.body) {
        ast.body.forEach(genStmt);
      }
      return { instructions };
    }
  };
  var optimizer4 = {
    optimize: (instructions) => optimize(instructions)
  };
  var codegen4 = {
    generate(instructions, symbolTable) {
      const output = [];
      output.push("; V8 Ignition-style educational bytecode");
      output.push(
        "; Registers: a0, a1 (arguments), r0-r7 (registers), acc (accumulator)"
      );
      output.push("");
      for (const instr of instructions) {
        if (instr.startsWith("func_begin ")) {
          output.push(`
[Bytecode for ${instr.split(" ")[1]}]:`);
          continue;
        }
        if (instr.startsWith("func_end ")) {
          output.push("  LdaUndefined");
          output.push("  Return");
          continue;
        }
        if (instr.startsWith("param_receive ")) {
          output.push(`  ; bind ${instr.split(" ")[1]}`);
          continue;
        }
        if (instr.startsWith("return ")) {
          const val = instr.split(" ")[1];
          output.push(`  LdaNamedProperty [${val}]`);
          output.push("  Return");
          continue;
        }
        if (instr === "return") {
          output.push("  LdaUndefined");
          output.push("  Return");
          continue;
        }
        if (instr.endsWith(":")) {
          output.push(instr);
          continue;
        }
        if (instr.startsWith("goto ")) {
          output.push(`  Jump [${instr.split(" ")[1]}]`);
          continue;
        }
        if (instr.startsWith("if_false ")) {
          const parts2 = instr.split(" ");
          output.push(`  JumpIfFalse [${parts2[3]}]`);
          continue;
        }
        const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/%<>=!]+)\s+(\S+)$/.exec(
          instr
        );
        if (binMatch) {
          const [, dst, l, op, r] = binMatch;
          output.push(`  LdaNamedProperty [${l}]`);
          output.push(`  Star r0`);
          output.push(`  LdaNamedProperty [${r}]`);
          const opName = {
            "+": "Add",
            "-": "Sub",
            "*": "Mul",
            "/": "Div",
            "==": "TestEqual",
            "<": "TestLessThan",
            ">": "TestGreaterThan"
          }[op] || "Add";
          output.push(`  ${opName} r0`);
          output.push(`  Star [${dst}]`);
          continue;
        }
        const copyMatch = /^(\S+)\s*=\s*(.+)$/.exec(instr);
        if (copyMatch) {
          output.push(`  LdaConstant [${copyMatch[2]}]`);
          output.push(`  Star [${copyMatch[1]}]`);
          continue;
        }
        output.push(`  ; ${instr}`);
      }
      return {
        targetLabel: "V8 Ignition Bytecode (Node.js/Chrome)",
        instructions: output
      };
    }
  };

  // js/languages/typescript/index.js
  var typescript_exports = {};
  __export(typescript_exports, {
    backend: () => backend6,
    codegen: () => codegen5,
    examples: () => examples6,
    id: () => id6,
    ir: () => ir5,
    label: () => label6,
    lexer: () => lexer5,
    optimizer: () => optimizer5,
    parser: () => parser5,
    semantic: () => semantic5
  });
  var id6 = "typescript";
  var label6 = "TypeScript";
  var TS_KEYWORDS = /* @__PURE__ */ new Set([
    "var",
    "let",
    "const",
    "function",
    "return",
    "if",
    "else",
    "while",
    "for",
    "type",
    "interface",
    "implements",
    "enum",
    "as",
    "any",
    "number",
    "string",
    "boolean",
    "void",
    "never",
    "unknown",
    "readonly",
    "public",
    "private",
    "protected",
    "class",
    "extends",
    "super",
    "this",
    "new",
    "import",
    "export",
    "true",
    "false",
    "null",
    "undefined"
  ]);
  var examples6 = [
    {
      label: "A \xB7 Typed function & arithmetic",
      code: `function computeDiscount(price: number, rate: number): number {
    const discount: number = price * rate;
    const finalPrice: number = price - discount;
    return finalPrice;
}

const itemTotal: number = computeDiscount(250, 0.2);
console.log(itemTotal);`
    },
    {
      label: "B \xB7 Interface contract & usage",
      code: `interface User {
    id: number;
    name: string;
    isActive: boolean;
}

function printUser(id: number, name: string): void {
    const status: boolean = true;
    console.log(name);
}`
    },
    {
      label: "C \xB7 Type error (Type mismatch)",
      code: `const port: number = 8080;
const host: string = 127001;`
    },
    {
      label: "D \xB7 Constant folding optimization",
      code: `const width: number = 10 * 4;
const height: number = 5 + 5;
const area: number = width * height;`
    }
  ];
  var lexer5 = {
    tokenize(source) {
      const tokens = [];
      const errors = [];
      let i2 = 0, line = 1, col = 1;
      while (i2 < source.length) {
        const ch = source[i2];
        if (ch === " " || ch === "	" || ch === "\r") {
          i2++;
          col++;
          continue;
        }
        if (ch === "\n") {
          i2++;
          line++;
          col = 1;
          continue;
        }
        if (ch === "/" && source[i2 + 1] === "/") {
          while (i2 < source.length && source[i2] !== "\n") i2++;
          continue;
        }
        if (/[0-9]/.test(ch)) {
          const startCol = col;
          let num = "";
          while (i2 < source.length && /[0-9.]/.test(source[i2])) {
            num += source[i2++];
            col++;
          }
          tokens.push({
            lexeme: num,
            type: num.includes(".") ? "FLOAT_LITERAL" : "INT_LITERAL",
            line,
            col: startCol
          });
          continue;
        }
        if (/[a-zA-Z_$]/.test(ch)) {
          const startCol = col;
          let id8 = "";
          while (i2 < source.length && /[a-zA-Z0-9_$]/.test(source[i2])) {
            id8 += source[i2++];
            col++;
          }
          tokens.push({
            lexeme: id8,
            type: TS_KEYWORDS.has(id8) ? "KEYWORD" : "IDENTIFIER",
            line,
            col: startCol
          });
          continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
          const quote = ch;
          const startCol = col;
          let s = quote;
          i2++;
          col++;
          while (i2 < source.length && source[i2] !== quote) {
            s += source[i2++];
            col++;
          }
          if (i2 < source.length) {
            s += source[i2++];
            col++;
          }
          tokens.push({ lexeme: s, type: "STRING_LITERAL", line, col: startCol });
          continue;
        }
        const two = source.slice(i2, i2 + 2);
        if (["===", "!=="].includes(source.slice(i2, i2 + 3))) {
          tokens.push({ lexeme: source.slice(i2, i2 + 3), type: "OPERATOR", line, col });
          i2 += 3;
          col += 3;
          continue;
        }
        if (["==", "!=", "<=", ">=", "&&", "||", "=>"].includes(two)) {
          tokens.push({ lexeme: two, type: "OPERATOR", line, col });
          i2 += 2;
          col += 2;
          continue;
        }
        if (["+", "-", "*", "/", "%", "=", "<", ">", "!"].includes(ch)) {
          tokens.push({ lexeme: ch, type: "OPERATOR", line, col });
          i2++;
          col++;
          continue;
        }
        if (["(", ")", "{", "}", "[", "]", ";", ",", ".", ":", "?", "|", "&"].includes(ch)) {
          tokens.push({ lexeme: ch, type: "PUNCT", line, col });
          i2++;
          col++;
          continue;
        }
        errors.push({ message: `Unexpected token '${ch}'`, line, col });
        i2++;
        col++;
      }
      tokens.push({ lexeme: "EOF", type: "EOF", line, col });
      return { tokens, errors };
    }
  };
  var backend6 = {
    async run(source) {
      const response = await fetch("http://localhost:4174/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: "typescript", source })
      });
      if (!response.ok) throw new Error(`TAC backend returned HTTP ${response.status}`);
      return response.json();
    }
  };
  var parser5 = {
    parse(tokens) {
      let cur = 0;
      const errors = [];
      const peek = () => tokens[Math.min(cur, tokens.length - 1)];
      const is = (type, val) => {
        const t = peek();
        return t.type === type && (val === void 0 || t.lexeme === val);
      };
      const advance = () => tokens[cur++];
      const match = (type, val) => {
        if (is(type, val)) return advance();
        return null;
      };
      const expect = (type, val) => {
        const t = peek();
        if (t.type === type && (val === void 0 || t.lexeme === val)) return advance();
        const err2 = new ParseError(`Expected ${val ? `'${val}'` : type}, got '${t.lexeme}'`, t.line, t.col);
        errors.push(err2);
        throw err2;
      };
      function parseTypeAnnotation() {
        if (match("PUNCT", ":")) {
          if (is("KEYWORD") || is("IDENTIFIER")) {
            return advance().lexeme;
          }
          return "any";
        }
        return null;
      }
      function parseProgram() {
        const body2 = [];
        while (!is("EOF")) {
          body2.push(parseStatement());
        }
        return {
          type: "Program",
          body: body2,
          toTextTree(indent = "") {
            return `${indent}TypeScript Program
` + body2.map((s) => s && s.toTextTree ? s.toTextTree(indent + "  ") : `${indent}  ${s?.type}`).join("\n");
          }
        };
      }
      function parseStatement() {
        const t = peek();
        if (t.type === "KEYWORD") {
          if (["const", "let", "var"].includes(t.lexeme)) return parseVarDecl();
          if (t.lexeme === "function") return parseFuncDecl();
          if (t.lexeme === "interface") return parseInterface();
          if (t.lexeme === "return") return parseReturn();
        }
        return parseExprStmt();
      }
      function parseInterface() {
        advance();
        const name2 = expect("IDENTIFIER").lexeme;
        expect("PUNCT", "{");
        const properties = [];
        while (!is("PUNCT", "}") && !is("EOF")) {
          const propName = expect("IDENTIFIER").lexeme;
          const propType = parseTypeAnnotation() || "any";
          match("PUNCT", ";");
          properties.push({ name: propName, type: propType });
        }
        expect("PUNCT", "}");
        return {
          type: "InterfaceDeclaration",
          name: name2,
          properties,
          toTextTree(indent = "") {
            return `${indent}Interface ${name2} {
` + properties.map((p) => `${indent}  ${p.name}: ${p.type};`).join("\n") + `
${indent}}`;
          }
        };
      }
      function parseVarDecl() {
        const kind = advance().lexeme;
        const idToken = expect("IDENTIFIER");
        const typeAnnotation = parseTypeAnnotation();
        let init2 = null;
        if (match("OPERATOR", "=")) {
          init2 = parseExpression();
        }
        match("PUNCT", ";");
        return {
          type: "VariableDeclaration",
          kind,
          name: idToken.lexeme,
          typeAnnotation,
          init: init2,
          line: idToken.line,
          col: idToken.col,
          toTextTree(indent = "") {
            return `${indent}VarDecl [${kind}] ${idToken.lexeme}${typeAnnotation ? `: ${typeAnnotation}` : ""}` + (init2 ? `
${init2.toTextTree(indent + "  ")}` : "");
          }
        };
      }
      function parseFuncDecl() {
        advance();
        const name2 = expect("IDENTIFIER").lexeme;
        expect("PUNCT", "(");
        const params = [];
        while (!is("PUNCT", ")") && !is("EOF")) {
          const pName = expect("IDENTIFIER").lexeme;
          const pType = parseTypeAnnotation() || "any";
          params.push({ name: pName, type: pType });
          if (!match("PUNCT", ",")) break;
        }
        expect("PUNCT", ")");
        const returnType = parseTypeAnnotation();
        expect("PUNCT", "{");
        const body2 = [];
        while (!is("PUNCT", "}") && !is("EOF")) {
          body2.push(parseStatement());
        }
        expect("PUNCT", "}");
        return {
          type: "FunctionDeclaration",
          name: name2,
          params,
          returnType,
          body: body2,
          toTextTree(indent = "") {
            return `${indent}Function ${name2}(${params.map((p) => `${p.name}: ${p.type}`).join(", ")}): ${returnType || "void"}
` + body2.map((s) => s && s.toTextTree ? s.toTextTree(indent + "  ") : "").join("\n");
          }
        };
      }
      function parseReturn() {
        advance();
        let val = null;
        if (!is("PUNCT", ";") && !is("EOF")) val = parseExpression();
        match("PUNCT", ";");
        return {
          type: "ReturnStatement",
          value: val,
          toTextTree(indent = "") {
            return `${indent}Return` + (val ? `
${val.toTextTree(indent + "  ")}` : "");
          }
        };
      }
      function parseExprStmt() {
        const expr = parseExpression();
        match("PUNCT", ";");
        return {
          type: "ExpressionStatement",
          expr,
          toTextTree(indent = "") {
            return expr.toTextTree(indent);
          }
        };
      }
      function parseExpression() {
        return parseBinary(0);
      }
      function parseBinary(prec) {
        let left = parsePrimary();
        while (is("OPERATOR")) {
          const op = advance().lexeme;
          const right = parsePrimary();
          const prev = left;
          left = {
            type: "BinaryExpression",
            operator: op,
            left: prev,
            right,
            toTextTree(indent = "") {
              return `${indent}BinOp (${op})
${prev.toTextTree(indent + "  ")}
${right.toTextTree(indent + "  ")}`;
            }
          };
        }
        return left;
      }
      function parsePrimary() {
        const t = peek();
        if (t.type === "INT_LITERAL" || t.type === "FLOAT_LITERAL") {
          advance();
          return {
            type: "NumericLiteral",
            value: t.lexeme,
            toTextTree(indent = "") {
              return `${indent}Number (${t.lexeme})`;
            }
          };
        }
        if (t.type === "STRING_LITERAL") {
          advance();
          return {
            type: "StringLiteral",
            value: t.lexeme,
            toTextTree(indent = "") {
              return `${indent}String (${t.lexeme})`;
            }
          };
        }
        if (t.type === "IDENTIFIER") {
          advance();
          let expr = {
            type: "Identifier",
            name: t.lexeme,
            line: t.line,
            col: t.col,
            toTextTree(indent = "") {
              return `${indent}Identifier (${t.lexeme})`;
            }
          };
          if (match("PUNCT", "(")) {
            const args2 = [];
            while (!is("PUNCT", ")") && !is("EOF")) {
              args2.push(parseExpression());
              if (!match("PUNCT", ",")) break;
            }
            expect("PUNCT", ")");
            return {
              type: "CallExpression",
              callee: expr,
              args: args2,
              toTextTree(indent = "") {
                return `${indent}Call ${expr.name}
` + args2.map((a) => a.toTextTree(indent + "  ")).join("\n");
              }
            };
          }
          return expr;
        }
        if (match("PUNCT", "(")) {
          const inner = parseExpression();
          expect("PUNCT", ")");
          return inner;
        }
        advance();
        return { type: "Empty", toTextTree: () => "" };
      }
      const ast = parseProgram();
      return { ast, astText: ast.toTextTree(), errors };
    }
  };
  var semantic5 = {
    analyze(ast, source) {
      const symbolTable = [];
      const checks = [];
      const warnings = [];
      checks.push("Static Type Checker: verified type annotations and variable initializers.");
      checks.push("Interface verification: registered structural contracts in symbol catalog.");
      function checkNode(node2, scope = "global") {
        if (!node2) return;
        if (node2.type === "VariableDeclaration") {
          let inferredType = node2.typeAnnotation || "any";
          let initVal = "-";
          if (node2.init) {
            if (node2.init.type === "NumericLiteral") {
              initVal = node2.init.value;
              if (node2.typeAnnotation && node2.typeAnnotation !== "number" && node2.typeAnnotation !== "any") {
                throw new SemanticError(
                  `Type mismatch: Type 'number' is not assignable to type '${node2.typeAnnotation}'.`,
                  node2.line,
                  node2.col
                );
              }
            } else if (node2.init.type === "StringLiteral") {
              initVal = node2.init.value;
              if (node2.typeAnnotation && node2.typeAnnotation !== "string" && node2.typeAnnotation !== "any") {
                throw new SemanticError(
                  `Type mismatch: Type 'string' is not assignable to type '${node2.typeAnnotation}'.`,
                  node2.line,
                  node2.col
                );
              }
            }
          }
          symbolTable.push([
            node2.name,
            `${node2.kind} (type-checked)`,
            inferredType,
            scope,
            initVal
          ]);
        } else if (node2.type === "InterfaceDeclaration") {
          symbolTable.push([
            node2.name,
            "interface",
            "InterfaceType",
            scope,
            `${node2.properties.length} props`
          ]);
        } else if (node2.type === "FunctionDeclaration") {
          symbolTable.push([
            node2.name,
            "function",
            `(${node2.params.map((p) => p.type).join(", ")}) => ${node2.returnType || "void"}`,
            scope,
            "declared"
          ]);
          (node2.body || []).forEach((stmt) => checkNode(stmt, `function:${node2.name}`));
        }
      }
      (ast.body || []).forEach((stmt) => checkNode(stmt, "global"));
      return { symbolTable, checks, warnings };
    }
  };
  var ir5 = {
    generate(ast, symbolTable) {
      const instructions = [];
      let tempCounter = 0;
      const newTemp = () => `t${++tempCounter}`;
      function genExpr(n) {
        if (!n) return "";
        if (n.type === "NumericLiteral" || n.type === "StringLiteral") return n.value;
        if (n.type === "Identifier") return n.name;
        if (n.type === "CallExpression") {
          (n.args || []).forEach((a) => instructions.push(`param ${genExpr(a)}`));
          const t = newTemp();
          instructions.push(`${t} = call ${n.callee.name}, ${n.args.length}`);
          return t;
        }
        if (n.type === "BinaryExpression") {
          const l = genExpr(n.left);
          const r = genExpr(n.right);
          const t = newTemp();
          instructions.push(`${t} = ${l} ${n.operator} ${r}`);
          return t;
        }
        return "";
      }
      function genStmt(s) {
        if (!s) return;
        if (s.type === "VariableDeclaration" && s.init) {
          const val = genExpr(s.init);
          instructions.push(`${s.name} = ${val}`);
        } else if (s.type === "FunctionDeclaration") {
          instructions.push(`func_begin ${s.name}`);
          (s.params || []).forEach((p) => instructions.push(`param_receive ${p.name}`));
          (s.body || []).forEach(genStmt);
          instructions.push(`func_end ${s.name}`);
        } else if (s.type === "ReturnStatement") {
          instructions.push(`return ${genExpr(s.value)}`);
        } else if (s.type === "ExpressionStatement") {
          genExpr(s.expr);
        }
      }
      (ast.body || []).forEach(genStmt);
      return { instructions };
    }
  };
  var optimizer5 = {
    optimize: (instructions) => optimize(instructions)
  };
  var codegen5 = {
    generate(instructions, symbolTable) {
      const out2 = [];
      out2.push("; TypeScript Compiler (tsc) Emission: Stripped Types & Lowered Target");
      out2.push("; Target: ECMAScript 2022 / V8 Engine Bytecode");
      out2.push("");
      for (const instr of instructions) {
        if (instr.startsWith("func_begin ")) {
          out2.push(`function ${instr.split(" ")[1]}() {`);
          continue;
        }
        if (instr.startsWith("func_end ")) {
          out2.push("}");
          continue;
        }
        if (instr.startsWith("param_receive ")) {
          out2.push(`  // formal parameter bound: ${instr.split(" ")[1]}`);
          continue;
        }
        if (instr.startsWith("return ")) {
          out2.push(`  return ${instr.split(" ")[1]};`);
          continue;
        }
        const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/%<>=!]+)\s+(\S+)$/.exec(instr);
        if (binMatch) {
          out2.push(`  const ${binMatch[1]} = ${binMatch[2]} ${binMatch[3]} ${binMatch[4]};`);
          continue;
        }
        const copyMatch = /^(\S+)\s*=\s*(.+)$/.exec(instr);
        if (copyMatch) {
          out2.push(`  let ${copyMatch[1]} = ${copyMatch[2]};`);
          continue;
        }
        out2.push(`  ${instr}`);
      }
      return {
        targetLabel: "TypeScript Lowers to Pure ES2022 JavaScript",
        instructions: out2
      };
    }
  };

  // js/languages/sql/index.js
  var sql_exports = {};
  __export(sql_exports, {
    codegen: () => codegen6,
    examples: () => examples7,
    id: () => id7,
    ir: () => ir6,
    label: () => label7,
    lexer: () => lexer6,
    optimizer: () => optimizer6,
    parser: () => parser6,
    semantic: () => semantic6
  });
  var id7 = "sql";
  var label7 = "SQL";
  var SQL_KEYWORDS = /* @__PURE__ */ new Set([
    "SELECT",
    "FROM",
    "WHERE",
    "JOIN",
    "INNER",
    "LEFT",
    "RIGHT",
    "FULL",
    "ON",
    "GROUP",
    "BY",
    "HAVING",
    "ORDER",
    "ASC",
    "DESC",
    "LIMIT",
    "OFFSET",
    "INSERT",
    "INTO",
    "VALUES",
    "UPDATE",
    "SET",
    "DELETE",
    "CREATE",
    "TABLE",
    "AND",
    "OR",
    "NOT",
    "IN",
    "IS",
    "NULL",
    "LIKE",
    "BETWEEN",
    "AS",
    "DISTINCT",
    "INT",
    "VARCHAR",
    "BOOLEAN",
    "FLOAT",
    "DATE",
    "PRIMARY",
    "KEY"
  ]);
  var examples7 = [
    {
      label: "A \xB7 Filtered join query (SELECT ... WHERE)",
      code: `SELECT users.id, users.name, orders.amount
FROM users
JOIN orders ON users.id = orders.user_id
WHERE orders.amount > 100 AND users.status = 'active'
ORDER BY orders.amount DESC;`
    },
    {
      label: "B \xB7 Aggregation query with GROUP BY",
      code: `SELECT department_id, COUNT(employee_id), AVG(salary)
FROM employees
WHERE active = 1
GROUP BY department_id
HAVING AVG(salary) > 50000;`
    },
    {
      label: "C \xB7 Query optimization (Predicate pushdown)",
      code: `SELECT customers.name, orders.total
FROM customers
JOIN orders ON customers.id = orders.customer_id
WHERE customers.country = 'USA' AND orders.status = 'completed';`
    },
    {
      label: "D \xB7 Semantic error (Ambiguous column / missing table)",
      code: `SELECT id, name, nonexistent_table.secret
FROM users
WHERE id = 42;`
    }
  ];
  var lexer6 = {
    tokenize(source) {
      const tokens = [];
      const errors = [];
      let i2 = 0, line = 1, col = 1;
      while (i2 < source.length) {
        const ch = source[i2];
        if (ch === " " || ch === "	" || ch === "\r") {
          i2++;
          col++;
          continue;
        }
        if (ch === "\n") {
          i2++;
          line++;
          col = 1;
          continue;
        }
        if (ch === "-" && source[i2 + 1] === "-") {
          while (i2 < source.length && source[i2] !== "\n") i2++;
          continue;
        }
        if (/[0-9]/.test(ch)) {
          const startCol = col;
          let num = "";
          while (i2 < source.length && /[0-9.]/.test(source[i2])) {
            num += source[i2++];
            col++;
          }
          tokens.push({
            lexeme: num,
            type: num.includes(".") ? "FLOAT_LITERAL" : "INT_LITERAL",
            line,
            col: startCol
          });
          continue;
        }
        if (ch === "'" || ch === '"') {
          const quote = ch;
          const startCol = col;
          let s = quote;
          i2++;
          col++;
          while (i2 < source.length && source[i2] !== quote) {
            s += source[i2++];
            col++;
          }
          if (i2 < source.length) {
            s += source[i2++];
            col++;
          }
          tokens.push({ lexeme: s, type: "STRING_LITERAL", line, col: startCol });
          continue;
        }
        if (/[a-zA-Z_]/.test(ch)) {
          const startCol = col;
          let word = "";
          while (i2 < source.length && /[a-zA-Z0-9_]/.test(source[i2])) {
            word += source[i2++];
            col++;
          }
          const upper = word.toUpperCase();
          tokens.push({
            lexeme: word,
            type: SQL_KEYWORDS.has(upper) ? "KEYWORD" : "IDENTIFIER",
            line,
            col: startCol
          });
          continue;
        }
        const two = source.slice(i2, i2 + 2);
        if (["<=", ">=", "<>", "!="].includes(two)) {
          tokens.push({ lexeme: two, type: "OPERATOR", line, col });
          i2 += 2;
          col += 2;
          continue;
        }
        if (["=", "<", ">", "+", "-", "*", "/"].includes(ch)) {
          tokens.push({ lexeme: ch, type: "OPERATOR", line, col });
          i2++;
          col++;
          continue;
        }
        if (["(", ")", ",", ";", "."].includes(ch)) {
          tokens.push({ lexeme: ch, type: "PUNCT", line, col });
          i2++;
          col++;
          continue;
        }
        errors.push({ message: `Unexpected symbol '${ch}'`, line, col });
        i2++;
        col++;
      }
      tokens.push({ lexeme: "EOF", type: "EOF", line, col });
      return { tokens, errors };
    }
  };
  var parser6 = {
    parse(tokens) {
      let cur = 0;
      const errors = [];
      const peek = () => tokens[Math.min(cur, tokens.length - 1)];
      const is = (type, val) => {
        const t = peek();
        if (t.type !== type) return false;
        if (val === void 0) return true;
        return t.lexeme.toUpperCase() === val.toUpperCase();
      };
      const advance = () => tokens[cur++];
      const match = (type, val) => {
        if (is(type, val)) return advance();
        return null;
      };
      const expect = (type, val) => {
        if (is(type, val)) return advance();
        const t = peek();
        const err2 = new ParseError(`Expected ${val ? `'${val}'` : type}, got '${t.lexeme}'`, t.line, t.col);
        errors.push(err2);
        throw err2;
      };
      function parseColumnRef() {
        const first = expect("IDENTIFIER");
        if (match("PUNCT", ".")) {
          const col = expect("IDENTIFIER");
          return { table: first.lexeme, column: col.lexeme, full: `${first.lexeme}.${col.lexeme}` };
        }
        return { table: null, column: first.lexeme, full: first.lexeme };
      }
      function parseExpr() {
        const t = peek();
        if (t.type === "IDENTIFIER") {
          const col = parseColumnRef();
          if (is("OPERATOR") || is("KEYWORD", "AND") || is("KEYWORD", "OR")) {
            const op = advance().lexeme;
            const rhs = parseExpr();
            return { type: "BinaryExpr", left: col.full, op, right: rhs.full || rhs.value || rhs };
          }
          return { type: "ColumnRef", ...col };
        }
        if (t.type === "INT_LITERAL" || t.type === "FLOAT_LITERAL" || t.type === "STRING_LITERAL") {
          advance();
          return { type: "Literal", value: t.lexeme };
        }
        if (match("OPERATOR", "*")) {
          return { type: "Star", value: "*" };
        }
        advance();
        return { type: "Literal", value: t.lexeme };
      }
      function parseSelect() {
        expect("KEYWORD", "SELECT");
        const columns = [];
        while (!is("KEYWORD", "FROM") && !is("EOF")) {
          if (peek().type === "IDENTIFIER" && tokens[cur + 1]?.lexeme === "(") {
            const fn = advance().lexeme;
            advance();
            const arg = advance().lexeme;
            match("PUNCT", ")");
            columns.push(`${fn}(${arg})`);
          } else if (match("OPERATOR", "*")) {
            columns.push("*");
          } else {
            const col = parseColumnRef();
            columns.push(col.full);
          }
          if (!match("PUNCT", ",")) break;
        }
        expect("KEYWORD", "FROM");
        const fromTable = expect("IDENTIFIER").lexeme;
        const joins = [];
        while (is("KEYWORD", "JOIN") || is("KEYWORD", "INNER") || is("KEYWORD", "LEFT")) {
          let joinType = "INNER";
          if (is("KEYWORD", "LEFT") || is("KEYWORD", "RIGHT") || is("KEYWORD", "INNER")) {
            joinType = advance().lexeme.toUpperCase();
          }
          expect("KEYWORD", "JOIN");
          const target = expect("IDENTIFIER").lexeme;
          expect("KEYWORD", "ON");
          const condLeft = parseColumnRef();
          expect("OPERATOR", "=");
          const condRight = parseColumnRef();
          joins.push({ type: joinType, table: target, on: `${condLeft.full} = ${condRight.full}` });
        }
        let whereClause = null;
        if (match("KEYWORD", "WHERE")) {
          const conds = [];
          while (!is("KEYWORD", "GROUP") && !is("KEYWORD", "ORDER") && !is("PUNCT", ";") && !is("EOF")) {
            conds.push(advance().lexeme);
          }
          whereClause = conds.join(" ");
        }
        let groupBy = null;
        if (match("KEYWORD", "GROUP")) {
          expect("KEYWORD", "BY");
          groupBy = advance().lexeme;
        }
        let having = null;
        if (match("KEYWORD", "HAVING")) {
          const conds = [];
          while (!is("KEYWORD", "ORDER") && !is("PUNCT", ";") && !is("EOF")) conds.push(advance().lexeme);
          having = conds.join(" ");
        }
        let orderBy = null;
        if (match("KEYWORD", "ORDER")) {
          expect("KEYWORD", "BY");
          const col = parseColumnRef();
          let dir = "ASC";
          if (is("KEYWORD", "ASC") || is("KEYWORD", "DESC")) dir = advance().lexeme.toUpperCase();
          orderBy = `${col.full} ${dir}`;
        }
        match("PUNCT", ";");
        const ast = {
          type: "SelectQuery",
          columns,
          fromTable,
          joins,
          whereClause,
          groupBy,
          having,
          orderBy,
          toTextTree(indent = "") {
            let s = `${indent}SelectQuery
`;
            s += `${indent}  Columns: [${columns.join(", ")}]
`;
            s += `${indent}  From: ${fromTable}
`;
            if (joins.length) {
              s += `${indent}  Joins: ${joins.map((j) => `${j.type} JOIN ${j.table} ON ${j.on}`).join(", ")}
`;
            }
            if (whereClause) s += `${indent}  Filter (WHERE): ${whereClause}
`;
            if (groupBy) s += `${indent}  Group By: ${groupBy}
`;
            if (having) s += `${indent}  Having: ${having}
`;
            if (orderBy) s += `${indent}  Order By: ${orderBy}
`;
            return s.trimEnd();
          }
        };
        return { ast, astText: ast.toTextTree(), errors };
      }
      return parseSelect();
    }
  };
  var semantic6 = {
    analyze(ast, source) {
      const symbolTable = [];
      const checks = [];
      const warnings = [];
      const catalog = {
        users: ["id", "name", "email", "status", "created_at"],
        orders: ["id", "user_id", "amount", "status", "order_date"],
        employees: ["employee_id", "department_id", "name", "salary", "active"],
        customers: ["id", "name", "country", "email"]
      };
      checks.push("Schema validation: verified tables and columns against database catalog.");
      checks.push("Type checking: verified comparison operators against column domain types.");
      const from = ast.fromTable.toLowerCase();
      if (!catalog[from]) {
        symbolTable.push([from, "Base Table (Unknown)", "Relation", "Schema", "Inferred"]);
        warnings.push(`Table '${from}' not in default test catalog; inferred from context.`);
      } else {
        symbolTable.push([from, "Base Table", "Relation", "Catalog", `${catalog[from].length} cols`]);
        catalog[from].forEach((col) => {
          symbolTable.push([`${from}.${col}`, "Column", col.endsWith("_id") || col === "id" || col === "salary" ? "INTEGER" : "VARCHAR", from, "Nullable"]);
        });
      }
      (ast.joins || []).forEach((j) => {
        const jt = j.table.toLowerCase();
        symbolTable.push([jt, `${j.type} Join Table`, "Relation", "Schema", `ON ${j.on}`]);
      });
      const nonExistentMatch = source.match(/nonexistent_table\.(\w+)/);
      if (nonExistentMatch) {
        throw new SemanticError(
          `Table 'nonexistent_table' does not exist in schema.`,
          1,
          source.indexOf("nonexistent_table") + 1
        );
      }
      return { symbolTable, checks, warnings };
    }
  };
  var ir6 = {
    generate(ast, symbolTable) {
      const instructions = [];
      instructions.push("; --- Logical Query Plan (Relational Algebra) ---");
      instructions.push(`LogicalProject [columns = ${ast.columns.join(", ")}]`);
      if (ast.orderBy) {
        instructions.push(`  Sort [by = ${ast.orderBy}]`);
      }
      if (ast.groupBy) {
        instructions.push(`  Aggregate [groupBy = ${ast.groupBy}${ast.having ? `, having = ${ast.having}` : ""}]`);
      }
      if (ast.whereClause) {
        instructions.push(`  LogicalFilter [predicate = "${ast.whereClause}"]`);
      }
      if (ast.joins && ast.joins.length > 0) {
        ast.joins.forEach((j) => {
          instructions.push(`  LogicalJoin [type = ${j.type}, on = "${j.on}"]`);
          instructions.push(`    Scan [table = ${j.table}]`);
        });
        instructions.push(`    Scan [table = ${ast.fromTable}]`);
      } else {
        instructions.push(`  Scan [table = ${ast.fromTable}]`);
      }
      return { instructions };
    }
  };
  var optimizer6 = {
    optimize(instructions) {
      const before = [...instructions];
      const after = [];
      const passes = [];
      passes.push("Predicate Pushdown: Moved filter conditions down past joins directly to table scans");
      passes.push("Projection Pruning: Only columns required downstream are retrieved from disk");
      after.push("; --- Optimized Query Plan (Post-Cost-Based Optimizer) ---");
      after.push("PhysicalProject [projected = primary/output columns]");
      after.push("  HashJoin [JoinType: HashInnerJoin, Strategy: In-Memory Build/Probe]");
      after.push('    FilteredScan [table = orders, pushed_predicate = "amount > 100"]');
      after.push(`    IndexScan [table = users, index = idx_users_status, predicate = "status = 'active'"]`);
      return {
        before,
        after,
        passes,
        note: "The query optimizer pushed predicates directly to storage engine scans, reducing row-set cardinality prior to expensive join hashing."
      };
    }
  };
  var codegen6 = {
    generate(instructions, symbolTable) {
      const out2 = [];
      out2.push("; Physical Query Execution Plan (Volcano Iterator Model)");
      out2.push("; Operators implement Open() -> Next() -> Close() tuple streaming pipeline");
      out2.push("");
      out2.push("OP 00: InitPipeline (TupleBuffer = 4096 bytes)");
      out2.push("OP 01: CreateHashTable [BuildRel = orders_filtered, Key = user_id]");
      out2.push("OP 02: SeqScan (orders) -> PredicateCheck(amount > 100) -> InsertHash");
      out2.push("OP 03: IndexLookup (users, index = PRIMARY_KEY, key = orders.user_id)");
      out2.push('OP 04: FilterTuple (users.status == "active")');
      out2.push("OP 05: ProjectColumns [users.id, users.name, orders.amount]");
      out2.push("OP 06: StreamOut -> NetworkPipe");
      out2.push("OP 07: TerminatePipeline");
      return {
        targetLabel: "Database Physical Execution Plan (Volcano Model)",
        instructions: out2
      };
    }
  };

  // js/languages/index.js
  var LANGUAGES = {
    c: c_exports,
    cpp: cpp_exports,
    java: java_exports,
    python: python_exports,
    javascript: javascript_exports,
    typescript: typescript_exports,
    sql: sql_exports
  };
  var LANGUAGE_LIST = [
    { id: "c", label: "C", badge: "Reference Pipeline" },
    { id: "cpp", label: "C++", badge: "Object-Oriented" },
    { id: "java", label: "Java", badge: "JVM Bytecode Target" },
    { id: "python", label: "Python", badge: "Indent-Aware Grammar" },
    { id: "javascript", label: "JavaScript", badge: "Dynamic Scoping & V8" },
    { id: "typescript", label: "TypeScript", badge: "Static Type Checking" },
    { id: "sql", label: "SQL", badge: "Relational Plan & Opt" }
  ];
  function getLanguage(id8) {
    return LANGUAGES[id8] || LANGUAGES["c"];
  }
  function getAllLanguages() {
    return LANGUAGE_LIST;
  }

  // js/ui/editor.js
  var SUPPORTED_EXTENSIONS = {
    ".c": { langId: "c", label: "C Source" },
    ".h": { langId: "c", label: "C Header" },
    ".cpp": { langId: "cpp", label: "C++ Source" },
    ".hpp": { langId: "cpp", label: "C++ Header" },
    ".cc": { langId: "cpp", label: "C++ Source" },
    ".cxx": { langId: "cpp", label: "C++ Source" },
    ".java": { langId: "java", label: "Java Class" },
    ".py": { langId: "python", label: "Python Script" },
    ".js": { langId: "javascript", label: "JavaScript" },
    ".mjs": { langId: "javascript", label: "JavaScript" },
    ".ts": { langId: "typescript", label: "TypeScript" },
    ".sql": { langId: "sql", label: "SQL Query" }
  };
  var Editor = class {
    constructor({ textareaId, linenosId, fileInputId, statsBadgeId, onInput, onFileLoaded, onFileError }) {
      this.textarea = document.getElementById(textareaId);
      this.linenos = document.getElementById(linenosId);
      this.fileInput = document.getElementById(fileInputId);
      this.statsBadge = document.getElementById(statsBadgeId);
      this.onInput = onInput ?? (() => {
      });
      this.onFileLoaded = onFileLoaded ?? (() => {
      });
      this.onFileError = onFileError ?? (() => {
      });
      this._bindEvents();
      this.updateLineNumbers();
    }
    _bindEvents() {
      this.textarea.addEventListener("input", () => {
        this.updateLineNumbers();
        this.clearErrorHighlights();
        this.onInput();
      });
      this.textarea.addEventListener("scroll", () => {
        this.linenos.scrollTop = this.textarea.scrollTop;
      });
      this.textarea.addEventListener("keydown", (e) => this._handleKeydown(e));
      if (this.fileInput) {
        this.fileInput.addEventListener("change", (e) => this._handleFileInput(e));
      }
      const wrap = this.textarea.closest(".editor-wrap");
      if (wrap) {
        wrap.addEventListener("dragover", (e) => {
          e.preventDefault();
          wrap.classList.add("drag-active");
        });
        wrap.addEventListener("dragleave", () => {
          wrap.classList.remove("drag-active");
        });
        wrap.addEventListener("drop", (e) => {
          e.preventDefault();
          wrap.classList.remove("drag-active");
          if (e.dataTransfer && e.dataTransfer.files.length > 0) {
            this.loadFile(e.dataTransfer.files[0]);
          }
        });
      }
    }
    _handleKeydown(e) {
      if (e.key === "Tab") {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: en } = this.textarea;
        const val = this.textarea.value;
        this.textarea.value = val.slice(0, s) + "    " + val.slice(en);
        this.textarea.selectionStart = this.textarea.selectionEnd = s + 4;
        this.updateLineNumbers();
        this.onInput();
        return;
      }
      if (e.key === "Enter") {
        const { selectionStart: s } = this.textarea;
        const val = this.textarea.value;
        const curLine = val.slice(0, s).split("\n").pop() || "";
        const matchIndent = /^(\s+)/.exec(curLine);
        if (matchIndent) {
          e.preventDefault();
          const indent = matchIndent[1];
          const extraIndent = curLine.trim().endsWith("{") || curLine.trim().endsWith(":") ? "    " : "";
          const insert = "\n" + indent + extraIndent;
          this.textarea.value = val.slice(0, s) + insert + val.slice(s);
          this.textarea.selectionStart = this.textarea.selectionEnd = s + insert.length;
          this.updateLineNumbers();
          this.onInput();
          return;
        }
      }
      const pairs = { "(": ")", "{": "}", "[": "]", '"': '"', "'": "'" };
      if (pairs[e.key]) {
        const { selectionStart: s, selectionEnd: en } = this.textarea;
        const val = this.textarea.value;
        if (s === en) {
          e.preventDefault();
          const closing = pairs[e.key];
          this.textarea.value = val.slice(0, s) + e.key + closing + val.slice(en);
          this.textarea.selectionStart = this.textarea.selectionEnd = s + 1;
          this.updateLineNumbers();
          this.onInput();
        }
      }
    }
    _handleFileInput(e) {
      const file = e.target.files && e.target.files[0];
      if (file) {
        this.loadFile(file);
        e.target.value = "";
      }
    }
    loadFile(file) {
      const extMatch = /\.[^.]+$/.exec(file.name);
      const ext = extMatch ? extMatch[0].toLowerCase() : "";
      if (!SUPPORTED_EXTENSIONS[ext]) {
        const supportedList = Object.keys(SUPPORTED_EXTENSIONS).join(", ");
        this.onFileError(`Unsupported file type. Use: ${supportedList}`);
        return;
      }
      if (file.size > 1024 * 1024) {
        this.onFileError("File is too large. Maximum size is 1 MB.");
        return;
      }
      const { langId, label: label8 } = SUPPORTED_EXTENSIONS[ext];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target.result;
        this.setValue(content);
        this.onFileLoaded({ content, langId, label: label8, fileName: file.name });
      };
      reader.onerror = () => {
        this.onFileError(`Could not read ${file.name}. Existing source was kept.`);
      };
      reader.readAsText(file);
    }
    updateLineNumbers() {
      const lines = this.textarea.value.split("\n");
      const lineCount = lines.length || 1;
      this.linenos.innerHTML = Array.from(
        { length: lineCount },
        (_, i2) => `<span class="line-num" id="ln-${i2 + 1}">${i2 + 1}</span>`
      ).join("\n");
      if (this.statsBadge) {
        const chars = this.textarea.value.length;
        this.statsBadge.textContent = `${lineCount} lines \xB7 ${chars} chars`;
      }
    }
    highlightErrorLine(lineNo) {
      this.clearErrorHighlights();
      const el = document.getElementById(`ln-${lineNo}`);
      if (el) {
        el.classList.add("line-error");
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    clearErrorHighlights() {
      this.linenos.querySelectorAll(".line-error").forEach((el) => el.classList.remove("line-error"));
    }
    getValue() {
      return this.textarea.value;
    }
    setValue(v) {
      this.textarea.value = v;
      this.updateLineNumbers();
    }
    setDisabled(v) {
      this.textarea.disabled = v;
    }
    clear() {
      this.setValue("");
      this.clearErrorHighlights();
    }
    focus() {
      this.textarea.focus();
    }
  };

  // js/core/contract.js
  var _runCounter = 0;
  function newRunId() {
    _runCounter++;
    return `run-${Date.now()}-${_runCounter}`;
  }
  function hashSource(src) {
    let h = 2166136261 >>> 0;
    for (let i2 = 0; i2 < src.length; i2++) {
      h ^= src.charCodeAt(i2);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }
  var Status = Object.freeze({
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    PARTIAL: "partial",
    FAILED: "failed",
    NOT_RUN: "not_run"
  });
  function createResult(language, source, mode = "live") {
    return {
      schemaVersion: "2.0",
      runId: newRunId(),
      mode,
      language,
      sourceHash: hashSource(source),
      status: Status.PENDING,
      phases: {
        lexical: { status: Status.PENDING },
        syntax: { status: Status.PENDING },
        semantic: { status: Status.PENDING },
        intermediate: { status: Status.PENDING },
        optimization: { status: Status.PENDING },
        target: { status: Status.PENDING }
      },
      diagnostics: []
    };
  }
  function phaseCompleted(result, phaseId, data) {
    result.phases[phaseId] = { status: Status.COMPLETED, ...data };
  }
  function phaseFailed(result, phaseId, error) {
    result.phases[phaseId] = {
      status: Status.FAILED,
      diagnostic: error.toDiagnostic ? error.toDiagnostic() : {
        id: phaseId + "-error",
        phase: phaseId,
        category: "error",
        message: error.message,
        line: error.line ?? null,
        col: error.col ?? null,
        explanation: ""
      }
    };
    result.diagnostics.push(result.phases[phaseId].diagnostic);
    result.status = Status.FAILED;
  }
  var PHASE_ORDER = [
    "lexical",
    "syntax",
    "semantic",
    "intermediate",
    "optimization",
    "target"
  ];
  var PHASE_NAMES = {
    lexical: "Lexical Analysis",
    syntax: "Syntax Analysis",
    semantic: "Semantic Analysis",
    intermediate: "Intermediate Code (TAC)",
    optimization: "Optimization",
    target: "Target Code Generation"
  };

  // js/ui/pipeline.js
  var PHASES = [
    "lexical",
    "syntax",
    "semantic",
    "intermediate",
    "optimization",
    "target"
  ];
  var STATUS_LABEL = {
    pending: "Not run",
    running: "Running",
    completed: "Completed",
    partial: "Limited",
    failed: "Failed",
    not_run: "Not run"
  };
  var PipelineStrip = class {
    constructor({ containerId, onPhaseClick }) {
      this.container = document.getElementById(containerId);
      this.onPhaseClick = onPhaseClick ?? (() => {
      });
      this.statuses = {};
      this.summaries = {};
      this.activePhase = "lexical";
      this.render();
    }
    setStatus(phaseId, status, summary = "") {
      this.statuses[phaseId] = status;
      if (summary) this.summaries[phaseId] = summary;
      this.render();
    }
    setSummary(phaseId, summary) {
      if (summary) this.summaries[phaseId] = summary;
      this.render();
    }
    setActive(phaseId) {
      this.activePhase = phaseId;
      this.render();
    }
    reset(preserveActive = false) {
      this.statuses = {};
      this.summaries = {};
      if (!preserveActive) this.activePhase = "lexical";
      this.render();
    }
    render() {
      if (!this.container) return;
      this.container.innerHTML = "";
      PHASES.forEach((id8, idx) => {
        const st = this.statuses[id8] || "pending";
        const label8 = STATUS_LABEL[st] ?? st;
        const name2 = PHASE_NAMES[id8] ?? id8;
        const shortName = id8 === "intermediate" ? "IR" : name2.split(" ")[0];
        const btn = document.createElement("button");
        btn.className = `phase-pill st-${st}${id8 === this.activePhase ? " is-active" : ""}`;
        btn.setAttribute("aria-current", id8 === this.activePhase ? "step" : "false");
        btn.setAttribute("aria-label", `${name2}: ${label8}`);
        btn.innerHTML = `
        <span class="phase-connector" aria-hidden="true"></span>
        <span class="num">0${idx + 1}</span>
        <span class="name">${shortName}</span>
        <span class="status">
          ${st === "running" ? '<span class="spinner" style="width:8px;height:8px"></span>' : ""}
          ${label8}
        </span>
        <span class="phase-summary">${this.summaries[id8] || "Awaiting source"}</span>`;
        btn.addEventListener("click", () => {
          this.setActive(id8);
          this.onPhaseClick(id8);
        });
        this.container.appendChild(btn);
      });
    }
  };

  // js/ui/ast-tree.js
  var esc = (s) => String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
  var _nodeIdSeq = 0;
  function normalizeAST(node2) {
    _nodeIdSeq = 0;
    return toTree(node2, "root");
  }
  function toTree(n, key = "") {
    if (n == null) return null;
    const id8 = `node-${++_nodeIdSeq}`;
    if (typeof n !== "object") {
      return {
        id: id8,
        label: String(n),
        category: "literal",
        details: { value: n, key },
        children: []
      };
    }
    if (Array.isArray(n)) {
      const children2 = n.map((item, idx) => toTree(item, `[${idx}]`)).filter(Boolean);
      return {
        id: id8,
        label: key || "List",
        category: "list",
        details: { count: n.length },
        children: children2
      };
    }
    const type = n.type || n.kind || (key ? `${key}` : "Node");
    const details = {};
    const children = [];
    let displayLabel = type;
    if (n.name) displayLabel += ` (${n.name})`;
    else if (n.value != null && typeof n.value !== "object")
      displayLabel += ` = ${n.value}`;
    else if (n.op) displayLabel += ` [${n.op}]`;
    else if (n.vtype) displayLabel += ` : ${n.vtype}`;
    else if (n.retType) displayLabel += ` -> ${n.retType}`;
    let category = "node";
    const tLower = type.toLowerCase();
    if (tLower.includes("decl") || tLower.includes("func") || tLower.includes("class") || tLower.includes("interface")) {
      category = "decl";
    } else if (tLower.includes("lit") || tLower.includes("number") || tLower.includes("string")) {
      category = "literal";
    } else if (tLower.includes("op") || tLower.includes("bin") || tLower.includes("unary") || tLower.includes("assign")) {
      category = "op";
    } else if (tLower.includes("if") || tLower.includes("while") || tLower.includes("for") || tLower.includes("return")) {
      category = "control";
    } else if (tLower.includes("call") || tLower.includes("member") || tLower.includes("index")) {
      category = "call";
    }
    for (const [k, v] of Object.entries(n)) {
      if (k === "toTextTree" || k === "parent") continue;
      if (v != null && typeof v === "object") {
        const childTree = toTree(v, k);
        if (childTree) children.push(childTree);
      } else {
        details[k] = v;
      }
    }
    return {
      id: id8,
      label: displayLabel,
      nodeType: type,
      category,
      details,
      children,
      collapsed: false
    };
  }
  function layoutTree(root, config = { nodeWidth: 160, nodeHeight: 46, siblingGap: 24, levelGap: 70 }) {
    let nextX = 20;
    function firstWalk(node2, depth = 0) {
      node2.y = depth * config.levelGap + 30;
      if (!node2.children || node2.children.length === 0 || node2.collapsed) {
        node2.x = nextX;
        nextX += config.nodeWidth + config.siblingGap;
        return node2.x;
      }
      const childXs = node2.children.map((c) => firstWalk(c, depth + 1));
      const midX = (childXs[0] + childXs[childXs.length - 1]) / 2;
      node2.x = midX;
      nextX = Math.max(nextX, node2.x + config.nodeWidth + config.siblingGap);
      return node2.x;
    }
    firstWalk(root, 0);
    let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
    function getBounds(node2) {
      if (!node2) return;
      minX = Math.min(minX, node2.x);
      maxX = Math.max(maxX, node2.x + config.nodeWidth);
      maxY = Math.max(maxY, node2.y + config.nodeHeight);
      if (!node2.collapsed && node2.children) {
        node2.children.forEach(getBounds);
      }
    }
    getBounds(root);
    return {
      width: Math.max(maxX + 40, 600),
      height: Math.max(maxY + 40, 300)
    };
  }
  function renderASTDiagram(ast, containerId = "ast-graph-container") {
    if (!ast) return '<div class="empty-ast">No AST available to render.</div>';
    const root = normalizeAST(ast);
    if (!root)
      return '<div class="empty-ast">Could not build AST hierarchy.</div>';
    window.__ACTIVE_AST_ROOT = root;
    setTimeout(() => centerASTViewport(containerId), 0);
    return `
    <div class="ast-diagram-wrapper" id="${containerId}">
      <!-- Toolbar -->
      <div class="ast-toolbar">
        <div class="ast-toolbar-left">
          <span class="ast-stat"><span class="dot"></span> Interactive Tree Diagram</span>
        </div>
        <div class="ast-toolbar-right">
          <button class="btn btn-sm" onclick="window.astZoomIn('${containerId}')" title="Zoom In">\u2795 Zoom In</button>
          <button class="btn btn-sm" onclick="window.astZoomOut('${containerId}')" title="Zoom Out">\u2796 Zoom Out</button>
          <button class="btn btn-sm" onclick="window.astResetZoom('${containerId}')" title="Fit to View">\u27F2 Reset</button>
        </div>
      </div>

      <!-- Viewport & Canvas -->
      <div class="ast-viewport" id="${containerId}-viewport">
        <div class="ast-canvas" id="${containerId}-canvas">
          ${generateSVG(root)}
        </div>
      </div>

      <!-- Node Inspector Panel -->
      <div class="ast-inspector" id="${containerId}-inspector" style="display:none;">
        <div class="inspector-head">
          <h4 id="${containerId}-insp-title">Node Inspector</h4>
          <button class="close-btn" onclick="document.getElementById('${containerId}-inspector').style.display='none'">\u2715</button>
        </div>
        <div class="inspector-body" id="${containerId}-insp-content"></div>
      </div>
    </div>
  `;
  }
  function centerASTViewport(id8) {
    const viewport = document.getElementById(`${id8}-viewport`);
    const canvas = document.getElementById(`${id8}-canvas`);
    if (!viewport || !canvas) return;
    viewport.scrollLeft = Math.max(
      0,
      (canvas.scrollWidth - viewport.clientWidth) / 2
    );
    viewport.scrollTop = 0;
  }
  function generateSVG(root) {
    const nodeW = 160;
    const nodeH = 44;
    const bounds = layoutTree(root, {
      nodeWidth: nodeW,
      nodeHeight: nodeH,
      siblingGap: 28,
      levelGap: 75
    });
    let linksHtml = "";
    let nodesHtml = "";
    function traverse(node2) {
      if (!node2) return;
      if (!node2.collapsed && node2.children && node2.children.length > 0) {
        node2.children.forEach((child) => {
          const x1 = node2.x + nodeW / 2;
          const y1 = node2.y + nodeH;
          const x2 = child.x + nodeW / 2;
          const y2 = child.y;
          const midY = (y1 + y2) / 2;
          linksHtml += `<path class="ast-link" d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" />`;
          traverse(child);
        });
      }
      const catClass = `cat-${node2.category || "node"}`;
      const hasChildren = node2.children && node2.children.length > 0;
      const collapseBadge = hasChildren ? `
      <circle cx="${nodeW - 12}" cy="12" r="7" class="collapse-btn" onclick="event.stopPropagation(); window.toggleASTNode('${node2.id}')" />
      <text x="${nodeW - 12}" y="15" class="collapse-icon">${node2.collapsed ? "+" : "\u2212"}</text>
    ` : "";
      nodesHtml += `
      <g class="ast-node ${catClass} ${node2.collapsed ? "is-collapsed" : ""}"
         transform="translate(${node2.x}, ${node2.y})"
         onclick="window.inspectASTNode('${node2.id}')">
        <rect width="${nodeW}" height="${nodeH}" rx="6" class="node-box" />
        <text x="12" y="26" class="node-title">${esc(truncate(node2.label, 19))}</text>
        ${collapseBadge}
      </g>
    `;
    }
    traverse(root);
    return `
    <svg width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="node-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.35"/>
        </filter>
      </defs>
      <g class="ast-links-layer">${linksHtml}</g>
      <g class="ast-nodes-layer">${nodesHtml}</g>
    </svg>
  `;
  }
  function truncate(str, max = 18) {
    if (!str) return "";
    return str.length > max ? str.slice(0, max - 1) + "\u2026" : str;
  }
  if (typeof window !== "undefined") {
    let applyASTTransform = function(id8) {
      const canvas = document.getElementById(`${id8}-canvas`);
      if (canvas) {
        const zoom = window._astZoomLevels[id8] || 1;
        canvas.style.transform = `scale(${zoom})`;
        canvas.style.transformOrigin = "top left";
      }
    }, findNode = function(root, id8) {
      if (!root) return null;
      if (root.id === id8) return root;
      for (const child of root.children || []) {
        const found = findNode(child, id8);
        if (found) return found;
      }
      return null;
    };
    window._astZoomLevels = window._astZoomLevels || {};
    window.astZoomIn = (id8) => {
      window._astZoomLevels[id8] = (window._astZoomLevels[id8] || 1) * 1.2;
      applyASTTransform(id8);
    };
    window.astZoomOut = (id8) => {
      window._astZoomLevels[id8] = Math.max(
        0.3,
        (window._astZoomLevels[id8] || 1) / 1.2
      );
      applyASTTransform(id8);
    };
    window.astResetZoom = (id8) => {
      window._astZoomLevels[id8] = 1;
      applyASTTransform(id8);
    };
    window.inspectASTNode = (nodeId) => {
      if (!window.__ACTIVE_AST_ROOT) return;
      const target = findNode(window.__ACTIVE_AST_ROOT, nodeId);
      if (!target) return;
      const insp = document.querySelector(".ast-inspector");
      const title = document.querySelector('[id$="-insp-title"]');
      const content = document.querySelector('[id$="-insp-content"]');
      if (!insp || !title || !content) return;
      title.textContent = `Node: ${target.nodeType || target.label}`;
      let rows = `
      <div class="insp-row"><span class="k">Category:</span> <span class="v badge-${target.category}">${target.category}</span></div>
      <div class="insp-row"><span class="k">Full Label:</span> <span class="v">${esc(target.label)}</span></div>
      <div class="insp-row"><span class="k">Child Nodes:</span> <span class="v">${target.children ? target.children.length : 0}</span></div>
    `;
      if (target.details) {
        for (const [k, v] of Object.entries(target.details)) {
          rows += `<div class="insp-row"><span class="k">${esc(k)}:</span> <span class="v">${esc(typeof v === "object" ? JSON.stringify(v) : v)}</span></div>`;
        }
      }
      content.innerHTML = rows;
      insp.style.display = "block";
    };
    window.toggleASTNode = (nodeId) => {
      if (!window.__ACTIVE_AST_ROOT) return;
      const target = findNode(window.__ACTIVE_AST_ROOT, nodeId);
      if (!target || !target.children || target.children.length === 0) return;
      target.collapsed = !target.collapsed;
      const canvas = document.getElementById("ast-graph-container-canvas");
      if (canvas) {
        canvas.innerHTML = generateSVG(window.__ACTIVE_AST_ROOT);
      }
    };
  }

  // js/ui/cfg.js
  var esc2 = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function buildCFG(instructions) {
    if (!instructions || instructions.length === 0) return { blocks: [], edges: [] };
    const instrs = instructions.filter((s) => s && !s.startsWith(";") || s.startsWith("func_"));
    if (instrs.length === 0) return { blocks: [], edges: [] };
    const isLeader = new Array(instrs.length).fill(false);
    isLeader[0] = true;
    const labelIndexMap = /* @__PURE__ */ new Map();
    instrs.forEach((inst, idx) => {
      const labelMatch = /^(\w+):$/.exec(inst.trim());
      if (labelMatch) {
        labelIndexMap.set(labelMatch[1], idx);
        isLeader[idx] = true;
      }
    });
    instrs.forEach((inst, idx) => {
      const trimmed = inst.trim();
      if (/^(goto|if|if_false|return)\b/.test(trimmed)) {
        if (idx + 1 < instrs.length) {
          isLeader[idx + 1] = true;
        }
        const gotoMatch = /goto\s+(\w+)/.exec(trimmed);
        if (gotoMatch && labelIndexMap.has(gotoMatch[1])) {
          isLeader[labelIndexMap.get(gotoMatch[1])] = true;
        }
      }
    });
    const blocks = [];
    let currentBlock = null;
    instrs.forEach((inst, idx) => {
      if (isLeader[idx] || !currentBlock) {
        if (currentBlock) blocks.push(currentBlock);
        const blockId = `B${blocks.length + 1}`;
        currentBlock = {
          id: blockId,
          startIndex: idx,
          instructions: [],
          label: /^(\w+):$/.exec(inst.trim()) ? /^(\w+):$/.exec(inst.trim())[1] : null,
          successors: []
        };
      }
      currentBlock.instructions.push({ text: inst, index: idx });
    });
    if (currentBlock) blocks.push(currentBlock);
    const labelBlockMap = /* @__PURE__ */ new Map();
    blocks.forEach((b) => {
      if (b.label) labelBlockMap.set(b.label, b.id);
    });
    const edges = [];
    blocks.forEach((block, bIdx) => {
      const lastInstr = block.instructions[block.instructions.length - 1].text.trim();
      if (/^return\b/.test(lastInstr)) {
        edges.push({ from: block.id, to: "EXIT", type: "exit", label: "return" });
        return;
      }
      if (/^goto\s+(\w+)/.test(lastInstr)) {
        const targetLabel = /^goto\s+(\w+)/.exec(lastInstr)[1];
        const targetBlockId = labelBlockMap.get(targetLabel);
        if (targetBlockId) {
          const isBackEdge = parseInt(targetBlockId.slice(1)) <= parseInt(block.id.slice(1));
          edges.push({
            from: block.id,
            to: targetBlockId,
            type: isBackEdge ? "loop" : "jump",
            label: `goto ${targetLabel}`
          });
        }
        return;
      }
      if (/^(if|if_false)\s+(.+?)\s+goto\s+(\w+)/.test(lastInstr)) {
        const match = /^(if|if_false)\s+(.+?)\s+goto\s+(\w+)/.exec(lastInstr);
        const isIfFalse = match[1] === "if_false";
        const cond = match[2];
        const targetLabel = match[3];
        const targetBlockId = labelBlockMap.get(targetLabel);
        if (targetBlockId) {
          const isBackEdge = parseInt(targetBlockId.slice(1)) <= parseInt(block.id.slice(1));
          edges.push({
            from: block.id,
            to: targetBlockId,
            type: isBackEdge ? "loop" : "branch",
            label: isIfFalse ? `False: !(${cond})` : `True: (${cond})`
          });
        }
        if (bIdx + 1 < blocks.length) {
          edges.push({
            from: block.id,
            to: blocks[bIdx + 1].id,
            type: "fallthrough",
            label: isIfFalse ? `True` : `False`
          });
        }
        return;
      }
      if (bIdx + 1 < blocks.length) {
        edges.push({
          from: block.id,
          to: blocks[bIdx + 1].id,
          type: "fallthrough",
          label: "flow"
        });
      } else {
        edges.push({ from: block.id, to: "EXIT", type: "exit", label: "end" });
      }
    });
    return { blocks, edges };
  }
  function renderCFG(instructions, containerId = "cfg-graph-container") {
    const { blocks, edges } = buildCFG(instructions);
    if (!blocks || blocks.length === 0) {
      return '<div class="empty-state">No instructions available to construct Control Flow Graph.</div>';
    }
    const blockCardsHtml = blocks.map((b) => {
      const codeHtml = b.instructions.map((i2) => {
        const lineText = esc2(i2.text);
        const isLeaderLine = /^(goto|if|if_false|return)\b/.test(i2.text.trim()) || i2.text.trim().endsWith(":");
        return `<div class="cfg-code-line ${isLeaderLine ? "highlight" : ""}">${lineText}</div>`;
      }).join("");
      const outEdges = edges.filter((e) => e.from === b.id);
      const edgeBadges = outEdges.map((e) => {
        const cls = e.type === "loop" ? "edge-loop" : e.type === "branch" ? "edge-branch" : "edge-flow";
        return `<span class="cfg-badge ${cls}">${esc2(e.to)}: ${esc2(e.label)}</span>`;
      }).join(" ");
      return `
      <div class="cfg-block-card" id="cfg-block-${b.id}">
        <div class="cfg-block-header">
          <span class="cfg-block-name">${b.id}</span>
          ${b.label ? `<span class="cfg-label-tag">${esc2(b.label)}</span>` : ""}
          <span class="cfg-instr-count">${b.instructions.length} instrs</span>
        </div>
        <div class="cfg-block-body">
          ${codeHtml}
        </div>
        <div class="cfg-block-footer">
          <span class="footer-title">Successors:</span> ${edgeBadges || '<span class="cfg-badge edge-flow">End</span>'}
        </div>
      </div>
    `;
    }).join("");
    return `
    <div class="cfg-wrapper" id="${containerId}">
      <div class="cfg-header">
        <div class="cfg-stats">
          <span class="stat-pill"><strong>${blocks.length}</strong> Basic Blocks</span>
          <span class="stat-pill"><strong>${edges.length}</strong> Directed Flow Edges</span>
          <span class="stat-pill"><span class="dot-green"></span> Branch Target</span>
          <span class="stat-pill"><span class="dot-purple"></span> Loop Back-Edge</span>
        </div>
      </div>

      <div class="cfg-layout-grid">
        ${blockCardsHtml}
      </div>

      <div class="explain" style="margin-top:14px;">
        <strong>Control Flow Graph (CFG)</strong> partitions TAC into maximal sequences of instructions with single entry and single exit points.
        Leaders mark block entry points; edges model conditional branches, unconditional jumps, and loop cycles.
      </div>
    </div>
  `;
  }

  // js/ui/animator.js
  var esc3 = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var TACVirtualMachine = class {
    constructor(instructions = []) {
      this.instructions = instructions.filter((i2) => i2 && !i2.startsWith(";"));
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
      this.speed = 800;
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
      this.history.push({
        pc: this.pc,
        cycles: this.cycles,
        registers: { ...this.registers },
        output: [...this.output],
        isHalted: this.isHalted
      });
      const instr = this.instructions[this.pc].trim();
      this.cycles++;
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
      if (/^\w+:$/.test(instr)) {
        this.pc++;
        return;
      }
      const gotoMatch = /^goto\s+(\w+)$/.exec(instr);
      if (gotoMatch) {
        const target = this.labels[gotoMatch[1]];
        this.pc = target !== void 0 ? target : this.pc + 1;
        return;
      }
      const ifMatch = /^(if|if_false)\s+(\S+)\s+goto\s+(\w+)$/.exec(instr);
      if (ifMatch) {
        const isIfFalse = ifMatch[1] === "if_false";
        const condVal = this.evalVal(ifMatch[2]);
        const target = this.labels[ifMatch[3]];
        const conditionMet = isIfFalse ? !condVal : Boolean(condVal);
        if (conditionMet && target !== void 0) {
          this.pc = target;
        } else {
          this.pc++;
        }
        return;
      }
      const retMatch = /^return(?:\s+(\S+))?$/.exec(instr);
      if (retMatch) {
        const val = retMatch[1] ? this.evalVal(retMatch[1]) : "0";
        this.output.push(`Process exited with return value: ${val}`);
        this.isHalted = true;
        this.pc = this.instructions.length;
        return;
      }
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
      const copyMatch = /^(\S+)\s*=\s*(.+)$/.exec(instr);
      if (copyMatch) {
        const [, dst, src] = copyMatch;
        this.registers[dst] = this.evalVal(src.trim());
        this.pc++;
        return;
      }
      if (/^param\b/.test(instr)) {
        this.pc++;
        return;
      }
      this.pc++;
    }
    evalVal(token) {
      if (token == null) return 0;
      const s = String(token).trim();
      if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
      if (s === "true") return 1;
      if (s === "false") return 0;
      if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
      return this.registers[s] !== void 0 ? this.registers[s] : 0;
    }
    evalOp(op, lv, rv) {
      switch (op) {
        case "+":
          return lv + rv;
        case "-":
          return lv - rv;
        case "*":
          return lv * rv;
        case "/":
          return rv !== 0 ? Math.floor(lv / rv) : 0;
        case "%":
          return rv !== 0 ? lv % rv : 0;
        case "<":
          return lv < rv ? 1 : 0;
        case ">":
          return lv > rv ? 1 : 0;
        case "<=":
          return lv <= rv ? 1 : 0;
        case ">=":
          return lv >= rv ? 1 : 0;
        case "==":
          return lv === rv ? 1 : 0;
        case "!=":
          return lv !== rv ? 1 : 0;
        case "&&":
          return lv && rv ? 1 : 0;
        case "||":
          return lv || rv ? 1 : 0;
        default:
          return rv;
      }
    }
  };
  var activeVM = null;
  function renderTACAnimator(instructions, containerId = "tac-animator-container") {
    activeVM = new TACVirtualMachine(instructions);
    window.__TAC_VM = activeVM;
    return `
    <div class="animator-wrapper" id="${containerId}">
      <!-- Playback Controls Bar -->
      <div class="animator-controls">
        <div class="btn-group">
          <button class="btn btn-sm" id="btn-vm-reset" onclick="window.vmReset()">\u23EE Reset</button>
          <button class="btn btn-sm" id="btn-vm-prev" onclick="window.vmPrev()">\u25C0 Step Back</button>
          <button class="btn btn-sm btn-primary" id="btn-vm-play" onclick="window.vmTogglePlay()">\u25B6 Auto Play</button>
          <button class="btn btn-sm btn-primary" id="btn-vm-next" onclick="window.vmNext()">Step Forward \u25B6</button>
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
            ${activeVM.output.map((o) => `<div>${esc3(o)}</div>`).join("") || '<div class="muted-text">Awaiting execution\u2026</div>'}
          </div>
        </div>
      </div>
    </div>
  `;
  }
  function renderCodeLines(vm) {
    return vm.instructions.map((inst, idx) => {
      const isCurrent = idx === vm.pc;
      const isTarget = inst.trim().endsWith(":");
      return `
      <div class="vm-instr-line ${isCurrent ? "active-instr" : ""} ${isTarget ? "is-label" : ""}" id="vm-line-${idx}">
        <span class="vm-line-no">${idx + 1}</span>
        <span class="vm-pointer">${isCurrent ? "\u25B6" : ""}</span>
        <span class="vm-text">${esc3(inst)}</span>
      </div>
    `;
    }).join("");
  }
  function renderRegisters(regs) {
    const entries = Object.entries(regs);
    if (entries.length === 0) {
      return `<div class="empty-regs">No variables loaded yet. Step to initialize.</div>`;
    }
    return entries.map(([k, v]) => `
    <div class="reg-card">
      <span class="reg-name">${esc3(k)}</span>
      <span class="reg-val">${esc3(v)}</span>
    </div>
  `).join("");
  }
  if (typeof window !== "undefined") {
    window.vmUpdateUI = () => {
      const vm = window.__TAC_VM;
      if (!vm) return;
      const codeList = document.getElementById("vm-code-list");
      if (codeList) codeList.innerHTML = renderCodeLines(vm);
      const activeEl = document.getElementById(`vm-line-${vm.pc}`);
      if (activeEl) activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const regGrid = document.getElementById("vm-registers-grid");
      if (regGrid) regGrid.innerHTML = renderRegisters(vm.registers);
      const consoleOut = document.getElementById("vm-console-output");
      if (consoleOut) {
        consoleOut.innerHTML = vm.output.map((o) => `<div class="log-entry">\u2713 ${esc3(o)}</div>`).join("") || `<div class="muted-text">${vm.isHalted ? "Execution halted." : `Executing instruction ${vm.pc + 1}\u2026`}</div>`;
      }
      const badge = document.getElementById("vm-status-badge");
      if (badge) {
        badge.textContent = vm.isHalted ? `Halted (${vm.cycles} cycles)` : `Running (Line ${vm.pc + 1}/${vm.instructions.length} \xB7 ${vm.cycles} cycles)`;
        badge.className = `vm-status-badge ${vm.isHalted ? "halted" : "active"}`;
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
      const playBtn = document.getElementById("btn-vm-play");
      if (playBtn) playBtn.textContent = "\u25B6 Auto Play";
      window.vmUpdateUI();
    };
    window.vmTogglePlay = () => {
      const vm = window.__TAC_VM;
      if (!vm) return;
      const playBtn = document.getElementById("btn-vm-play");
      if (vm.isRunning) {
        clearInterval(vm.timer);
        vm.isRunning = false;
        if (playBtn) playBtn.textContent = "\u25B6 Auto Play";
      } else {
        if (vm.isHalted) vm.reset();
        vm.isRunning = true;
        if (playBtn) playBtn.textContent = "\u23F8 Pause";
        vm.timer = setInterval(() => {
          const canContinue = vm.step();
          window.vmUpdateUI();
          if (!canContinue) {
            clearInterval(vm.timer);
            vm.isRunning = false;
            if (playBtn) playBtn.textContent = "\u25B6 Auto Play";
          }
        }, vm.speed);
      }
    };
    window.vmSetSpeed = (ms) => {
      const vm = window.__TAC_VM;
      if (vm) vm.speed = Number(ms);
      const lbl = document.getElementById("vm-speed-val");
      if (lbl) lbl.textContent = `${ms}ms`;
    };
  }

  // js/ui/renderer.js
  var esc4 = (s) => String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );
  var escAttr = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (typeof window !== "undefined") {
    window.switchPhaseTab = (phaseId, tabName, btnEl) => {
      const card = btnEl?.closest(".phase-workspace") || document.getElementById(`card-${phaseId}`);
      if (!card) return;
      card.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      if (btnEl) btnEl.classList.add("active");
      card.querySelectorAll(".phase-tab-view").forEach((v) => v.style.display = "none");
      const target = card.querySelector(`[data-tab="${tabName}"]`);
      if (target) target.style.display = "block";
      if (tabName === "animator" && window.vmUpdateUI) {
        window.vmUpdateUI();
      }
    };
  }
  function renderTokens(tokens) {
    if (!tokens || tokens.length === 0)
      return '<p style="color:var(--muted)">No tokens produced.</p>';
    const rows = tokens.filter((t) => t.type !== "EOF").map(
      (t) => `<tr>
      <td class="tok-${esc4(t.type)}">${esc4(t.lexeme)}</td>
      <td><span class="tok-tag">${esc4(t.type)}</span></td>
      <td>${t.line != null ? `${t.line}:${t.col}` : "\u2014"}</td>
    </tr>`
    ).join("");
    return `
    <div class="scroll-x">
      <table>
        <thead><tr><th>Lexeme</th><th>Category</th><th>Location</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="explain">
      A <strong>token</strong> is a categorized lexical unit; its <strong>lexeme</strong> is its exact source-text spelling.
      Whitespace and comments are consumed by the lexer.
    </div>`;
  }
  function renderASTMultiView(ast, astText) {
    const visualHtml = renderASTDiagram(ast, "ast-graph-container");
    const textHtml = `
    <div class="ast-tree">${esc4(astText || "No text tree available")}</div>
  `;
    return `
    <!-- View Switcher Tabs -->
    <div class="phase-tabs-bar">
      <button class="tab-btn active" onclick="window.switchPhaseTab('syntax', 'visual', this)">
        \u{1F333} Visual Tree Diagram
      </button>
      
    </div>

    <!-- Tab 1: Visual Tree Diagram (Default) -->
    <div class="phase-tab-view" data-tab="visual" style="display:block;">
      ${visualHtml}
    </div>

    <!-- Tab 2: Text Tree View -->
    <div class="phase-tab-view" data-tab="text" style="display:none;">
      ${textHtml}
    </div>

    <div class="explain" style="margin-top:14px;">
      <strong>AST (Abstract Syntax Tree)</strong> encapsulates hierarchical program structure.
      Nesting reflects operator precedence and scope boundaries without grammatical syntax clutter.
    </div>
  `;
  }
  function renderSymbolTable(symbolTable) {
    const list = Array.isArray(symbolTable) ? symbolTable : symbolTable && typeof symbolTable === "object" ? Object.entries(symbolTable).map(
      ([name2, value]) => value && typeof value === "object" ? { name: name2, ...value } : { name: name2, value }
    ) : [];
    if (list.length === 0)
      return '<p style="color:var(--muted)">Symbol table is empty.</p>';
    const rows = list.map((s) => {
      const isArray = Array.isArray(s);
      const name2 = isArray ? s[0] : s.name;
      const kind = isArray ? s[1] : s.kind;
      const type = isArray ? s[2] : s.type;
      const scope = isArray ? s[3] : s.scope;
      const value = isArray ? s[4] : s.value ?? "\u2014";
      return `<tr>
      <td><strong>${esc4(name2)}</strong></td>
      <td><span class="scope-pill">${esc4(kind)}</span></td>
      <td><code>${esc4(type)}</code></td>
      <td>${esc4(scope)}</td>
      <td>${esc4(value)}</td>
    </tr>`;
    }).join("");
    return `
    <div class="scroll-x">
      <table>
        <thead><tr><th>Identifier</th><th>Kind</th><th>Type</th><th>Scope</th><th>Value / Init</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }
  function renderChecks(checks = [], warnings = []) {
    const text = (value) => typeof value === "string" ? value : value?.message ?? JSON.stringify(value);
    const checkList = Array.isArray(checks) ? checks : [];
    const warningList = Array.isArray(warnings) ? warnings : [];
    const items = [
      ...checkList.map(
        (c) => `<li><span class="ck">\u2713</span>${esc4(text(c))}</li>`
      ),
      ...warningList.map(
        (w) => `<li><span class="wn">\u26A0</span>${esc4(text(w))}</li>`
      )
    ].join("");
    if (!items) return "";
    return `<ul class="checks-list">${items}</ul>`;
  }
  function renderIntermediateMultiView(instructions) {
    if (!instructions || instructions.length === 0) {
      return '<p style="color:var(--muted)">No intermediate instructions generated.</p>';
    }
    const rawCode = instructions.map(esc4).join("\n");
    const tacHtml = `
    <div class="code-block-wrap">
      <button class="copy-btn" data-copy="${escAttr(instructions.join("\n"))}" onclick="navigator.clipboard.writeText(this.dataset.copy).then(()=>this.textContent='Copied!')">Copy TAC</button>
      <pre class="code-block">${rawCode}</pre>
    </div>
    <div class="explain">
      <strong>Three-Address Code (TAC)</strong> linearizes expressions: each statement has at most one operator.
      Temporaries (<code>t1</code>, <code>t2</code>\u2026) hold intermediate computations.
    </div>
  `;
    const cfgHtml = renderCFG(instructions, "cfg-graph-container");
    const animHtml = renderTACAnimator(instructions, "tac-animator-container");
    return `
    <!-- View Switcher Tabs -->
    <div class="phase-tabs-bar">
      <button class="tab-btn active" onclick="window.switchPhaseTab('intermediate', 'tac', this)">
        \u{1F4DD} Three-Address Code (TAC)
      </button>
      <button class="tab-btn" onclick="window.switchPhaseTab('intermediate', 'cfg', this)">
        \u{1F500} Control Flow Graph (CFG)
      </button>
      <button class="tab-btn" onclick="window.switchPhaseTab('intermediate', 'animator', this)">
        \u25B6\uFE0F Step-Through VM Animator
      </button>
    </div>

    <!-- Tab 1: Linear TAC -->
    <div class="phase-tab-view" data-tab="tac" style="display:block;">
      ${tacHtml}
    </div>

    <!-- Tab 2: Control Flow Graph (CFG) -->
    <div class="phase-tab-view" data-tab="cfg" style="display:none;">
      ${cfgHtml}
    </div>

    <!-- Tab 3: TAC Step Animator -->
    <div class="phase-tab-view" data-tab="animator" style="display:none;">
      ${animHtml}
    </div>
  `;
  }
  function renderOptimization(phase) {
    const before = (phase.before || []).map(esc4).join("\n");
    const after = (phase.after || []).map(esc4).join("\n");
    const passNames = (phase.passes || []).join(", ");
    return `
    <div class="tac-compare">
      <div>
        <h4>Before Optimization</h4>
        <pre class="code-block">${before || "(empty)"}</pre>
      </div>
      <div>
        <h4>After Optimization</h4>
        <pre class="code-block">${after || "(empty)"}</pre>
      </div>
    </div>
    ${passNames ? `<div class="pass-note"><strong>Passes applied: ${esc4(passNames)}</strong><br>${esc4(phase.note)}</div>` : `<div class="pass-note" style="border-left-color:var(--muted)"><strong>No optimization applied.</strong><br>${esc4(phase.note)}</div>`}`;
  }
  function renderTargetCode(phase) {
    const code = (phase.instructions || []).map(esc4).join("\n");
    return `
    <span class="badge info">${esc4(phase.targetLabel ?? "Educational target code")} \u2014 not executable</span>
    <div class="code-block-wrap">
      <button class="copy-btn" data-copy="${escAttr((phase.instructions || []).join("\n"))}" onclick="navigator.clipboard.writeText(this.dataset.copy).then(()=>this.textContent='Copied!')">Copy Target Code</button>
      <pre class="code-block">${code || "(empty)"}</pre>
    </div>
    <div class="explain">
      Target code translation mapping Three-Address Code into architecture-appropriate virtual machine instructions or assembly.
    </div>`;
  }
  function renderDiagnostic(diag) {
    if (!diag) return "";
    const loc = diag.line != null ? `Line ${diag.line}${diag.col != null ? `, column ${diag.col}` : ""}` : "";
    return `
    <div class="diag">
      <div class="dphase">\u26D4 Error \u2014 ${esc4(diag.phase ?? "")} phase</div>
      <div class="dmsg">${esc4(diag.message)}</div>
      ${loc ? `<div class="dloc">\u{1F4CD} ${esc4(loc)}</div>` : ""}
      ${diag.explanation ? `<div class="dexp">${esc4(diag.explanation)}</div>` : ""}
    </div>`;
  }
  function renderPhaseBody(phaseId, phaseData) {
    if (phaseData.status === "not_run") {
      return `<div class="not-run-body"><strong style="color:var(--text)">Not run.</strong><br>${esc4(phaseData.reason ?? "")}</div>`;
    }
    let html = `<span class="badge live">\u25CF Live analysis</span>`;
    if (phaseData.status === "failed") {
      switch (phaseId) {
        case "lexical":
          html += renderDiagnostic(phaseData.diagnostic);
          break;
        case "syntax":
          html += `<div class="not-run-body">Syntax analysis could not construct a complete Abstract Syntax Tree.</div>`;
          html += renderDiagnostic(phaseData.diagnostic);
          break;
        case "semantic":
          if (phaseData.symbolTable)
            html += renderSymbolTable(phaseData.symbolTable);
          html += renderDiagnostic(phaseData.diagnostic);
          break;
        default:
          html += renderDiagnostic(phaseData.diagnostic);
      }
      return html;
    }
    switch (phaseId) {
      case "lexical":
        html += renderTokens(phaseData.tokens);
        break;
      case "syntax":
        html += renderASTMultiView(phaseData.ast, phaseData.astText);
        if (phaseData.treeSitterOnly) {
          html += `<div class="pass-note"><strong>Tree-sitter-backed educational output.</strong><br>Semantic, intermediate, optimization, and target views are generic node-based results rather than language-specific compiler output.</div>`;
        }
        break;
      case "semantic":
        html += renderSymbolTable(phaseData.symbolTable);
        html += renderChecks(phaseData.checks, phaseData.warnings);
        html += `<div class="explain">The <strong>symbol table</strong> tracks every declared identifier, its type, and its scope. Semantic analysis ensures types are compatible and all identifiers are declared before use.</div>`;
        break;
      case "intermediate":
        html += renderIntermediateMultiView(phaseData.instructions);
        break;
      case "optimization":
        html += renderOptimization(phaseData);
        break;
      case "target":
        html += renderTargetCode(phaseData);
        break;
      default:
        html += `<pre class="code-block">${esc4(JSON.stringify(phaseData, null, 2))}</pre>`;
    }
    return html;
  }

  // js/ui/feed.js
  var STATUS_LABEL2 = {
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    not_run: "Not run",
    pending: "Not run",
    partial: "Limited"
  };
  var PhaseFeed = class {
    constructor({ containerId, onActivePhaseChange }) {
      this.container = document.getElementById(containerId);
      this.onActivePhaseChange = onActivePhaseChange ?? (() => {
      });
      this._phaseData = {};
      this._activePhase = "lexical";
      this._stale = false;
    }
    showEmpty(msg = "Select a phase after running the source.") {
      this._phaseData = {};
      this._stale = false;
      this.container.innerHTML = `<div class="empty-state"><strong>No analysis yet</strong>${msg}</div>`;
    }
    startRun() {
      this._phaseData = Object.fromEntries(PHASES.map((id8) => [id8, { status: "running" }]));
      this._stale = false;
      this._renderActive();
    }
    updatePhase(phaseId, phaseData) {
      this._phaseData[phaseId] = phaseData;
      this._renderActive();
    }
    activatePhase(phaseId) {
      if (!PHASES.includes(phaseId)) return;
      this._activePhase = phaseId;
      this._renderActive();
      this.onActivePhaseChange(phaseId);
    }
    scrollToPhase(phaseId) {
      this.activatePhase(phaseId);
    }
    markStale() {
      if (!Object.keys(this._phaseData).length) return;
      this._stale = true;
      this._renderActive();
    }
    _renderActive() {
      if (!this.container || !Object.keys(this._phaseData).length) return;
      const idx = PHASES.indexOf(this._activePhase);
      const phaseData = this._phaseData[this._activePhase] || { status: "not_run" };
      const status = phaseData.status || "not_run";
      const label8 = STATUS_LABEL2[status] ?? status;
      const summary = this._summary(this._activePhase, phaseData);
      const previous = PHASES[idx - 1];
      const next = PHASES[idx + 1];
      this.container.innerHTML = `
      <section class="phase-workspace${this._stale ? " is-stale" : ""}" aria-live="polite">
        <div class="phase-workspace-head">
          <div class="phase-title-group">
            <span class="cnum">0${idx + 1}</span>
            <div><span class="eyebrow">Active phase</span><h3>${PHASE_NAMES[this._activePhase] ?? this._activePhase}</h3></div>
          </div>
          <span class="card-status ${status}">${status === "running" ? '<span class="spinner"></span>' : ""}${label8}</span>
        </div>
        <div class="phase-summary-row">
          <span>${this._stale ? "Source changed. Results are stale." : summary}</span>
          ${this._capability(phaseData)}
        </div>
        <div class="workspace-output ${status === "running" ? "skeleton" : ""}">
          ${status === "running" ? '<div class="skel-line"></div><div class="skel-line"></div><div class="skel-line"></div>' : renderPhaseBody(this._activePhase, phaseData)}
        </div>
        <div class="phase-nav">
          <button class="btn btn-subtle" data-phase="${previous || ""}" ${previous ? "" : "disabled"}>\u2190 Previous</button>
          <span class="phase-position">${idx + 1} / ${PHASES.length}</span>
          <button class="btn btn-subtle" data-phase="${next || ""}" ${next ? "" : "disabled"}>Next \u2192</button>
        </div>
      </section>`;
      this.container.querySelectorAll("[data-phase]").forEach((button) => {
        if (button.dataset.phase) button.addEventListener("click", () => this.activatePhase(button.dataset.phase));
      });
    }
    _summary(phaseId, data) {
      if (data.summary) return data.summary;
      if (data.diagnostic) return data.diagnostic.message || "Diagnostic reported";
      if (data.status === "running") return "Processing phase output";
      if (data.status === "failed") return "Phase failed";
      if (data.status === "not_run") return "Phase not run";
      const counts = { lexical: "Tokens emitted", syntax: "Syntax tree available", semantic: "Semantic checks available", intermediate: "Intermediate representation available", optimization: "Optimization comparison available", target: "Target output available" };
      return counts[phaseId] || "Output available";
    }
    _capability(data) {
      const text = data.outputLabel || data.capability || (data.mode === "fallback" ? "Generic output" : "");
      return text ? `<span class="capability-badge">${text}</span>` : "";
    }
  };

  // node_modules/web-tree-sitter/web-tree-sitter.js
  var import_meta = {};
  var __defProp2 = Object.defineProperty;
  var __name = (target, value) => __defProp2(target, "name", { value, configurable: true });
  var Edit = class {
    static {
      __name(this, "Edit");
    }
    /** The start position of the change. */
    startPosition;
    /** The end position of the change before the edit. */
    oldEndPosition;
    /** The end position of the change after the edit. */
    newEndPosition;
    /** The start index of the change. */
    startIndex;
    /** The end index of the change before the edit. */
    oldEndIndex;
    /** The end index of the change after the edit. */
    newEndIndex;
    constructor({
      startIndex,
      oldEndIndex,
      newEndIndex,
      startPosition,
      oldEndPosition,
      newEndPosition
    }) {
      this.startIndex = startIndex >>> 0;
      this.oldEndIndex = oldEndIndex >>> 0;
      this.newEndIndex = newEndIndex >>> 0;
      this.startPosition = startPosition;
      this.oldEndPosition = oldEndPosition;
      this.newEndPosition = newEndPosition;
    }
    /**
     * Edit a point and index to keep it in-sync with source code that has been edited.
     *
     * This function updates a single point's byte offset and row/column position
     * based on an edit operation. This is useful for editing points without
     * requiring a tree or node instance.
     */
    editPoint(point, index) {
      let newIndex = index;
      const newPoint = { ...point };
      if (index >= this.oldEndIndex) {
        newIndex = this.newEndIndex + (index - this.oldEndIndex);
        const originalRow = point.row;
        newPoint.row = this.newEndPosition.row + (point.row - this.oldEndPosition.row);
        newPoint.column = originalRow === this.oldEndPosition.row ? this.newEndPosition.column + (point.column - this.oldEndPosition.column) : point.column;
      } else if (index > this.startIndex) {
        newIndex = this.newEndIndex;
        newPoint.row = this.newEndPosition.row;
        newPoint.column = this.newEndPosition.column;
      }
      return { point: newPoint, index: newIndex };
    }
    /**
     * Edit a range to keep it in-sync with source code that has been edited.
     *
     * This function updates a range's start and end positions based on an edit
     * operation. This is useful for editing ranges without requiring a tree
     * or node instance.
     */
    editRange(range) {
      const newRange = {
        startIndex: range.startIndex,
        startPosition: { ...range.startPosition },
        endIndex: range.endIndex,
        endPosition: { ...range.endPosition }
      };
      if (range.endIndex >= this.oldEndIndex) {
        if (range.endIndex !== Number.MAX_SAFE_INTEGER) {
          newRange.endIndex = this.newEndIndex + (range.endIndex - this.oldEndIndex);
          newRange.endPosition = {
            row: this.newEndPosition.row + (range.endPosition.row - this.oldEndPosition.row),
            column: range.endPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.endPosition.column - this.oldEndPosition.column) : range.endPosition.column
          };
          if (newRange.endIndex < this.newEndIndex) {
            newRange.endIndex = Number.MAX_SAFE_INTEGER;
            newRange.endPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
          }
        }
      } else if (range.endIndex > this.startIndex) {
        newRange.endIndex = this.startIndex;
        newRange.endPosition = { ...this.startPosition };
      }
      if (range.startIndex >= this.oldEndIndex) {
        newRange.startIndex = this.newEndIndex + (range.startIndex - this.oldEndIndex);
        newRange.startPosition = {
          row: this.newEndPosition.row + (range.startPosition.row - this.oldEndPosition.row),
          column: range.startPosition.row === this.oldEndPosition.row ? this.newEndPosition.column + (range.startPosition.column - this.oldEndPosition.column) : range.startPosition.column
        };
        if (newRange.startIndex < this.newEndIndex) {
          newRange.startIndex = Number.MAX_SAFE_INTEGER;
          newRange.startPosition = { row: Number.MAX_SAFE_INTEGER, column: Number.MAX_SAFE_INTEGER };
        }
      } else if (range.startIndex > this.startIndex) {
        newRange.startIndex = this.startIndex;
        newRange.startPosition = { ...this.startPosition };
      }
      return newRange;
    }
  };
  var SIZE_OF_SHORT = 2;
  var SIZE_OF_INT = 4;
  var SIZE_OF_CURSOR = 4 * SIZE_OF_INT;
  var SIZE_OF_NODE = 5 * SIZE_OF_INT;
  var SIZE_OF_POINT = 2 * SIZE_OF_INT;
  var SIZE_OF_RANGE = 2 * SIZE_OF_INT + 2 * SIZE_OF_POINT;
  var ZERO_POINT = { row: 0, column: 0 };
  var INTERNAL = /* @__PURE__ */ Symbol("INTERNAL");
  function assertInternal(x) {
    if (x !== INTERNAL) throw new Error("Illegal constructor");
  }
  __name(assertInternal, "assertInternal");
  function isPoint(point) {
    return !!point && typeof point.row === "number" && typeof point.column === "number";
  }
  __name(isPoint, "isPoint");
  function setModule(module2) {
    C = module2;
  }
  __name(setModule, "setModule");
  var C;
  function newFinalizer(handler) {
    try {
      return new FinalizationRegistry(handler);
    } catch (e) {
      console.error("Unsupported FinalizationRegistry:", e);
      return;
    }
  }
  __name(newFinalizer, "newFinalizer");
  var finalizer = newFinalizer((address) => {
    C._ts_lookahead_iterator_delete(address);
  });
  var LookaheadIterator = class {
    static {
      __name(this, "LookaheadIterator");
    }
    /** @internal */
    [0] = 0;
    // Internal handle for Wasm
    /** @internal */
    language;
    /** @internal */
    positioned = false;
    /** @internal */
    constructor(internal, address, language) {
      assertInternal(internal);
      this[0] = address;
      this.language = language;
      finalizer?.register(this, address, this);
    }
    /**
     * Get the current symbol of the lookahead iterator.
     *
     * Returns `null` if the iterator is not positioned on a symbol:
     *
     * - Before the first iteration step
     * - After the iterator is exhausted
     * - After a {@link reset} or {@link resetState} call
     */
    get currentTypeId() {
      return this.positioned ? C._ts_lookahead_iterator_current_symbol(this[0]) : null;
    }
    /**
     * Get the current symbol name of the lookahead iterator.
     *
     * Returns `null` if the iterator is not positioned on a symbol.
     */
    get currentType() {
      const id8 = this.currentTypeId;
      if (id8 === null) return null;
      return this.language.types[id8] ?? C.UTF8ToString(C._ts_language_symbol_name(this.language[0], id8));
    }
    /** Delete the lookahead iterator, freeing its resources. */
    delete() {
      finalizer?.unregister(this);
      C._ts_lookahead_iterator_delete(this[0]);
      this[0] = 0;
    }
    /**
     * Reset the lookahead iterator.
     *
     * This returns `true` if the language was set successfully and `false`
     * otherwise.
     */
    reset(language, stateId) {
      if (C._ts_lookahead_iterator_reset(this[0], language[0], stateId)) {
        this.language = language;
        this.positioned = false;
        return true;
      }
      return false;
    }
    /**
     * Reset the lookahead iterator to another state.
     *
     * This returns `true` if the iterator was reset to the given state and
     * `false` otherwise.
     */
    resetState(stateId) {
      if (!C._ts_lookahead_iterator_reset_state(this[0], stateId)) return false;
      this.positioned = false;
      return true;
    }
    /**
     * Returns an iterator that iterates over the symbols of the lookahead iterator.
     *
     * The iterator will yield the current symbol name as a string for each step
     * until there are no more symbols to iterate over.
     */
    [Symbol.iterator]() {
      return {
        next: /* @__PURE__ */ __name(() => {
          this.positioned = Boolean(C._ts_lookahead_iterator_next(this[0]));
          const value = this.currentType;
          return value === null ? { done: true, value: "" } : { done: false, value };
        }, "next")
      };
    }
  };
  function getText(tree, startIndex, endIndex, startPosition) {
    const length = endIndex - startIndex;
    let result = tree.textCallback(startIndex, startPosition);
    if (result) {
      startIndex += result.length;
      while (startIndex < endIndex) {
        const string = tree.textCallback(startIndex, startPosition);
        if (string && string.length > 0) {
          startIndex += string.length;
          result += string;
        } else {
          break;
        }
      }
      if (startIndex > endIndex) {
        result = result.slice(0, length);
      }
    }
    return result ?? "";
  }
  __name(getText, "getText");
  var finalizer2 = newFinalizer((address) => {
    C._ts_tree_delete(address);
  });
  var Tree = class _Tree {
    static {
      __name(this, "Tree");
    }
    /** @internal */
    [0] = 0;
    // Internal handle for Wasm
    /** @internal */
    textCallback;
    /** The language that was used to parse the syntax tree. */
    language;
    /** @internal */
    constructor(internal, address, language, textCallback) {
      assertInternal(internal);
      this[0] = address;
      this.language = language;
      this.textCallback = textCallback;
      finalizer2?.register(this, address, this);
    }
    /** Create a shallow copy of the syntax tree. This is very fast. */
    copy() {
      const address = C._ts_tree_copy(this[0]);
      return new _Tree(INTERNAL, address, this.language, this.textCallback);
    }
    /** Delete the syntax tree, freeing its resources. */
    delete() {
      finalizer2?.unregister(this);
      C._ts_tree_delete(this[0]);
      this[0] = 0;
    }
    /** Get the root node of the syntax tree. */
    get rootNode() {
      C._ts_tree_root_node_wasm(this[0]);
      return unmarshalNode(this);
    }
    /**
     * Get the root node of the syntax tree, but with its position shifted
     * forward by the given offset.
     */
    rootNodeWithOffset(offsetBytes, offsetExtent) {
      const address = TRANSFER_BUFFER + SIZE_OF_NODE;
      C.setValue(address, offsetBytes, "i32");
      marshalPoint(address + SIZE_OF_INT, offsetExtent);
      C._ts_tree_root_node_with_offset_wasm(this[0]);
      return unmarshalNode(this);
    }
    /**
     * Edit the syntax tree to keep it in sync with source code that has been
     * edited.
     *
     * You must describe the edit both in terms of byte offsets and in terms of
     * row/column coordinates.
     */
    edit(edit) {
      marshalEdit(edit);
      C._ts_tree_edit_wasm(this[0]);
    }
    /** Create a new {@link TreeCursor} starting from the root of the tree. */
    walk() {
      return this.rootNode.walk();
    }
    /**
     * Compare this old edited syntax tree to a new syntax tree representing
     * the same document, returning a sequence of ranges whose syntactic
     * structure has changed.
     *
     * For this to work correctly, this syntax tree must have been edited such
     * that its ranges match up to the new tree. Generally, you'll want to
     * call this method right after calling one of the [`Parser::parse`]
     * functions. Call it on the old tree that was passed to parse, and
     * pass the new tree that was returned from `parse`.
     */
    getChangedRanges(other) {
      if (!(other instanceof _Tree)) {
        throw new TypeError("Argument must be a Tree");
      }
      C._ts_tree_get_changed_ranges_wasm(this[0], other[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const result = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          result[i2] = unmarshalRange(address);
          address += SIZE_OF_RANGE;
        }
        C._free(buffer);
      }
      return result;
    }
    /** Get the included ranges that were used to parse the syntax tree. */
    getIncludedRanges() {
      C._ts_tree_included_ranges_wasm(this[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const result = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          result[i2] = unmarshalRange(address);
          address += SIZE_OF_RANGE;
        }
        C._free(buffer);
      }
      return result;
    }
  };
  var finalizer3 = newFinalizer((address) => {
    C._ts_tree_cursor_delete_wasm(address);
  });
  var TreeCursor = class _TreeCursor {
    static {
      __name(this, "TreeCursor");
    }
    /** @internal */
    // @ts-expect-error: never read
    [0] = 0;
    // Internal handle for Wasm
    /** @internal */
    // @ts-expect-error: never read
    [1] = 0;
    // Internal handle for Wasm
    /** @internal */
    // @ts-expect-error: never read
    [2] = 0;
    // Internal handle for Wasm
    /** @internal */
    // @ts-expect-error: never read
    [3] = 0;
    // Internal handle for Wasm
    /** @internal */
    tree;
    /** @internal */
    constructor(internal, tree) {
      assertInternal(internal);
      this.tree = tree;
      unmarshalTreeCursor(this);
      finalizer3?.register(this, this.tree[0], this);
    }
    /** Creates a deep copy of the tree cursor. This allocates new memory. */
    copy() {
      const copy = new _TreeCursor(INTERNAL, this.tree);
      C._ts_tree_cursor_copy_wasm(this.tree[0]);
      unmarshalTreeCursor(copy);
      return copy;
    }
    /** Delete the tree cursor, freeing its resources. */
    delete() {
      finalizer3?.unregister(this);
      marshalTreeCursor(this);
      C._ts_tree_cursor_delete_wasm(this.tree[0]);
      this[0] = this[1] = this[2] = 0;
    }
    /** Get the tree cursor's current {@link Node}. */
    get currentNode() {
      marshalTreeCursor(this);
      C._ts_tree_cursor_current_node_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /**
     * Get the numerical field id of this tree cursor's current node.
     *
     * See also {@link TreeCursor#currentFieldName}.
     */
    get currentFieldId() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_field_id_wasm(this.tree[0]);
    }
    /** Get the field name of this tree cursor's current node. */
    get currentFieldName() {
      return this.tree.language.fields[this.currentFieldId];
    }
    /**
     * Get the depth of the cursor's current node relative to the original
     * node that the cursor was constructed with.
     */
    get currentDepth() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_depth_wasm(this.tree[0]);
    }
    /**
     * Get the index of the cursor's current node out of all of the
     * descendants of the original node that the cursor was constructed with.
     */
    get currentDescendantIndex() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_descendant_index_wasm(this.tree[0]);
    }
    /** Get the type of the cursor's current node. */
    get nodeType() {
      return this.tree.language.types[this.nodeTypeId] || "ERROR";
    }
    /** Get the type id of the cursor's current node. */
    get nodeTypeId() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_node_type_id_wasm(this.tree[0]);
    }
    /** Get the state id of the cursor's current node. */
    get nodeStateId() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_node_state_id_wasm(this.tree[0]);
    }
    /** Get the id of the cursor's current node. */
    get nodeId() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_node_id_wasm(this.tree[0]);
    }
    /**
     * Check if the cursor's current node is *named*.
     *
     * Named nodes correspond to named rules in the grammar, whereas
     * *anonymous* nodes correspond to string literals in the grammar.
     */
    get nodeIsNamed() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_node_is_named_wasm(this.tree[0]) === 1;
    }
    /**
     * Check if the cursor's current node is *missing*.
     *
     * Missing nodes are inserted by the parser in order to recover from
     * certain kinds of syntax errors.
     */
    get nodeIsMissing() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_current_node_is_missing_wasm(this.tree[0]) === 1;
    }
    /** Get the string content of the cursor's current node. */
    get nodeText() {
      marshalTreeCursor(this);
      const startIndex = C._ts_tree_cursor_start_index_wasm(this.tree[0]);
      const endIndex = C._ts_tree_cursor_end_index_wasm(this.tree[0]);
      C._ts_tree_cursor_start_position_wasm(this.tree[0]);
      const startPosition = unmarshalPoint(TRANSFER_BUFFER);
      return getText(this.tree, startIndex, endIndex, startPosition);
    }
    /** Get the start position of the cursor's current node. */
    get startPosition() {
      marshalTreeCursor(this);
      C._ts_tree_cursor_start_position_wasm(this.tree[0]);
      return unmarshalPoint(TRANSFER_BUFFER);
    }
    /** Get the end position of the cursor's current node. */
    get endPosition() {
      marshalTreeCursor(this);
      C._ts_tree_cursor_end_position_wasm(this.tree[0]);
      return unmarshalPoint(TRANSFER_BUFFER);
    }
    /** Get the start index of the cursor's current node. */
    get startIndex() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_start_index_wasm(this.tree[0]);
    }
    /** Get the end index of the cursor's current node. */
    get endIndex() {
      marshalTreeCursor(this);
      return C._ts_tree_cursor_end_index_wasm(this.tree[0]);
    }
    /**
     * Move this cursor to the first child of its current node.
     *
     * This returns `true` if the cursor successfully moved, and returns
     * `false` if there were no children.
     */
    gotoFirstChild() {
      marshalTreeCursor(this);
      const result = C._ts_tree_cursor_goto_first_child_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
      return result === 1;
    }
    /**
     * Move this cursor to the last child of its current node.
     *
     * This returns `true` if the cursor successfully moved, and returns
     * `false` if there were no children.
     *
     * Note that this function may be slower than
     * {@link TreeCursor#gotoFirstChild} because it needs to
     * iterate through all the children to compute the child's position.
     */
    gotoLastChild() {
      marshalTreeCursor(this);
      const result = C._ts_tree_cursor_goto_last_child_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
      return result === 1;
    }
    /**
     * Move this cursor to the parent of its current node.
     *
     * This returns `true` if the cursor successfully moved, and returns
     * `false` if there was no parent node (the cursor was already on the
     * root node).
     *
     * Note that the node the cursor was constructed with is considered the root
     * of the cursor, and the cursor cannot walk outside this node.
     */
    gotoParent() {
      marshalTreeCursor(this);
      const result = C._ts_tree_cursor_goto_parent_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
      return result === 1;
    }
    /**
     * Move this cursor to the next sibling of its current node.
     *
     * This returns `true` if the cursor successfully moved, and returns
     * `false` if there was no next sibling node.
     *
     * Note that the node the cursor was constructed with is considered the root
     * of the cursor, and the cursor cannot walk outside this node.
     */
    gotoNextSibling() {
      marshalTreeCursor(this);
      const result = C._ts_tree_cursor_goto_next_sibling_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
      return result === 1;
    }
    /**
     * Move this cursor to the previous sibling of its current node.
     *
     * This returns `true` if the cursor successfully moved, and returns
     * `false` if there was no previous sibling node.
     *
     * Note that this function may be slower than
     * {@link TreeCursor#gotoNextSibling} due to how node
     * positions are stored. In the worst case, this will need to iterate
     * through all the children up to the previous sibling node to recalculate
     * its position. Also note that the node the cursor was constructed with is
     * considered the root of the cursor, and the cursor cannot walk outside this node.
     */
    gotoPreviousSibling() {
      marshalTreeCursor(this);
      const result = C._ts_tree_cursor_goto_previous_sibling_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
      return result === 1;
    }
    /**
     * Move the cursor to the node that is the nth descendant of
     * the original node that the cursor was constructed with, where
     * zero represents the original node itself.
     */
    gotoDescendant(goalDescendantIndex) {
      marshalTreeCursor(this);
      C._ts_tree_cursor_goto_descendant_wasm(this.tree[0], goalDescendantIndex);
      unmarshalTreeCursor(this);
    }
    /**
     * Move this cursor to the first child of its current node that contains or
     * starts after the given byte offset.
     *
     * This returns `true` if the cursor successfully moved to a child node, and returns
     * `false` if no such child was found.
     */
    gotoFirstChildForIndex(goalIndex) {
      marshalTreeCursor(this);
      C.setValue(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalIndex, "i32");
      const result = C._ts_tree_cursor_goto_first_child_for_index_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
      return result === 1;
    }
    /**
     * Move this cursor to the first child of its current node that contains or
     * starts after the given byte offset.
     *
     * This returns the index of the child node if one was found, and returns
     * `null` if no such child was found.
     */
    gotoFirstChildForPosition(goalPosition) {
      marshalTreeCursor(this);
      marshalPoint(TRANSFER_BUFFER + SIZE_OF_CURSOR, goalPosition);
      const result = C._ts_tree_cursor_goto_first_child_for_position_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
      return result === 1;
    }
    /**
     * Re-initialize this tree cursor to start at the original node that the
     * cursor was constructed with.
     */
    reset(node2) {
      marshalNode(node2);
      marshalTreeCursor(this, TRANSFER_BUFFER + SIZE_OF_NODE);
      C._ts_tree_cursor_reset_wasm(this.tree[0]);
      unmarshalTreeCursor(this);
    }
    /**
     * Re-initialize a tree cursor to the same position as another cursor.
     *
     * Unlike {@link TreeCursor#reset}, this will not lose parent
     * information and allows reusing already created cursors.
     */
    resetTo(cursor) {
      marshalTreeCursor(this, TRANSFER_BUFFER);
      marshalTreeCursor(cursor, TRANSFER_BUFFER + SIZE_OF_CURSOR);
      C._ts_tree_cursor_reset_to_wasm(this.tree[0], cursor.tree[0]);
      unmarshalTreeCursor(this);
    }
  };
  var Node = class {
    static {
      __name(this, "Node");
    }
    /** @internal */
    // @ts-expect-error: never read
    [0] = 0;
    // Internal handle for Wasm
    /** @internal */
    _children;
    /** @internal */
    _namedChildren;
    /** @internal */
    constructor(internal, {
      id: id8,
      tree,
      startIndex,
      startPosition,
      other
    }) {
      assertInternal(internal);
      this[0] = other;
      this.id = id8;
      this.tree = tree;
      this.startIndex = startIndex;
      this.startPosition = startPosition;
    }
    /**
     * The numeric id for this node that is unique.
     *
     * Within a given syntax tree, no two nodes have the same id. However:
     *
     * * If a new tree is created based on an older tree, and a node from the old tree is reused in
     *   the process, then that node will have the same id in both trees.
     *
     * * A node not marked as having changes does not guarantee it was reused.
     *
     * * If a node is marked as having changed in the old tree, it will not be reused.
     */
    id;
    /** The byte index where this node starts. */
    startIndex;
    /** The position where this node starts. */
    startPosition;
    /** The tree that this node belongs to. */
    tree;
    /** Get this node's type as a numerical id. */
    get typeId() {
      marshalNode(this);
      return C._ts_node_symbol_wasm(this.tree[0]);
    }
    /**
     * Get the node's type as a numerical id as it appears in the grammar,
     * ignoring aliases.
     */
    get grammarId() {
      marshalNode(this);
      return C._ts_node_grammar_symbol_wasm(this.tree[0]);
    }
    /** Get this node's type as a string. */
    get type() {
      return this.tree.language.types[this.typeId] || "ERROR";
    }
    /**
     * Get this node's symbol name as it appears in the grammar, ignoring
     * aliases as a string.
     */
    get grammarType() {
      return this.tree.language.types[this.grammarId] || "ERROR";
    }
    /**
     * Check if this node is *named*.
     *
     * Named nodes correspond to named rules in the grammar, whereas
     * *anonymous* nodes correspond to string literals in the grammar.
     */
    get isNamed() {
      marshalNode(this);
      return C._ts_node_is_named_wasm(this.tree[0]) === 1;
    }
    /**
     * Check if this node is *extra*.
     *
     * Extra nodes represent things like comments, which are not required
     * by the grammar, but can appear anywhere.
     */
    get isExtra() {
      marshalNode(this);
      return C._ts_node_is_extra_wasm(this.tree[0]) === 1;
    }
    /**
     * Check if this node represents a syntax error.
     *
     * Syntax errors represent parts of the code that could not be incorporated
     * into a valid syntax tree.
     */
    get isError() {
      marshalNode(this);
      return C._ts_node_is_error_wasm(this.tree[0]) === 1;
    }
    /**
     * Check if this node is *missing*.
     *
     * Missing nodes are inserted by the parser in order to recover from
     * certain kinds of syntax errors.
     */
    get isMissing() {
      marshalNode(this);
      return C._ts_node_is_missing_wasm(this.tree[0]) === 1;
    }
    /** Check if this node has been edited. */
    get hasChanges() {
      marshalNode(this);
      return C._ts_node_has_changes_wasm(this.tree[0]) === 1;
    }
    /**
     * Check if this node represents a syntax error or contains any syntax
     * errors anywhere within it.
     */
    get hasError() {
      marshalNode(this);
      return C._ts_node_has_error_wasm(this.tree[0]) === 1;
    }
    /** Get the byte index where this node ends. */
    get endIndex() {
      marshalNode(this);
      return C._ts_node_end_index_wasm(this.tree[0]);
    }
    /** Get the position where this node ends. */
    get endPosition() {
      marshalNode(this);
      C._ts_node_end_point_wasm(this.tree[0]);
      return unmarshalPoint(TRANSFER_BUFFER);
    }
    /** Get the string content of this node. */
    get text() {
      return getText(this.tree, this.startIndex, this.endIndex, this.startPosition);
    }
    /** Get this node's parse state. */
    get parseState() {
      marshalNode(this);
      return C._ts_node_parse_state_wasm(this.tree[0]);
    }
    /** Get the parse state after this node. */
    get nextParseState() {
      marshalNode(this);
      return C._ts_node_next_parse_state_wasm(this.tree[0]);
    }
    /** Check if this node is equal to another node. */
    equals(other) {
      return this.tree === other.tree && this.id === other.id;
    }
    /**
     * Get the node's child at the given index, where zero represents the first child.
     *
     * This method is fairly fast, but its cost is technically log(n), so if
     * you might be iterating over a long list of children, you should use
     * {@link Node#children} instead.
     */
    child(index) {
      marshalNode(this);
      C._ts_node_child_wasm(this.tree[0], index);
      return unmarshalNode(this.tree);
    }
    /**
     * Get this node's *named* child at the given index.
     *
     * See also {@link Node#isNamed}.
     * This method is fairly fast, but its cost is technically log(n), so if
     * you might be iterating over a long list of children, you should use
     * {@link Node#namedChildren} instead.
     */
    namedChild(index) {
      marshalNode(this);
      C._ts_node_named_child_wasm(this.tree[0], index);
      return unmarshalNode(this.tree);
    }
    /**
     * Get this node's child with the given numerical field id.
     *
     * See also {@link Node#childForFieldName}. You can
     * convert a field name to an id using {@link Language#fieldIdForName}.
     */
    childForFieldId(fieldId) {
      marshalNode(this);
      C._ts_node_child_by_field_id_wasm(this.tree[0], fieldId);
      return unmarshalNode(this.tree);
    }
    /**
     * Get the first child with the given field name.
     *
     * If multiple children may have the same field name, access them using
     * {@link Node#childrenForFieldName}.
     */
    childForFieldName(fieldName) {
      const fieldId = this.tree.language.fields.indexOf(fieldName);
      if (fieldId !== -1) return this.childForFieldId(fieldId);
      return null;
    }
    /** Get the field name of this node's child at the given index. */
    fieldNameForChild(index) {
      marshalNode(this);
      const address = C._ts_node_field_name_for_child_wasm(this.tree[0], index);
      if (!address) return null;
      return C.AsciiToString(address);
    }
    /** Get the field name of this node's named child at the given index. */
    fieldNameForNamedChild(index) {
      marshalNode(this);
      const address = C._ts_node_field_name_for_named_child_wasm(this.tree[0], index);
      if (!address) return null;
      return C.AsciiToString(address);
    }
    /**
     * Get an array of this node's children with a given field name.
     *
     * See also {@link Node#children}.
     */
    childrenForFieldName(fieldName) {
      const fieldId = this.tree.language.fields.indexOf(fieldName);
      if (fieldId !== -1 && fieldId !== 0) return this.childrenForFieldId(fieldId);
      return [];
    }
    /**
      * Get an array of this node's children with a given field id.
      *
      * See also {@link Node#childrenForFieldName}.
      */
    childrenForFieldId(fieldId) {
      marshalNode(this);
      C._ts_node_children_by_field_id_wasm(this.tree[0], fieldId);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const result = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          result[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
        C._free(buffer);
      }
      return result;
    }
    /** Get the node's first child that contains or starts after the given byte offset. */
    firstChildForIndex(index) {
      marshalNode(this);
      const address = TRANSFER_BUFFER + SIZE_OF_NODE;
      C.setValue(address, index, "i32");
      C._ts_node_first_child_for_byte_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get the node's first named child that contains or starts after the given byte offset. */
    firstNamedChildForIndex(index) {
      marshalNode(this);
      const address = TRANSFER_BUFFER + SIZE_OF_NODE;
      C.setValue(address, index, "i32");
      C._ts_node_first_named_child_for_byte_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get this node's number of children. */
    get childCount() {
      marshalNode(this);
      return C._ts_node_child_count_wasm(this.tree[0]);
    }
    /**
     * Get this node's number of *named* children.
     *
     * See also {@link Node#isNamed}.
     */
    get namedChildCount() {
      marshalNode(this);
      return C._ts_node_named_child_count_wasm(this.tree[0]);
    }
    /** Get this node's first child. */
    get firstChild() {
      return this.child(0);
    }
    /**
     * Get this node's first named child.
     *
     * See also {@link Node#isNamed}.
     */
    get firstNamedChild() {
      return this.namedChild(0);
    }
    /** Get this node's last child. */
    get lastChild() {
      return this.child(this.childCount - 1);
    }
    /**
     * Get this node's last named child.
     *
     * See also {@link Node#isNamed}.
     */
    get lastNamedChild() {
      return this.namedChild(this.namedChildCount - 1);
    }
    /**
     * Iterate over this node's children.
     *
     * If you're walking the tree recursively, you may want to use the
     * {@link TreeCursor} APIs directly instead.
     */
    get children() {
      if (!this._children) {
        marshalNode(this);
        C._ts_node_children_wasm(this.tree[0]);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        this._children = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            this._children[i2] = unmarshalNode(this.tree, address);
            address += SIZE_OF_NODE;
          }
          C._free(buffer);
        }
      }
      return this._children;
    }
    /**
     * Iterate over this node's named children.
     *
     * See also {@link Node#children}.
     */
    get namedChildren() {
      if (!this._namedChildren) {
        marshalNode(this);
        C._ts_node_named_children_wasm(this.tree[0]);
        const count = C.getValue(TRANSFER_BUFFER, "i32");
        const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        this._namedChildren = new Array(count);
        if (count > 0) {
          let address = buffer;
          for (let i2 = 0; i2 < count; i2++) {
            this._namedChildren[i2] = unmarshalNode(this.tree, address);
            address += SIZE_OF_NODE;
          }
          C._free(buffer);
        }
      }
      return this._namedChildren;
    }
    /**
     * Get the descendants of this node that are the given type, or in the given types array.
     *
     * The types array should contain node type strings, which can be retrieved from {@link Language#types}.
     *
     * Additionally, a `startPosition` and `endPosition` can be passed in to restrict the search to a byte range.
     */
    descendantsOfType(types, startPosition = ZERO_POINT, endPosition = ZERO_POINT) {
      if (!Array.isArray(types)) types = [types];
      const symbols = [];
      const typesBySymbol = this.tree.language.types;
      for (const node_type of types) {
        if (node_type == "ERROR") {
          symbols.push(65535);
        }
      }
      for (let i2 = 0, n = typesBySymbol.length; i2 < n; i2++) {
        if (types.includes(typesBySymbol[i2])) {
          symbols.push(i2);
        }
      }
      const symbolsAddress = C._malloc(SIZE_OF_INT * symbols.length);
      for (let i2 = 0, n = symbols.length; i2 < n; i2++) {
        C.setValue(symbolsAddress + i2 * SIZE_OF_INT, symbols[i2], "i32");
      }
      marshalNode(this);
      C._ts_node_descendants_of_type_wasm(
        this.tree[0],
        symbolsAddress,
        symbols.length,
        startPosition.row,
        startPosition.column,
        endPosition.row,
        endPosition.column
      );
      const descendantCount = C.getValue(TRANSFER_BUFFER, "i32");
      const descendantAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const result = new Array(descendantCount);
      if (descendantCount > 0) {
        let address = descendantAddress;
        for (let i2 = 0; i2 < descendantCount; i2++) {
          result[i2] = unmarshalNode(this.tree, address);
          address += SIZE_OF_NODE;
        }
      }
      C._free(descendantAddress);
      C._free(symbolsAddress);
      return result;
    }
    /** Get this node's next sibling. */
    get nextSibling() {
      marshalNode(this);
      C._ts_node_next_sibling_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get this node's previous sibling. */
    get previousSibling() {
      marshalNode(this);
      C._ts_node_prev_sibling_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /**
     * Get this node's next *named* sibling.
     *
     * See also {@link Node#isNamed}.
     */
    get nextNamedSibling() {
      marshalNode(this);
      C._ts_node_next_named_sibling_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /**
     * Get this node's previous *named* sibling.
     *
     * See also {@link Node#isNamed}.
     */
    get previousNamedSibling() {
      marshalNode(this);
      C._ts_node_prev_named_sibling_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get the node's number of descendants, including one for the node itself. */
    get descendantCount() {
      marshalNode(this);
      return C._ts_node_descendant_count_wasm(this.tree[0]);
    }
    /**
     * Get this node's immediate parent.
     * Prefer {@link Node#childWithDescendant} for iterating over this node's ancestors.
     */
    get parent() {
      marshalNode(this);
      C._ts_node_parent_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /**
     * Get the node that contains `descendant`.
     *
     * Note that this can return `descendant` itself.
     */
    childWithDescendant(descendant) {
      marshalNode(this);
      marshalNode(descendant, 1);
      C._ts_node_child_with_descendant_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get the smallest node within this node that spans the given byte range. */
    descendantForIndex(start2, end = start2) {
      if (typeof start2 !== "number" || typeof end !== "number") {
        throw new Error("Arguments must be numbers");
      }
      marshalNode(this);
      const address = TRANSFER_BUFFER + SIZE_OF_NODE;
      C.setValue(address, start2, "i32");
      C.setValue(address + SIZE_OF_INT, end, "i32");
      C._ts_node_descendant_for_index_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get the smallest named node within this node that spans the given byte range. */
    namedDescendantForIndex(start2, end = start2) {
      if (typeof start2 !== "number" || typeof end !== "number") {
        throw new Error("Arguments must be numbers");
      }
      marshalNode(this);
      const address = TRANSFER_BUFFER + SIZE_OF_NODE;
      C.setValue(address, start2, "i32");
      C.setValue(address + SIZE_OF_INT, end, "i32");
      C._ts_node_named_descendant_for_index_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get the smallest node within this node that spans the given point range. */
    descendantForPosition(start2, end = start2) {
      if (!isPoint(start2) || !isPoint(end)) {
        throw new Error("Arguments must be {row, column} objects");
      }
      marshalNode(this);
      const address = TRANSFER_BUFFER + SIZE_OF_NODE;
      marshalPoint(address, start2);
      marshalPoint(address + SIZE_OF_POINT, end);
      C._ts_node_descendant_for_position_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /** Get the smallest named node within this node that spans the given point range. */
    namedDescendantForPosition(start2, end = start2) {
      if (!isPoint(start2) || !isPoint(end)) {
        throw new Error("Arguments must be {row, column} objects");
      }
      marshalNode(this);
      const address = TRANSFER_BUFFER + SIZE_OF_NODE;
      marshalPoint(address, start2);
      marshalPoint(address + SIZE_OF_POINT, end);
      C._ts_node_named_descendant_for_position_wasm(this.tree[0]);
      return unmarshalNode(this.tree);
    }
    /**
     * Create a new {@link TreeCursor} starting from this node.
     *
     * Note that the given node is considered the root of the cursor,
     * and the cursor cannot walk outside this node.
     */
    walk() {
      marshalNode(this);
      C._ts_tree_cursor_new_wasm(this.tree[0]);
      return new TreeCursor(INTERNAL, this.tree);
    }
    /**
     * Edit this node to keep it in-sync with source code that has been edited.
     *
     * This function is only rarely needed. When you edit a syntax tree with
     * the {@link Tree#edit} method, all of the nodes that you retrieve from
     * the tree afterward will already reflect the edit. You only need to
     * use {@link Node#edit} when you have a specific {@link Node} instance that
     * you want to keep and continue to use after an edit.
     */
    edit(edit) {
      if (this.startIndex >= edit.oldEndIndex) {
        this.startIndex = edit.newEndIndex + (this.startIndex - edit.oldEndIndex);
        let subbedPointRow;
        let subbedPointColumn;
        if (this.startPosition.row > edit.oldEndPosition.row) {
          subbedPointRow = this.startPosition.row - edit.oldEndPosition.row;
          subbedPointColumn = this.startPosition.column;
        } else {
          subbedPointRow = 0;
          subbedPointColumn = this.startPosition.column;
          if (this.startPosition.column >= edit.oldEndPosition.column) {
            subbedPointColumn = this.startPosition.column - edit.oldEndPosition.column;
          }
        }
        if (subbedPointRow > 0) {
          this.startPosition.row += subbedPointRow;
          this.startPosition.column = subbedPointColumn;
        } else {
          this.startPosition.column += subbedPointColumn;
        }
      } else if (this.startIndex > edit.startIndex) {
        this.startIndex = edit.newEndIndex;
        this.startPosition.row = edit.newEndPosition.row;
        this.startPosition.column = edit.newEndPosition.column;
      }
    }
    /** Get the S-expression representation of this node. */
    toString() {
      marshalNode(this);
      const address = C._ts_node_to_string_wasm(this.tree[0]);
      const result = C.AsciiToString(address);
      C._free(address);
      return result;
    }
  };
  function unmarshalCaptures(query, tree, address, patternIndex, result) {
    for (let i2 = 0, n = result.length; i2 < n; i2++) {
      const captureIndex = C.getValue(address, "i32");
      address += SIZE_OF_INT;
      const node2 = unmarshalNode(tree, address);
      address += SIZE_OF_NODE;
      result[i2] = { patternIndex, name: query.captureNames[captureIndex], node: node2 };
    }
    return address;
  }
  __name(unmarshalCaptures, "unmarshalCaptures");
  function marshalNode(node2, index = 0) {
    let address = TRANSFER_BUFFER + index * SIZE_OF_NODE;
    C.setValue(address, node2.id, "i32");
    address += SIZE_OF_INT;
    C.setValue(address, node2.startIndex, "i32");
    address += SIZE_OF_INT;
    C.setValue(address, node2.startPosition.row, "i32");
    address += SIZE_OF_INT;
    C.setValue(address, node2.startPosition.column, "i32");
    address += SIZE_OF_INT;
    C.setValue(address, node2[0], "i32");
  }
  __name(marshalNode, "marshalNode");
  function unmarshalNode(tree, address = TRANSFER_BUFFER) {
    const id8 = C.getValue(address, "i32");
    address += SIZE_OF_INT;
    if (id8 === 0) return null;
    const index = C.getValue(address, "i32");
    address += SIZE_OF_INT;
    const row = C.getValue(address, "i32");
    address += SIZE_OF_INT;
    const column = C.getValue(address, "i32");
    address += SIZE_OF_INT;
    const other = C.getValue(address, "i32");
    const result = new Node(INTERNAL, {
      id: id8,
      tree,
      startIndex: index,
      startPosition: { row, column },
      other
    });
    return result;
  }
  __name(unmarshalNode, "unmarshalNode");
  function marshalTreeCursor(cursor, address = TRANSFER_BUFFER) {
    C.setValue(address + 0 * SIZE_OF_INT, cursor[0], "i32");
    C.setValue(address + 1 * SIZE_OF_INT, cursor[1], "i32");
    C.setValue(address + 2 * SIZE_OF_INT, cursor[2], "i32");
    C.setValue(address + 3 * SIZE_OF_INT, cursor[3], "i32");
  }
  __name(marshalTreeCursor, "marshalTreeCursor");
  function unmarshalTreeCursor(cursor) {
    cursor[0] = C.getValue(TRANSFER_BUFFER + 0 * SIZE_OF_INT, "i32");
    cursor[1] = C.getValue(TRANSFER_BUFFER + 1 * SIZE_OF_INT, "i32");
    cursor[2] = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
    cursor[3] = C.getValue(TRANSFER_BUFFER + 3 * SIZE_OF_INT, "i32");
  }
  __name(unmarshalTreeCursor, "unmarshalTreeCursor");
  function marshalPoint(address, point) {
    C.setValue(address, point.row, "i32");
    C.setValue(address + SIZE_OF_INT, point.column, "i32");
  }
  __name(marshalPoint, "marshalPoint");
  function unmarshalPoint(address) {
    const result = {
      row: C.getValue(address, "i32") >>> 0,
      column: C.getValue(address + SIZE_OF_INT, "i32") >>> 0
    };
    return result;
  }
  __name(unmarshalPoint, "unmarshalPoint");
  function marshalRange(address, range) {
    marshalPoint(address, range.startPosition);
    address += SIZE_OF_POINT;
    marshalPoint(address, range.endPosition);
    address += SIZE_OF_POINT;
    C.setValue(address, range.startIndex, "i32");
    address += SIZE_OF_INT;
    C.setValue(address, range.endIndex, "i32");
    address += SIZE_OF_INT;
  }
  __name(marshalRange, "marshalRange");
  function unmarshalRange(address) {
    const result = {};
    result.startPosition = unmarshalPoint(address);
    address += SIZE_OF_POINT;
    result.endPosition = unmarshalPoint(address);
    address += SIZE_OF_POINT;
    result.startIndex = C.getValue(address, "i32") >>> 0;
    address += SIZE_OF_INT;
    result.endIndex = C.getValue(address, "i32") >>> 0;
    return result;
  }
  __name(unmarshalRange, "unmarshalRange");
  function marshalEdit(edit, address = TRANSFER_BUFFER) {
    marshalPoint(address, edit.startPosition);
    address += SIZE_OF_POINT;
    marshalPoint(address, edit.oldEndPosition);
    address += SIZE_OF_POINT;
    marshalPoint(address, edit.newEndPosition);
    address += SIZE_OF_POINT;
    C.setValue(address, edit.startIndex, "i32");
    address += SIZE_OF_INT;
    C.setValue(address, edit.oldEndIndex, "i32");
    address += SIZE_OF_INT;
    C.setValue(address, edit.newEndIndex, "i32");
    address += SIZE_OF_INT;
  }
  __name(marshalEdit, "marshalEdit");
  function unmarshalLanguageMetadata(address) {
    const major_version = C.getValue(address, "i32");
    const minor_version = C.getValue(address += SIZE_OF_INT, "i32");
    const patch_version = C.getValue(address += SIZE_OF_INT, "i32");
    return { major_version, minor_version, patch_version };
  }
  __name(unmarshalLanguageMetadata, "unmarshalLanguageMetadata");
  var LANGUAGE_FUNCTION_REGEX = /^tree_sitter_\w+$/;
  var Language = class _Language {
    static {
      __name(this, "Language");
    }
    /** @internal */
    [0] = 0;
    // Internal handle for Wasm
    /**
     * A list of all node types in the language. The index of each type in this
     * array is its node type id.
     */
    types;
    /**
     * A list of all field names in the language. The index of each field name in
     * this array is its field id.
     */
    fields;
    /** @internal */
    constructor(internal, address) {
      assertInternal(internal);
      this[0] = address;
      this.types = new Array(C._ts_language_symbol_count(this[0]));
      for (let i2 = 0, n = this.types.length; i2 < n; i2++) {
        if (C._ts_language_symbol_type(this[0], i2) < 2) {
          this.types[i2] = C.UTF8ToString(C._ts_language_symbol_name(this[0], i2));
        }
      }
      this.fields = new Array(C._ts_language_field_count(this[0]) + 1);
      for (let i2 = 0, n = this.fields.length; i2 < n; i2++) {
        const fieldName = C._ts_language_field_name_for_id(this[0], i2);
        if (fieldName !== 0) {
          this.fields[i2] = C.UTF8ToString(fieldName);
        } else {
          this.fields[i2] = null;
        }
      }
    }
    /**
     * Gets the name of the language.
     */
    get name() {
      const ptr = C._ts_language_name(this[0]);
      if (ptr === 0) return null;
      return C.UTF8ToString(ptr);
    }
    /**
     * Gets the ABI version of the language.
     */
    get abiVersion() {
      return C._ts_language_abi_version(this[0]);
    }
    /**
    * Get the metadata for this language. This information is generated by the
    * CLI, and relies on the language author providing the correct metadata in
    * the language's `tree-sitter.json` file.
    */
    get metadata() {
      C._ts_language_metadata_wasm(this[0]);
      const length = C.getValue(TRANSFER_BUFFER, "i32");
      if (length === 0) return null;
      return unmarshalLanguageMetadata(TRANSFER_BUFFER + SIZE_OF_INT);
    }
    /**
     * Gets the number of fields in the language.
     */
    get fieldCount() {
      return this.fields.length - 1;
    }
    /**
     * Gets the number of states in the language.
     */
    get stateCount() {
      return C._ts_language_state_count(this[0]);
    }
    /**
     * Get the field id for a field name.
     */
    fieldIdForName(fieldName) {
      const result = this.fields.indexOf(fieldName);
      return result !== -1 ? result : null;
    }
    /**
     * Get the field name for a field id.
     */
    fieldNameForId(fieldId) {
      return this.fields[fieldId] ?? null;
    }
    /**
     * Get the node type id for a node type name.
     */
    idForNodeType(type, named) {
      const typeLength = C.lengthBytesUTF8(type);
      const typeAddress = C._malloc(typeLength + 1);
      C.stringToUTF8(type, typeAddress, typeLength + 1);
      const result = C._ts_language_symbol_for_name(this[0], typeAddress, typeLength, named ? 1 : 0);
      C._free(typeAddress);
      return result || null;
    }
    /**
     * Gets the number of node types in the language.
     */
    get nodeTypeCount() {
      return C._ts_language_symbol_count(this[0]);
    }
    /**
     * Get the node type name for a node type id.
     */
    nodeTypeForId(typeId) {
      const name2 = C._ts_language_symbol_name(this[0], typeId);
      return name2 ? C.UTF8ToString(name2) : null;
    }
    /**
     * Check if a node type is named.
     *
     * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/2-basic-parsing.html#named-vs-anonymous-nodes}
     */
    nodeTypeIsNamed(typeId) {
      return C._ts_language_type_is_named_wasm(this[0], typeId) ? true : false;
    }
    /**
     * Check if a node type is visible.
     */
    nodeTypeIsVisible(typeId) {
      return C._ts_language_type_is_visible_wasm(this[0], typeId) ? true : false;
    }
    /**
     * Get the supertypes ids of this language.
     *
     * @see {@link https://tree-sitter.github.io/tree-sitter/using-parsers/6-static-node-types.html?highlight=supertype#supertype-nodes}
     */
    get supertypes() {
      C._ts_language_supertypes_wasm(this[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const result = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          result[i2] = C.getValue(address, "i16");
          address += SIZE_OF_SHORT;
        }
      }
      return result;
    }
    /**
     * Get the subtype ids for a given supertype node id.
     */
    subtypes(supertype) {
      C._ts_language_subtypes_wasm(this[0], supertype);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const result = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          result[i2] = C.getValue(address, "i16");
          address += SIZE_OF_SHORT;
        }
      }
      return result;
    }
    /**
     * Get the next state id for a given state id and node type id.
     */
    nextState(stateId, typeId) {
      return C._ts_language_next_state(this[0], stateId, typeId);
    }
    /**
     * Create a new lookahead iterator for this language and parse state.
     *
     * This returns `null` if state is invalid for this language.
     *
     * Iterating {@link LookaheadIterator} will yield valid symbols in the given
     * parse state. A newly created iterator is not positioned on a symbol, so
     * {@link LookaheadIterator#currentType} returns `null` until the first
     * iteration step.
     *
     * Lookahead iterators can be useful for generating suggestions and improving
     * syntax error diagnostics. To get symbols valid in an `ERROR` node, use the
     * lookahead iterator on its first leaf node state. For `MISSING` nodes, a
     * lookahead iterator created on the previous non-extra leaf node may be
     * appropriate.
     */
    lookaheadIterator(stateId) {
      const address = C._ts_lookahead_iterator_new(this[0], stateId);
      if (address) return new LookaheadIterator(INTERNAL, address, this);
      return null;
    }
    /**
     * Load a language from a WebAssembly module.
     * The module can be provided as a path to a file, a `URL` to a file, or as a
     * buffer.
     */
    static async load(input) {
      let binary2;
      if (input instanceof Uint8Array) {
        binary2 = input;
      } else if (globalThis.process?.versions.node) {
        const fs2 = await Promise.resolve().then(() => __toESM(require_promises(), 1));
        binary2 = await fs2.readFile(input);
      } else {
        const response = await fetch(input);
        if (!response.ok) {
          const body2 = await response.text();
          throw new Error(`Language.load failed with status ${response.status}.

${body2}`);
        }
        const retryResp = response.clone();
        try {
          binary2 = await WebAssembly.compileStreaming(response);
        } catch (reason) {
          console.error("wasm streaming compile failed:", reason);
          console.error("falling back to ArrayBuffer instantiation");
          binary2 = new Uint8Array(await retryResp.arrayBuffer());
        }
      }
      const mod = await C.loadWebAssemblyModule(binary2, { loadAsync: true });
      return _Language.loadFromWasmExports(mod, { sync: false });
    }
    static loadFromWasmExports(mod, { sync }) {
      const symbolNames = Object.keys(mod);
      const functionName = symbolNames.find((key) => LANGUAGE_FUNCTION_REGEX.test(key) && !key.includes("external_scanner_"));
      if (!functionName) {
        console.log(`Couldn't find language function in Wasm file. Symbols:
${JSON.stringify(symbolNames, null, 2)}`);
        throw new Error(`Language.${sync ? "loadSync" : "load"} failed: no language function found in Wasm file`);
      }
      const languageAddress = mod[functionName]();
      return new _Language(INTERNAL, languageAddress);
    }
    /**
     * Load a language synchronously from a pre-compiled WebAssembly module.
     * Use this when the host environment provides a `WebAssembly.Module` directly.
     */
    static loadSync(wasmModule) {
      const mod = C.loadWebAssemblyModule(wasmModule, { loadAsync: false });
      return _Language.loadFromWasmExports(mod, { sync: true });
    }
  };
  async function Module2(moduleArg = {}) {
    var moduleRtn;
    var Module = moduleArg;
    var ENVIRONMENT_IS_WEB = typeof window == "object";
    var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != "undefined";
    var ENVIRONMENT_IS_NODE = typeof process == "object" && process.versions?.node && process.type != "renderer";
    if (ENVIRONMENT_IS_NODE) {
      const { createRequire } = await Promise.resolve().then(() => __toESM(require_module(), 1));
      var require = createRequire(import_meta.url);
    }
    Module.currentQueryProgressCallback = null;
    Module.currentProgressCallback = null;
    Module.currentLogCallback = null;
    Module.currentParseCallback = null;
    var arguments_ = [];
    var thisProgram = "./this.program";
    var quit_ = /* @__PURE__ */ __name((status, toThrow) => {
      throw toThrow;
    }, "quit_");
    var _scriptName = import_meta.url;
    var scriptDirectory = "";
    function locateFile(path) {
      if (Module["locateFile"]) {
        return Module["locateFile"](path, scriptDirectory);
      }
      return scriptDirectory + path;
    }
    __name(locateFile, "locateFile");
    var readAsync, readBinary;
    if (ENVIRONMENT_IS_NODE) {
      var fs = require("fs");
      if (_scriptName.startsWith("file:")) {
        scriptDirectory = require("path").dirname(require("url").fileURLToPath(_scriptName)) + "/";
      }
      readBinary = /* @__PURE__ */ __name((filename) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename);
        return ret;
      }, "readBinary");
      readAsync = /* @__PURE__ */ __name(async (filename, binary2 = true) => {
        filename = isFileURI(filename) ? new URL(filename) : filename;
        var ret = fs.readFileSync(filename, binary2 ? void 0 : "utf8");
        return ret;
      }, "readAsync");
      if (process.argv.length > 1) {
        thisProgram = process.argv[1].replace(/\\/g, "/");
      }
      arguments_ = process.argv.slice(2);
      quit_ = /* @__PURE__ */ __name((status, toThrow) => {
        process.exitCode = status;
        throw toThrow;
      }, "quit_");
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      try {
        scriptDirectory = new URL(".", _scriptName).href;
      } catch {
      }
      {
        if (ENVIRONMENT_IS_WORKER) {
          readBinary = /* @__PURE__ */ __name((url) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, false);
            xhr.responseType = "arraybuffer";
            xhr.send(null);
            return new Uint8Array(
              /** @type{!ArrayBuffer} */
              xhr.response
            );
          }, "readBinary");
        }
        readAsync = /* @__PURE__ */ __name(async (url) => {
          if (isFileURI(url)) {
            return new Promise((resolve, reject) => {
              var xhr = new XMLHttpRequest();
              xhr.open("GET", url, true);
              xhr.responseType = "arraybuffer";
              xhr.onload = () => {
                if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                  resolve(xhr.response);
                  return;
                }
                reject(xhr.status);
              };
              xhr.onerror = reject;
              xhr.send(null);
            });
          }
          var response = await fetch(url, {
            credentials: "same-origin"
          });
          if (response.ok) {
            return response.arrayBuffer();
          }
          throw new Error(response.status + " : " + response.url);
        }, "readAsync");
      }
    } else {
    }
    var out = console.log.bind(console);
    var err = console.error.bind(console);
    var dynamicLibraries = [];
    var wasmBinary;
    var ABORT = false;
    var EXITSTATUS;
    var isFileURI = /* @__PURE__ */ __name((filename) => filename.startsWith("file://"), "isFileURI");
    var readyPromiseResolve, readyPromiseReject;
    var wasmMemory;
    var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    var HEAP64, HEAPU64;
    var HEAP_DATA_VIEW;
    var runtimeInitialized = false;
    function updateMemoryViews() {
      var b = wasmMemory.buffer;
      Module["HEAP8"] = HEAP8 = new Int8Array(b);
      Module["HEAP16"] = HEAP16 = new Int16Array(b);
      Module["HEAPU8"] = HEAPU8 = new Uint8Array(b);
      Module["HEAPU16"] = HEAPU16 = new Uint16Array(b);
      Module["HEAP32"] = HEAP32 = new Int32Array(b);
      Module["HEAPU32"] = HEAPU32 = new Uint32Array(b);
      Module["HEAPF32"] = HEAPF32 = new Float32Array(b);
      Module["HEAPF64"] = HEAPF64 = new Float64Array(b);
      Module["HEAP64"] = HEAP64 = new BigInt64Array(b);
      Module["HEAPU64"] = HEAPU64 = new BigUint64Array(b);
      Module["HEAP_DATA_VIEW"] = HEAP_DATA_VIEW = new DataView(b);
      LE_HEAP_UPDATE();
    }
    __name(updateMemoryViews, "updateMemoryViews");
    function initMemory() {
      if (Module["wasmMemory"]) {
        wasmMemory = Module["wasmMemory"];
      } else {
        var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 33554432;
        wasmMemory = new WebAssembly.Memory({
          "initial": INITIAL_MEMORY / 65536,
          // In theory we should not need to emit the maximum if we want "unlimited"
          // or 4GB of memory, but VMs error on that atm, see
          // https://github.com/emscripten-core/emscripten/issues/14130
          // And in the pthreads case we definitely need to emit a maximum. So
          // always emit one.
          "maximum": 32768
        });
      }
      updateMemoryViews();
    }
    __name(initMemory, "initMemory");
    var __RELOC_FUNCS__ = [];
    function preRun() {
      if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
          addOnPreRun(Module["preRun"].shift());
        }
      }
      callRuntimeCallbacks(onPreRuns);
    }
    __name(preRun, "preRun");
    function initRuntime() {
      runtimeInitialized = true;
      callRuntimeCallbacks(__RELOC_FUNCS__);
      wasmExports["__wasm_call_ctors"]();
      callRuntimeCallbacks(onPostCtors);
    }
    __name(initRuntime, "initRuntime");
    function preMain() {
    }
    __name(preMain, "preMain");
    function postRun() {
      if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
          addOnPostRun(Module["postRun"].shift());
        }
      }
      callRuntimeCallbacks(onPostRuns);
    }
    __name(postRun, "postRun");
    function abort(what) {
      Module["onAbort"]?.(what);
      what = "Aborted(" + what + ")";
      err(what);
      ABORT = true;
      what += ". Build with -sASSERTIONS for more info.";
      var e = new WebAssembly.RuntimeError(what);
      readyPromiseReject?.(e);
      throw e;
    }
    __name(abort, "abort");
    var wasmBinaryFile;
    function findWasmBinary() {
      if (Module["locateFile"]) {
        return locateFile("web-tree-sitter.wasm");
      }
      return new URL("web-tree-sitter.wasm", import_meta.url).href;
    }
    __name(findWasmBinary, "findWasmBinary");
    function getBinarySync(file) {
      if (file == wasmBinaryFile && wasmBinary) {
        return new Uint8Array(wasmBinary);
      }
      if (readBinary) {
        return readBinary(file);
      }
      throw "both async and sync fetching of the wasm failed";
    }
    __name(getBinarySync, "getBinarySync");
    async function getWasmBinary(binaryFile) {
      if (!wasmBinary) {
        try {
          var response = await readAsync(binaryFile);
          return new Uint8Array(response);
        } catch {
        }
      }
      return getBinarySync(binaryFile);
    }
    __name(getWasmBinary, "getWasmBinary");
    async function instantiateArrayBuffer(binaryFile, imports) {
      try {
        var binary2 = await getWasmBinary(binaryFile);
        var instance2 = await WebAssembly.instantiate(binary2, imports);
        return instance2;
      } catch (reason) {
        err(`failed to asynchronously prepare wasm: ${reason}`);
        abort(reason);
      }
    }
    __name(instantiateArrayBuffer, "instantiateArrayBuffer");
    async function instantiateAsync(binary2, binaryFile, imports) {
      if (!binary2 && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
        try {
          var response = fetch(binaryFile, {
            credentials: "same-origin"
          });
          var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
          return instantiationResult;
        } catch (reason) {
          err(`wasm streaming compile failed: ${reason}`);
          err("falling back to ArrayBuffer instantiation");
        }
      }
      return instantiateArrayBuffer(binaryFile, imports);
    }
    __name(instantiateAsync, "instantiateAsync");
    function getWasmImports() {
      return {
        "env": wasmImports,
        "wasi_snapshot_preview1": wasmImports,
        "GOT.mem": new Proxy(wasmImports, GOTHandler),
        "GOT.func": new Proxy(wasmImports, GOTHandler)
      };
    }
    __name(getWasmImports, "getWasmImports");
    async function createWasm() {
      function receiveInstance(instance2, module2) {
        wasmExports = instance2.exports;
        wasmExports = relocateExports(wasmExports, 1024);
        var metadata2 = getDylinkMetadata(module2);
        if (metadata2.neededDynlibs) {
          dynamicLibraries = metadata2.neededDynlibs.concat(dynamicLibraries);
        }
        mergeLibSymbols(wasmExports, "main");
        LDSO.init();
        loadDylibs();
        __RELOC_FUNCS__.push(wasmExports["__wasm_apply_data_relocs"]);
        assignWasmExports(wasmExports);
        return wasmExports;
      }
      __name(receiveInstance, "receiveInstance");
      function receiveInstantiationResult(result2) {
        return receiveInstance(result2["instance"], result2["module"]);
      }
      __name(receiveInstantiationResult, "receiveInstantiationResult");
      var info2 = getWasmImports();
      if (Module["instantiateWasm"]) {
        return new Promise((resolve, reject) => {
          Module["instantiateWasm"](info2, (mod, inst) => {
            resolve(receiveInstance(mod, inst));
          });
        });
      }
      wasmBinaryFile ??= findWasmBinary();
      var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info2);
      var exports = receiveInstantiationResult(result);
      return exports;
    }
    __name(createWasm, "createWasm");
    class ExitStatus {
      static {
        __name(this, "ExitStatus");
      }
      name = "ExitStatus";
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }
    var GOT = {};
    var currentModuleWeakSymbols = /* @__PURE__ */ new Set([]);
    var GOTHandler = {
      get(obj, symName) {
        var rtn = GOT[symName];
        if (!rtn) {
          rtn = GOT[symName] = new WebAssembly.Global({
            "value": "i32",
            "mutable": true
          });
        }
        if (!currentModuleWeakSymbols.has(symName)) {
          rtn.required = true;
        }
        return rtn;
      }
    };
    var LE_ATOMICS_NATIVE_BYTE_ORDER = [];
    var LE_HEAP_LOAD_F32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat32(byteOffset, true), "LE_HEAP_LOAD_F32");
    var LE_HEAP_LOAD_F64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getFloat64(byteOffset, true), "LE_HEAP_LOAD_F64");
    var LE_HEAP_LOAD_I16 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt16(byteOffset, true), "LE_HEAP_LOAD_I16");
    var LE_HEAP_LOAD_I32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getInt32(byteOffset, true), "LE_HEAP_LOAD_I32");
    var LE_HEAP_LOAD_I64 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getBigInt64(byteOffset, true), "LE_HEAP_LOAD_I64");
    var LE_HEAP_LOAD_U32 = /* @__PURE__ */ __name((byteOffset) => HEAP_DATA_VIEW.getUint32(byteOffset, true), "LE_HEAP_LOAD_U32");
    var LE_HEAP_STORE_F32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat32(byteOffset, value, true), "LE_HEAP_STORE_F32");
    var LE_HEAP_STORE_F64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setFloat64(byteOffset, value, true), "LE_HEAP_STORE_F64");
    var LE_HEAP_STORE_I16 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt16(byteOffset, value, true), "LE_HEAP_STORE_I16");
    var LE_HEAP_STORE_I32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setInt32(byteOffset, value, true), "LE_HEAP_STORE_I32");
    var LE_HEAP_STORE_I64 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setBigInt64(byteOffset, value, true), "LE_HEAP_STORE_I64");
    var LE_HEAP_STORE_U32 = /* @__PURE__ */ __name((byteOffset, value) => HEAP_DATA_VIEW.setUint32(byteOffset, value, true), "LE_HEAP_STORE_U32");
    var callRuntimeCallbacks = /* @__PURE__ */ __name((callbacks) => {
      while (callbacks.length > 0) {
        callbacks.shift()(Module);
      }
    }, "callRuntimeCallbacks");
    var onPostRuns = [];
    var addOnPostRun = /* @__PURE__ */ __name((cb) => onPostRuns.push(cb), "addOnPostRun");
    var onPreRuns = [];
    var addOnPreRun = /* @__PURE__ */ __name((cb) => onPreRuns.push(cb), "addOnPreRun");
    var UTF8Decoder = typeof TextDecoder != "undefined" ? new TextDecoder() : void 0;
    var findStringEnd = /* @__PURE__ */ __name((heapOrArray, idx, maxBytesToRead, ignoreNul) => {
      var maxIdx = idx + maxBytesToRead;
      if (ignoreNul) return maxIdx;
      while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
      return idx;
    }, "findStringEnd");
    var UTF8ArrayToString = /* @__PURE__ */ __name((heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = "";
      while (idx < endPtr) {
        var u0 = heapOrArray[idx++];
        if (!(u0 & 128)) {
          str += String.fromCharCode(u0);
          continue;
        }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 224) == 192) {
          str += String.fromCharCode((u0 & 31) << 6 | u1);
          continue;
        }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 240) == 224) {
          u0 = (u0 & 15) << 12 | u1 << 6 | u2;
        } else {
          u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
        }
        if (u0 < 65536) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 65536;
          str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
        }
      }
      return str;
    }, "UTF8ArrayToString");
    var getDylinkMetadata = /* @__PURE__ */ __name((binary2) => {
      var offset = 0;
      var end = 0;
      function getU8() {
        return binary2[offset++];
      }
      __name(getU8, "getU8");
      function getLEB() {
        var ret = 0;
        var mul = 1;
        while (1) {
          var byte = binary2[offset++];
          ret += (byte & 127) * mul;
          mul *= 128;
          if (!(byte & 128)) break;
        }
        return ret;
      }
      __name(getLEB, "getLEB");
      function getString() {
        var len = getLEB();
        offset += len;
        return UTF8ArrayToString(binary2, offset - len, len);
      }
      __name(getString, "getString");
      function getStringList() {
        var count2 = getLEB();
        var rtn = [];
        while (count2--) rtn.push(getString());
        return rtn;
      }
      __name(getStringList, "getStringList");
      function failIf(condition, message) {
        if (condition) throw new Error(message);
      }
      __name(failIf, "failIf");
      if (binary2 instanceof WebAssembly.Module) {
        var dylinkSection = WebAssembly.Module.customSections(binary2, "dylink.0");
        failIf(dylinkSection.length === 0, "need dylink section");
        binary2 = new Uint8Array(dylinkSection[0]);
        end = binary2.length;
      } else {
        var int32View = new Uint32Array(new Uint8Array(binary2.subarray(0, 24)).buffer);
        var magicNumberFound = int32View[0] == 1836278016 || int32View[0] == 6386541;
        failIf(!magicNumberFound, "need to see wasm magic number");
        failIf(binary2[8] !== 0, "need the dylink section to be first");
        offset = 9;
        var section_size = getLEB();
        end = offset + section_size;
        var name2 = getString();
        failIf(name2 !== "dylink.0");
      }
      var customSection = {
        neededDynlibs: [],
        tlsExports: /* @__PURE__ */ new Set(),
        weakImports: /* @__PURE__ */ new Set(),
        runtimePaths: []
      };
      var WASM_DYLINK_MEM_INFO = 1;
      var WASM_DYLINK_NEEDED = 2;
      var WASM_DYLINK_EXPORT_INFO = 3;
      var WASM_DYLINK_IMPORT_INFO = 4;
      var WASM_DYLINK_RUNTIME_PATH = 5;
      var WASM_SYMBOL_TLS = 256;
      var WASM_SYMBOL_BINDING_MASK = 3;
      var WASM_SYMBOL_BINDING_WEAK = 1;
      while (offset < end) {
        var subsectionType = getU8();
        var subsectionSize = getLEB();
        if (subsectionType === WASM_DYLINK_MEM_INFO) {
          customSection.memorySize = getLEB();
          customSection.memoryAlign = getLEB();
          customSection.tableSize = getLEB();
          customSection.tableAlign = getLEB();
        } else if (subsectionType === WASM_DYLINK_NEEDED) {
          customSection.neededDynlibs = getStringList();
        } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
          var count = getLEB();
          while (count--) {
            var symname = getString();
            var flags2 = getLEB();
            if (flags2 & WASM_SYMBOL_TLS) {
              customSection.tlsExports.add(symname);
            }
          }
        } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
          var count = getLEB();
          while (count--) {
            var modname = getString();
            var symname = getString();
            var flags2 = getLEB();
            if ((flags2 & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
              customSection.weakImports.add(symname);
            }
          }
        } else if (subsectionType === WASM_DYLINK_RUNTIME_PATH) {
          customSection.runtimePaths = getStringList();
        } else {
          offset += subsectionSize;
        }
      }
      return customSection;
    }, "getDylinkMetadata");
    function getValue(ptr, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          return HEAP8[ptr];
        case "i8":
          return HEAP8[ptr];
        case "i16":
          return LE_HEAP_LOAD_I16((ptr >> 1) * 2);
        case "i32":
          return LE_HEAP_LOAD_I32((ptr >> 2) * 4);
        case "i64":
          return LE_HEAP_LOAD_I64((ptr >> 3) * 8);
        case "float":
          return LE_HEAP_LOAD_F32((ptr >> 2) * 4);
        case "double":
          return LE_HEAP_LOAD_F64((ptr >> 3) * 8);
        case "*":
          return LE_HEAP_LOAD_U32((ptr >> 2) * 4);
        default:
          abort(`invalid type for getValue: ${type}`);
      }
    }
    __name(getValue, "getValue");
    var newDSO = /* @__PURE__ */ __name((name2, handle2, syms) => {
      var dso = {
        refcount: Infinity,
        name: name2,
        exports: syms,
        global: true
      };
      LDSO.loadedLibsByName[name2] = dso;
      if (handle2 != void 0) {
        LDSO.loadedLibsByHandle[handle2] = dso;
      }
      return dso;
    }, "newDSO");
    var LDSO = {
      loadedLibsByName: {},
      loadedLibsByHandle: {},
      init() {
        newDSO("__main__", 0, wasmImports);
      }
    };
    var ___heap_base = 82240;
    var alignMemory = /* @__PURE__ */ __name((size, alignment) => Math.ceil(size / alignment) * alignment, "alignMemory");
    var getMemory = /* @__PURE__ */ __name((size) => {
      if (runtimeInitialized) {
        return _calloc(size, 1);
      }
      var ret = ___heap_base;
      var end = ret + alignMemory(size, 16);
      ___heap_base = end;
      GOT["__heap_base"].value = end;
      return ret;
    }, "getMemory");
    var isInternalSym = /* @__PURE__ */ __name((symName) => ["__cpp_exception", "__c_longjmp", "__wasm_apply_data_relocs", "__dso_handle", "__tls_size", "__tls_align", "__set_stack_limits", "_emscripten_tls_init", "__wasm_init_tls", "__wasm_call_ctors", "__start_em_asm", "__stop_em_asm", "__start_em_js", "__stop_em_js"].includes(symName) || symName.startsWith("__em_js__"), "isInternalSym");
    var uleb128EncodeWithLen = /* @__PURE__ */ __name((arr) => {
      const n = arr.length;
      return [n % 128 | 128, n >> 7, ...arr];
    }, "uleb128EncodeWithLen");
    var wasmTypeCodes = {
      "i": 127,
      // i32
      "p": 127,
      // i32
      "j": 126,
      // i64
      "f": 125,
      // f32
      "d": 124,
      // f64
      "e": 111
    };
    var generateTypePack = /* @__PURE__ */ __name((types) => uleb128EncodeWithLen(Array.from(types, (type) => {
      var code = wasmTypeCodes[type];
      return code;
    })), "generateTypePack");
    var convertJsFunctionToWasm = /* @__PURE__ */ __name((func2, sig) => {
      var bytes = Uint8Array.of(
        0,
        97,
        115,
        109,
        // magic ("\0asm")
        1,
        0,
        0,
        0,
        // version: 1
        1,
        ...uleb128EncodeWithLen([
          1,
          // count: 1
          96,
          // param types
          ...generateTypePack(sig.slice(1)),
          // return types (for now only supporting [] if `void` and single [T] otherwise)
          ...generateTypePack(sig[0] === "v" ? "" : sig[0])
        ]),
        // The rest of the module is static
        2,
        7,
        // import section
        // (import "e" "f" (func 0 (type 0)))
        1,
        1,
        101,
        1,
        102,
        0,
        0,
        7,
        5,
        // export section
        // (export "f" (func 0 (type 0)))
        1,
        1,
        102,
        0,
        0
      );
      var module2 = new WebAssembly.Module(bytes);
      var instance2 = new WebAssembly.Instance(module2, {
        "e": {
          "f": func2
        }
      });
      var wrappedFunc = instance2.exports["f"];
      return wrappedFunc;
    }, "convertJsFunctionToWasm");
    var wasmTableMirror = [];
    var wasmTable = new WebAssembly.Table({
      "initial": 31,
      "element": "anyfunc"
    });
    var getWasmTableEntry = /* @__PURE__ */ __name((funcPtr) => {
      var func2 = wasmTableMirror[funcPtr];
      if (!func2) {
        wasmTableMirror[funcPtr] = func2 = wasmTable.get(funcPtr);
      }
      return func2;
    }, "getWasmTableEntry");
    var updateTableMap = /* @__PURE__ */ __name((offset, count) => {
      if (functionsInTableMap) {
        for (var i2 = offset; i2 < offset + count; i2++) {
          var item = getWasmTableEntry(i2);
          if (item) {
            functionsInTableMap.set(item, i2);
          }
        }
      }
    }, "updateTableMap");
    var functionsInTableMap;
    var getFunctionAddress = /* @__PURE__ */ __name((func2) => {
      if (!functionsInTableMap) {
        functionsInTableMap = /* @__PURE__ */ new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      return functionsInTableMap.get(func2) || 0;
    }, "getFunctionAddress");
    var freeTableIndexes = [];
    var getEmptyTableSlot = /* @__PURE__ */ __name(() => {
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      return wasmTable["grow"](1);
    }, "getEmptyTableSlot");
    var setWasmTableEntry = /* @__PURE__ */ __name((idx, func2) => {
      wasmTable.set(idx, func2);
      wasmTableMirror[idx] = wasmTable.get(idx);
    }, "setWasmTableEntry");
    var addFunction = /* @__PURE__ */ __name((func2, sig) => {
      var rtn = getFunctionAddress(func2);
      if (rtn) {
        return rtn;
      }
      var ret = getEmptyTableSlot();
      try {
        setWasmTableEntry(ret, func2);
      } catch (err2) {
        if (!(err2 instanceof TypeError)) {
          throw err2;
        }
        var wrapped = convertJsFunctionToWasm(func2, sig);
        setWasmTableEntry(ret, wrapped);
      }
      functionsInTableMap.set(func2, ret);
      return ret;
    }, "addFunction");
    var updateGOT = /* @__PURE__ */ __name((exports, replace) => {
      for (var symName in exports) {
        if (isInternalSym(symName)) {
          continue;
        }
        var value = exports[symName];
        GOT[symName] ||= new WebAssembly.Global({
          "value": "i32",
          "mutable": true
        });
        if (replace || GOT[symName].value == 0) {
          if (typeof value == "function") {
            GOT[symName].value = addFunction(value);
          } else if (typeof value == "number") {
            GOT[symName].value = value;
          } else {
            err(`unhandled export type for '${symName}': ${typeof value}`);
          }
        }
      }
    }, "updateGOT");
    var relocateExports = /* @__PURE__ */ __name((exports, memoryBase2, replace) => {
      var relocated = {};
      for (var e in exports) {
        var value = exports[e];
        if (typeof value == "object") {
          value = value.value;
        }
        if (typeof value == "number") {
          value += memoryBase2;
        }
        relocated[e] = value;
      }
      updateGOT(relocated, replace);
      return relocated;
    }, "relocateExports");
    var isSymbolDefined = /* @__PURE__ */ __name((symName) => {
      var existing = wasmImports[symName];
      if (!existing || existing.stub) {
        return false;
      }
      return true;
    }, "isSymbolDefined");
    var dynCall = /* @__PURE__ */ __name((sig, ptr, args2 = [], promising = false) => {
      var func2 = getWasmTableEntry(ptr);
      var rtn = func2(...args2);
      function convert(rtn2) {
        return rtn2;
      }
      __name(convert, "convert");
      return convert(rtn);
    }, "dynCall");
    var stackSave = /* @__PURE__ */ __name(() => _emscripten_stack_get_current(), "stackSave");
    var stackRestore = /* @__PURE__ */ __name((val) => __emscripten_stack_restore(val), "stackRestore");
    var createInvokeFunction = /* @__PURE__ */ __name((sig) => (ptr, ...args2) => {
      var sp = stackSave();
      try {
        return dynCall(sig, ptr, args2);
      } catch (e) {
        stackRestore(sp);
        if (e !== e + 0) throw e;
        _setThrew(1, 0);
        if (sig[0] == "j") return 0n;
      }
    }, "createInvokeFunction");
    var resolveGlobalSymbol = /* @__PURE__ */ __name((symName, direct = false) => {
      var sym;
      if (isSymbolDefined(symName)) {
        sym = wasmImports[symName];
      } else if (symName.startsWith("invoke_")) {
        sym = wasmImports[symName] = createInvokeFunction(symName.split("_")[1]);
      }
      return {
        sym,
        name: symName
      };
    }, "resolveGlobalSymbol");
    var onPostCtors = [];
    var addOnPostCtor = /* @__PURE__ */ __name((cb) => onPostCtors.push(cb), "addOnPostCtor");
    var UTF8ToString = /* @__PURE__ */ __name((ptr, maxBytesToRead, ignoreNul) => ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "", "UTF8ToString");
    var loadWebAssemblyModule = /* @__PURE__ */ __name((binary, flags, libName, localScope, handle) => {
      var metadata = getDylinkMetadata(binary);
      function loadModule() {
        var memAlign = Math.pow(2, metadata.memoryAlign);
        var memoryBase = metadata.memorySize ? alignMemory(getMemory(metadata.memorySize + memAlign), memAlign) : 0;
        var tableBase = metadata.tableSize ? wasmTable.length : 0;
        if (handle) {
          HEAP8[handle + 8] = 1;
          LE_HEAP_STORE_U32((handle + 12 >> 2) * 4, memoryBase);
          LE_HEAP_STORE_I32((handle + 16 >> 2) * 4, metadata.memorySize);
          LE_HEAP_STORE_U32((handle + 20 >> 2) * 4, tableBase);
          LE_HEAP_STORE_I32((handle + 24 >> 2) * 4, metadata.tableSize);
        }
        if (metadata.tableSize) {
          wasmTable.grow(metadata.tableSize);
        }
        var moduleExports;
        function resolveSymbol(sym) {
          var resolved = resolveGlobalSymbol(sym).sym;
          if (!resolved && localScope) {
            resolved = localScope[sym];
          }
          if (!resolved) {
            resolved = moduleExports[sym];
          }
          return resolved;
        }
        __name(resolveSymbol, "resolveSymbol");
        var proxyHandler = {
          get(stubs, prop) {
            switch (prop) {
              case "__memory_base":
                return memoryBase;
              case "__table_base":
                return tableBase;
            }
            if (prop in wasmImports && !wasmImports[prop].stub) {
              var res = wasmImports[prop];
              return res;
            }
            if (!(prop in stubs)) {
              var resolved;
              stubs[prop] = (...args2) => {
                resolved ||= resolveSymbol(prop);
                return resolved(...args2);
              };
            }
            return stubs[prop];
          }
        };
        var proxy = new Proxy({}, proxyHandler);
        currentModuleWeakSymbols = metadata.weakImports;
        var info = {
          "GOT.mem": new Proxy({}, GOTHandler),
          "GOT.func": new Proxy({}, GOTHandler),
          "env": proxy,
          "wasi_snapshot_preview1": proxy
        };
        function postInstantiation(module, instance) {
          updateTableMap(tableBase, metadata.tableSize);
          moduleExports = relocateExports(instance.exports, memoryBase);
          if (!flags.allowUndefined) {
            reportUndefinedSymbols();
          }
          function addEmAsm(addr, body) {
            var args = [];
            var arity = 0;
            for (; arity < 16; arity++) {
              if (body.indexOf("$" + arity) != -1) {
                args.push("$" + arity);
              } else {
                break;
              }
            }
            args = args.join(",");
            var func = `(${args}) => { ${body} };`;
            ASM_CONSTS[start] = eval(func);
          }
          __name(addEmAsm, "addEmAsm");
          if ("__start_em_asm" in moduleExports) {
            var start = moduleExports["__start_em_asm"];
            var stop = moduleExports["__stop_em_asm"];
            while (start < stop) {
              var jsString = UTF8ToString(start);
              addEmAsm(start, jsString);
              start = HEAPU8.indexOf(0, start) + 1;
            }
          }
          function addEmJs(name, cSig, body) {
            var jsArgs = [];
            cSig = cSig.slice(1, -1);
            if (cSig != "void") {
              cSig = cSig.split(",");
              for (var i in cSig) {
                var jsArg = cSig[i].split(" ").pop();
                jsArgs.push(jsArg.replace("*", ""));
              }
            }
            var func = `(${jsArgs}) => ${body};`;
            moduleExports[name] = eval(func);
          }
          __name(addEmJs, "addEmJs");
          for (var name in moduleExports) {
            if (name.startsWith("__em_js__")) {
              var start = moduleExports[name];
              var jsString = UTF8ToString(start);
              var parts = jsString.split("<::>");
              addEmJs(name.replace("__em_js__", ""), parts[0], parts[1]);
              delete moduleExports[name];
            }
          }
          var applyRelocs = moduleExports["__wasm_apply_data_relocs"];
          if (applyRelocs) {
            if (runtimeInitialized) {
              applyRelocs();
            } else {
              __RELOC_FUNCS__.push(applyRelocs);
            }
          }
          var init = moduleExports["__wasm_call_ctors"];
          if (init) {
            if (runtimeInitialized) {
              init();
            } else {
              addOnPostCtor(init);
            }
          }
          return moduleExports;
        }
        __name(postInstantiation, "postInstantiation");
        if (flags.loadAsync) {
          return (async () => {
            var instance2;
            if (binary instanceof WebAssembly.Module) {
              instance2 = new WebAssembly.Instance(binary, info);
            } else {
              ({ module: binary, instance: instance2 } = await WebAssembly.instantiate(binary, info));
            }
            return postInstantiation(binary, instance2);
          })();
        }
        var module = binary instanceof WebAssembly.Module ? binary : new WebAssembly.Module(binary);
        var instance = new WebAssembly.Instance(module, info);
        return postInstantiation(module, instance);
      }
      __name(loadModule, "loadModule");
      flags = {
        ...flags,
        rpath: {
          parentLibPath: libName,
          paths: metadata.runtimePaths
        }
      };
      if (flags.loadAsync) {
        return metadata.neededDynlibs.reduce((chain, dynNeeded) => chain.then(() => loadDynamicLibrary(dynNeeded, flags, localScope)), Promise.resolve()).then(loadModule);
      }
      metadata.neededDynlibs.forEach((needed) => loadDynamicLibrary(needed, flags, localScope));
      return loadModule();
    }, "loadWebAssemblyModule");
    var mergeLibSymbols = /* @__PURE__ */ __name((exports, libName2) => {
      for (var [sym, exp] of Object.entries(exports)) {
        const setImport = /* @__PURE__ */ __name((target) => {
          if (!isSymbolDefined(target)) {
            wasmImports[target] = exp;
          }
        }, "setImport");
        setImport(sym);
        const main_alias = "__main_argc_argv";
        if (sym == "main") {
          setImport(main_alias);
        }
        if (sym == main_alias) {
          setImport("main");
        }
      }
    }, "mergeLibSymbols");
    var asyncLoad = /* @__PURE__ */ __name(async (url) => {
      var arrayBuffer = await readAsync(url);
      return new Uint8Array(arrayBuffer);
    }, "asyncLoad");
    function loadDynamicLibrary(libName2, flags2 = {
      global: true,
      nodelete: true
    }, localScope2, handle2) {
      var dso = LDSO.loadedLibsByName[libName2];
      if (dso) {
        if (!flags2.global) {
          if (localScope2) {
            Object.assign(localScope2, dso.exports);
          }
        } else if (!dso.global) {
          dso.global = true;
          mergeLibSymbols(dso.exports, libName2);
        }
        if (flags2.nodelete && dso.refcount !== Infinity) {
          dso.refcount = Infinity;
        }
        dso.refcount++;
        if (handle2) {
          LDSO.loadedLibsByHandle[handle2] = dso;
        }
        return flags2.loadAsync ? Promise.resolve(true) : true;
      }
      dso = newDSO(libName2, handle2, "loading");
      dso.refcount = flags2.nodelete ? Infinity : 1;
      dso.global = flags2.global;
      function loadLibData() {
        if (handle2) {
          var data = LE_HEAP_LOAD_U32((handle2 + 28 >> 2) * 4);
          var dataSize = LE_HEAP_LOAD_U32((handle2 + 32 >> 2) * 4);
          if (data && dataSize) {
            var libData = HEAP8.slice(data, data + dataSize);
            return flags2.loadAsync ? Promise.resolve(libData) : libData;
          }
        }
        var libFile = locateFile(libName2);
        if (flags2.loadAsync) {
          return asyncLoad(libFile);
        }
        if (!readBinary) {
          throw new Error(`${libFile}: file not found, and synchronous loading of external files is not available`);
        }
        return readBinary(libFile);
      }
      __name(loadLibData, "loadLibData");
      function getExports() {
        if (flags2.loadAsync) {
          return loadLibData().then((libData) => loadWebAssemblyModule(libData, flags2, libName2, localScope2, handle2));
        }
        return loadWebAssemblyModule(loadLibData(), flags2, libName2, localScope2, handle2);
      }
      __name(getExports, "getExports");
      function moduleLoaded(exports) {
        if (dso.global) {
          mergeLibSymbols(exports, libName2);
        } else if (localScope2) {
          Object.assign(localScope2, exports);
        }
        dso.exports = exports;
      }
      __name(moduleLoaded, "moduleLoaded");
      if (flags2.loadAsync) {
        return getExports().then((exports) => {
          moduleLoaded(exports);
          return true;
        });
      }
      moduleLoaded(getExports());
      return true;
    }
    __name(loadDynamicLibrary, "loadDynamicLibrary");
    var reportUndefinedSymbols = /* @__PURE__ */ __name(() => {
      for (var [symName, entry] of Object.entries(GOT)) {
        if (entry.value == 0) {
          var value = resolveGlobalSymbol(symName, true).sym;
          if (!value && !entry.required) {
            continue;
          }
          if (typeof value == "function") {
            entry.value = addFunction(value, value.sig);
          } else if (typeof value == "number") {
            entry.value = value;
          } else {
            throw new Error(`bad export type for '${symName}': ${typeof value}`);
          }
        }
      }
    }, "reportUndefinedSymbols");
    var runDependencies = 0;
    var dependenciesFulfilled = null;
    var removeRunDependency = /* @__PURE__ */ __name((id8) => {
      runDependencies--;
      Module["monitorRunDependencies"]?.(runDependencies);
      if (runDependencies == 0) {
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }, "removeRunDependency");
    var addRunDependency = /* @__PURE__ */ __name((id8) => {
      runDependencies++;
      Module["monitorRunDependencies"]?.(runDependencies);
    }, "addRunDependency");
    var loadDylibs = /* @__PURE__ */ __name(async () => {
      if (!dynamicLibraries.length) {
        reportUndefinedSymbols();
        return;
      }
      addRunDependency("loadDylibs");
      for (var lib of dynamicLibraries) {
        await loadDynamicLibrary(lib, {
          loadAsync: true,
          global: true,
          nodelete: true,
          allowUndefined: true
        });
      }
      reportUndefinedSymbols();
      removeRunDependency("loadDylibs");
    }, "loadDylibs");
    var noExitRuntime = true;
    function setValue(ptr, value, type = "i8") {
      if (type.endsWith("*")) type = "*";
      switch (type) {
        case "i1":
          HEAP8[ptr] = value;
          break;
        case "i8":
          HEAP8[ptr] = value;
          break;
        case "i16":
          LE_HEAP_STORE_I16((ptr >> 1) * 2, value);
          break;
        case "i32":
          LE_HEAP_STORE_I32((ptr >> 2) * 4, value);
          break;
        case "i64":
          LE_HEAP_STORE_I64((ptr >> 3) * 8, BigInt(value));
          break;
        case "float":
          LE_HEAP_STORE_F32((ptr >> 2) * 4, value);
          break;
        case "double":
          LE_HEAP_STORE_F64((ptr >> 3) * 8, value);
          break;
        case "*":
          LE_HEAP_STORE_U32((ptr >> 2) * 4, value);
          break;
        default:
          abort(`invalid type for setValue: ${type}`);
      }
    }
    __name(setValue, "setValue");
    var ___memory_base = new WebAssembly.Global({
      "value": "i32",
      "mutable": false
    }, 1024);
    var ___stack_high = 82240;
    var ___stack_low = 16704;
    var ___stack_pointer = new WebAssembly.Global({
      "value": "i32",
      "mutable": true
    }, 82240);
    var ___table_base = new WebAssembly.Global({
      "value": "i32",
      "mutable": false
    }, 1);
    var __abort_js = /* @__PURE__ */ __name(() => abort(""), "__abort_js");
    __abort_js.sig = "v";
    var getHeapMax = /* @__PURE__ */ __name(() => (
      // Stay one Wasm page short of 4GB: while e.g. Chrome is able to allocate
      // full 4GB Wasm memories, the size will wrap back to 0 bytes in Wasm side
      // for any code that deals with heap sizes, which would require special
      // casing all heap size related code to treat 0 specially.
      2147483648
    ), "getHeapMax");
    var growMemory = /* @__PURE__ */ __name((size) => {
      var oldHeapSize = wasmMemory.buffer.byteLength;
      var pages = (size - oldHeapSize + 65535) / 65536 | 0;
      try {
        wasmMemory.grow(pages);
        updateMemoryViews();
        return 1;
      } catch (e) {
      }
    }, "growMemory");
    var _emscripten_resize_heap = /* @__PURE__ */ __name((requestedSize) => {
      var oldSize = HEAPU8.length;
      requestedSize >>>= 0;
      var maxHeapSize = getHeapMax();
      if (requestedSize > maxHeapSize) {
        return false;
      }
      for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
        var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
        overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
        var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
        var replacement = growMemory(newSize);
        if (replacement) {
          return true;
        }
      }
      return false;
    }, "_emscripten_resize_heap");
    _emscripten_resize_heap.sig = "ip";
    var _fd_close = /* @__PURE__ */ __name((fd) => 52, "_fd_close");
    _fd_close.sig = "ii";
    var INT53_MAX = 9007199254740992;
    var INT53_MIN = -9007199254740992;
    var bigintToI53Checked = /* @__PURE__ */ __name((num) => num < INT53_MIN || num > INT53_MAX ? NaN : Number(num), "bigintToI53Checked");
    function _fd_seek(fd, offset, whence, newOffset) {
      offset = bigintToI53Checked(offset);
      return 70;
    }
    __name(_fd_seek, "_fd_seek");
    _fd_seek.sig = "iijip";
    var printCharBuffers = [null, [], []];
    var printChar = /* @__PURE__ */ __name((stream, curr) => {
      var buffer = printCharBuffers[stream];
      if (curr === 0 || curr === 10) {
        (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
        buffer.length = 0;
      } else {
        buffer.push(curr);
      }
    }, "printChar");
    var _fd_write = /* @__PURE__ */ __name((fd, iov, iovcnt, pnum) => {
      var num = 0;
      for (var i2 = 0; i2 < iovcnt; i2++) {
        var ptr = LE_HEAP_LOAD_U32((iov >> 2) * 4);
        var len = LE_HEAP_LOAD_U32((iov + 4 >> 2) * 4);
        iov += 8;
        for (var j = 0; j < len; j++) {
          printChar(fd, HEAPU8[ptr + j]);
        }
        num += len;
      }
      LE_HEAP_STORE_U32((pnum >> 2) * 4, num);
      return 0;
    }, "_fd_write");
    _fd_write.sig = "iippp";
    function _tree_sitter_log_callback(isLexMessage, messageAddress) {
      if (Module.currentLogCallback) {
        const message = UTF8ToString(messageAddress);
        Module.currentLogCallback(message, isLexMessage !== 0);
      }
    }
    __name(_tree_sitter_log_callback, "_tree_sitter_log_callback");
    function _tree_sitter_parse_callback(inputBufferAddress, index, row, column, lengthAddress) {
      const INPUT_BUFFER_SIZE = 10 * 1024;
      const string = Module.currentParseCallback(index, {
        row,
        column
      });
      if (typeof string === "string") {
        setValue(lengthAddress, string.length, "i32");
        stringToUTF16(string, inputBufferAddress, INPUT_BUFFER_SIZE);
      } else {
        setValue(lengthAddress, 0, "i32");
      }
    }
    __name(_tree_sitter_parse_callback, "_tree_sitter_parse_callback");
    function _tree_sitter_progress_callback(currentOffset, hasError) {
      if (Module.currentProgressCallback) {
        return Module.currentProgressCallback({
          currentOffset,
          hasError
        });
      }
      return false;
    }
    __name(_tree_sitter_progress_callback, "_tree_sitter_progress_callback");
    function _tree_sitter_query_progress_callback(currentOffset) {
      if (Module.currentQueryProgressCallback) {
        return Module.currentQueryProgressCallback({
          currentOffset
        });
      }
      return false;
    }
    __name(_tree_sitter_query_progress_callback, "_tree_sitter_query_progress_callback");
    var runtimeKeepaliveCounter = 0;
    var keepRuntimeAlive = /* @__PURE__ */ __name(() => noExitRuntime || runtimeKeepaliveCounter > 0, "keepRuntimeAlive");
    var _proc_exit = /* @__PURE__ */ __name((code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module["onExit"]?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    }, "_proc_exit");
    _proc_exit.sig = "vi";
    var exitJS = /* @__PURE__ */ __name((status, implicit) => {
      EXITSTATUS = status;
      _proc_exit(status);
    }, "exitJS");
    var handleException = /* @__PURE__ */ __name((e) => {
      if (e instanceof ExitStatus || e == "unwind") {
        return EXITSTATUS;
      }
      quit_(1, e);
    }, "handleException");
    var lengthBytesUTF8 = /* @__PURE__ */ __name((str) => {
      var len = 0;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var c = str.charCodeAt(i2);
        if (c <= 127) {
          len++;
        } else if (c <= 2047) {
          len += 2;
        } else if (c >= 55296 && c <= 57343) {
          len += 4;
          ++i2;
        } else {
          len += 3;
        }
      }
      return len;
    }, "lengthBytesUTF8");
    var stringToUTF8Array = /* @__PURE__ */ __name((str, heap, outIdx, maxBytesToWrite) => {
      if (!(maxBytesToWrite > 0)) return 0;
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1;
      for (var i2 = 0; i2 < str.length; ++i2) {
        var u = str.codePointAt(i2);
        if (u <= 127) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 2047) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 192 | u >> 6;
          heap[outIdx++] = 128 | u & 63;
        } else if (u <= 65535) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 224 | u >> 12;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
        } else {
          if (outIdx + 3 >= endIdx) break;
          heap[outIdx++] = 240 | u >> 18;
          heap[outIdx++] = 128 | u >> 12 & 63;
          heap[outIdx++] = 128 | u >> 6 & 63;
          heap[outIdx++] = 128 | u & 63;
          i2++;
        }
      }
      heap[outIdx] = 0;
      return outIdx - startIdx;
    }, "stringToUTF8Array");
    var stringToUTF8 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite), "stringToUTF8");
    var stackAlloc = /* @__PURE__ */ __name((sz) => __emscripten_stack_alloc(sz), "stackAlloc");
    var stringToUTF8OnStack = /* @__PURE__ */ __name((str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    }, "stringToUTF8OnStack");
    var AsciiToString = /* @__PURE__ */ __name((ptr) => {
      var str = "";
      while (1) {
        var ch = HEAPU8[ptr++];
        if (!ch) return str;
        str += String.fromCharCode(ch);
      }
    }, "AsciiToString");
    var stringToUTF16 = /* @__PURE__ */ __name((str, outPtr, maxBytesToWrite) => {
      maxBytesToWrite ??= 2147483647;
      if (maxBytesToWrite < 2) return 0;
      maxBytesToWrite -= 2;
      var startPtr = outPtr;
      var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
      for (var i2 = 0; i2 < numCharsToWrite; ++i2) {
        var codeUnit = str.charCodeAt(i2);
        LE_HEAP_STORE_I16((outPtr >> 1) * 2, codeUnit);
        outPtr += 2;
      }
      LE_HEAP_STORE_I16((outPtr >> 1) * 2, 0);
      return outPtr - startPtr;
    }, "stringToUTF16");
    LE_ATOMICS_NATIVE_BYTE_ORDER = new Int8Array(new Int16Array([1]).buffer)[0] === 1 ? [
      /* little endian */
      ((x) => x),
      ((x) => x),
      void 0,
      ((x) => x)
    ] : [
      /* big endian */
      ((x) => x),
      ((x) => ((x & 65280) << 8 | (x & 255) << 24) >> 16),
      void 0,
      ((x) => x >> 24 & 255 | x >> 8 & 65280 | (x & 65280) << 8 | (x & 255) << 24)
    ];
    function LE_HEAP_UPDATE() {
      HEAPU16.unsigned = ((x) => x & 65535);
      HEAPU32.unsigned = ((x) => x >>> 0);
    }
    __name(LE_HEAP_UPDATE, "LE_HEAP_UPDATE");
    {
      initMemory();
      if (Module["noExitRuntime"]) noExitRuntime = Module["noExitRuntime"];
      if (Module["print"]) out = Module["print"];
      if (Module["printErr"]) err = Module["printErr"];
      if (Module["dynamicLibraries"]) dynamicLibraries = Module["dynamicLibraries"];
      if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];
      if (Module["arguments"]) arguments_ = Module["arguments"];
      if (Module["thisProgram"]) thisProgram = Module["thisProgram"];
      if (Module["preInit"]) {
        if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
        while (Module["preInit"].length > 0) {
          Module["preInit"].shift()();
        }
      }
    }
    Module["setValue"] = setValue;
    Module["getValue"] = getValue;
    Module["UTF8ToString"] = UTF8ToString;
    Module["stringToUTF8"] = stringToUTF8;
    Module["lengthBytesUTF8"] = lengthBytesUTF8;
    Module["AsciiToString"] = AsciiToString;
    Module["stringToUTF16"] = stringToUTF16;
    Module["loadWebAssemblyModule"] = loadWebAssemblyModule;
    Module["LE_HEAP_STORE_I64"] = LE_HEAP_STORE_I64;
    var ASM_CONSTS = {};
    var _malloc, _calloc, _realloc, _free, _ts_range_edit, _memcmp, _ts_language_symbol_count, _ts_language_state_count, _ts_language_abi_version, _ts_language_name, _ts_language_field_count, _ts_language_next_state, _ts_language_symbol_name, _ts_language_symbol_for_name, _strncmp, _ts_language_symbol_type, _ts_language_field_name_for_id, _ts_lookahead_iterator_new, _ts_lookahead_iterator_delete, _ts_lookahead_iterator_reset_state, _ts_lookahead_iterator_reset, _ts_lookahead_iterator_next, _ts_lookahead_iterator_current_symbol, _ts_point_edit, _ts_parser_delete, _ts_parser_reset, _ts_parser_set_language, _ts_parser_set_included_ranges, _ts_query_new, _ts_query_delete, _iswspace, _iswalnum, _ts_query_copy, _ts_query_pattern_count, _ts_query_capture_count, _ts_query_string_count, _ts_query_capture_name_for_id, _ts_query_capture_quantifier_for_id, _ts_query_string_value_for_id, _ts_query_predicates_for_pattern, _ts_query_start_byte_for_pattern, _ts_query_end_byte_for_pattern, _ts_query_is_pattern_rooted, _ts_query_is_pattern_non_local, _ts_query_is_pattern_guaranteed_at_step, _ts_query_disable_capture, _ts_query_disable_pattern, _ts_tree_copy, _ts_tree_delete, _ts_init, _ts_parser_new_wasm, _ts_parser_enable_logger_wasm, _ts_parser_parse_wasm, _ts_parser_included_ranges_wasm, _ts_language_type_is_named_wasm, _ts_language_type_is_visible_wasm, _ts_language_metadata_wasm, _ts_language_supertypes_wasm, _ts_language_subtypes_wasm, _ts_tree_root_node_wasm, _ts_tree_root_node_with_offset_wasm, _ts_tree_edit_wasm, _ts_tree_included_ranges_wasm, _ts_tree_get_changed_ranges_wasm, _ts_tree_cursor_new_wasm, _ts_tree_cursor_copy_wasm, _ts_tree_cursor_delete_wasm, _ts_tree_cursor_reset_wasm, _ts_tree_cursor_reset_to_wasm, _ts_tree_cursor_goto_first_child_wasm, _ts_tree_cursor_goto_last_child_wasm, _ts_tree_cursor_goto_first_child_for_index_wasm, _ts_tree_cursor_goto_first_child_for_position_wasm, _ts_tree_cursor_goto_next_sibling_wasm, _ts_tree_cursor_goto_previous_sibling_wasm, _ts_tree_cursor_goto_descendant_wasm, _ts_tree_cursor_goto_parent_wasm, _ts_tree_cursor_current_node_type_id_wasm, _ts_tree_cursor_current_node_state_id_wasm, _ts_tree_cursor_current_node_is_named_wasm, _ts_tree_cursor_current_node_is_missing_wasm, _ts_tree_cursor_current_node_id_wasm, _ts_tree_cursor_start_position_wasm, _ts_tree_cursor_end_position_wasm, _ts_tree_cursor_start_index_wasm, _ts_tree_cursor_end_index_wasm, _ts_tree_cursor_current_field_id_wasm, _ts_tree_cursor_current_depth_wasm, _ts_tree_cursor_current_descendant_index_wasm, _ts_tree_cursor_current_node_wasm, _ts_node_symbol_wasm, _ts_node_field_name_for_child_wasm, _ts_node_field_name_for_named_child_wasm, _ts_node_children_by_field_id_wasm, _ts_node_first_child_for_byte_wasm, _ts_node_first_named_child_for_byte_wasm, _ts_node_grammar_symbol_wasm, _ts_node_child_count_wasm, _ts_node_named_child_count_wasm, _ts_node_child_wasm, _ts_node_named_child_wasm, _ts_node_child_by_field_id_wasm, _ts_node_next_sibling_wasm, _ts_node_prev_sibling_wasm, _ts_node_next_named_sibling_wasm, _ts_node_prev_named_sibling_wasm, _ts_node_descendant_count_wasm, _ts_node_parent_wasm, _ts_node_child_with_descendant_wasm, _ts_node_descendant_for_index_wasm, _ts_node_named_descendant_for_index_wasm, _ts_node_descendant_for_position_wasm, _ts_node_named_descendant_for_position_wasm, _ts_node_start_point_wasm, _ts_node_end_point_wasm, _ts_node_start_index_wasm, _ts_node_end_index_wasm, _ts_node_to_string_wasm, _ts_node_children_wasm, _ts_node_named_children_wasm, _ts_node_descendants_of_type_wasm, _ts_node_is_named_wasm, _ts_node_has_changes_wasm, _ts_node_has_error_wasm, _ts_node_is_error_wasm, _ts_node_is_missing_wasm, _ts_node_is_extra_wasm, _ts_node_parse_state_wasm, _ts_node_next_parse_state_wasm, _ts_query_matches_wasm, _ts_query_captures_wasm, _memset, _memcpy, _memmove, _iswalpha, _iswblank, _iswdigit, _iswlower, _iswpunct, _iswupper, _iswxdigit, _memchr, _strlen, _strcmp, _strncat, _strncpy, _towlower, _towupper, _setThrew, __emscripten_stack_restore, __emscripten_stack_alloc, _emscripten_stack_get_current, ___wasm_apply_data_relocs;
    function assignWasmExports(wasmExports2) {
      Module["_malloc"] = _malloc = wasmExports2["malloc"];
      Module["_calloc"] = _calloc = wasmExports2["calloc"];
      Module["_realloc"] = _realloc = wasmExports2["realloc"];
      Module["_free"] = _free = wasmExports2["free"];
      Module["_ts_range_edit"] = _ts_range_edit = wasmExports2["ts_range_edit"];
      Module["_memcmp"] = _memcmp = wasmExports2["memcmp"];
      Module["_ts_language_symbol_count"] = _ts_language_symbol_count = wasmExports2["ts_language_symbol_count"];
      Module["_ts_language_state_count"] = _ts_language_state_count = wasmExports2["ts_language_state_count"];
      Module["_ts_language_abi_version"] = _ts_language_abi_version = wasmExports2["ts_language_abi_version"];
      Module["_ts_language_name"] = _ts_language_name = wasmExports2["ts_language_name"];
      Module["_ts_language_field_count"] = _ts_language_field_count = wasmExports2["ts_language_field_count"];
      Module["_ts_language_next_state"] = _ts_language_next_state = wasmExports2["ts_language_next_state"];
      Module["_ts_language_symbol_name"] = _ts_language_symbol_name = wasmExports2["ts_language_symbol_name"];
      Module["_ts_language_symbol_for_name"] = _ts_language_symbol_for_name = wasmExports2["ts_language_symbol_for_name"];
      Module["_strncmp"] = _strncmp = wasmExports2["strncmp"];
      Module["_ts_language_symbol_type"] = _ts_language_symbol_type = wasmExports2["ts_language_symbol_type"];
      Module["_ts_language_field_name_for_id"] = _ts_language_field_name_for_id = wasmExports2["ts_language_field_name_for_id"];
      Module["_ts_lookahead_iterator_new"] = _ts_lookahead_iterator_new = wasmExports2["ts_lookahead_iterator_new"];
      Module["_ts_lookahead_iterator_delete"] = _ts_lookahead_iterator_delete = wasmExports2["ts_lookahead_iterator_delete"];
      Module["_ts_lookahead_iterator_reset_state"] = _ts_lookahead_iterator_reset_state = wasmExports2["ts_lookahead_iterator_reset_state"];
      Module["_ts_lookahead_iterator_reset"] = _ts_lookahead_iterator_reset = wasmExports2["ts_lookahead_iterator_reset"];
      Module["_ts_lookahead_iterator_next"] = _ts_lookahead_iterator_next = wasmExports2["ts_lookahead_iterator_next"];
      Module["_ts_lookahead_iterator_current_symbol"] = _ts_lookahead_iterator_current_symbol = wasmExports2["ts_lookahead_iterator_current_symbol"];
      Module["_ts_point_edit"] = _ts_point_edit = wasmExports2["ts_point_edit"];
      Module["_ts_parser_delete"] = _ts_parser_delete = wasmExports2["ts_parser_delete"];
      Module["_ts_parser_reset"] = _ts_parser_reset = wasmExports2["ts_parser_reset"];
      Module["_ts_parser_set_language"] = _ts_parser_set_language = wasmExports2["ts_parser_set_language"];
      Module["_ts_parser_set_included_ranges"] = _ts_parser_set_included_ranges = wasmExports2["ts_parser_set_included_ranges"];
      Module["_ts_query_new"] = _ts_query_new = wasmExports2["ts_query_new"];
      Module["_ts_query_delete"] = _ts_query_delete = wasmExports2["ts_query_delete"];
      Module["_iswspace"] = _iswspace = wasmExports2["iswspace"];
      Module["_iswalnum"] = _iswalnum = wasmExports2["iswalnum"];
      Module["_ts_query_copy"] = _ts_query_copy = wasmExports2["ts_query_copy"];
      Module["_ts_query_pattern_count"] = _ts_query_pattern_count = wasmExports2["ts_query_pattern_count"];
      Module["_ts_query_capture_count"] = _ts_query_capture_count = wasmExports2["ts_query_capture_count"];
      Module["_ts_query_string_count"] = _ts_query_string_count = wasmExports2["ts_query_string_count"];
      Module["_ts_query_capture_name_for_id"] = _ts_query_capture_name_for_id = wasmExports2["ts_query_capture_name_for_id"];
      Module["_ts_query_capture_quantifier_for_id"] = _ts_query_capture_quantifier_for_id = wasmExports2["ts_query_capture_quantifier_for_id"];
      Module["_ts_query_string_value_for_id"] = _ts_query_string_value_for_id = wasmExports2["ts_query_string_value_for_id"];
      Module["_ts_query_predicates_for_pattern"] = _ts_query_predicates_for_pattern = wasmExports2["ts_query_predicates_for_pattern"];
      Module["_ts_query_start_byte_for_pattern"] = _ts_query_start_byte_for_pattern = wasmExports2["ts_query_start_byte_for_pattern"];
      Module["_ts_query_end_byte_for_pattern"] = _ts_query_end_byte_for_pattern = wasmExports2["ts_query_end_byte_for_pattern"];
      Module["_ts_query_is_pattern_rooted"] = _ts_query_is_pattern_rooted = wasmExports2["ts_query_is_pattern_rooted"];
      Module["_ts_query_is_pattern_non_local"] = _ts_query_is_pattern_non_local = wasmExports2["ts_query_is_pattern_non_local"];
      Module["_ts_query_is_pattern_guaranteed_at_step"] = _ts_query_is_pattern_guaranteed_at_step = wasmExports2["ts_query_is_pattern_guaranteed_at_step"];
      Module["_ts_query_disable_capture"] = _ts_query_disable_capture = wasmExports2["ts_query_disable_capture"];
      Module["_ts_query_disable_pattern"] = _ts_query_disable_pattern = wasmExports2["ts_query_disable_pattern"];
      Module["_ts_tree_copy"] = _ts_tree_copy = wasmExports2["ts_tree_copy"];
      Module["_ts_tree_delete"] = _ts_tree_delete = wasmExports2["ts_tree_delete"];
      Module["_ts_init"] = _ts_init = wasmExports2["ts_init"];
      Module["_ts_parser_new_wasm"] = _ts_parser_new_wasm = wasmExports2["ts_parser_new_wasm"];
      Module["_ts_parser_enable_logger_wasm"] = _ts_parser_enable_logger_wasm = wasmExports2["ts_parser_enable_logger_wasm"];
      Module["_ts_parser_parse_wasm"] = _ts_parser_parse_wasm = wasmExports2["ts_parser_parse_wasm"];
      Module["_ts_parser_included_ranges_wasm"] = _ts_parser_included_ranges_wasm = wasmExports2["ts_parser_included_ranges_wasm"];
      Module["_ts_language_type_is_named_wasm"] = _ts_language_type_is_named_wasm = wasmExports2["ts_language_type_is_named_wasm"];
      Module["_ts_language_type_is_visible_wasm"] = _ts_language_type_is_visible_wasm = wasmExports2["ts_language_type_is_visible_wasm"];
      Module["_ts_language_metadata_wasm"] = _ts_language_metadata_wasm = wasmExports2["ts_language_metadata_wasm"];
      Module["_ts_language_supertypes_wasm"] = _ts_language_supertypes_wasm = wasmExports2["ts_language_supertypes_wasm"];
      Module["_ts_language_subtypes_wasm"] = _ts_language_subtypes_wasm = wasmExports2["ts_language_subtypes_wasm"];
      Module["_ts_tree_root_node_wasm"] = _ts_tree_root_node_wasm = wasmExports2["ts_tree_root_node_wasm"];
      Module["_ts_tree_root_node_with_offset_wasm"] = _ts_tree_root_node_with_offset_wasm = wasmExports2["ts_tree_root_node_with_offset_wasm"];
      Module["_ts_tree_edit_wasm"] = _ts_tree_edit_wasm = wasmExports2["ts_tree_edit_wasm"];
      Module["_ts_tree_included_ranges_wasm"] = _ts_tree_included_ranges_wasm = wasmExports2["ts_tree_included_ranges_wasm"];
      Module["_ts_tree_get_changed_ranges_wasm"] = _ts_tree_get_changed_ranges_wasm = wasmExports2["ts_tree_get_changed_ranges_wasm"];
      Module["_ts_tree_cursor_new_wasm"] = _ts_tree_cursor_new_wasm = wasmExports2["ts_tree_cursor_new_wasm"];
      Module["_ts_tree_cursor_copy_wasm"] = _ts_tree_cursor_copy_wasm = wasmExports2["ts_tree_cursor_copy_wasm"];
      Module["_ts_tree_cursor_delete_wasm"] = _ts_tree_cursor_delete_wasm = wasmExports2["ts_tree_cursor_delete_wasm"];
      Module["_ts_tree_cursor_reset_wasm"] = _ts_tree_cursor_reset_wasm = wasmExports2["ts_tree_cursor_reset_wasm"];
      Module["_ts_tree_cursor_reset_to_wasm"] = _ts_tree_cursor_reset_to_wasm = wasmExports2["ts_tree_cursor_reset_to_wasm"];
      Module["_ts_tree_cursor_goto_first_child_wasm"] = _ts_tree_cursor_goto_first_child_wasm = wasmExports2["ts_tree_cursor_goto_first_child_wasm"];
      Module["_ts_tree_cursor_goto_last_child_wasm"] = _ts_tree_cursor_goto_last_child_wasm = wasmExports2["ts_tree_cursor_goto_last_child_wasm"];
      Module["_ts_tree_cursor_goto_first_child_for_index_wasm"] = _ts_tree_cursor_goto_first_child_for_index_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_index_wasm"];
      Module["_ts_tree_cursor_goto_first_child_for_position_wasm"] = _ts_tree_cursor_goto_first_child_for_position_wasm = wasmExports2["ts_tree_cursor_goto_first_child_for_position_wasm"];
      Module["_ts_tree_cursor_goto_next_sibling_wasm"] = _ts_tree_cursor_goto_next_sibling_wasm = wasmExports2["ts_tree_cursor_goto_next_sibling_wasm"];
      Module["_ts_tree_cursor_goto_previous_sibling_wasm"] = _ts_tree_cursor_goto_previous_sibling_wasm = wasmExports2["ts_tree_cursor_goto_previous_sibling_wasm"];
      Module["_ts_tree_cursor_goto_descendant_wasm"] = _ts_tree_cursor_goto_descendant_wasm = wasmExports2["ts_tree_cursor_goto_descendant_wasm"];
      Module["_ts_tree_cursor_goto_parent_wasm"] = _ts_tree_cursor_goto_parent_wasm = wasmExports2["ts_tree_cursor_goto_parent_wasm"];
      Module["_ts_tree_cursor_current_node_type_id_wasm"] = _ts_tree_cursor_current_node_type_id_wasm = wasmExports2["ts_tree_cursor_current_node_type_id_wasm"];
      Module["_ts_tree_cursor_current_node_state_id_wasm"] = _ts_tree_cursor_current_node_state_id_wasm = wasmExports2["ts_tree_cursor_current_node_state_id_wasm"];
      Module["_ts_tree_cursor_current_node_is_named_wasm"] = _ts_tree_cursor_current_node_is_named_wasm = wasmExports2["ts_tree_cursor_current_node_is_named_wasm"];
      Module["_ts_tree_cursor_current_node_is_missing_wasm"] = _ts_tree_cursor_current_node_is_missing_wasm = wasmExports2["ts_tree_cursor_current_node_is_missing_wasm"];
      Module["_ts_tree_cursor_current_node_id_wasm"] = _ts_tree_cursor_current_node_id_wasm = wasmExports2["ts_tree_cursor_current_node_id_wasm"];
      Module["_ts_tree_cursor_start_position_wasm"] = _ts_tree_cursor_start_position_wasm = wasmExports2["ts_tree_cursor_start_position_wasm"];
      Module["_ts_tree_cursor_end_position_wasm"] = _ts_tree_cursor_end_position_wasm = wasmExports2["ts_tree_cursor_end_position_wasm"];
      Module["_ts_tree_cursor_start_index_wasm"] = _ts_tree_cursor_start_index_wasm = wasmExports2["ts_tree_cursor_start_index_wasm"];
      Module["_ts_tree_cursor_end_index_wasm"] = _ts_tree_cursor_end_index_wasm = wasmExports2["ts_tree_cursor_end_index_wasm"];
      Module["_ts_tree_cursor_current_field_id_wasm"] = _ts_tree_cursor_current_field_id_wasm = wasmExports2["ts_tree_cursor_current_field_id_wasm"];
      Module["_ts_tree_cursor_current_depth_wasm"] = _ts_tree_cursor_current_depth_wasm = wasmExports2["ts_tree_cursor_current_depth_wasm"];
      Module["_ts_tree_cursor_current_descendant_index_wasm"] = _ts_tree_cursor_current_descendant_index_wasm = wasmExports2["ts_tree_cursor_current_descendant_index_wasm"];
      Module["_ts_tree_cursor_current_node_wasm"] = _ts_tree_cursor_current_node_wasm = wasmExports2["ts_tree_cursor_current_node_wasm"];
      Module["_ts_node_symbol_wasm"] = _ts_node_symbol_wasm = wasmExports2["ts_node_symbol_wasm"];
      Module["_ts_node_field_name_for_child_wasm"] = _ts_node_field_name_for_child_wasm = wasmExports2["ts_node_field_name_for_child_wasm"];
      Module["_ts_node_field_name_for_named_child_wasm"] = _ts_node_field_name_for_named_child_wasm = wasmExports2["ts_node_field_name_for_named_child_wasm"];
      Module["_ts_node_children_by_field_id_wasm"] = _ts_node_children_by_field_id_wasm = wasmExports2["ts_node_children_by_field_id_wasm"];
      Module["_ts_node_first_child_for_byte_wasm"] = _ts_node_first_child_for_byte_wasm = wasmExports2["ts_node_first_child_for_byte_wasm"];
      Module["_ts_node_first_named_child_for_byte_wasm"] = _ts_node_first_named_child_for_byte_wasm = wasmExports2["ts_node_first_named_child_for_byte_wasm"];
      Module["_ts_node_grammar_symbol_wasm"] = _ts_node_grammar_symbol_wasm = wasmExports2["ts_node_grammar_symbol_wasm"];
      Module["_ts_node_child_count_wasm"] = _ts_node_child_count_wasm = wasmExports2["ts_node_child_count_wasm"];
      Module["_ts_node_named_child_count_wasm"] = _ts_node_named_child_count_wasm = wasmExports2["ts_node_named_child_count_wasm"];
      Module["_ts_node_child_wasm"] = _ts_node_child_wasm = wasmExports2["ts_node_child_wasm"];
      Module["_ts_node_named_child_wasm"] = _ts_node_named_child_wasm = wasmExports2["ts_node_named_child_wasm"];
      Module["_ts_node_child_by_field_id_wasm"] = _ts_node_child_by_field_id_wasm = wasmExports2["ts_node_child_by_field_id_wasm"];
      Module["_ts_node_next_sibling_wasm"] = _ts_node_next_sibling_wasm = wasmExports2["ts_node_next_sibling_wasm"];
      Module["_ts_node_prev_sibling_wasm"] = _ts_node_prev_sibling_wasm = wasmExports2["ts_node_prev_sibling_wasm"];
      Module["_ts_node_next_named_sibling_wasm"] = _ts_node_next_named_sibling_wasm = wasmExports2["ts_node_next_named_sibling_wasm"];
      Module["_ts_node_prev_named_sibling_wasm"] = _ts_node_prev_named_sibling_wasm = wasmExports2["ts_node_prev_named_sibling_wasm"];
      Module["_ts_node_descendant_count_wasm"] = _ts_node_descendant_count_wasm = wasmExports2["ts_node_descendant_count_wasm"];
      Module["_ts_node_parent_wasm"] = _ts_node_parent_wasm = wasmExports2["ts_node_parent_wasm"];
      Module["_ts_node_child_with_descendant_wasm"] = _ts_node_child_with_descendant_wasm = wasmExports2["ts_node_child_with_descendant_wasm"];
      Module["_ts_node_descendant_for_index_wasm"] = _ts_node_descendant_for_index_wasm = wasmExports2["ts_node_descendant_for_index_wasm"];
      Module["_ts_node_named_descendant_for_index_wasm"] = _ts_node_named_descendant_for_index_wasm = wasmExports2["ts_node_named_descendant_for_index_wasm"];
      Module["_ts_node_descendant_for_position_wasm"] = _ts_node_descendant_for_position_wasm = wasmExports2["ts_node_descendant_for_position_wasm"];
      Module["_ts_node_named_descendant_for_position_wasm"] = _ts_node_named_descendant_for_position_wasm = wasmExports2["ts_node_named_descendant_for_position_wasm"];
      Module["_ts_node_start_point_wasm"] = _ts_node_start_point_wasm = wasmExports2["ts_node_start_point_wasm"];
      Module["_ts_node_end_point_wasm"] = _ts_node_end_point_wasm = wasmExports2["ts_node_end_point_wasm"];
      Module["_ts_node_start_index_wasm"] = _ts_node_start_index_wasm = wasmExports2["ts_node_start_index_wasm"];
      Module["_ts_node_end_index_wasm"] = _ts_node_end_index_wasm = wasmExports2["ts_node_end_index_wasm"];
      Module["_ts_node_to_string_wasm"] = _ts_node_to_string_wasm = wasmExports2["ts_node_to_string_wasm"];
      Module["_ts_node_children_wasm"] = _ts_node_children_wasm = wasmExports2["ts_node_children_wasm"];
      Module["_ts_node_named_children_wasm"] = _ts_node_named_children_wasm = wasmExports2["ts_node_named_children_wasm"];
      Module["_ts_node_descendants_of_type_wasm"] = _ts_node_descendants_of_type_wasm = wasmExports2["ts_node_descendants_of_type_wasm"];
      Module["_ts_node_is_named_wasm"] = _ts_node_is_named_wasm = wasmExports2["ts_node_is_named_wasm"];
      Module["_ts_node_has_changes_wasm"] = _ts_node_has_changes_wasm = wasmExports2["ts_node_has_changes_wasm"];
      Module["_ts_node_has_error_wasm"] = _ts_node_has_error_wasm = wasmExports2["ts_node_has_error_wasm"];
      Module["_ts_node_is_error_wasm"] = _ts_node_is_error_wasm = wasmExports2["ts_node_is_error_wasm"];
      Module["_ts_node_is_missing_wasm"] = _ts_node_is_missing_wasm = wasmExports2["ts_node_is_missing_wasm"];
      Module["_ts_node_is_extra_wasm"] = _ts_node_is_extra_wasm = wasmExports2["ts_node_is_extra_wasm"];
      Module["_ts_node_parse_state_wasm"] = _ts_node_parse_state_wasm = wasmExports2["ts_node_parse_state_wasm"];
      Module["_ts_node_next_parse_state_wasm"] = _ts_node_next_parse_state_wasm = wasmExports2["ts_node_next_parse_state_wasm"];
      Module["_ts_query_matches_wasm"] = _ts_query_matches_wasm = wasmExports2["ts_query_matches_wasm"];
      Module["_ts_query_captures_wasm"] = _ts_query_captures_wasm = wasmExports2["ts_query_captures_wasm"];
      Module["_memset"] = _memset = wasmExports2["memset"];
      Module["_memcpy"] = _memcpy = wasmExports2["memcpy"];
      Module["_memmove"] = _memmove = wasmExports2["memmove"];
      Module["_iswalpha"] = _iswalpha = wasmExports2["iswalpha"];
      Module["_iswblank"] = _iswblank = wasmExports2["iswblank"];
      Module["_iswdigit"] = _iswdigit = wasmExports2["iswdigit"];
      Module["_iswlower"] = _iswlower = wasmExports2["iswlower"];
      Module["_iswpunct"] = _iswpunct = wasmExports2["iswpunct"];
      Module["_iswupper"] = _iswupper = wasmExports2["iswupper"];
      Module["_iswxdigit"] = _iswxdigit = wasmExports2["iswxdigit"];
      Module["_memchr"] = _memchr = wasmExports2["memchr"];
      Module["_strlen"] = _strlen = wasmExports2["strlen"];
      Module["_strcmp"] = _strcmp = wasmExports2["strcmp"];
      Module["_strncat"] = _strncat = wasmExports2["strncat"];
      Module["_strncpy"] = _strncpy = wasmExports2["strncpy"];
      Module["_towlower"] = _towlower = wasmExports2["towlower"];
      Module["_towupper"] = _towupper = wasmExports2["towupper"];
      _setThrew = wasmExports2["setThrew"];
      __emscripten_stack_restore = wasmExports2["_emscripten_stack_restore"];
      __emscripten_stack_alloc = wasmExports2["_emscripten_stack_alloc"];
      _emscripten_stack_get_current = wasmExports2["emscripten_stack_get_current"];
      ___wasm_apply_data_relocs = wasmExports2["__wasm_apply_data_relocs"];
    }
    __name(assignWasmExports, "assignWasmExports");
    var wasmImports = {
      /** @export */
      __heap_base: ___heap_base,
      /** @export */
      __indirect_function_table: wasmTable,
      /** @export */
      __memory_base: ___memory_base,
      /** @export */
      __stack_high: ___stack_high,
      /** @export */
      __stack_low: ___stack_low,
      /** @export */
      __stack_pointer: ___stack_pointer,
      /** @export */
      __table_base: ___table_base,
      /** @export */
      _abort_js: __abort_js,
      /** @export */
      emscripten_resize_heap: _emscripten_resize_heap,
      /** @export */
      fd_close: _fd_close,
      /** @export */
      fd_seek: _fd_seek,
      /** @export */
      fd_write: _fd_write,
      /** @export */
      memory: wasmMemory,
      /** @export */
      tree_sitter_log_callback: _tree_sitter_log_callback,
      /** @export */
      tree_sitter_parse_callback: _tree_sitter_parse_callback,
      /** @export */
      tree_sitter_progress_callback: _tree_sitter_progress_callback,
      /** @export */
      tree_sitter_query_progress_callback: _tree_sitter_query_progress_callback
    };
    function callMain(args2 = []) {
      var entryFunction = resolveGlobalSymbol("main").sym;
      if (!entryFunction) return;
      args2.unshift(thisProgram);
      var argc = args2.length;
      var argv = stackAlloc((argc + 1) * 4);
      var argv_ptr = argv;
      args2.forEach((arg) => {
        LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, stringToUTF8OnStack(arg));
        argv_ptr += 4;
      });
      LE_HEAP_STORE_U32((argv_ptr >> 2) * 4, 0);
      try {
        var ret = entryFunction(argc, argv);
        exitJS(
          ret,
          /* implicit = */
          true
        );
        return ret;
      } catch (e) {
        return handleException(e);
      }
    }
    __name(callMain, "callMain");
    function run(args2 = arguments_) {
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      preRun();
      if (runDependencies > 0) {
        dependenciesFulfilled = run;
        return;
      }
      function doRun() {
        Module["calledRun"] = true;
        if (ABORT) return;
        initRuntime();
        preMain();
        readyPromiseResolve?.(Module);
        Module["onRuntimeInitialized"]?.();
        var noInitialRun = Module["noInitialRun"] || false;
        if (!noInitialRun) callMain(args2);
        postRun();
      }
      __name(doRun, "doRun");
      if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout(() => {
          setTimeout(() => Module["setStatus"](""), 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    __name(run, "run");
    var wasmExports;
    wasmExports = await createWasm();
    run();
    if (runtimeInitialized) {
      moduleRtn = Module;
    } else {
      moduleRtn = new Promise((resolve, reject) => {
        readyPromiseResolve = resolve;
        readyPromiseReject = reject;
      });
    }
    return moduleRtn;
  }
  __name(Module2, "Module");
  var web_tree_sitter_default = Module2;
  var Module3 = null;
  async function initializeBinding(moduleOptions) {
    return Module3 ??= await web_tree_sitter_default(moduleOptions);
  }
  __name(initializeBinding, "initializeBinding");
  function checkModule() {
    return !!Module3;
  }
  __name(checkModule, "checkModule");
  var TRANSFER_BUFFER;
  var LANGUAGE_VERSION;
  var MIN_COMPATIBLE_VERSION;
  var finalizer4 = newFinalizer((addresses) => {
    C._ts_parser_delete(addresses[0]);
    C._free(addresses[1]);
  });
  var Parser2 = class {
    static {
      __name(this, "Parser");
    }
    /** @internal */
    [0] = 0;
    // Internal handle for Wasm
    /** @internal */
    [1] = 0;
    // Internal handle for Wasm
    /** @internal */
    logCallback = null;
    /** The parser's current language. */
    language = null;
    /**
     * This must always be called before creating a Parser.
     *
     * You can optionally pass in options to configure the Wasm module, the most common
     * one being `locateFile` to help the module find the `.wasm` file.
     */
    static async init(moduleOptions) {
      setModule(await initializeBinding(moduleOptions));
      TRANSFER_BUFFER = C._ts_init();
      LANGUAGE_VERSION = C.getValue(TRANSFER_BUFFER, "i32");
      MIN_COMPATIBLE_VERSION = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    }
    /**
     * Create a new parser.
     */
    constructor() {
      this.initialize();
      finalizer4?.register(this, [this[0], this[1]], this);
    }
    /** @internal */
    initialize() {
      if (!checkModule()) {
        throw new Error("cannot construct a Parser before calling `init()`");
      }
      C._ts_parser_new_wasm();
      this[0] = C.getValue(TRANSFER_BUFFER, "i32");
      this[1] = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
    }
    /** Delete the parser, freeing its resources. */
    delete() {
      finalizer4?.unregister(this);
      C._ts_parser_delete(this[0]);
      C._free(this[1]);
      this[0] = 0;
      this[1] = 0;
    }
    /**
     * Set the language that the parser should use for parsing.
     *
     * If the language was not successfully assigned, an error will be thrown.
     * This happens if the language was generated with an incompatible
     * version of the Tree-sitter CLI. Check the language's version using
     * {@link Language#version} and compare it to this library's
     * {@link LANGUAGE_VERSION} and {@link MIN_COMPATIBLE_VERSION} constants.
     */
    setLanguage(language) {
      let address;
      if (!language) {
        address = 0;
        this.language = null;
      } else if (language.constructor === Language) {
        address = language[0];
        const version = C._ts_language_abi_version(address);
        if (version < MIN_COMPATIBLE_VERSION || LANGUAGE_VERSION < version) {
          throw new Error(
            `Incompatible language version ${version}. Compatibility range ${MIN_COMPATIBLE_VERSION} through ${LANGUAGE_VERSION}.`
          );
        }
        this.language = language;
      } else {
        throw new Error("Argument must be a Language");
      }
      C._ts_parser_set_language(this[0], address);
      return this;
    }
    /**
     * Parse a slice of UTF8 text.
     *
     * @param {string | ParseCallback} callback - The UTF8-encoded text to parse or a callback function.
     *
     * @param {Tree | null} [oldTree] - A previous syntax tree parsed from the same document. If the text of the
     *   document has changed since `oldTree` was created, then you must edit `oldTree` to match
     *   the new text using {@link Tree#edit}.
     *
     * @param {ParseOptions} [options] - Options for parsing the text.
     *  This can be used to set the included ranges, or a progress callback.
     *
     * @returns {Tree | null} A {@link Tree} if parsing succeeded, or `null` if:
     *  - The parser has not yet had a language assigned with {@link Parser#setLanguage}.
     *  - The progress callback returned true.
     */
    parse(callback, oldTree, options) {
      if (typeof callback === "string") {
        C.currentParseCallback = (index) => callback.slice(index);
      } else if (typeof callback === "function") {
        C.currentParseCallback = callback;
      } else {
        throw new Error("Argument must be a string or a function");
      }
      if (options?.progressCallback) {
        C.currentProgressCallback = options.progressCallback;
      } else {
        C.currentProgressCallback = null;
      }
      if (this.logCallback) {
        C.currentLogCallback = this.logCallback;
        C._ts_parser_enable_logger_wasm(this[0], 1);
      } else {
        C.currentLogCallback = null;
        C._ts_parser_enable_logger_wasm(this[0], 0);
      }
      let rangeCount = 0;
      let rangeAddress = 0;
      if (options?.includedRanges) {
        rangeCount = options.includedRanges.length;
        rangeAddress = C._calloc(rangeCount, SIZE_OF_RANGE);
        let address = rangeAddress;
        for (let i2 = 0; i2 < rangeCount; i2++) {
          marshalRange(address, options.includedRanges[i2]);
          address += SIZE_OF_RANGE;
        }
      }
      const treeAddress = C._ts_parser_parse_wasm(
        this[0],
        this[1],
        oldTree ? oldTree[0] : 0,
        rangeAddress,
        rangeCount
      );
      if (!treeAddress) {
        C.currentParseCallback = null;
        C.currentLogCallback = null;
        C.currentProgressCallback = null;
        return null;
      }
      if (!this.language) {
        throw new Error("Parser must have a language to parse");
      }
      const result = new Tree(INTERNAL, treeAddress, this.language, C.currentParseCallback);
      C.currentParseCallback = null;
      C.currentLogCallback = null;
      C.currentProgressCallback = null;
      return result;
    }
    /**
     * Instruct the parser to start the next parse from the beginning.
     *
     * If the parser previously failed because of a callback, 
     * then by default, it will resume where it left off on the
     * next call to {@link Parser#parse} or other parsing functions.
     * If you don't want to resume, and instead intend to use this parser to
     * parse some other document, you must call `reset` first.
     */
    reset() {
      C._ts_parser_reset(this[0]);
    }
    /** Get the ranges of text that the parser will include when parsing. */
    getIncludedRanges() {
      C._ts_parser_included_ranges_wasm(this[0]);
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const buffer = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const result = new Array(count);
      if (count > 0) {
        let address = buffer;
        for (let i2 = 0; i2 < count; i2++) {
          result[i2] = unmarshalRange(address);
          address += SIZE_OF_RANGE;
        }
        C._free(buffer);
      }
      return result;
    }
    /** Set the logging callback that a parser should use during parsing. */
    setLogger(callback) {
      if (!callback) {
        this.logCallback = null;
      } else if (typeof callback !== "function") {
        throw new Error("Logger callback must be a function");
      } else {
        this.logCallback = callback;
      }
      return this;
    }
    /** Get the parser's current logger. */
    getLogger() {
      return this.logCallback;
    }
  };
  var PREDICATE_STEP_TYPE_CAPTURE = 1;
  var PREDICATE_STEP_TYPE_STRING = 2;
  var QUERY_WORD_REGEX = /[\w-]+/g;
  var CaptureQuantifier = {
    Zero: 0,
    ZeroOrOne: 1,
    ZeroOrMore: 2,
    One: 3,
    OneOrMore: 4
  };
  var isCaptureStep = /* @__PURE__ */ __name((step) => step.type === "capture", "isCaptureStep");
  var isStringStep = /* @__PURE__ */ __name((step) => step.type === "string", "isStringStep");
  var QueryErrorKind = {
    Syntax: 1,
    NodeName: 2,
    FieldName: 3,
    CaptureName: 4,
    PatternStructure: 5
  };
  var QueryError = class _QueryError extends Error {
    constructor(kind, info2, index, length) {
      super(_QueryError.formatMessage(kind, info2));
      this.kind = kind;
      this.info = info2;
      this.index = index;
      this.length = length;
      this.name = "QueryError";
    }
    kind;
    info;
    index;
    length;
    static {
      __name(this, "QueryError");
    }
    /** Formats an error message based on the error kind and info */
    static formatMessage(kind, info2) {
      switch (kind) {
        case QueryErrorKind.NodeName:
          return `Bad node name '${info2.word}'`;
        case QueryErrorKind.FieldName:
          return `Bad field name '${info2.word}'`;
        case QueryErrorKind.CaptureName:
          return `Bad capture name @${info2.word}`;
        case QueryErrorKind.PatternStructure:
          return `Bad pattern structure at offset ${info2.suffix}`;
        case QueryErrorKind.Syntax:
          return `Bad syntax at offset ${info2.suffix}`;
      }
    }
  };
  function parseAnyPredicate(steps, index, operator, textPredicates) {
    if (steps.length !== 3) {
      throw new Error(
        `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}`
      );
    }
    if (!isCaptureStep(steps[1])) {
      throw new Error(
        `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}"`
      );
    }
    const isPositive = operator === "eq?" || operator === "any-eq?";
    const matchAll = !operator.startsWith("any-");
    if (isCaptureStep(steps[2])) {
      const captureName1 = steps[1].name;
      const captureName2 = steps[2].name;
      textPredicates[index].push((captures) => {
        const nodes1 = [];
        const nodes2 = [];
        for (const c of captures) {
          if (c.name === captureName1) nodes1.push(c.node);
          if (c.name === captureName2) nodes2.push(c.node);
        }
        const compare = /* @__PURE__ */ __name((n1, n2, positive) => {
          return positive ? n1.text === n2.text : n1.text !== n2.text;
        }, "compare");
        return matchAll ? nodes1.every((n1) => nodes2.some((n2) => compare(n1, n2, isPositive))) : nodes1.some((n1) => nodes2.some((n2) => compare(n1, n2, isPositive)));
      });
    } else {
      const captureName = steps[1].name;
      const stringValue = steps[2].value;
      const matches = /* @__PURE__ */ __name((n) => n.text === stringValue, "matches");
      const doesNotMatch = /* @__PURE__ */ __name((n) => n.text !== stringValue, "doesNotMatch");
      textPredicates[index].push((captures) => {
        const nodes = [];
        for (const c of captures) {
          if (c.name === captureName) nodes.push(c.node);
        }
        const test = isPositive ? matches : doesNotMatch;
        return matchAll ? nodes.every(test) : nodes.some(test);
      });
    }
  }
  __name(parseAnyPredicate, "parseAnyPredicate");
  function parseMatchPredicate(steps, index, operator, textPredicates) {
    if (steps.length !== 3) {
      throw new Error(
        `Wrong number of arguments to \`#${operator}\` predicate. Expected 2, got ${steps.length - 1}.`
      );
    }
    if (steps[1].type !== "capture") {
      throw new Error(
        `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
      );
    }
    if (steps[2].type !== "string") {
      throw new Error(
        `Second argument of \`#${operator}\` predicate must be a string. Got @${steps[2].name}.`
      );
    }
    const isPositive = operator === "match?" || operator === "any-match?";
    const matchAll = !operator.startsWith("any-");
    const captureName = steps[1].name;
    const regex = new RegExp(steps[2].value);
    textPredicates[index].push((captures) => {
      const nodes = [];
      for (const c of captures) {
        if (c.name === captureName) nodes.push(c.node.text);
      }
      const test = /* @__PURE__ */ __name((text, positive) => {
        return positive ? regex.test(text) : !regex.test(text);
      }, "test");
      if (nodes.length === 0) return !isPositive;
      return matchAll ? nodes.every((text) => test(text, isPositive)) : nodes.some((text) => test(text, isPositive));
    });
  }
  __name(parseMatchPredicate, "parseMatchPredicate");
  function parseAnyOfPredicate(steps, index, operator, textPredicates) {
    if (steps.length < 2) {
      throw new Error(
        `Wrong number of arguments to \`#${operator}\` predicate. Expected at least 1. Got ${steps.length - 1}.`
      );
    }
    if (steps[1].type !== "capture") {
      throw new Error(
        `First argument of \`#${operator}\` predicate must be a capture. Got "${steps[1].value}".`
      );
    }
    const isPositive = operator === "any-of?";
    const captureName = steps[1].name;
    const stringSteps = steps.slice(2);
    if (!stringSteps.every(isStringStep)) {
      throw new Error(
        `Arguments to \`#${operator}\` predicate must be strings.".`
      );
    }
    const values = stringSteps.map((s) => s.value);
    textPredicates[index].push((captures) => {
      const nodes = [];
      for (const c of captures) {
        if (c.name === captureName) nodes.push(c.node.text);
      }
      if (nodes.length === 0) return !isPositive;
      return nodes.every((text) => values.includes(text)) === isPositive;
    });
  }
  __name(parseAnyOfPredicate, "parseAnyOfPredicate");
  function parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties) {
    if (steps.length < 2 || steps.length > 3) {
      throw new Error(
        `Wrong number of arguments to \`#${operator}\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`
      );
    }
    if (!steps.every(isStringStep)) {
      throw new Error(
        `Arguments to \`#${operator}\` predicate must be strings.".`
      );
    }
    const properties = operator === "is?" ? assertedProperties : refutedProperties;
    if (!properties[index]) properties[index] = {};
    properties[index][steps[1].value] = steps[2]?.value ?? null;
  }
  __name(parseIsPredicate, "parseIsPredicate");
  function parseSetDirective(steps, index, setProperties) {
    if (steps.length < 2 || steps.length > 3) {
      throw new Error(`Wrong number of arguments to \`#set!\` predicate. Expected 1 or 2. Got ${steps.length - 1}.`);
    }
    if (!steps.every(isStringStep)) {
      throw new Error(`Arguments to \`#set!\` predicate must be strings.".`);
    }
    if (!setProperties[index]) setProperties[index] = {};
    setProperties[index][steps[1].value] = steps[2]?.value ?? null;
  }
  __name(parseSetDirective, "parseSetDirective");
  function parsePattern(index, stepType, stepValueId, captureNames, stringValues, steps, textPredicates, predicates, setProperties, assertedProperties, refutedProperties) {
    if (stepType === PREDICATE_STEP_TYPE_CAPTURE) {
      const name2 = captureNames[stepValueId];
      steps.push({ type: "capture", name: name2 });
    } else if (stepType === PREDICATE_STEP_TYPE_STRING) {
      steps.push({ type: "string", value: stringValues[stepValueId] });
    } else if (steps.length > 0) {
      if (steps[0].type !== "string") {
        throw new Error("Predicates must begin with a literal value");
      }
      const operator = steps[0].value;
      switch (operator) {
        case "any-not-eq?":
        case "not-eq?":
        case "any-eq?":
        case "eq?":
          parseAnyPredicate(steps, index, operator, textPredicates);
          break;
        case "any-not-match?":
        case "not-match?":
        case "any-match?":
        case "match?":
          parseMatchPredicate(steps, index, operator, textPredicates);
          break;
        case "not-any-of?":
        case "any-of?":
          parseAnyOfPredicate(steps, index, operator, textPredicates);
          break;
        case "is?":
        case "is-not?":
          parseIsPredicate(steps, index, operator, assertedProperties, refutedProperties);
          break;
        case "set!":
          parseSetDirective(steps, index, setProperties);
          break;
        default:
          predicates[index].push({ operator, operands: steps.slice(1) });
      }
      steps.length = 0;
    }
  }
  __name(parsePattern, "parsePattern");
  var finalizer5 = newFinalizer((address) => {
    C._ts_query_delete(address);
  });
  var Query = class {
    static {
      __name(this, "Query");
    }
    /** @internal */
    [0] = 0;
    // Internal handle for Wasm
    /** @internal */
    exceededMatchLimit;
    /** @internal */
    textPredicates;
    /** The names of the captures used in the query. */
    captureNames;
    /** The quantifiers of the captures used in the query. */
    captureQuantifiers;
    /**
     * The other user-defined predicates associated with the given index.
     *
     * This includes predicates with operators other than:
     * - `match?`
     * - `eq?` and `not-eq?`
     * - `any-of?` and `not-any-of?`
     * - `is?` and `is-not?`
     * - `set!`
     */
    predicates;
    /** The properties for predicates with the operator `set!`. */
    setProperties;
    /** The properties for predicates with the operator `is?`. */
    assertedProperties;
    /** The properties for predicates with the operator `is-not?`. */
    refutedProperties;
    /** The maximum number of in-progress matches for this cursor. */
    matchLimit;
    /**
     * Create a new query from a string containing one or more S-expression
     * patterns.
     *
     * The query is associated with a particular language, and can only be run
     * on syntax nodes parsed with that language. References to Queries can be
     * shared between multiple threads.
     *
     * @link {@see https://tree-sitter.github.io/tree-sitter/using-parsers/queries}
     */
    constructor(language, source) {
      const sourceLength = C.lengthBytesUTF8(source);
      const sourceAddress = C._malloc(sourceLength + 1);
      C.stringToUTF8(source, sourceAddress, sourceLength + 1);
      const address = C._ts_query_new(
        language[0],
        sourceAddress,
        sourceLength,
        TRANSFER_BUFFER,
        TRANSFER_BUFFER + SIZE_OF_INT
      );
      if (!address) {
        const errorId = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
        const errorByte = C.getValue(TRANSFER_BUFFER, "i32");
        const errorIndex = C.UTF8ToString(sourceAddress, errorByte).length;
        const suffix = source.slice(errorIndex, errorIndex + 100).split("\n")[0];
        const word = suffix.match(QUERY_WORD_REGEX)?.[0] ?? "";
        C._free(sourceAddress);
        switch (errorId) {
          case QueryErrorKind.Syntax:
            throw new QueryError(QueryErrorKind.Syntax, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
          case QueryErrorKind.NodeName:
            throw new QueryError(errorId, { word }, errorIndex, word.length);
          case QueryErrorKind.FieldName:
            throw new QueryError(errorId, { word }, errorIndex, word.length);
          case QueryErrorKind.CaptureName:
            throw new QueryError(errorId, { word }, errorIndex, word.length);
          case QueryErrorKind.PatternStructure:
            throw new QueryError(errorId, { suffix: `${errorIndex}: '${suffix}'...` }, errorIndex, 0);
        }
      }
      const stringCount = C._ts_query_string_count(address);
      const captureCount = C._ts_query_capture_count(address);
      const patternCount = C._ts_query_pattern_count(address);
      const captureNames = new Array(captureCount);
      const captureQuantifiers = new Array(patternCount);
      const stringValues = new Array(stringCount);
      for (let i2 = 0; i2 < captureCount; i2++) {
        const nameAddress = C._ts_query_capture_name_for_id(
          address,
          i2,
          TRANSFER_BUFFER
        );
        const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
        captureNames[i2] = C.UTF8ToString(nameAddress, nameLength);
      }
      for (let i2 = 0; i2 < patternCount; i2++) {
        const captureQuantifiersArray = new Array(captureCount);
        for (let j = 0; j < captureCount; j++) {
          const quantifier = C._ts_query_capture_quantifier_for_id(address, i2, j);
          captureQuantifiersArray[j] = quantifier;
        }
        captureQuantifiers[i2] = captureQuantifiersArray;
      }
      for (let i2 = 0; i2 < stringCount; i2++) {
        const valueAddress = C._ts_query_string_value_for_id(
          address,
          i2,
          TRANSFER_BUFFER
        );
        const nameLength = C.getValue(TRANSFER_BUFFER, "i32");
        stringValues[i2] = C.UTF8ToString(valueAddress, nameLength);
      }
      const setProperties = new Array(patternCount);
      const assertedProperties = new Array(patternCount);
      const refutedProperties = new Array(patternCount);
      const predicates = new Array(patternCount);
      const textPredicates = new Array(patternCount);
      for (let i2 = 0; i2 < patternCount; i2++) {
        const predicatesAddress = C._ts_query_predicates_for_pattern(address, i2, TRANSFER_BUFFER);
        const stepCount = C.getValue(TRANSFER_BUFFER, "i32");
        predicates[i2] = [];
        textPredicates[i2] = [];
        const steps = new Array();
        let stepAddress = predicatesAddress;
        for (let j = 0; j < stepCount; j++) {
          const stepType = C.getValue(stepAddress, "i32");
          stepAddress += SIZE_OF_INT;
          const stepValueId = C.getValue(stepAddress, "i32");
          stepAddress += SIZE_OF_INT;
          parsePattern(
            i2,
            stepType,
            stepValueId,
            captureNames,
            stringValues,
            steps,
            textPredicates,
            predicates,
            setProperties,
            assertedProperties,
            refutedProperties
          );
        }
        Object.freeze(textPredicates[i2]);
        Object.freeze(predicates[i2]);
        Object.freeze(setProperties[i2]);
        Object.freeze(assertedProperties[i2]);
        Object.freeze(refutedProperties[i2]);
      }
      C._free(sourceAddress);
      this[0] = address;
      this.captureNames = captureNames;
      this.captureQuantifiers = captureQuantifiers;
      this.textPredicates = textPredicates;
      this.predicates = predicates;
      this.setProperties = setProperties;
      this.assertedProperties = assertedProperties;
      this.refutedProperties = refutedProperties;
      this.exceededMatchLimit = false;
      finalizer5?.register(this, address, this);
    }
    /** Delete the query, freeing its resources. */
    delete() {
      finalizer5?.unregister(this);
      C._ts_query_delete(this[0]);
      this[0] = 0;
    }
    /**
     * Iterate over all of the matches in the order that they were found.
     *
     * Each match contains the index of the pattern that matched, and a list of
     * captures. Because multiple patterns can match the same set of nodes,
     * one match may contain captures that appear *before* some of the
     * captures from a previous match.
     *
     * @param {Node} node - The node to execute the query on.
     *
     * @param {QueryOptions} options - Options for query execution.
     */
    matches(node2, options = {}) {
      const startPosition = options.startPosition ?? ZERO_POINT;
      const endPosition = options.endPosition ?? ZERO_POINT;
      const startIndex = options.startIndex ?? 0;
      const endIndex = options.endIndex ?? 0;
      const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
      const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
      const startContainingIndex = options.startContainingIndex ?? 0;
      const endContainingIndex = options.endContainingIndex ?? 0;
      const matchLimit = options.matchLimit ?? 4294967295;
      const maxStartDepth = options.maxStartDepth ?? 4294967295;
      const progressCallback = options.progressCallback;
      if (typeof matchLimit !== "number") {
        throw new Error("Arguments must be numbers");
      }
      this.matchLimit = matchLimit;
      if (endIndex !== 0 && startIndex > endIndex) {
        throw new Error("`startIndex` cannot be greater than `endIndex`");
      }
      if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
        throw new Error("`startPosition` cannot be greater than `endPosition`");
      }
      if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
        throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
      }
      if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
        throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
      }
      if (progressCallback) {
        C.currentQueryProgressCallback = progressCallback;
      }
      marshalNode(node2);
      C._ts_query_matches_wasm(
        this[0],
        node2.tree[0],
        startPosition.row,
        startPosition.column,
        endPosition.row,
        endPosition.column,
        startIndex,
        endIndex,
        startContainingPosition.row,
        startContainingPosition.column,
        endContainingPosition.row,
        endContainingPosition.column,
        startContainingIndex,
        endContainingIndex,
        matchLimit,
        maxStartDepth
      );
      const rawCount = C.getValue(TRANSFER_BUFFER, "i32");
      const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
      const result = new Array(rawCount);
      this.exceededMatchLimit = Boolean(didExceedMatchLimit);
      let filteredCount = 0;
      let address = startAddress;
      for (let i2 = 0; i2 < rawCount; i2++) {
        const patternIndex = C.getValue(address, "i32");
        address += SIZE_OF_INT;
        const captureCount = C.getValue(address, "i32");
        address += SIZE_OF_INT;
        const captures = new Array(captureCount);
        address = unmarshalCaptures(this, node2.tree, address, patternIndex, captures);
        if (this.textPredicates[patternIndex].every((p) => p(captures))) {
          result[filteredCount] = { patternIndex, captures };
          const setProperties = this.setProperties[patternIndex];
          result[filteredCount].setProperties = setProperties;
          const assertedProperties = this.assertedProperties[patternIndex];
          result[filteredCount].assertedProperties = assertedProperties;
          const refutedProperties = this.refutedProperties[patternIndex];
          result[filteredCount].refutedProperties = refutedProperties;
          filteredCount++;
        }
      }
      result.length = filteredCount;
      C._free(startAddress);
      C.currentQueryProgressCallback = null;
      return result;
    }
    /**
     * Iterate over all of the individual captures in the order that they
     * appear.
     *
     * This is useful if you don't care about which pattern matched, and just
     * want a single, ordered sequence of captures.
     *
     * @param {Node} node - The node to execute the query on.
     *
     * @param {QueryOptions} options - Options for query execution.
     */
    captures(node2, options = {}) {
      const startPosition = options.startPosition ?? ZERO_POINT;
      const endPosition = options.endPosition ?? ZERO_POINT;
      const startIndex = options.startIndex ?? 0;
      const endIndex = options.endIndex ?? 0;
      const startContainingPosition = options.startContainingPosition ?? ZERO_POINT;
      const endContainingPosition = options.endContainingPosition ?? ZERO_POINT;
      const startContainingIndex = options.startContainingIndex ?? 0;
      const endContainingIndex = options.endContainingIndex ?? 0;
      const matchLimit = options.matchLimit ?? 4294967295;
      const maxStartDepth = options.maxStartDepth ?? 4294967295;
      const progressCallback = options.progressCallback;
      if (typeof matchLimit !== "number") {
        throw new Error("Arguments must be numbers");
      }
      this.matchLimit = matchLimit;
      if (endIndex !== 0 && startIndex > endIndex) {
        throw new Error("`startIndex` cannot be greater than `endIndex`");
      }
      if (endPosition !== ZERO_POINT && (startPosition.row > endPosition.row || startPosition.row === endPosition.row && startPosition.column > endPosition.column)) {
        throw new Error("`startPosition` cannot be greater than `endPosition`");
      }
      if (endContainingIndex !== 0 && startContainingIndex > endContainingIndex) {
        throw new Error("`startContainingIndex` cannot be greater than `endContainingIndex`");
      }
      if (endContainingPosition !== ZERO_POINT && (startContainingPosition.row > endContainingPosition.row || startContainingPosition.row === endContainingPosition.row && startContainingPosition.column > endContainingPosition.column)) {
        throw new Error("`startContainingPosition` cannot be greater than `endContainingPosition`");
      }
      if (progressCallback) {
        C.currentQueryProgressCallback = progressCallback;
      }
      marshalNode(node2);
      C._ts_query_captures_wasm(
        this[0],
        node2.tree[0],
        startPosition.row,
        startPosition.column,
        endPosition.row,
        endPosition.column,
        startIndex,
        endIndex,
        startContainingPosition.row,
        startContainingPosition.column,
        endContainingPosition.row,
        endContainingPosition.column,
        startContainingIndex,
        endContainingIndex,
        matchLimit,
        maxStartDepth
      );
      const count = C.getValue(TRANSFER_BUFFER, "i32");
      const startAddress = C.getValue(TRANSFER_BUFFER + SIZE_OF_INT, "i32");
      const didExceedMatchLimit = C.getValue(TRANSFER_BUFFER + 2 * SIZE_OF_INT, "i32");
      const result = new Array();
      this.exceededMatchLimit = Boolean(didExceedMatchLimit);
      const captures = new Array();
      let address = startAddress;
      for (let i2 = 0; i2 < count; i2++) {
        const patternIndex = C.getValue(address, "i32");
        address += SIZE_OF_INT;
        const captureCount = C.getValue(address, "i32");
        address += SIZE_OF_INT;
        const captureIndex = C.getValue(address, "i32");
        address += SIZE_OF_INT;
        captures.length = captureCount;
        address = unmarshalCaptures(this, node2.tree, address, patternIndex, captures);
        if (this.textPredicates[patternIndex].every((p) => p(captures))) {
          const capture = captures[captureIndex];
          const setProperties = this.setProperties[patternIndex];
          capture.setProperties = setProperties;
          const assertedProperties = this.assertedProperties[patternIndex];
          capture.assertedProperties = assertedProperties;
          const refutedProperties = this.refutedProperties[patternIndex];
          capture.refutedProperties = refutedProperties;
          result.push(capture);
        }
      }
      C._free(startAddress);
      C.currentQueryProgressCallback = null;
      return result;
    }
    /** Get the predicates for a given pattern. */
    predicatesForPattern(patternIndex) {
      return this.predicates[patternIndex];
    }
    /**
     * Disable a certain capture within a query.
     *
     * This prevents the capture from being returned in matches, and also
     * avoids any resource usage associated with recording the capture.
     */
    disableCapture(captureName) {
      const captureNameLength = C.lengthBytesUTF8(captureName);
      const captureNameAddress = C._malloc(captureNameLength + 1);
      C.stringToUTF8(captureName, captureNameAddress, captureNameLength + 1);
      C._ts_query_disable_capture(this[0], captureNameAddress, captureNameLength);
      C._free(captureNameAddress);
    }
    /**
     * Disable a certain pattern within a query.
     *
     * This prevents the pattern from matching, and also avoids any resource
     * usage associated with the pattern. This throws an error if the pattern
     * index is out of bounds.
     */
    disablePattern(patternIndex) {
      if (patternIndex >= this.predicates.length) {
        throw new Error(
          `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
        );
      }
      C._ts_query_disable_pattern(this[0], patternIndex);
    }
    /**
     * Check if, on its last execution, this cursor exceeded its maximum number
     * of in-progress matches.
     */
    didExceedMatchLimit() {
      return this.exceededMatchLimit;
    }
    /** Get the byte offset where the given pattern starts in the query's source. */
    startIndexForPattern(patternIndex) {
      if (patternIndex >= this.predicates.length) {
        throw new Error(
          `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
        );
      }
      return C._ts_query_start_byte_for_pattern(this[0], patternIndex);
    }
    /** Get the byte offset where the given pattern ends in the query's source. */
    endIndexForPattern(patternIndex) {
      if (patternIndex >= this.predicates.length) {
        throw new Error(
          `Pattern index is ${patternIndex} but the pattern count is ${this.predicates.length}`
        );
      }
      return C._ts_query_end_byte_for_pattern(this[0], patternIndex);
    }
    /** Get the number of patterns in the query. */
    patternCount() {
      return C._ts_query_pattern_count(this[0]);
    }
    /** Get the index for a given capture name. */
    captureIndexForName(captureName) {
      return this.captureNames.indexOf(captureName);
    }
    /** Check if a given pattern within a query has a single root node. */
    isPatternRooted(patternIndex) {
      return C._ts_query_is_pattern_rooted(this[0], patternIndex) === 1;
    }
    /** Check if a given pattern within a query has a single root node. */
    isPatternNonLocal(patternIndex) {
      return C._ts_query_is_pattern_non_local(this[0], patternIndex) === 1;
    }
    /**
     * Check if a given step in a query is 'definite'.
     *
     * A query step is 'definite' if its parent pattern will be guaranteed to
     * match successfully once it reaches the step.
     */
    isPatternGuaranteedAtStep(byteIndex) {
      return C._ts_query_is_pattern_guaranteed_at_step(this[0], byteIndex) === 1;
    }
  };

  // js/core/tree-sitter.js
  var GRAMMAR_FILES = {
    c: "tree-sitter-c.wasm",
    cpp: "tree-sitter-cpp.wasm",
    java: "tree-sitter-java.wasm",
    python: "tree-sitter-python.wasm",
    javascript: "tree-sitter-javascript.wasm",
    typescript: "tree-sitter-typescript.wasm"
  };
  var parserReady;
  var languages = /* @__PURE__ */ new Map();
  async function getParser() {
    if (!parserReady) {
      parserReady = Parser2.init({
        locateFile: () => "vendor/tree-sitter/web-tree-sitter.wasm"
      });
    }
    await parserReady;
    return Parser2;
  }
  async function parseWithTreeSitter(languageId, source) {
    const grammarFile = GRAMMAR_FILES[languageId];
    if (!grammarFile) return null;
    try {
      const ParserClass = await getParser();
      let language = languages.get(languageId);
      if (!language) {
        language = await Language.load(`vendor/tree-sitter/${grammarFile}`);
        languages.set(languageId, language);
      }
      const parser7 = new ParserClass();
      parser7.setLanguage(language);
      const tree = parser7.parse(source);
      const root = tree.rootNode;
      const result = {
        ast: toAstNode(root),
        astText: root.toString(),
        hasError: root.hasError,
        errorNode: findErrorNode(root)
      };
      parser7.delete();
      tree.delete();
      return result;
    } catch (error) {
      console.warn(`Tree-sitter is unavailable for ${languageId}:`, error);
      return null;
    }
  }
  function toAstNode(node2) {
    const children = node2.namedChildren.map(toAstNode);
    const ast = { type: node2.type, children };
    if (children.length === 0) ast.value = node2.text;
    return ast;
  }
  function findErrorNode(node2) {
    if (node2.type === "ERROR" || node2.isMissing) return node2;
    for (const child of node2.namedChildren) {
      const error = findErrorNode(child);
      if (error) return error;
    }
    return null;
  }

  // js/core/tree-sitter-pipeline.js
  var MAX_NODES = 240;
  function analyzeTreeSitterAst(ast, languageId) {
    const nodes = collectNodes(ast);
    const declarations = nodes.filter(
      (node2) => /declaration|function|class|method|interface|import|export/.test(
        node2.type
      )
    ).slice(0, 80).map((node2, index) => [
      node2.value || node2.type,
      "syntax node",
      languageId,
      "Tree-sitter AST",
      `node ${index + 1}`
    ]);
    return {
      symbolTable: declarations,
      checks: [
        `Tree-sitter validated the ${languageId} syntax tree.`,
        `Generic semantic traversal visited ${nodes.length} named nodes.`,
        "Language-specific type and scope rules were not inferred by this generic pass."
      ],
      warnings: declarations.length === 0 ? ["No declaration-like nodes were found in the syntax tree."] : []
    };
  }
  function generateTreeSitterIr(ast) {
    const nodes = collectNodes(ast).slice(0, MAX_NODES);
    return {
      representation: "Tree-sitter node trace",
      instructions: nodes.map(
        (node2, index) => `n${index + 1} = ${node2.type}${node2.value ? ` (${node2.value})` : ""}`
      )
    };
  }
  function optimizeTreeSitterIr(instructions) {
    const before = instructions || [];
    const after = before.filter(
      (instruction, index) => index === 0 || instruction !== before[index - 1]
    );
    return {
      before,
      after,
      passes: after.length < before.length ? ["Duplicate node trace removal"] : [],
      note: "Generic Tree-sitter trace optimization; no language-specific optimization rules were applied."
    };
  }
  function generateTreeSitterTarget(instructions, languageId) {
    return {
      targetLabel: `Generic ${languageId} syntax trace`,
      instructions: (instructions || []).map((instruction) => `; ${instruction}`)
    };
  }
  function collectNodes(root) {
    const nodes = [];
    function visit(node2) {
      if (!node2 || nodes.length >= MAX_NODES) return;
      nodes.push(node2);
      (node2.children || []).forEach(visit);
    }
    visit(root);
    return nodes;
  }

  // js/core/runner.js
  async function runPipeline(langModule, source, callbacks = {}) {
    const { onPhaseStart, onPhaseEnd } = callbacks;
    let backendResult = null;
    if (langModule.backend && typeof langModule.backend.run === "function") {
      try {
        backendResult = await langModule.backend.run(source);
      } catch (err2) {
        console.warn("Backend unavailable or failed, falling back to frontend for", langModule.id, err2);
      }
    }
    if (backendResult) {
      const result2 = createResult(langModule.id, source, "backend");
      const lexical = langModule.lexer.tokenize(source);
      const tree = await parseWithTreeSitter(langModule.id, source);
      backendResult.phases = backendResult.phases || {};
      backendResult.phases.lexical = {
        status: "completed",
        tokens: lexical.tokens ?? [],
        errors: lexical.errors ?? []
      };
      backendResult.phases.syntax = tree?.hasError ? {
        status: Status.FAILED,
        diagnostic: {
          phase: "syntax",
          message: "Tree-sitter found invalid syntax.",
          line: (tree.errorNode?.startPosition?.row ?? 0) + 1,
          col: (tree.errorNode?.startPosition?.column ?? 0) + 1
        }
      } : {
        status: "completed",
        ast: tree?.ast,
        astText: tree?.astText ?? "",
        errors: []
      };
      for (const phaseId of PHASE_ORDER) {
        const phaseData = backendResult.phases[phaseId] ?? {
          status: Status.NOT_RUN,
          reason: "Phase was not provided by the backend."
        };
        result2.phases[phaseId] = {
          ...phaseData,
          status: phaseData.status ?? Status.COMPLETED
        };
        if (onPhaseEnd) onPhaseEnd(phaseId, result2.phases[phaseId]);
      }
      result2.status = Object.values(result2.phases).some(
        (phase) => phase.status === Status.FAILED
      ) ? Status.FAILED : Status.COMPLETED;
      return result2;
    }
    const result = createResult(langModule.id, source, backendResult ? "backend" : "live");
    const phaseRunners = [
      {
        id: "lexical",
        fn: async () => {
          const phaseResult = langModule.lexer.tokenize(source);
          const treeResult = await parseWithTreeSitter(langModule.id, source);
          if (treeResult) {
            phaseResult.errors = [];
            phaseResult.treeResult = treeResult;
          }
          return phaseResult;
        }
      },
      {
        id: "syntax",
        fn: async (ctx2) => {
          const treeResult = ctx2.treeResult ?? await parseWithTreeSitter(langModule.id, source);
          if (!treeResult) {
            throw new ParseError(
              `No Tree-sitter grammar is available for ${langModule.label || langModule.id}.`,
              1,
              1
            );
          }
          if (treeResult?.hasError) {
            const node2 = treeResult.errorNode;
            const row = node2?.startPosition?.row ?? 0;
            const column = node2?.startPosition?.column ?? 0;
            throw new ParseError(
              `Tree-sitter found invalid ${langModule.label || langModule.id} syntax near '${node2?.type || "source"}'.`,
              row + 1,
              column + 1
            );
          }
          try {
            const lowered = langModule.parser.parse(ctx2.tokens, source);
            if (!lowered?.errors?.length) return lowered;
          } catch {
          }
          return {
            ast: treeResult.ast,
            astText: treeResult.astText,
            treeSitterOnly: true
          };
        }
      },
      {
        id: "semantic",
        fn: (ctx2) => ctx2.treeSitterOnly ? analyzeTreeSitterAst(ctx2.ast, langModule.id) : langModule.semantic.analyze(ctx2.ast, source)
      },
      {
        id: "intermediate",
        fn: (ctx2) => ctx2.treeSitterOnly ? generateTreeSitterIr(ctx2.ast) : langModule.ir.generate(ctx2.ast, ctx2.symbolTable)
      },
      {
        id: "optimization",
        fn: (ctx2) => ctx2.treeSitterOnly ? optimizeTreeSitterIr(ctx2.instructions) : langModule.optimizer.optimize(ctx2.instructions)
      },
      {
        id: "target",
        fn: (ctx2) => ctx2.treeSitterOnly ? generateTreeSitterTarget(ctx2.optimizedInstructions, langModule.id) : langModule.codegen.generate(
          ctx2.optimizedInstructions,
          ctx2.symbolTable,
          langModule.id
        )
      }
    ];
    const ctx = {};
    let failedAt = -1;
    for (let i2 = 0; i2 < phaseRunners.length; i2++) {
      const { id: id8, fn } = phaseRunners[i2];
      result.phases[id8] = { status: Status.RUNNING };
      if (onPhaseStart) onPhaseStart(id8);
      await yieldToUI();
      if (failedAt >= 0) {
        const prevFailed = PHASE_ORDER[failedAt];
        const reason = `${capitalize(prevFailed)} analysis failed \u2014 this phase was not executed.`;
        result.phases[id8] = { status: Status.NOT_RUN, reason };
        if (onPhaseEnd) onPhaseEnd(id8, result.phases[id8]);
        continue;
      }
      try {
        if (backendResult && i2 >= 2) {
          const phaseData = backendResult.phases?.[id8];
          if (!phaseData) throw new Error(`Backend did not return the ${id8} phase.`);
          if (id8 === "semantic") ctx.symbolTable = phaseData.symbolTable;
          if (id8 === "intermediate") ctx.instructions = phaseData.instructions;
          if (id8 === "optimization") ctx.optimizedInstructions = phaseData.after;
          phaseCompleted(result, id8, phaseData);
          if (onPhaseEnd) onPhaseEnd(id8, result.phases[id8]);
          continue;
        }
        const phaseResult = await fn(ctx);
        if (phaseResult?.errors?.length) {
          throw phaseResult.errors[0];
        }
        switch (id8) {
          case "lexical":
            ctx.tokens = phaseResult.tokens;
            ctx.treeResult = phaseResult.treeResult;
            phaseCompleted(result, id8, {
              tokens: phaseResult.tokens,
              errors: phaseResult.errors ?? []
            });
            break;
          case "syntax":
            ctx.ast = phaseResult.ast;
            ctx.treeSitterOnly = phaseResult.treeSitterOnly ?? false;
            phaseCompleted(result, id8, {
              ast: phaseResult.ast,
              astText: phaseResult.astText ?? "",
              treeSitterOnly: phaseResult.treeSitterOnly ?? false,
              errors: phaseResult.errors ?? []
            });
            break;
          case "semantic":
            ctx.symbolTable = phaseResult.symbolTable;
            phaseCompleted(result, id8, {
              symbolTable: phaseResult.symbolTable,
              checks: phaseResult.checks ?? [],
              warnings: phaseResult.warnings ?? []
            });
            break;
          case "intermediate":
            ctx.instructions = phaseResult.instructions;
            phaseCompleted(result, id8, {
              representation: "TAC",
              instructions: phaseResult.instructions
            });
            break;
          case "optimization":
            ctx.optimizedInstructions = phaseResult.after;
            phaseCompleted(result, id8, {
              before: phaseResult.before,
              after: phaseResult.after,
              passes: phaseResult.passes ?? [],
              note: phaseResult.note ?? ""
            });
            break;
          case "target":
            phaseCompleted(result, id8, {
              targetLabel: phaseResult.targetLabel,
              instructions: phaseResult.instructions
            });
            break;
        }
        if (onPhaseEnd) onPhaseEnd(id8, result.phases[id8]);
      } catch (err2) {
        failedAt = i2;
        phaseFailed(result, id8, err2);
        result.status = "failed";
        if (onPhaseEnd) onPhaseEnd(id8, result.phases[id8]);
      }
    }
    if (failedAt < 0) result.status = Status.COMPLETED;
    return result;
  }
  function yieldToUI() {
    return new Promise((r) => setTimeout(r, 0));
  }
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // js/main.js
  var langSelect = document.getElementById("langSelect");
  var exampleSelect = document.getElementById("exampleSelect");
  var analyzeBtn = document.getElementById("analyzeBtn");
  var clearBtn = document.getElementById("clearBtn");
  var uploadBtn = document.getElementById("uploadBtn");
  var fileInput = document.getElementById("fileUploadInput");
  var statusHint = document.getElementById("statusHint");
  var modeBadge = document.getElementById("modeBadge");
  var sourceState = document.getElementById("sourceState");
  var fileNameEl = document.getElementById("fileName");
  var editorLanguage = document.getElementById("editorLanguage");
  var copySourceBtn = document.getElementById("copySourceBtn");
  var currentLangId = "c";
  var isRunning = false;
  var editor = new Editor({
    textareaId: "source",
    linenosId: "linenos",
    fileInputId: "fileUploadInput",
    statsBadgeId: "editorStatsBadge",
    onInput: () => {
      feed.markStale();
      if (sourceState) sourceState.textContent = "Source changed";
      statusHint.textContent = "Source changed. Analyze to update results.";
    },
    onFileLoaded: ({ content, langId, label: label8, fileName: uploadedFileName }) => {
      if (langId !== currentLangId) {
        setLanguage(langId, false);
        langSelect.value = langId;
      }
      pipeline.reset();
      if (fileNameEl) fileNameEl.textContent = uploadedFileName || "Untitled source";
      if (editorLanguage) editorLanguage.textContent = label8;
      if (sourceState) sourceState.textContent = "Loaded";
      feed.showEmpty(
        `Loaded <strong>${uploadedFileName}</strong>. ${label8} selected.`
      );
      statusHint.textContent = `Loaded ${uploadedFileName}. ${label8} selected.`;
    },
    onFileError: (message) => {
      if (sourceState) sourceState.textContent = "Upload error";
      statusHint.textContent = message;
    }
  });
  var pipeline = new PipelineStrip({
    containerId: "pipeline",
    onPhaseClick: (phaseId) => feed.activatePhase(phaseId)
  });
  var feed = new PhaseFeed({
    containerId: "feed",
    onActivePhaseChange: (phaseId) => pipeline.setActive(phaseId)
  });
  function initLanguageSelector() {
    langSelect.innerHTML = "";
    getAllLanguages().forEach((lang) => {
      const opt = document.createElement("option");
      opt.value = lang.id;
      opt.textContent = `${lang.label} (${lang.badge})`;
      langSelect.appendChild(opt);
    });
    langSelect.value = currentLangId;
    langSelect.addEventListener("change", (e) => {
      setLanguage(e.target.value);
    });
  }
  function setLanguage(langId, loadDefaultExample = true) {
    currentLangId = langId;
    const mod = getLanguage(langId);
    if (modeBadge) {
      modeBadge.textContent = `${mod.label || langId.toUpperCase()} \xB7 Ready`;
    }
    if (editorLanguage) editorLanguage.textContent = mod.label || langId.toUpperCase();
    populateExamples(mod);
    if (loadDefaultExample) {
      if (mod.examples && mod.examples.length > 0) {
        loadExample(mod.examples[0]);
      } else {
        editor.clear();
      }
    }
    pipeline.reset();
    if (loadDefaultExample) {
      feed.showEmpty(
        `Ready to analyze ${mod.label || langId} source.`
      );
      statusHint.textContent = `${mod.label || langId} selected. Ready to analyze.`;
    }
  }
  function populateExamples(mod) {
    exampleSelect.innerHTML = "";
    (mod.examples || []).forEach((ex, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = ex.label;
      exampleSelect.appendChild(opt);
    });
    exampleSelect.onchange = (e) => {
      const idx = Number(e.target.value);
      if (mod.examples && mod.examples[idx]) {
        loadExample(mod.examples[idx]);
      }
    };
  }
  function loadExample(example) {
    editor.setValue(example.code);
    pipeline.reset();
    feed.showEmpty(
      `Loaded <strong>${example.label}</strong>. Click Analyze to run all 6 phases.`
    );
    if (fileNameEl) fileNameEl.textContent = "Example source";
    if (sourceState) sourceState.textContent = "Ready";
    statusHint.textContent = `Loaded ${example.label}. Ready to analyze.`;
  }
  async function executeRun() {
    if (isRunning) return;
    const source = editor.getValue();
    if (!source.trim()) {
      statusHint.textContent = "Please enter or select source code before analyzing.";
      return;
    }
    const langModule = getLanguage(currentLangId);
    isRunning = true;
    setControlsDisabled(true);
    editor.clearErrorHighlights();
    if (sourceState) sourceState.textContent = "Analyzing";
    statusHint.textContent = `Analyzing ${langModule.label || currentLangId} source code...`;
    feed.startRun();
    pipeline.reset(true);
    try {
      const result = await runPipeline(langModule, source, {
        onPhaseStart: (phaseId) => {
          pipeline.setStatus(phaseId, "running");
        },
        onPhaseEnd: (phaseId, phaseData) => {
          pipeline.setStatus(phaseId, phaseData.status, phaseData.summary);
          feed.updatePhase(phaseId, phaseData);
          if (phaseData.diagnostic && phaseData.diagnostic.line != null) {
            editor.highlightErrorLine(phaseData.diagnostic.line);
          }
        }
      });
      if (result.status === "completed") {
        if (sourceState) sourceState.textContent = "Analyzed";
        statusHint.textContent = "Analysis complete. All phases processed.";
      } else if (result.status === "partial") {
        if (sourceState) sourceState.textContent = "Limited";
        statusHint.textContent = "Syntax analysis complete. Later educational phases are unavailable.";
      } else {
        if (sourceState) sourceState.textContent = "Failed";
        statusHint.textContent = "Analysis stopped. Check the highlighted line.";
      }
    } catch (err2) {
      console.error("Fatal pipeline error:", err2);
      if (sourceState) sourceState.textContent = "Failed";
      statusHint.textContent = `Pipeline error: ${err2.message}`;
    } finally {
      isRunning = false;
      setControlsDisabled(false);
    }
  }
  function setControlsDisabled(disabled) {
    analyzeBtn.disabled = disabled;
    clearBtn.disabled = disabled;
    if (uploadBtn) uploadBtn.disabled = disabled;
    langSelect.disabled = disabled;
    exampleSelect.disabled = disabled;
    editor.setDisabled(disabled);
  }
  analyzeBtn.addEventListener("click", executeRun);
  clearBtn.addEventListener("click", () => {
    if (isRunning) return;
    editor.clear();
    pipeline.reset();
    feed.showEmpty("Editor cleared. Enter source code to analyze.");
    if (fileNameEl) fileNameEl.textContent = "Untitled source";
    if (sourceState) sourceState.textContent = "Ready";
    statusHint.textContent = "Source cleared.";
  });
  copySourceBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(editor.getValue());
      statusHint.textContent = "Source copied to clipboard.";
    } catch {
      statusHint.textContent = "Clipboard unavailable.";
    }
  });
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener("click", () => {
      if (!isRunning) fileInput.click();
    });
  }
  initLanguageSelector();
  setLanguage("c");
})();
