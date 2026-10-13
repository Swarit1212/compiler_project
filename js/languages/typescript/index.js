// ─── TypeScript Language Module ───────────────────────────────────────────────
import { LexerError, ParseError, SemanticError } from '../../core/errors.js';
import * as cOptimizer from '../c/optimizer.js';

export const id = 'typescript';
export const label = 'TypeScript';

const TS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'while', 'for',
  'type', 'interface', 'implements', 'enum', 'as', 'any', 'number', 'string',
  'boolean', 'void', 'never', 'unknown', 'readonly', 'public', 'private',
  'protected', 'class', 'extends', 'super', 'this', 'new', 'import', 'export',
  'true', 'false', 'null', 'undefined'
]);

export const examples = [
  {
    label: 'A · Typed function & arithmetic',
    code: `function computeDiscount(price: number, rate: number): number {
    const discount: number = price * rate;
    const finalPrice: number = price - discount;
    return finalPrice;
}

const itemTotal: number = computeDiscount(250, 0.2);
console.log(itemTotal);`
  },
  {
    label: 'B · Interface contract & usage',
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
    label: 'C · Type error (Type mismatch)',
    code: `const port: number = 8080;
const host: string = 127001;`
  },
  {
    label: 'D · Constant folding optimization',
    code: `const width: number = 10 * 4;
const height: number = 5 + 5;
const area: number = width * height;`
  }
];

// ─── Lexer ────────────────────────────────────────────────────────────────────
export const lexer = {
  tokenize(source) {
    const tokens = [];
    const errors = [];
    let i = 0, line = 1, col = 1;

    while (i < source.length) {
      const ch = source[i];

      if (ch === ' ' || ch === '\t' || ch === '\r') {
        i++; col++; continue;
      }
      if (ch === '\n') {
        i++; line++; col = 1; continue;
      }

      if (ch === '/' && source[i + 1] === '/') {
        while (i < source.length && source[i] !== '\n') i++;
        continue;
      }

      if (/[0-9]/.test(ch)) {
        const startCol = col;
        let num = '';
        while (i < source.length && /[0-9.]/.test(source[i])) {
          num += source[i++]; col++;
        }
        tokens.push({
          lexeme: num,
          type: num.includes('.') ? 'FLOAT_LITERAL' : 'INT_LITERAL',
          line, col: startCol
        });
        continue;
      }

      if (/[a-zA-Z_$]/.test(ch)) {
        const startCol = col;
        let id = '';
        while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) {
          id += source[i++]; col++;
        }
        tokens.push({
          lexeme: id,
          type: TS_KEYWORDS.has(id) ? 'KEYWORD' : 'IDENTIFIER',
          line, col: startCol
        });
        continue;
      }

      if (ch === '"' || ch === '\'' || ch === '`') {
        const quote = ch;
        const startCol = col;
        let s = quote;
        i++; col++;
        while (i < source.length && source[i] !== quote) {
          s += source[i++]; col++;
        }
        if (i < source.length) { s += source[i++]; col++; }
        tokens.push({ lexeme: s, type: 'STRING_LITERAL', line, col: startCol });
        continue;
      }

      const two = source.slice(i, i + 2);
      if (['===', '!=='].includes(source.slice(i, i + 3))) {
        tokens.push({ lexeme: source.slice(i, i + 3), type: 'OPERATOR', line, col });
        i += 3; col += 3; continue;
      }
      if (['==', '!=', '<=', '>=', '&&', '||', '=>'].includes(two)) {
        tokens.push({ lexeme: two, type: 'OPERATOR', line, col });
        i += 2; col += 2; continue;
      }
      if (['+', '-', '*', '/', '%', '=', '<', '>', '!'].includes(ch)) {
        tokens.push({ lexeme: ch, type: 'OPERATOR', line, col });
        i++; col++; continue;
      }

      if (['(', ')', '{', '}', '[', ']', ';', ',', '.', ':', '?', '|', '&'].includes(ch)) {
        tokens.push({ lexeme: ch, type: 'PUNCT', line, col });
        i++; col++; continue;
      }

      errors.push({ message: `Unexpected token '${ch}'`, line, col });
      i++; col++;
    }

    tokens.push({ lexeme: 'EOF', type: 'EOF', line, col });
    return { tokens, errors };
  }
};

