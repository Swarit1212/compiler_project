const path = require("path");
const { Parser, Language } = require("web-tree-sitter");

const grammars = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  c: "c",
  cpp: "cpp",
};
let initialized;
const languages = new Map();

async function parse(language, source) {
  initialized = initialized || Parser.init({
    locateFile: () => path.join(path.dirname(require.resolve("web-tree-sitter")), "web-tree-sitter.wasm"),
  });
  await initialized;
  if (!languages.has(language)) {
    const file = path.join(path.dirname(require.resolve("tree-sitter-wasms/package.json")), "out", `tree-sitter-${grammars[language]}.wasm`);
    try {
      languages.set(language, await Language.load(file));
    } catch (error) {
      return { type: "program", text: source, namedChildren: [], parseError: error };
    }
  }
  const parser = new Parser();
  parser.setLanguage(languages.get(language));
  const tree = parser.parse(source);
  return tree.rootNode;
}

module.exports = { parse };
