const MAX_NODES = 240;

export function analyzeTreeSitterAst(ast, languageId) {
  const nodes = collectNodes(ast);
  const declarations = nodes
    .filter((node) =>
      /declaration|function|class|method|interface|import|export/.test(
        node.type,
      ),
    )
    .slice(0, 80)
    .map((node, index) => [
      node.value || node.type,
      "syntax node",
      languageId,
      "Tree-sitter AST",
      `node ${index + 1}`,
    ]);

  return {
    symbolTable: declarations,
    checks: [
      `Tree-sitter validated the ${languageId} syntax tree.`,
      `Generic semantic traversal visited ${nodes.length} named nodes.`,
      "Language-specific type and scope rules were not inferred by this generic pass.",
    ],
    warnings:
      declarations.length === 0
        ? ["No declaration-like nodes were found in the syntax tree."]
        : [],
  };
}

export function generateTreeSitterIr(ast) {
  const nodes = collectNodes(ast).slice(0, MAX_NODES);
  return {
    representation: "Tree-sitter node trace",
    instructions: nodes.map(
      (node, index) =>
        `n${index + 1} = ${node.type}${node.value ? ` (${node.value})` : ""}`,
    ),
  };
}

export function optimizeTreeSitterIr(instructions) {
  const before = instructions || [];
  const after = before.filter(
    (instruction, index) => index === 0 || instruction !== before[index - 1],
  );
  return {
    before,
    after,
    passes:
      after.length < before.length ? ["Duplicate node trace removal"] : [],
    note: "Generic Tree-sitter trace optimization; no language-specific optimization rules were applied.",
  };
}

export function generateTreeSitterTarget(instructions, languageId) {
  return {
    targetLabel: `Generic ${languageId} syntax trace`,
    instructions: (instructions || []).map((instruction) => `; ${instruction}`),
  };
}

function collectNodes(root) {
  const nodes = [];
  function visit(node) {
    if (!node || nodes.length >= MAX_NODES) return;
    nodes.push(node);
    (node.children || []).forEach(visit);
  }
  visit(root);
  return nodes;
}
