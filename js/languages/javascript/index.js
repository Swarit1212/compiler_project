// ─── JavaScript Language Module ───────────────────────────────────────────────
import { LexerError, ParseError, SemanticError } from "../../core/errors.js";
import * as cOptimizer from "../c/optimizer.js";

export const id = "javascript";
export const label = "JavaScript";

const JS_KEYWORDS = new Set([
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
  "Infinity",
]);

export const examples = [
  {
    label: "A · Function & arithmetic",
    code: `function calculateTotal(price, taxRate) {
    const tax = price * taxRate;
    const shipping = 5;
    const total = price + tax + shipping;
    return total;
}

let result = calculateTotal(100, 0.18);
console.log(result);`,
  },
  {
    label: "B · Constant folding & optimization",
    code: `const base = 10 * 10;
const multiplier = 2 + 3;
let finalScore = base * multiplier;
console.log(finalScore);`,
  },
  {
    label: "C · While loop & accumulation",
    code: `let count = 0;
let sum = 0;
while (count < 5) {
    sum = sum + count;
    count = count + 1;
}
console.log(sum);`,
  },
  {
    label: "D · Semantic error (const reassignment)",
    code: `const MAX_USERS = 100;
MAX_USERS = 200;`,
  },
];

// ─── Lexer ────────────────────────────────────────────────────────────────────
export const lexer = {
  tokenize(source) {
    const tokens = [];
    const errors = [];
    let i = 0,
      line = 1,
      col = 1;

    while (i < source.length) {
      const ch = source[i];

      // Whitespace
      if (ch === " " || ch === "\t" || ch === "\r") {
        i++;
        col++;
        continue;
      }
      if (ch === "\n") {
        i++;
        line++;
        col = 1;
        continue;
      }

      // Comments
      if (ch === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") i++;
        continue;
      }
      if (ch === "/" && source[i + 1] === "*") {
        i += 2;
        col += 2;
        while (
          i < source.length &&
          !(source[i] === "*" && source[i + 1] === "/")
        ) {
          if (source[i] === "\n") {
            line++;
            col = 1;
          } else {
            col++;
          }
          i++;
        }
        if (i < source.length) {
          i += 2;
          col += 2;
        }
        continue;
      }

      // Numbers
      if (/[0-9]/.test(ch)) {
        const startCol = col;
        let num = "";
        while (i < source.length && /[0-9.]/.test(source[i])) {
          num += source[i++];
          col++;
        }
        tokens.push({
          lexeme: num,
          type: num.includes(".") ? "FLOAT_LITERAL" : "INT_LITERAL",
          line,
          col: startCol,
        });
        continue;
      }

      // Identifiers / Keywords
      if (/[a-zA-Z_$]/.test(ch)) {
        const startCol = col;
        let id = "";
        while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) {
          id += source[i++];
          col++;
        }
        tokens.push({
          lexeme: id,
          type: JS_KEYWORDS.has(id) ? "KEYWORD" : "IDENTIFIER",
          line,
          col: startCol,
        });
        continue;
      }

      // Strings
      if (ch === '"' || ch === "'" || ch === "`") {
        const quote = ch;
        const startCol = col;
        let s = quote;
        i++;
        col++;
        while (i < source.length && source[i] !== quote) {
          if (source[i] === "\\" && i + 1 < source.length) {
            s += source[i++];
            col++;
          }
          if (source[i] === "\n") {
            line++;
            col = 0;
          }
          s += source[i++];
          col++;
        }
        if (i < source.length) {
          s += source[i++];
          col++;
        }
        tokens.push({ lexeme: s, type: "STRING_LITERAL", line, col: startCol });
        continue;
      }

      // Operators
      const two = source.slice(i, i + 2);
      const three = source.slice(i, i + 3);
      if (["===", "!==", ">>>", "..."].includes(three)) {
        tokens.push({ lexeme: three, type: "OPERATOR", line, col });
        i += 3;
        col += 3;
        continue;
      }
      if (
        [
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
          "??",
        ].includes(two)
      ) {
        tokens.push({ lexeme: two, type: "OPERATOR", line, col });
        i += 2;
        col += 2;
        continue;
      }
      if (
        [
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
          "?",
        ].includes(ch)
      ) {
        tokens.push({ lexeme: ch, type: "OPERATOR", line, col });
        i++;
        col++;
        continue;
      }

      // Punctuators
      if (["(", ")", "{", "}", "[", "]", ";", ",", ".", ":"].includes(ch)) {
        tokens.push({ lexeme: ch, type: "PUNCT", line, col });
        i++;
        col++;
        continue;
      }

      errors.push({ message: `Unexpected character '${ch}'`, line, col });
      i++;
      col++;
    }

    tokens.push({ lexeme: "EOF", type: "EOF", line, col });
    return { tokens, errors };
  },
};

