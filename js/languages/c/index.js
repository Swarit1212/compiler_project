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

export { lexer, parser, semantic, ir, optimizer, codegen };
