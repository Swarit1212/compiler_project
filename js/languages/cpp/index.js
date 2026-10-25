// ─── C++ Language Module ──────────────────────────────────────────────────────
// Extends the C pipeline with C++-specific constructs.

import * as cLexer   from '../c/lexer.js';
import * as cParser  from '../c/parser.js';
import * as cSemantic from '../c/semantic.js';
import * as cIR       from '../c/ir.js';
import * as cOptimizer from '../c/optimizer.js';
import * as cCodegen  from '../c/codegen.js';
import { LexerError, ParseError } from '../../core/errors.js';

export const id = 'cpp';
export const label = 'C++';

// ── C++ extra keywords ────────────────────────────────────────────────────────
const CPP_KEYWORDS = new Set([
  ...cLexer.C_KEYWORDS,
  'class','namespace','template','typename','new','delete','this','super',
  'public','private','protected','virtual','override','final','inline',
  'explicit','operator','friend','throw','try','catch','noexcept',
  'nullptr','constexpr','auto','decltype','using','static_assert',
  'std','string','vector','map','set','pair','cout','cin','endl',
]);

// ── Examples ──────────────────────────────────────────────────────────────────
export const examples = [
  {
    label: 'A · Class with constructor',
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
    label: 'B · Template function',
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
    label: 'C · Type error (incompatible assignment)',
    code: `int main() {
    int x = "hello";
    return 0;
}`
  },
  {
    label: 'D · Constant folding',
    code: `int main() {
    int result = 8 * 8 + 4 * 4;
    return result;
}`
  },
];

// ── Lexer: C + extra keywords ─────────────────────────────────────────────────
export const lexer = {
  tokenize(source) {
    const result = cLexer.tokenize(source);
    // Re-classify C++ keywords not caught by base lexer
    result.tokens = result.tokens.map(t => {
      if (t.type === 'IDENTIFIER' && CPP_KEYWORDS.has(t.lexeme)) {
        return { ...t, type: 'KEYWORD' };
      }
      return t;
    });
    return result;
  }
};

// ── Parser: C parser (handles most C++ subset) ────────────────────────────────
export const parser = {
  parse(tokens) { return cParser.parse(tokens); }
};

// ── Semantic: C semantic (class stubs noted as warnings) ──────────────────────
export const semantic = {
  analyze(ast, source) {
    const result = cSemantic.analyze(ast, source);
    result.checks.unshift('C++ class definitions are treated as struct scopes in this analysis.');
    return result;
  }
};

// ── IR, Optimizer, Codegen: delegate to C ────────────────────────────────────
export const ir        = { generate: (ast, sym) => cIR.generate(ast, sym) };
export const optimizer = { optimize: (instrs) => cOptimizer.optimize(instrs) };
export const codegen   = { generate: (tac, sym) => ({ ...cCodegen.generate(tac, sym, 'cpp'), targetLabel: 'Educational pseudo-assembly (C++ ABI)' }) };

// Backend using Clang/LLVM via local server
export const backend = {
  /**
   * Run the C/C++ backend analysis.
   * @param {string} source - The source code to analyze
   * @returns {Promise<Object>} The backend response with phases
   */
  run: async (source) => {
    try {
      const response = await fetch('http://localhost:4174/api/analyze/ccpp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          language: 'cpp',
          source: source,
          options: {
            target: 'x86-64',
            standard: 'c++17'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Backend request failed with status ${response.status}`);
      }

      return response.json();
    } catch (err) {
      console.error('C++ backend error:', err);
      throw err;
    }
  }
};
