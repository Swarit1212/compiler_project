function lower(root) {
  let temp = 0;
  let label = 0;
  const output = [];
  const loops = [];
  const emit = (line) => output.push(`    ${line}`);
  const nextTemp = () => `t${++temp}`;
  const nextLabel = () => `L${++label}`;
  const field = (node, name) => node && node.childForFieldName(name);
  const text = (node) => (node ? node.text : "0");
  if (root.parseError) {
    const lowerTextExpression = (value) => {
      const tokens = value.trim().match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[A-Za-z_$][\w$]*|-?\d+(?:\.\d+)?|===|!==|==|!=|<=|>=|&&|\|\||[()+\-*/%<>,[\]]/g) || [];
      let position = 0;
      const precedence = { "||": 1, "&&": 2, "==": 3, "!=": 3, "===": 3, "!==": 3, "<": 4, ">": 4, "<=": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 };
      const parseBinary = (minimum) => {
        let left = parsePrimary();
        while (position < tokens.length) {
          const operator = tokens[position];
          const level = precedence[operator];
          if (!level || level < minimum) break;
          position++;
          const right = parseBinary(level + 1);
          const result = nextTemp();
          emit(`${result} = ${left} ${operator === "===" ? "==" : operator === "!==" ? "!=" : operator} ${right}`);
          left = result;
        }
        return left;
      };
      const parsePrimary = () => {
        const token = tokens[position++];
        if (token === "(") {
          const result = parseBinary(0);
          if (tokens[position] === ")") position++;
          return result;
        }
        if (!token) return "0";
        if (token === "-") {
          const operand = parsePrimary();
          const result = nextTemp();
          emit(`${result} = -${operand}`);
          return result;
        }
        if (tokens[position] === "(") {
          position++;
          const args = [];
          while (tokens[position] && tokens[position] !== ")") {
            args.push(parseBinary(0));
            if (tokens[position] === ",") position++;
          }
          if (tokens[position] === ")") position++;
          args.forEach((arg) => emit(`param ${arg}`));
          const result = nextTemp();
          emit(`${result} = call ${token}, ${args.length}`);
          return result;
        }
        return token;
      };
      return parseBinary(0);
    };
    if (/\b(?:while|if|else|elif)\b/.test(root.text)) {
      const blocks = [];
      for (const rawLine of root.text.split(/\r?\n/)) {
        const trimmed = rawLine.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
        if (!trimmed) continue;
        const indent = rawLine.search(/\S/);
        while (blocks.length && indent <= blocks[blocks.length - 1].indent) {
          const block = blocks.pop();
          if (block.kind === "while") emit(`goto ${block.start}`);
          output.push(`${block.exit}:`);
        }
        const functionMatch = trimmed.match(/^(?:def|function)\s+([A-Za-z_$]\w*)\s*\(([^)]*)\)\s*:?\s*$/);
        if (functionMatch) {
          output.push(`func ${functionMatch[1]}(${functionMatch[2].trim()}):`);
          continue;
        }
        const whileMatch = trimmed.match(/^while\s+(.+?)(?::|\s*\{)?$/);
        if (whileMatch) {
          const start = nextLabel();
          const exit = nextLabel();
          output.push(`${start}:`);
          const condition = lowerTextExpression(whileMatch[1]);
          emit(`if_false ${condition} goto ${exit}`);
          blocks.push({ indent, kind: "while", start, exit });
          continue;
        }
        const ifMatch = trimmed.match(/^if\s+(.+?)(?::|\s*\{)?$/);
        if (ifMatch) {
          const otherwise = nextLabel();
          const done = nextLabel();
          const condition = lowerTextExpression(ifMatch[1]);
          emit(`if_false ${condition} goto ${otherwise}`);
          blocks.push({ indent, kind: "if", exit: otherwise, done });
          continue;
        }
        if (/^(?:else|elif)\b/.test(trimmed) && blocks.length) {
          const block = blocks[blocks.length - 1];
          emit(`goto ${block.done}`);
          output.push(`${block.exit}:`);
          continue;
        }
        const assignment = trimmed.match(/^(?:const|let|var|int|float|double|auto)?\s*([A-Za-z_$]\w*)\s*=\s*(.+)$/);
        if (assignment) emit(`${assignment[1]} = ${lowerTextExpression(assignment[2])}`);
        else if (/^return\b/.test(trimmed)) emit(`return ${lowerTextExpression(trimmed.replace(/^return\s+/, ""))}`);
      }
      while (blocks.length) {
        const block = blocks.pop();
        if (block.kind === "while") emit(`goto ${block.start}`);
        output.push(`${block.kind === "if" ? block.exit : block.exit}:`);
        if (block.done) output.push(`${block.done}:`);
      }
      return output.join("\n");
    }
    const methodPattern = /(?:def|function|(?:public|private|protected|static|final)\s+)*[\w<>\[\]]+\s+([A-Za-z_$]\w*)\s*\(([^)]*)\)\s*\{([^{}]*)\}/g;
    const processStatement = (statement) => {
      const trimmed = statement.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim();
      if (!trimmed) return;
      const assignment = trimmed.match(/^(?:(?:const|let|var|int|float|double|auto|bool|boolean|String|string)\s+)*([A-Za-z_$]\w*)\s*=\s*(.+)$/);
      if (assignment) {
        emit(`${assignment[1]} = ${lowerTextExpression(assignment[2])}`);
        return;
      }
      const returnMatch = trimmed.match(/^return(?:\s+(.+))?$/);
      if (returnMatch) emit(`return${returnMatch[1] ? ` ${lowerTextExpression(returnMatch[1])}` : ""}`);
    };
    const hasCStyleFunction = /(?:int|void|float|double|bool|boolean|String)\s+[A-Za-z_$]\w*\s*\([^)]*\)\s*\{/.test(root.text);
    if (hasCStyleFunction) {
      let cFunction;
      while ((cFunction = methodPattern.exec(root.text))) {
        output.push(`func ${cFunction[1]}(${cFunction[2].trim()}):`);
        cFunction[3].split(";").forEach(processStatement);
      }
      return output.join("\n");
    }
    let methodMatch;
    while ((methodMatch = methodPattern.exec(root.text))) {
      if (methodMatch[1] === "if" || methodMatch[1] === "while" || methodMatch[1] === "for") continue;
      output.push(`func ${methodMatch[1]}(${methodMatch[2].trim()}):`);
      const body = methodMatch[3];
      const returnMatch = body.match(/\breturn\s+([^;]+)/);
      if (returnMatch) emit(`return ${lowerTextExpression(returnMatch[1])}`);
    }
    for (const statement of root.text.split(/[;\n]+/).map((part) => part.replace(/#.*$/, "").trim()).filter(Boolean)) {
      const functionMatch = statement.match(/^(?:def|function)\s+([A-Za-z_$]\w*)\s*\(([^)]*)\)/);
      if (functionMatch) {
        output.push(`func ${functionMatch[1]}(${functionMatch[2].trim()}):`);
        continue;
      }
      const assignment = statement.match(/^(?:const|let|var|int|float|double|auto)?\s*([A-Za-z_$]\w*)\s*=\s*(.+)$/);
      if (assignment) emit(`${assignment[1]} = ${lowerTextExpression(assignment[2])}`);
      else {
        const returnMatch = statement.match(/^return\s+(.+)$/);
        if (returnMatch) emit(`return ${lowerTextExpression(returnMatch[1])}`);
      }
    }
    return output.join("\n");
  }

  function reference(node) {
    if (!node) return "0";
    if (node.type === "identifier" || /_identifier$/.test(node.type)) return text(node);
    if (node.type === "subscript" || node.type === "subscript_expression") {
      return `${expression(field(node, "value") || field(node, "object"))}[${expression(field(node, "subscript") || field(node, "index"))}]`;
    }
    if (/member|attribute|field_expression/.test(node.type)) {
      return `${expression(field(node, "object") || field(node, "argument"))}.${text(field(node, "property") || field(node, "attribute") || field(node, "field"))}`;
    }
    return expression(node);
  }

  function expression(node) {
    if (!node) return "0";
    if (/^(identifier|integer|float|number|number_literal|true|false|null|none|True|False|None|undefined|nullptr)$/.test(node.type)) {
      return { true: "1", True: "1", false: "0", False: "0", null: "null", none: "null", None: "null", undefined: "null", nullptr: "null" }[node.type] || text(node);
    }
    if (/string|char_literal/.test(node.type)) return JSON.stringify(text(node).slice(0, 80));
    if (/parenthesized|condition_clause/.test(node.type)) return expression(node.namedChild(0));
    if (/binary|operator|comparison|boolean/.test(node.type) && node.namedChildCount >= 2) {
      const left = expression(node.namedChild(0));
      const right = expression(node.namedChild(node.namedChildCount - 1));
      const operator = node.text.slice(node.namedChild(0).endIndex - node.startIndex, node.namedChild(node.namedChildCount - 1).startIndex - node.startIndex).trim() || "+";
      const result = nextTemp();
      emit(`${result} = ${left} ${operator === "===" ? "==" : operator === "!==" ? "!=" : operator} ${right}`);
      return result;
    }
    if (/unary|not_operator|pointer_expression/.test(node.type)) {
      const operand = field(node, "argument") || node.namedChild(node.namedChildCount - 1);
      const operator = node.text.slice(0, operand.startIndex - node.startIndex).trim() || "!";
      const result = nextTemp();
      emit(`${result} = ${operator === "not" ? "!" : operator}${expression(operand)}`);
      return result;
    }
    if (/call|new_expression/.test(node.type)) {
      const fn = field(node, "function") || field(node, "constructor") || node.namedChild(0);
      const args = field(node, "arguments");
      const values = args ? args.namedChildren.map(expression) : [];
      values.forEach((value) => emit(`param ${value}`));
      const result = nextTemp();
      emit(`${result} = call ${text(fn).replace(/\s+/g, "")}, ${values.length}`);
      return result;
    }
    if (/subscript|member|attribute|field_expression/.test(node.type)) {
      const result = nextTemp();
      emit(`${result} = ${reference(node)}`);
      return result;
    }
    if (node.namedChildCount === 1) return expression(node.namedChild(0));
    const result = nextTemp();
    emit(`${result} = ${node.type}(${node.namedChildren.map(expression).join(", ")})`);
    return result;
  }

  function statement(node) {
    if (!node) return;
    if (/function_definition|function_declaration|method_definition|method_declaration/.test(node.type)) {
      const name = text(field(node, "name") || node.namedChild(0));
      const params = field(node, "parameters");
      output.push(`func ${name}(${params ? params.namedChildren.map(text).join(", ") : ""}):`);
      statement(field(node, "body"));
      emit("return");
      return;
    }
    if (/return_statement/.test(node.type)) {
      emit(`return ${expression(node.namedChild(0))}`);
      return;
    }
    if (/declaration|variable_declaration|lexical_declaration/.test(node.type)) {
      for (const child of node.namedChildren) {
        const value = field(child, "value");
        const name = field(child, "name") || field(child, "declarator");
        if (name) emit(`${text(name)} = ${value ? expression(value) : "0"}`);
      }
      return;
    }
    if (/assignment/.test(node.type)) {
      const left = field(node, "left");
      const right = field(node, "right");
      if (left && right) emit(`${reference(left)} = ${expression(right)}`);
      return;
    }
    if (/if_statement/.test(node.type)) {
      const condition = expression(field(node, "condition"));
      const otherwise = nextLabel();
      const done = nextLabel();
      emit(`if_false ${condition} goto ${otherwise}`);
      statement(field(node, "consequence"));
      emit(`goto ${done}`);
      output.push(`${otherwise}:`);
      statement(field(node, "alternative"));
      output.push(`${done}:`);
      return;
    }
    if (/while_statement/.test(node.type)) {
      const top = nextLabel();
      const exit = nextLabel();
      output.push(`${top}:`);
      emit(`if_false ${expression(field(node, "condition"))} goto ${exit}`);
      loops.push({ break: exit, continue: top });
      statement(field(node, "body"));
      loops.pop();
      emit(`goto ${top}`);
      output.push(`${exit}:`);
      return;
    }
    if (/break_statement|continue_statement/.test(node.type)) {
      const loop = loops[loops.length - 1];
      if (loop) emit(`goto ${node.type.startsWith("break") ? loop.break : loop.continue}`);
      return;
    }
    if (/expression_statement/.test(node.type)) {
      node.namedChildren.forEach(expression);
      return;
    }
    node.namedChildren.forEach(statement);
  }

  statement(root);
  return output.filter(Boolean).join("\n");
}

module.exports = { lower };
