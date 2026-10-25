const NUM = /^-?\d+(?:\.\d+)?$/;
const binary = /^(\S+) (\*\*|\*|\/\/|\/|%|<<|>>|<=|>=|==|!=|<|>|&|\||\^|\+|-) (\S+)$/;

function evaluate(a, op, b, cLike) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right) || (cLike && (a.includes(".") || b.includes(".")))) return null;
  if (op === "/" && right === 0) return null;
  const value = { "+": left + right, "-": left - right, "*": left * right, "/": cLike ? Math.trunc(left / right) : left / right, "%": left % right, "<": +(left < right), ">": +(left > right), "<=": +(left <= right), ">=": +(left >= right), "==": +(left == right), "!=": +(left != right), "&": left & right, "|": left | right, "^": left ^ right, "<<": left << right, ">>": left >> right }[op];
  return Number.isFinite(value) ? String(value) : null;
}

function optimize(tac, language) {
  const cLike = ["c", "cpp", "java"].includes(language);
  const passes = new Set();
  let lines = tac.split(/\r?\n/);
  for (let round = 0; round < 5; round++) {
    const before = lines.join("\n");
    const constants = new Map();
    const copies = new Map();
    lines = lines.map((raw) => {
      const line = raw.trim();
      if (!line) return raw;
      if (line.endsWith(":") || /^func\b/.test(line)) {
        constants.clear();
        copies.clear();
        return raw;
      }
      if (/^(goto|if|if_false|if_true|param)\b/.test(line)) {
        if (/^(goto|if|if_false|if_true)\b/.test(line)) {
          constants.clear();
          copies.clear();
        }
      }
      const assignment = line.match(/^(\w+) = (.+)$/);
      const substitute = (value) =>
        value.replace(/\b[A-Za-z_]\w*\b/g, (name) => constants.get(name) || copies.get(name) || name);
      let current = assignment
        ? `${assignment[1]} = ${substitute(assignment[2])}`
        : substitute(line);
      if (current !== line) passes.add("Constant/copy propagation");
      const match = current.match(/^(\w+) = (.+)$/);
      if (match) {
        let [, destination, rhs] = match;
        const expression = rhs.match(binary);
        if (expression && NUM.test(expression[1]) && NUM.test(expression[3])) {
          const folded = evaluate(expression[1], expression[2], expression[3], cLike);
          if (folded !== null) {
            rhs = folded;
            current = `${destination} = ${rhs}`;
            passes.add("Constant folding");
          }
        }
        if (NUM.test(rhs)) constants.set(destination, rhs);
        else if (/^[A-Za-z_]\w*$/.test(rhs)) copies.set(destination, rhs);
        else {
          constants.delete(destination);
          copies.delete(destination);
        }
        return `    ${current}`;
      }
      return `    ${current}`;
    });
    if (lines.join("\n") === before) break;
  }
  return { code: lines.join("\n"), passes: [...passes] };
}

module.exports = { optimize };