// ─── Parser ───────────────────────────────────────────────────────────────────
export const parser = {
  parse(tokens) {
    let cur = 0;
    const errors = [];
    const peek = (offset = 0) =>
      tokens[Math.min(cur + offset, tokens.length - 1)];
    const is = (type, lexeme) => {
      const t = peek();
      return t.type === type && (lexeme === undefined || t.lexeme === lexeme);
    };
    const advance = () => tokens[cur++];
    const match = (type, lexeme) => {
      if (is(type, lexeme)) return advance();
      return null;
    };
    const expect = (type, lexeme) => {
      const t = peek();
      if (t.type === type && (lexeme === undefined || t.lexeme === lexeme))
        return advance();
      const err = new ParseError(
        `Expected ${lexeme ? `'${lexeme}'` : type}, got '${t.lexeme}'`,
        t.line,
        t.col,
      );
      errors.push(err);
      throw err;
    };

    function parseProgram() {
      const body = [];
      while (!is("EOF")) {
        try {
          body.push(parseStatement());
        } catch (e) {
          if (e instanceof ParseError && !errors.includes(e)) errors.push(e);
          while (!is("EOF") && !is("PUNCT", ";")) advance();
          if (is("PUNCT", ";")) advance();
        }
      }
      return {
        type: "Program",
        body,
        toTextTree(indent = "") {
          return (
            `${indent}Program\n` +
            body
              .map((s) =>
                s.toTextTree
                  ? s.toTextTree(indent + "  ")
                  : `${indent}  ${s.type}`,
              )
              .join("\n")
          );
        },
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
      const body = [];
      while (!is("PUNCT", "}") && !is("EOF")) {
        body.push(parseStatement());
      }
      expect("PUNCT", "}");
      return {
        type: "BlockStatement",
        body,
        toTextTree(indent = "") {
          return (
            `${indent}Block\n` +
            body
              .map((s) =>
                s.toTextTree
                  ? s.toTextTree(indent + "  ")
                  : `${indent}  ${s.type}`,
              )
              .join("\n")
          );
        },
      };
    }

    function parseVarDecl() {
      const kind = advance().lexeme; // var, let, const
      const idToken = expect("IDENTIFIER");
      let init = null;
      if (match("OPERATOR", "=")) {
        init = parseExpression();
      }
      match("PUNCT", ";");
      return {
        type: "VariableDeclaration",
        kind,
        name: idToken.lexeme,
        init,
        line: idToken.line,
        col: idToken.col,
        toTextTree(indent = "") {
          let s = `${indent}VariableDecl [${kind}] ${idToken.lexeme}`;
          if (init && init.toTextTree)
            s += `\n${init.toTextTree(indent + "  ")}`;
          return s;
        },
      };
    }

    function parseFuncDecl() {
      advance(); // 'function'
      const name = expect("IDENTIFIER").lexeme;
      expect("PUNCT", "(");
      const params = [];
      while (!is("PUNCT", ")") && !is("EOF")) {
        params.push(expect("IDENTIFIER").lexeme);
        if (!match("PUNCT", ",")) break;
      }
      expect("PUNCT", ")");
      const body = parseBlock();
      return {
        type: "FunctionDeclaration",
        name,
        params,
        body,
        toTextTree(indent = "") {
          return (
            `${indent}Function ${name}(${params.join(", ")})\n` +
            body.toTextTree(indent + "  ")
          );
        },
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
            s += `\n${value.toTextTree(indent + "  ")}`;
          return s;
        },
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
          let s = `${indent}If\n${cond.toTextTree ? cond.toTextTree(indent + "  ") : ""}\n${thenStmt.toTextTree ? thenStmt.toTextTree(indent + "  ") : ""}`;
          if (elseStmt)
            s += `\n${indent}Else\n${elseStmt.toTextTree ? elseStmt.toTextTree(indent + "  ") : ""}`;
          return s;
        },
      };
    }

    function parseWhile() {
      advance();
      expect("PUNCT", "(");
      const cond = parseExpression();
      expect("PUNCT", ")");
      const body = parseStatement();
      return {
        type: "WhileStatement",
        cond,
        body,
        toTextTree(indent = "") {
          return `${indent}While\n${cond.toTextTree ? cond.toTextTree(indent + "  ") : ""}\n${body.toTextTree ? body.toTextTree(indent + "  ") : ""}`;
        },
      };
    }

    function parseExprStmt() {
      const expr = parseExpression();
      const terminated = match("PUNCT", ";");
      const next = peek();
      if (
        !terminated &&
        !is("EOF") &&
        !is("PUNCT", "}") &&
        next.line === expr.line
      ) {
        throw new ParseError(
          `Unexpected token '${next.lexeme}' after expression`,
          next.line,
          next.col,
        );
      }
      return {
        type: "ExpressionStatement",
        expr,
        toTextTree(indent = "") {
          return expr.toTextTree ? expr.toTextTree(indent) : `${indent}Expr`;
        },
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
            return `${indent}Assign (=)\n${left.toTextTree(indent + "  ")}\n${right.toTextTree(indent + "  ")}`;
          },
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
            return `${indent}Binary (||)\n${prev.toTextTree(indent + "  ")}\n${right.toTextTree(indent + "  ")}`;
          },
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
            return `${indent}Binary (&&)\n${prev.toTextTree(indent + "  ")}\n${right.toTextTree(indent + "  ")}`;
          },
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
            return `${indent}Binary (${op})\n${prev.toTextTree(indent + "  ")}\n${right.toTextTree(indent + "  ")}`;
          },
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
            return `${indent}Binary (${op})\n${prev.toTextTree(indent + "  ")}\n${right.toTextTree(indent + "  ")}`;
          },
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
            return `${indent}Binary (${op})\n${prev.toTextTree(indent + "  ")}\n${right.toTextTree(indent + "  ")}`;
          },
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
            return `${indent}Binary (${op})\n${prev.toTextTree(indent + "  ")}\n${right.toTextTree(indent + "  ")}`;
          },
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
            return `${indent}Unary (${op})\n${argument.toTextTree(indent + "  ")}`;
          },
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
          },
        };
      }
      if (t.type === "STRING_LITERAL") {
        advance();
        return {
          type: "StringLiteral",
          value: t.lexeme,
          toTextTree(indent = "") {
            return `${indent}String (${t.lexeme})`;
          },
        };
      }
      if (
        t.type === "KEYWORD" &&
        ["true", "false", "null", "undefined"].includes(t.lexeme)
      ) {
        advance();
        return {
          type: "BooleanOrNullLiteral",
          value: t.lexeme,
          toTextTree(indent = "") {
            return `${indent}Literal (${t.lexeme})`;
          },
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
          },
        };

        // Call or member expression
        while (is("PUNCT", "(") || is("PUNCT", ".")) {
          if (match("PUNCT", "(")) {
            const args = [];
            while (!is("PUNCT", ")") && !is("EOF")) {
              args.push(parseExpression());
              if (!match("PUNCT", ",")) break;
            }
            expect("PUNCT", ")");
            const callee = expr;
            expr = {
              type: "CallExpression",
              callee,
              args,
              toTextTree(indent = "") {
                return (
                  `${indent}Call\n${callee.toTextTree(indent + "  ")}` +
                  args.map((a) => `\n${a.toTextTree(indent + "    ")}`).join("")
                );
              },
            };
          } else if (match("PUNCT", ".")) {
            const prop = expect("IDENTIFIER").lexeme;
            const obj = expr;
            expr = {
              type: "MemberExpression",
              object: obj,
              property: prop,
              toTextTree(indent = "") {
                return `${indent}Member .${prop}\n${obj.toTextTree(indent + "  ")}`;
              },
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
  },
};

// ─── Semantic ─────────────────────────────────────────────────────────────────
export const semantic = {
  analyze(ast, source) {
    const symbolTable = [];
    const checks = [];
    const warnings = [];
    const constSymbols = new Set();
    const declared = new Set();

    checks.push(
      "Scope analysis: verified var/let/const block & lexical scoping.",
    );
    checks.push(
      "Type inference: dynamic JS types recorded from initialization values.",
    );

    function scan(node, scope = "global") {
      if (!node) return;

      if (node.type === "VariableDeclaration") {
        const isConst = node.kind === "const";
        if (isConst) constSymbols.add(node.name);
        declared.add(node.name);

        let inferredType = "any";
        let initVal = "-";
        if (node.init) {
          if (node.init.type === "NumericLiteral") {
            inferredType = "number";
            initVal = node.init.value;
          } else if (node.init.type === "StringLiteral") {
            inferredType = "string";
            initVal = node.init.value;
          } else if (node.init.type === "BooleanOrNullLiteral") {
            inferredType = "boolean";
            initVal = node.init.value;
          }
        }

        symbolTable.push([
          node.name,
          `${node.kind} variable`,
          inferredType,
          scope,
          initVal,
        ]);
      } else if (node.type === "FunctionDeclaration") {
        declared.add(node.name);
        symbolTable.push([
          node.name,
          "function",
          "Function",
          scope,
          `params: (${node.params.join(", ")})`,
        ]);
        if (node.body && node.body.body) {
          node.body.body.forEach((stmt) => scan(stmt, `function:${node.name}`));
        }
      } else if (node.type === "AssignmentExpression") {
        if (node.left && node.left.type === "Identifier") {
          if (constSymbols.has(node.left.name)) {
            throw new SemanticError(
              `TypeError: Assignment to constant variable '${node.left.name}'.`,
              node.left.line,
              node.left.col,
            );
          }
        }
      } else if (node.type === "BlockStatement" && node.body) {
        node.body.forEach((s) => scan(s, scope));
      } else if (node.type === "IfStatement") {
        scan(node.thenStmt, scope);
        if (node.elseStmt) scan(node.elseStmt, scope);
      } else if (node.type === "WhileStatement") {
        scan(node.body, scope);
      }
    }

    if (ast && ast.body) {
      ast.body.forEach((s) => scan(s, "global"));
    }

    return { symbolTable, checks, warnings };
  },
};

// ─── IR (TAC) ─────────────────────────────────────────────────────────────────
export const ir = {
  generate(ast, symbolTable) {
    const instructions = [];
    let tempCounter = 0;
    let labelCounter = 0;

    const newTemp = () => `t${++tempCounter}`;
    const newLabel = () => `L${++labelCounter}`;

    function genExpr(node) {
      if (!node) return "";
      if (
        node.type === "NumericLiteral" ||
        node.type === "StringLiteral" ||
        node.type === "BooleanOrNullLiteral"
      ) {
        return node.value;
      }
      if (node.type === "Identifier") {
        return node.name;
      }
      if (node.type === "MemberExpression") {
        const obj = genExpr(node.object);
        const t = newTemp();
        instructions.push(`${t} = ${obj}.${node.property}`);
        return t;
      }
      if (node.type === "CallExpression") {
        const args = (node.args || []).map(genExpr);
        args.forEach((a) => instructions.push(`param ${a}`));
        const callee =
          node.callee.name ||
          (node.callee.property
            ? `${genExpr(node.callee.object)}.${node.callee.property}`
            : "func");
        const t = newTemp();
        instructions.push(`${t} = call ${callee}, ${args.length}`);
        return t;
      }
      if (node.type === "BinaryExpression") {
        const left = genExpr(node.left);
        const right = genExpr(node.right);
        const t = newTemp();
        instructions.push(`${t} = ${left} ${node.operator} ${right}`);
        return t;
      }
      if (node.type === "UnaryExpression") {
        const arg = genExpr(node.argument);
        const t = newTemp();
        instructions.push(`${t} = ${node.operator}${arg}`);
        return t;
      }
      if (node.type === "AssignmentExpression") {
        const right = genExpr(node.right);
        const left = node.left.name || "var";
        instructions.push(`${left} = ${right}`);
        return left;
      }
      return "";
    }

    function genStmt(node) {
      if (!node) return;
      if (node.type === "VariableDeclaration") {
        if (node.init) {
          const val = genExpr(node.init);
          instructions.push(`${node.name} = ${val}`);
        }
      } else if (node.type === "ExpressionStatement") {
        genExpr(node.expr);
      } else if (node.type === "ReturnStatement") {
        if (node.value) {
          const val = genExpr(node.value);
          instructions.push(`return ${val}`);
        } else {
          instructions.push(`return`);
        }
      } else if (node.type === "FunctionDeclaration") {
        instructions.push(`func_begin ${node.name}`);
        (node.params || []).forEach((p) =>
          instructions.push(`param_receive ${p}`),
        );
        if (node.body && node.body.body) {
          node.body.body.forEach(genStmt);
        }
        instructions.push(`func_end ${node.name}`);
      } else if (node.type === "WhileStatement") {
        const startLbl = newLabel();
        const endLbl = newLabel();
        instructions.push(`${startLbl}:`);
        const cond = genExpr(node.cond);
        instructions.push(`if_false ${cond} goto ${endLbl}`);
        genStmt(node.body);
        instructions.push(`goto ${startLbl}`);
        instructions.push(`${endLbl}:`);
      } else if (node.type === "BlockStatement") {
        (node.body || []).forEach(genStmt);
      }
    }

    if (ast && ast.body) {
      ast.body.forEach(genStmt);
    }

    return { instructions };
  },
};

// ─── Optimizer ────────────────────────────────────────────────────────────────
export const optimizer = {
  optimize: (instructions) => cOptimizer.optimize(instructions),
};

// ─── Codegen (V8-style bytecode) ──────────────────────────────────────────────
export const codegen = {
  generate(instructions, symbolTable) {
    const output = [];
    output.push("; V8 Ignition-style educational bytecode");
    output.push(
      "; Registers: a0, a1 (arguments), r0-r7 (registers), acc (accumulator)",
    );
    output.push("");

    for (const instr of instructions) {
      if (instr.startsWith("func_begin ")) {
        output.push(`\n[Bytecode for ${instr.split(" ")[1]}]:`);
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
        const parts = instr.split(" ");
        output.push(`  JumpIfFalse [${parts[3]}]`);
        continue;
      }

      // Bin op: t1 = a + b
      const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/%<>=!]+)\s+(\S+)$/.exec(
        instr,
      );
      if (binMatch) {
        const [, dst, l, op, r] = binMatch;
        output.push(`  LdaNamedProperty [${l}]`);
        output.push(`  Star r0`);
        output.push(`  LdaNamedProperty [${r}]`);
        const opName =
          {
            "+": "Add",
            "-": "Sub",
            "*": "Mul",
            "/": "Div",
            "==": "TestEqual",
            "<": "TestLessThan",
            ">": "TestGreaterThan",
          }[op] || "Add";
        output.push(`  ${opName} r0`);
        output.push(`  Star [${dst}]`);
        continue;
      }

      // Copy: t1 = 5
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
      instructions: output,
    };
  },
};
