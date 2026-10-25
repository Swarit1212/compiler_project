const { parse } = require("./parse");
const { lower } = require("./lower");
const { optimize } = require("./opt");
const { codegen } = require("./codegen");
const { analyze } = require("./semantic");

async function textbook(language, source) {
  const tac = lower(await parse(language, source), language);
  const result = optimize(tac, language);
  return {
    semantic: analyze(source, language),
    tac,
    optimized: result.code,
    passes: result.passes,
    asm: codegen(result.code),
  };
}

module.exports = { textbook, optimize, codegen };