// ─── Parser ───────────────────────────────────────────────────────────────────
export const parser = {
  parse(tokens) {
    let cur = 0;
    const errors = [];
    const peek = () => tokens[Math.min(cur, tokens.length - 1)];
    const is = (type, val) => {
      const t = peek();
      return t.type === type && (val === undefined || t.lexeme === val);
    };
    const advance = () => tokens[cur++];
    const match = (type, val) => {
      if (is(type, val)) return advance();
      return null;
    };
    const expect = (type, val) => {
      const t = peek();
      if (t.type === type && (val === undefined || t.lexeme === val)) return advance();
      const err = new ParseError(`Expected ${val ? `'${val}'` : type}, got '${t.lexeme}'`, t.line, t.col);
      errors.push(err);
      throw err;
    };

    function parseTypeAnnotation() {
      if (match('PUNCT', ':')) {
        if (is('KEYWORD') || is('IDENTIFIER')) {
          return advance().lexeme;
        }
        return 'any';
      }
      return null;
    }

    function parseProgram() {
      const body = [];
      while (!is('EOF')) {
        body.push(parseStatement());
      }
      return {
        type: 'Program',
        body,
        toTextTree(indent = '') {
          return `${indent}TypeScript Program\n` + body.map(s => s && s.toTextTree ? s.toTextTree(indent + '  ') : `${indent}  ${s?.type}`).join('\n');
        }
      };
    }

    function parseStatement() {
      const t = peek();
      if (t.type === 'KEYWORD') {
        if (['const', 'let', 'var'].includes(t.lexeme)) return parseVarDecl();
        if (t.lexeme === 'function') return parseFuncDecl();
        if (t.lexeme === 'interface') return parseInterface();
        if (t.lexeme === 'return') return parseReturn();
      }
      return parseExprStmt();
    }

    function parseInterface() {
      advance(); // interface
      const name = expect('IDENTIFIER').lexeme;
      expect('PUNCT', '{');
      const properties = [];
      while (!is('PUNCT', '}') && !is('EOF')) {
        const propName = expect('IDENTIFIER').lexeme;
        const propType = parseTypeAnnotation() || 'any';
        match('PUNCT', ';');
        properties.push({ name: propName, type: propType });
      }
      expect('PUNCT', '}');
      return {
        type: 'InterfaceDeclaration',
        name,
        properties,
        toTextTree(indent = '') {
          return `${indent}Interface ${name} {\n` + properties.map(p => `${indent}  ${p.name}: ${p.type};`).join('\n') + `\n${indent}}`;
        }
      };
    }

    function parseVarDecl() {
      const kind = advance().lexeme;
      const idToken = expect('IDENTIFIER');
      const typeAnnotation = parseTypeAnnotation();
      let init = null;
      if (match('OPERATOR', '=')) {
        init = parseExpression();
      }
      match('PUNCT', ';');
      return {
        type: 'VariableDeclaration',
        kind,
        name: idToken.lexeme,
        typeAnnotation,
        init,
        line: idToken.line,
        col: idToken.col,
        toTextTree(indent = '') {
          return `${indent}VarDecl [${kind}] ${idToken.lexeme}${typeAnnotation ? `: ${typeAnnotation}` : ''}` +
            (init ? `\n${init.toTextTree(indent + '  ')}` : '');
        }
      };
    }

    function parseFuncDecl() {
      advance(); // function
      const name = expect('IDENTIFIER').lexeme;
      expect('PUNCT', '(');
      const params = [];
      while (!is('PUNCT', ')') && !is('EOF')) {
        const pName = expect('IDENTIFIER').lexeme;
        const pType = parseTypeAnnotation() || 'any';
        params.push({ name: pName, type: pType });
        if (!match('PUNCT', ',')) break;
      }
      expect('PUNCT', ')');
      const returnType = parseTypeAnnotation();
      expect('PUNCT', '{');
      const body = [];
      while (!is('PUNCT', '}') && !is('EOF')) {
        body.push(parseStatement());
      }
      expect('PUNCT', '}');
      return {
        type: 'FunctionDeclaration',
        name,
        params,
        returnType,
        body,
        toTextTree(indent = '') {
          return `${indent}Function ${name}(${params.map(p => `${p.name}: ${p.type}`).join(', ')}): ${returnType || 'void'}\n` +
            body.map(s => s && s.toTextTree ? s.toTextTree(indent + '  ') : '').join('\n');
        }
      };
    }

    function parseReturn() {
      advance();
      let val = null;
      if (!is('PUNCT', ';') && !is('EOF')) val = parseExpression();
      match('PUNCT', ';');
      return {
        type: 'ReturnStatement',
        value: val,
        toTextTree(indent = '') {
          return `${indent}Return` + (val ? `\n${val.toTextTree(indent + '  ')}` : '');
        }
      };
    }

    function parseExprStmt() {
      const expr = parseExpression();
      match('PUNCT', ';');
      return {
        type: 'ExpressionStatement',
        expr,
        toTextTree(indent = '') { return expr.toTextTree(indent); }
      };
    }

    function parseExpression() {
      return parseBinary(0);
    }

    function parseBinary(prec) {
      let left = parsePrimary();
      while (is('OPERATOR')) {
        const op = advance().lexeme;
        const right = parsePrimary();
        const prev = left;
        left = {
          type: 'BinaryExpression',
          operator: op,
          left: prev,
          right,
          toTextTree(indent = '') {
            return `${indent}BinOp (${op})\n${prev.toTextTree(indent + '  ')}\n${right.toTextTree(indent + '  ')}`;
          }
        };
      }
      return left;
    }

    function parsePrimary() {
      const t = peek();
      if (t.type === 'INT_LITERAL' || t.type === 'FLOAT_LITERAL') {
        advance();
        return {
          type: 'NumericLiteral',
          value: t.lexeme,
          toTextTree(indent = '') { return `${indent}Number (${t.lexeme})`; }
        };
      }
      if (t.type === 'STRING_LITERAL') {
        advance();
        return {
          type: 'StringLiteral',
          value: t.lexeme,
          toTextTree(indent = '') { return `${indent}String (${t.lexeme})`; }
        };
      }
      if (t.type === 'IDENTIFIER') {
        advance();
        let expr = {
          type: 'Identifier',
          name: t.lexeme,
          line: t.line,
          col: t.col,
          toTextTree(indent = '') { return `${indent}Identifier (${t.lexeme})`; }
        };
        if (match('PUNCT', '(')) {
          const args = [];
          while (!is('PUNCT', ')') && !is('EOF')) {
            args.push(parseExpression());
            if (!match('PUNCT', ',')) break;
          }
          expect('PUNCT', ')');
          return {
            type: 'CallExpression',
            callee: expr,
            args,
            toTextTree(indent = '') {
              return `${indent}Call ${expr.name}\n` + args.map(a => a.toTextTree(indent + '  ')).join('\n');
            }
          };
        }
        return expr;
      }
      if (match('PUNCT', '(')) {
        const inner = parseExpression();
        expect('PUNCT', ')');
        return inner;
      }
      advance();
      return { type: 'Empty', toTextTree: () => '' };
    }

    const ast = parseProgram();
    return { ast, astText: ast.toTextTree(), errors };
  }
};

