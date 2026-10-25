const comparisons = { "<": "LT", ">": "GT", "<=": "LE", ">=": "GE", "==": "EQ", "!=": "NE" };
const arithmetic = { "+": "ADD", "-": "SUB", "*": "MUL", "&": "AND", "|": "ORR", "^": "EOR", "<<": "LSL", ">>": "ASR" };

function codegen(tac) {
  const output = [];
  const emit = (line) => output.push(line);
  const load = (register, value) => emit(/^-?\d+(?:\.\d+)?$/.test(value) ? `    MOV ${register}, #${value}` : value === "null" ? `    MOV ${register}, #0` : `    LDR ${register}, [${value}]`);
  const epilogue = () => { emit("    MOV SP, FP"); emit("    POP {FP, PC}"); };
  for (const raw of tac.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (!/^\s/.test(raw) && line.endsWith(":")) {
      emit(`${line.replace(/\(.*/, "").replace(/:$/, "")}:`);
      emit("    PUSH {FP, LR}");
      emit("    MOV FP, SP");
      continue;
    }
    let match;
    if ((match = line.match(/^goto (L\d+)$/))) emit(`    B ${match[1]}`);
    else if ((match = line.match(/^(if_false|if_true) (\S+) goto (L\d+)$/))) { load("R0", match[2]); emit("    CMP R0, #0"); emit(`    ${match[1] === "if_false" ? "BEQ" : "BNE"} ${match[3]}`); }
    else if ((match = line.match(/^param (\S+)$/))) { load("R0", match[1]); emit("    PUSH {R0}"); }
    else if ((match = line.match(/^return(?: (\S+))?$/))) { if (match[1]) load("R0", match[1]); epilogue(); }
    else if ((match = line.match(/^(\w+) = (\S+) (\/|%|<<|>>|[+\-*<>=!&|^]+) (\S+)$/))) {
      const [, destination, left, operator, right] = match;
      load("R0", left); load("R1", right);
      if (arithmetic[operator]) emit(`    ${arithmetic[operator]} R0, R0, R1`);
      else if (operator === "/") emit("    SDIV R0, R0, R1");
      else if (operator === "%") { emit("    SDIV R2, R0, R1"); emit("    MLS R0, R2, R1, R0"); }
      else { emit("    CMP R0, R1"); emit("    MOV R0, #0"); emit(`    MOV${comparisons[operator] || "EQ"} R0, #1`); }
      emit(`    STR R0, [${destination}]`);
    } else if ((match = line.match(/^(\w+) = ([!~-])(\S+)$/))) {
      load("R0", match[3]);
      if (match[2] === "-") emit("    RSB R0, R0, #0");
      else if (match[2] === "~") emit("    MVN R0, R0");
      else { emit("    CMP R0, #0"); emit("    MOVEQ R0, #1"); emit("    MOVNE R0, #0"); }
      emit(`    STR R0, [${match[1]}]`);
    } else if ((match = line.match(/^(\w+) = (\S+)$/))) {
      load("R0", match[2]);
      emit(`    STR R0, [${match[1]}]`);
    } else emit(`    ; ${line}`);
  }
  return output.join("\n");
}

module.exports = { codegen };
