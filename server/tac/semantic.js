const KEYWORDS = new Set([
  "if", "else", "elif", "while", "for", "return", "function", "def",
  "class", "const", "let", "var", "int", "float", "double", "string",
  "boolean", "bool", "public", "private", "protected", "static", "new",
  "void", "String",
  "true", "false", "null", "None", "True", "False",
]);

function analyze(source, language) {
  const symbols = new Map();
  const checks = [];
  const warnings = [];
  const lines = source
    .replace(/[{};]/g, (token) => `${token}\n`)
    .split(/\r?\n/);
  const declaration = /^(?:(?:const|let|var)\s+)?(?:(?:public|private|protected|static|final)\s+)*(?:(?:int|float|double|boolean|bool|string|String|number|any)\s+)?([A-Za-z_$]\w*)\s*(?:[:=]|$)/;
  const functionPattern = /(?:def|function|(?:public|private|protected|static|final)\s+[\w<>\[\]]+)\s+([A-Za-z_$]\w*)\s*\(([^)]*)\)/;
  const classPattern = /\bclass\s+([A-Za-z_$]\w*)/;
  const classMatch = source.match(classPattern);
  if (classMatch) {
    symbols.set(classMatch[1], {
      name: classMatch[1],
      kind: "class",
      type: "class",
      scope: "global",
      value: "—",
    });
  }
  for (const line of lines) {
    const trimmed = line.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
    if (!trimmed) continue;
    const fn = trimmed.match(functionPattern);
    if (fn) {
      symbols.set(fn[1], { name: fn[1], kind: "function", type: "function", scope: "global", value: `${fn[2]}` });
      for (const parameter of fn[2].split(",").map((value) => value.trim()).filter(Boolean)) {
        const name = parameter.split(/[:\s]/)[0];
        if (/^[A-Za-z_$]\w*$/.test(name)) {
          symbols.set(name, { name, kind: "parameter", type: "unknown", scope: fn[1], value: "—" });
        }
      }
    }
    const match = trimmed.match(declaration);
    if (match && !KEYWORDS.has(match[1])) {
      const typeMatch = trimmed.match(/^(?:const|let|var|public|private|static|final|\s)*(int|float|double|boolean|bool|string|String|number|any)\b/);
      symbols.set(match[1], {
        name: match[1],
        kind: /^(const|let|var)\b/.test(trimmed) ? "variable" : "declaration",
        type: typeMatch ? typeMatch[1] : inferType(trimmed.split("=", 2)[1]),
        scope: "global",
        value: trimmed.includes("=") ? trimmed.split("=").slice(1).join("=").trim() : "—",
      });
    }
  }
  const identifiers = source.match(/[A-Za-z_$]\w*/g) || [];
  const declared = new Set([...symbols.keys(), ...KEYWORDS]);
  for (const identifier of identifiers) {
    if (!declared.has(identifier) && !isBuiltin(identifier, language)) {
      warnings.push(`Use of '${identifier}' before declaration.`);
    }
  }
  checks.push(`Collected ${symbols.size} declared symbol${symbols.size === 1 ? "" : "s"}.`);
  checks.push(`Checked ${lines.length} source line${lines.length === 1 ? "" : "s"}.`);
  return { symbolTable: [...symbols.values()], checks, warnings: [...new Set(warnings)] };
}

function inferType(value = "") {
  const text = value.trim();
  if (/^(true|false|True|False)$/.test(text)) return "boolean";
  if (/^["'`]/.test(text)) return "string";
  if (/^-?\d+\.\d+$/.test(text)) return "float";
  if (/^-?\d+$/.test(text)) return "int";
  if (/^\[/.test(text)) return "array";
  return "unknown";
}

function isBuiltin(name, language) {
  return new Set([
    "print", "console", "log", "max", "min", "len", "range", "Math",
    "System", "out", "println", "main", "args", "this",
  ]).has(name) || (language === "cpp" && ["std", "cout", "cin"].includes(name));
}

module.exports = { analyze };