// ─── Semantic ─────────────────────────────────────────────────────────────────
export const semantic = {
  analyze(ast, source) {
    const symbolTable = [];
    const checks = [];
    const warnings = [];

    checks.push('Static Type Checker: verified type annotations and variable initializers.');
    checks.push('Interface verification: registered structural contracts in symbol catalog.');

    function checkNode(node, scope = 'global') {
      if (!node) return;
      if (node.type === 'VariableDeclaration') {
        let inferredType = node.typeAnnotation || 'any';
        let initVal = '-';

        if (node.init) {
          if (node.init.type === 'NumericLiteral') {
            initVal = node.init.value;
            if (node.typeAnnotation && node.typeAnnotation !== 'number' && node.typeAnnotation !== 'any') {
              throw new SemanticError(
                `Type mismatch: Type 'number' is not assignable to type '${node.typeAnnotation}'.`,
                node.line, node.col
              );
            }
          } else if (node.init.type === 'StringLiteral') {
            initVal = node.init.value;
            if (node.typeAnnotation && node.typeAnnotation !== 'string' && node.typeAnnotation !== 'any') {
              throw new SemanticError(
                `Type mismatch: Type 'string' is not assignable to type '${node.typeAnnotation}'.`,
                node.line, node.col
              );
            }
          }
        }

        symbolTable.push([
          node.name,
          `${node.kind} (type-checked)`,
          inferredType,
          scope,
          initVal
        ]);
      } else if (node.type === 'InterfaceDeclaration') {
        symbolTable.push([
          node.name,
          'interface',
          'InterfaceType',
          scope,
          `${node.properties.length} props`
        ]);
      } else if (node.type === 'FunctionDeclaration') {
        symbolTable.push([
          node.name,
          'function',
          `(${node.params.map(p => p.type).join(', ')}) => ${node.returnType || 'void'}`,
          scope,
          'declared'
        ]);
        (node.body || []).forEach(stmt => checkNode(stmt, `function:${node.name}`));
      }
    }

    (ast.body || []).forEach(stmt => checkNode(stmt, 'global'));
    return { symbolTable, checks, warnings };
  }
};

