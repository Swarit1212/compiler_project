import { Language, Parser } from "web-tree-sitter";

const GRAMMAR_FILES = {
  c: "tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp.wasm",
  java: "tree-sitter-java.wasm",
  python: "tree-sitter-python.wasm",
  javascript: "tree-sitter-javascript.wasm",
  typescript: "tree-sitter-typescript.wasm",
};

let parserReady;
const languages = new Map();

async function getParser() {
  if (!parserReady) {
    parserReady = Parser.init({
      locateFile: () => "vendor/tree-sitter/web-tree-sitter.wasm",
    });
  }
  await parserReady;
  return Parser;
}

export async function parseWithTreeSitter(languageId, source) {
  const grammarFile = GRAMMAR_FILES[languageId];
  if (!grammarFile) return null;

  try {
    const ParserClass = await getParser();
    let language = languages.get(languageId);
    if (!language) {
      language = await Language.load(`vendor/tree-sitter/${grammarFile}`);
      languages.set(languageId, language);
    }

    const parser = new ParserClass();
    parser.setLanguage(language);
    const tree = parser.parse(source);
    const root = tree.rootNode;
    const result = {
      ast: toAstNode(root),
      astText: root.toString(),
      hasError: root.hasError,
      errorNode: findErrorNode(root),
    };
    parser.delete();
    tree.delete();
    return result;
  } catch (error) {
    console.warn(`Tree-sitter is unavailable for ${languageId}:`, error);
    return null;
  }
}

function toAstNode(node) {
  const children = node.namedChildren.map(toAstNode);
  const ast = { type: node.type, children };
  if (children.length === 0) ast.value = node.text;
  return ast;
}

function findErrorNode(node) {
  if (node.type === "ERROR" || node.isMissing) return node;
  for (const child of node.namedChildren) {
    const error = findErrorNode(child);
    if (error) return error;
  }
  return null;
}
