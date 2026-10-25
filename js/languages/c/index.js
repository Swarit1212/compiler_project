// ─── C Language Module ────────────────────────────────────────────────────────
import * as lexer from './lexer.js';
import * as parser from './parser.js';
import * as semantic from './semantic.js';
import * as ir from './ir.js';
import * as optimizer from './optimizer.js';
import * as codegen from './codegen.js';

export const id = 'c';
export const label = 'C';

export const examples = [
  {
    label: 'A · Valid arithmetic & variables',
    code: `int main() {
    int a = 10;
    int b = 20;
    int result = a + b * 5;
    return result;
}`
  },
  {
    label: 'B · Constant folding & propagation',
    code: `int main() {
    int x;
    x = 10 * 5 + 2;
    int y = x + 3;
    return y;
}`
  },
  {
    label: 'C · While loop & control flow',
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
    label: 'D · Syntax error (missing operand)',
    code: `int main() {
    int a = ;
    return a;
}`
  },
  {
    label: 'E · Semantic error (type mismatch)',
    code: `int main() {
    int a;
    a = "hello";
    return 0;
}`
  }
];

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
          language: 'c',
          source: source,
          options: {
            target: 'x86-64',
            standard: 'c11'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Backend request failed with status ${response.status}`);
      }

      return response.json();
    } catch (err) {
      console.error('C backend error:', err);
      throw err;
    }
  }
};

export { lexer, parser, semantic, ir, optimizer, codegen };