// ─── IR ───────────────────────────────────────────────────────────────────────
export const ir = {
  generate(ast, symbolTable) {
    const instructions = [];
    let tempCounter = 0;
    const newTemp = () => `t${++tempCounter}`;

    function genExpr(n) {
      if (!n) return '';
      if (n.type === 'NumericLiteral' || n.type === 'StringLiteral') return n.value;
      if (n.type === 'Identifier') return n.name;
      if (n.type === 'CallExpression') {
        (n.args || []).forEach(a => instructions.push(`param ${genExpr(a)}`));
        const t = newTemp();
        instructions.push(`${t} = call ${n.callee.name}, ${n.args.length}`);
        return t;
      }
      if (n.type === 'BinaryExpression') {
        const l = genExpr(n.left);
        const r = genExpr(n.right);
        const t = newTemp();
        instructions.push(`${t} = ${l} ${n.operator} ${r}`);
        return t;
      }
      return '';
    }

    function genStmt(s) {
      if (!s) return;
      if (s.type === 'VariableDeclaration' && s.init) {
        const val = genExpr(s.init);
        instructions.push(`${s.name} = ${val}`);
      } else if (s.type === 'FunctionDeclaration') {
        instructions.push(`func_begin ${s.name}`);
        (s.params || []).forEach(p => instructions.push(`param_receive ${p.name}`));
        (s.body || []).forEach(genStmt);
        instructions.push(`func_end ${s.name}`);
      } else if (s.type === 'ReturnStatement') {
        instructions.push(`return ${genExpr(s.value)}`);
      } else if (s.type === 'ExpressionStatement') {
        genExpr(s.expr);
      }
    }

    (ast.body || []).forEach(genStmt);
    return { instructions };
  }
};

// ─── Optimizer ────────────────────────────────────────────────────────────────
export const optimizer = {
  optimize: (instructions) => cOptimizer.optimize(instructions)
};

// ─── Codegen ──────────────────────────────────────────────────────────────────
export const codegen = {
  generate(instructions, symbolTable) {
    const out = [];
    out.push('; TypeScript Compiler (tsc) Emission: Stripped Types & Lowered Target');
    out.push('; Target: ECMAScript 2022 / V8 Engine Bytecode');
    out.push('');

    for (const instr of instructions) {
      if (instr.startsWith('func_begin ')) {
        out.push(`function ${instr.split(' ')[1]}() {`);
        continue;
      }
      if (instr.startsWith('func_end ')) {
        out.push('}');
        continue;
      }
      if (instr.startsWith('param_receive ')) {
        out.push(`  // formal parameter bound: ${instr.split(' ')[1]}`);
        continue;
      }
      if (instr.startsWith('return ')) {
        out.push(`  return ${instr.split(' ')[1]};`);
        continue;
      }
      const binMatch = /^(\S+)\s*=\s*(\S+)\s+([+\-*\/%<>=!]+)\s+(\S+)$/.exec(instr);
      if (binMatch) {
        out.push(`  const ${binMatch[1]} = ${binMatch[2]} ${binMatch[3]} ${binMatch[4]};`);
        continue;
      }
      const copyMatch = /^(\S+)\s*=\s*(.+)$/.exec(instr);
      if (copyMatch) {
        out.push(`  let ${copyMatch[1]} = ${copyMatch[2]};`);
        continue;
      }
      out.push(`  ${instr}`);
    }

    return {
      targetLabel: 'TypeScript Lowers to Pure ES2022 JavaScript',
      instructions: out
    };
  }
};
