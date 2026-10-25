const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const util = require("util");
const cors = require("cors");
const { textbook } = require("./tac");
const app = express();
const port = Number(process.env.PORT || 4174);

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.post("/api/compile", async (req, res) => {
  const language = req.body.language;
  const source = req.body.source;
  if (
    !["python", "javascript", "typescript", "java", "c", "cpp"].includes(
      language,
    )
  ) {
    return res
      .status(400)
      .json({ status: "failed", error: "Unsupported TAC language." });
  }
  try {
    const result = await textbook(language, source);
    res.json({
      status: "completed",
      mode: "textbook-tac",
      language,
      diagnostics: [],
      phases: {
        lexical: { status: "completed" },
        syntax: { status: "completed" },
        semantic: { status: "completed", ...result.semantic },
        intermediate: {
          status: "completed",
          representation: "TAC",
          instructions: result.tac.split(/\r?\n/).filter(Boolean),
        },
        optimization: {
          status: "completed",
          before: result.tac.split(/\r?\n/).filter(Boolean),
          after: result.optimized.split(/\r?\n/).filter(Boolean),
          passes: result.passes,
          note: "Shared Tree-sitter TAC optimizer.",
        },
        target: {
          status: "completed",
          targetLabel: "",
          instructions: result.asm.split(/\r?\n/).filter(Boolean),
        },
      },
    });
  } catch (error) {
    const message = String(error?.message || error);
    res.status(500).json({
      status: "failed",
      language,
      diagnostics: [{ phase: "intermediate", message }],
      phases: {
        lexical: { status: "completed" },
        syntax: { status: "completed" },
        semantic: {
          status: "completed",
          checks: [],
          warnings: [message],
          symbolTable: [],
        },
        intermediate: {
          status: "failed",
          diagnostic: { phase: "intermediate", message },
        },
        optimization: { status: "not_run", reason: "TAC generation failed." },
        target: { status: "not_run", reason: "TAC generation failed." },
      },
    });
  }
});

// Execute command with timeout
function executeCommand(command, args, input = null, timeout = 10000) {
  // Log the command being executed for debugging
  console.log(`Executing: ${command} ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = execFile(
      command,
      args,
      { timeout, maxBuffer: 8 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          console.log(`Command failed: ${command}`, error);
          reject({ error, stdout, stderr });
        } else {
          console.log(`Command succeeded: ${command}`);
          resolve({ stdout, stderr });
        }
      },
    );

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

function cleanIR(lines) {
  return lines
    .filter((line) => {
      const text = line.trim();
      return (
        text &&
        !/^(; ModuleID|; Function Attrs|source_filename|target |attributes #|!|declare\b)/.test(
          text,
        ) &&
        !/^%.*= type\b/.test(text) &&
        !/^@.*= external\b/.test(text)
      );
    })
    .map((line) =>
      line
        .replace(/\s+personality ptr @\S+/, "")
        .replace(/,? align \d+/g, "")
        .replace(/\s+dereferenceable\(\d+\)|\s+dead_on_return\(\d+\)/g, "")
        .replace(
          /\s+(noundef|nonnull|dso_local|local_unnamed_addr|unnamed_addr)\b/g,
          "",
        )
        .replace(/\s+#\d+\b/g, "")
        .replace(/,\s*!llvm\.loop\s+!\d+/, ""),
    );
}

function cleanAsm(lines) {
  const output = [];
  let inData = false;
  for (const raw of lines) {
    if (/^\s*\.section\b/.test(raw)) inData = true;
    if (/^\s*\.text\b/.test(raw)) inData = false;
    if (inData) continue;
    if (
      /^\s*\.(def|seh_\w+|scl|type|endef|p2align|file|globl|intel_syntax|att_syntax|text|set)\b/.test(
        raw,
      )
    )
      continue;
    if (/^\s*#/.test(raw) || /^@feat\.00|^GCC_except_table/.test(raw.trim()))
      continue;
    if (/^\s*int3\s*$/.test(raw)) continue;
    output.push(
      /^[.\w$@]+:/.test(raw.trim())
        ? raw.trimEnd()
        : raw.replace(/\s+#.*$/, "").trimEnd(),
    );
  }
  return output.filter((line) => line.trim());
}

async function demangle(lines) {
  const symbols = [...new Set(lines.join("\n").match(/_Z[\w$]+/g) ?? [])];
  if (!symbols.length) return lines;
  try {
    const { stdout } = await executeCommand(
      "llvm-cxxfilt",
      symbols,
      null,
      5000,
    );
    const names = stdout.split("\n");
    const replacements = new Map(
      symbols.map((symbol, index) => [symbol, (names[index] || symbol).trim()]),
    );
    return lines.map((line) =>
      line.replace(/_Z[\w$]+/g, (symbol) => replacements.get(symbol) ?? symbol),
    );
  } catch {
    return lines;
  }
}

// C/C++ backend using Clang/LLVM
app.post("/api/analyze/ccpp", async (req, res) => {
  const { source, options = {} } = req.body;
  const language = req.body.language === "c" ? "c" : "cpp";
  const { target = "x86-64", standard = language === "c" ? "c11" : "c++17" } =
    options;

  // Create a temporary directory for this request
  const tempDir = path.join(__dirname, "temp", Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });

  const sourceFile = path.join(
    tempDir,
    `source.${language === "c" ? "c" : "cpp"}`,
  );
  fs.writeFileSync(sourceFile, source);

  try {
    // Lexical analysis: we'll use a simple tokenizer for now (or skip and use frontend's lexer)
    // For now, we'll leave lexical to the frontend and focus on the rest.

    // Syntax analysis: we'll use clang to generate AST (we'll use the frontend's Tree-sitter for visualization)
    // So we skip syntax here too.

    // Check if compiler tools are available before proceeding (try standard, then MSYS2 paths)
    const clangPaths =
      language === "cpp"
        ? [
            "C:\\msys64\\ucrt64\\bin\\clang++.exe",
            "clang++",
            "C:\\Program Files\\LLVM\\bin\\clang++.exe",
          ]
        : [
            "clang",
            "C:\\msys64\\ucrt64\\bin\\clang.exe",
            "C:\\msys64\\clang64.exe",
            "C:\\msys64\\clang.exe",
            "C:\\msys64\\usr\\bin\\clang.exe",
            "C:\\Program Files\\LLVM\\bin\\clang.exe",
          ];
    const optPaths = [
      "opt", // Standard PATH lookup
      "C:\\msys64\\opt.exe",
      "C:\\msys64\\usr\\bin\\opt.exe",
      "C:\\Program Files\\LLVM\\bin\\opt.exe",
    ];
    const llcPaths = [
      "llc", // Standard PATH lookup
      "C:\\msys64\\llc.exe",
      "C:\\msys64\\usr\\bin\\llc.exe",
      "C:\\Program Files\\LLVM\\bin\\llc.exe",
    ];
    const llvmExtractPaths = [
      "llvm-extract",
      "C:\\msys64\\ucrt64\\bin\\llvm-extract.exe",
      "C:\\Program Files\\LLVM\\bin\\llvm-extract.exe",
    ];

    // Check clang availability
    let clangAvailable = false;
    let compilerExecutable = null;
    for (const clangPath of clangPaths) {
      try {
        await executeCommand(clangPath, ["--version"], null, 5000);
        clangAvailable = true;
        compilerExecutable = clangPath;
        break;
      } catch (err) {
        // Try next path
      }
    }

    // Check opt availability
    let optAvailable = false;
    for (const optPath of optPaths) {
      try {
        await executeCommand(optPath, ["--version"], null, 5000);
        optAvailable = true;
        if (!global.optExecutable) global.optExecutable = optPath;
        break;
      } catch (err) {
        // Try next path
      }
    }

    // Check llc availability
    let llcAvailable = false;
    for (const llcPath of llcPaths) {
      try {
        await executeCommand(llcPath, ["--version"], null, 5000);
        llcAvailable = true;
        if (!global.llcExecutable) global.llcExecutable = llcPath;
        break;
      } catch (err) {
        // Try next path
      }
    }

    let llvmExtractExecutable = null;
    for (const llvmExtractPath of llvmExtractPaths) {
      try {
        await executeCommand(llvmExtractPath, ["--version"], null, 5000);
        llvmExtractExecutable = llvmExtractPath;
        break;
      } catch (err) {
        // Try the next installation.
      }
    }

    // Semantic analysis: we'll run clang with -fsyntax-only to get diagnostics
    let semanticResult = {};
    if (clangAvailable) {
      try {
        const { stdout, stderr } = await executeCommand(
          compilerExecutable || "clang",
          ["-fsyntax-only", `-std=${standard}`, "-Wall", "-Wextra", sourceFile],
          null,
          15000,
        );
        semanticResult = {
          checks: [], // We could parse stdout/stderr for warnings
          warnings: [],
          // We don't have a symbol table from clang easily, so we'll leave it empty for now
          symbolTable: [],
        };
      } catch (err) {
        semanticResult = {
          checks: [],
          warnings: [],
          symbolTable: [],
        };
      }
    } else {
      semanticResult = {
        checks: [],
        warnings: [],
        symbolTable: [],
      };
    }

    // Intermediate code generation: LLVM IR
    let irResult = {};
    const irFile = path.join(tempDir, "intermediate.ll");
    if (clangAvailable) {
      try {
        const irArgs = (extra) => [
          `-std=${standard}`,
          "-S",
          "-emit-llvm",
          "-O0",
          "-Xclang",
          "-disable-O0-optnone",
          "-fno-discard-value-names",
          ...extra,
          "-o",
          "-",
          sourceFile,
        ];
        let irOutput;
        try {
          irOutput = await executeCommand(
            compilerExecutable || "clang",
            irArgs(["-fno-exceptions"]),
            null,
            30000,
          );
        } catch {
          irOutput = await executeCommand(
            compilerExecutable || "clang",
            irArgs([]),
            null,
            30000,
          );
        }
        const fullIR = irOutput.stdout;

        const userFunctions = [];
        for (const line of fullIR.split("\n")) {
          const match = /^define\b(.*)@([\w.$]+)\(/.exec(line);
          if (
            match &&
            !/linkonce_odr|available_externally|internal/.test(match[1])
          ) {
            userFunctions.push(match[2]);
          }
        }

        let irText = fullIR;
        if (llvmExtractExecutable && userFunctions.length > 0) {
          const fullFile = path.join(tempDir, "full.ll");
          fs.writeFileSync(fullFile, fullIR);
          try {
            const { stdout: extractedIR } = await executeCommand(
              llvmExtractExecutable,
              [
                "-S",
                ...userFunctions.map((name) => `--func=${name}`),
                fullFile,
                "-o",
                "-",
              ],
              null,
              15000,
            );
            if (extractedIR.trim()) irText = extractedIR;
          } catch (err) {
            console.warn(
              "llvm-extract failed; retaining full LLVM IR:",
              String(err.stderr || err.error?.message || err.message),
            );
          }
        }

        irResult = {
          instructions: irText.split("\n").filter((line) => line.trim()),
        };
        fs.writeFileSync(irFile, irText);
      } catch (err) {
        const message = String(err.stderr || err.error?.message || err.message);
        fs.rmSync(tempDir, { recursive: true, force: true });
        return res.json({
          status: "failed",
          mode: "clang-llvm",
          language,
          diagnostics: [{ phase: "intermediate", message }],
          phases: {
            lexical: { status: "completed" },
            syntax: { status: "completed" },
            semantic: {
              status: "completed",
              checks: [],
              warnings: [message],
              symbolTable: [],
            },
            intermediate: {
              status: "failed",
              diagnostic: { phase: "intermediate", message },
              instructions: [],
            },
            optimization: {
              status: "not_run",
              before: [],
              after: [],
              passes: [],
              reason: "IR generation failed, so there was nothing to optimize.",
            },
            target: {
              status: "not_run",
              reason: "IR generation failed, so no assembly was produced.",
            },
          },
        });
      }
    } else {
      const message =
        "Clang compiler not found. Please install LLVM/Clang toolchain.";
      fs.rmSync(tempDir, { recursive: true, force: true });
      return res.json({
        status: "failed",
        mode: "clang-llvm",
        language,
        diagnostics: [{ phase: "intermediate", message }],
        phases: {
          lexical: { status: "completed" },
          syntax: { status: "completed" },
          semantic: {
            status: "completed",
            checks: [],
            warnings: [message],
            symbolTable: [],
          },
          intermediate: {
            status: "failed",
            diagnostic: { phase: "intermediate", message },
            instructions: [],
          },
          optimization: {
            status: "not_run",
            before: [],
            after: [],
            passes: [],
            reason: "IR generation failed, so there was nothing to optimize.",
          },
          target: {
            status: "not_run",
            reason: "IR generation failed, so no assembly was produced.",
          },
        },
      });
    }

    // Keep the generated IR available to llc even when opt is unavailable.
    // Optimization: run opt on the LLVM IR
    let optResult = {};
    if (clangAvailable && optAvailable) {
      try {
        // First, write IR to a file
        // Run opt with -O2
        const { stdout } = await executeCommand(
          global.optExecutable || "opt",
          ["-O2", "-S", irFile, "-o", "-"],
          null,
          15000,
        );
        optResult = {
          before: irResult.instructions,
          after: stdout.split("\n").filter((line) => line.trim()),
          passes: ["-O2"],
          note: "LLVM IR optimized with -O2",
        };
        fs.writeFileSync(irFile, stdout);
      } catch (err) {
        optResult = {
          before: irResult.instructions,
          after: irResult.instructions,
          passes: [],
          note: `Optimization failed: ${err.stderr || err.error.message}`,
        };
      }
    } else {
      optResult = {
        before: irResult.instructions,
        after: irResult.instructions,
        passes: [],
        note: "LLVM opt tool not found. Please install LLVM toolchain.",
      };
    }

    // Target code generation: assembly
    let targetResult = {};
    if (clangAvailable && llcAvailable) {
      try {
        const { stdout } = await executeCommand(
          global.llcExecutable || "llc",
          [
            `-march=${target}`,
            "-O2",
            "-x86-asm-syntax=intel",
            "-o",
            "-",
            path.join(tempDir, "intermediate.ll"),
          ],
          null,
          15000,
        );
        targetResult = {
          targetLabel: `Assembly (${target})`,
          instructions: stdout.split("\n").filter((line) => line.trim()),
        };
      } catch (err) {
        targetResult = {
          targetLabel: `Assembly (${target})`,
          instructions: [
            `; Error generating assembly: ${err.stderr || err.error.message}`,
          ],
        };
      }
    } else {
      targetResult = {
        targetLabel: `Assembly (${target})`,
        instructions: [`; LLC tool not found. Please install LLVM toolchain.`],
      };
    }

    irResult.instructions = await demangle(cleanIR(irResult.instructions));
    optResult.before = await demangle(cleanIR(optResult.before));
    optResult.after = await demangle(cleanIR(optResult.after));
    targetResult.instructions = await demangle(
      cleanAsm(targetResult.instructions),
    );

    // Clean up temp directory
    setTimeout(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }, 5000);

    // Return the result in the expected format
    res.json({
      status: "completed",
      mode: "clang-llvm",
      language,
      diagnostics: [], // We could collect warnings from semantic step
      phases: {
        lexical: { status: "completed" }, // Placeholder - frontend handles lexical
        syntax: { status: "completed" }, // Placeholder - frontend handles syntax
        semantic: {
          status: "completed",
          ...semanticResult,
        },
        intermediate: {
          status: "completed",
          representation: "LLVM IR",
          ...irResult,
        },
        optimization: {
          status: "completed",
          ...optResult,
        },
        target: {
          status: "completed",
          ...targetResult,
        },
      },
    });
  } catch (err) {
    // Clean up on error
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error("Backend error:", err);
    res.status(500).json({
      status: "failed",
      error: err.message || "Unknown error",
    });
  }
});

// Java backend using javac/javap
app.post("/api/analyze/java", async (req, res) => {
  const { source, options = {} } = req.body;
  const { target = "jvm", standard = "java17" } = options;

  // Create a temporary directory for this request
  const tempDir = path.join(__dirname, "temp", Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });

  // Determine class name from source (simplified - looks for public class)
  let className = "Main";
  const classMatch = source.match(/public\s+class\s+(\w+)/);
  if (classMatch) {
    className = classMatch[1];
  }

  const sourceFile = path.join(tempDir, `${className}.java`);
  fs.writeFileSync(sourceFile, source);

  try {
    // For Java, we'll handle all phases through javac/javap

    // Lexical and Syntax analysis: handled by frontend or we can skip for now
    // Semantic analysis: javac provides this through compilation errors/warnings
    let semanticResult = {};
    try {
      // Compile with javac to get semantic errors/warnings
      const javaVersion = standard.replace("java", "") || "17";
      const { stdout, stderr } = await executeCommand(
        "javac",
        [`--release=${javaVersion}`, sourceFile],
        null,
        15000,
      );

      // If compilation succeeds, we have no semantic errors
      // Parse stderr for warnings
      semanticResult = {
        checks: [],
        warnings: stderr
          .split("\n")
          .filter((line) => line.trim() && line.includes("warning"))
          .map((line) => ({ message: line.trim() })),
        symbolTable: {}, // Simplified - we don't extract full symbol table from javac easily
      };
    } catch (err) {
      // Compilation failed - semantic errors
      semanticResult = {
        checks: [],
        warnings: [],
        symbolTable: {},
      };

      // If it's a compilation error, we still want to continue to show what we can
      // But we'll mark that semantic phase had issues
    }

    // Intermediate code generation: javap -bytecode for JVM bytecode
    let irResult = {};
    try {
      // First compile to .class file
      const javaVersion = standard.replace("java", "") || "17";
      await executeCommand(
        "javac",
        [`--release=${javaVersion}`, sourceFile],
        null,
        15000,
      );

      // Then disassemble with javap
      const { stdout } = await executeCommand(
        "javap",
        ["-c", "-classpath", tempDir, className],
        null,
        15000,
      );

      irResult = {
        instructions: stdout.split("\n").filter((line) => line.trim()),
      };
    } catch (err) {
      irResult = {
        instructions: [
          `; Error generating JVM bytecode: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Optimization: For Java, we note that JIT optimization happens at runtime
    // We'll show the bytecode before and after as the same since we can't easily
    // show JVM optimization without complex profiling tools
    let optResult = {
      before: irResult.instructions,
      after: irResult.instructions,
      passes: ["JIT (runtime)"],
      note: "Java bytecode - optimization performed by JIT at runtime",
    };
    let textbookResult = null;
    try {
      textbookResult = await textbook("java", source);
      semanticResult = { ...semanticResult, ...textbookResult.semantic };
      optResult = {
        before: textbookResult.tac.split(/\r?\n/).filter(Boolean),
        after: textbookResult.optimized.split(/\r?\n/).filter(Boolean),
        passes: textbookResult.passes,
        note: "Shared textbook TAC optimization; JVM bytecode remains available as the target view.",
      };
    } catch (error) {
      console.warn("Shared Java TAC generation failed:", error.message);
    }

    // Target code generation: JVM bytecode is already our "intermediate"
    // For Java, the JVM bytecode is both intermediate and target
    let targetResult = {};
    try {
      targetResult = {
        targetLabel: `JVM Bytecode (${standard})`,
        instructions: irResult.instructions,
      };
    } catch (err) {
      targetResult = {
        targetLabel: `JVM Bytecode (${standard})`,
        instructions: [
          `; Error processing target: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Clean up temp directory
    setTimeout(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }, 5000);

    // Return the result in the expected format
    res.json({
      status: "completed",
      mode: "javac-javap",
      language: req.body.language || "java",
      diagnostics: [], // We could collect warnings from semantic step
      phases: {
        lexical: { status: "completed" }, // Placeholder - frontend handles lexical
        syntax: { status: "completed" }, // Placeholder - frontend handles syntax
        semantic: {
          status: "completed",
          ...semanticResult,
        },
        intermediate: {
          status: "completed",
          representation: textbookResult ? "TAC" : "JVM Bytecode",
          instructions: textbookResult
            ? textbookResult.tac.split(/\r?\n/).filter(Boolean)
            : irResult.instructions,
          bytecodeInstructions: irResult.instructions,
        },
        optimization: {
          status: "completed",
          ...optResult,
        },
        target: {
          status: "completed",
          ...targetResult,
        },
      },
    });
  } catch (err) {
    // Clean up on error
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error("Backend error:", err);
    res.status(500).json({
      status: "failed",
      error: err.message || "Unknown error",
    });
  }
});

// Python backend using ast/dis
app.post("/api/analyze/python", async (req, res) => {
  const { source, options = {} } = req.body;
  const { target = "cpython", standard = "python3" } = options;

  // Create a temporary directory for this request
  const tempDir = path.join(__dirname, "temp", Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });

  const sourceFile = path.join(tempDir, "source.py");
  fs.writeFileSync(sourceFile, source);

  try {
    // For Python, we'll handle all phases through ast and dis

    // Lexical and Syntax analysis: Python ast module handles this
    let semanticResult = {};
    try {
      const script =
        "import ast, json, sys; source = open(sys.argv[1], 'r').read(); tree = ast.parse(source); result = {'checks': [], 'warnings': [], 'symbolTable': {}}; print(json.dumps(result))";
      const { stdout } = await executeCommand(
        "python3",
        ["-c", script, sourceFile],
        null,
        10000,
      );

      semanticResult = JSON.parse(stdout.trim());
    } catch (err) {
      semanticResult = {
        checks: [],
        warnings: [
          { message: `Syntax error: ${err.stderr || err.error.message}` },
        ],
        symbolTable: {},
      };
    }

    // Intermediate code generation: Python dis module for bytecode
    let irResult = {};
    try {
      const disScript = `
import dis, sys, json, io, contextlib
source = open(sys.argv[1], 'r').read()
buffer = io.StringIO()
with contextlib.redirect_stdout(buffer):
    dis.dis(source)
result = {
  "instructions": [line for line in buffer.getvalue().splitlines() if line.strip()]
}
print(json.dumps(result))
`.trim();
      const disScriptPath = path.join(tempDir, "dis_script.py");
      fs.writeFileSync(disScriptPath, disScript, "utf8");
      const { stdout } = await executeCommand(
        "python3",
        [disScriptPath, sourceFile],
        null,
        10000,
      );

      irResult = JSON.parse(stdout.trim());
    } catch (err) {
      irResult = {
        instructions: [
          `; Error generating Python bytecode: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Optimization: For Python, we note that optimization is limited (mostly constant folding at compile time)
    // We'll show the bytecode as-is since we can't easily show optimization without complex tools
    let optResult = {
      before: irResult.instructions,
      after: irResult.instructions,
      passes: ["Python compile-time optimizations"],
      note: "Python bytecode - limited compile-time optimization available",
    };

    // Target code generation: Python bytecode is our target
    let targetResult = {};
    try {
      targetResult = {
        targetLabel: `Python Bytecode (${standard})`,
        instructions: irResult.instructions,
      };
    } catch (err) {
      targetResult = {
        targetLabel: `Python Bytecode (${standard})`,
        instructions: [
          `; Error processing target: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Clean up temp directory
    setTimeout(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }, 5000);

    // Return the result in the expected format
    res.json({
      status: "completed",
      mode: "python-ast-dis",
      language: req.body.language || "python",
      diagnostics: [], // We could collect warnings from semantic step
      phases: {
        lexical: { status: "completed" }, // Placeholder - frontend handles lexical
        syntax: { status: "completed" }, // Placeholder - frontend handles syntax
        semantic: {
          status: "completed",
          ...semanticResult,
        },
        intermediate: {
          status: "completed",
          representation: "Python Bytecode",
          ...irResult,
        },
        optimization: {
          status: "completed",
          ...optResult,
        },
        target: {
          status: "completed",
          ...targetResult,
        },
      },
    });
  } catch (err) {
    // Clean up on error
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error("Backend error:", err);
    res.status(500).json({
      status: "failed",
      error: err.message || "Unknown error",
    });
  }
});

// JavaScript backend using Node.js AST
app.post("/api/analyze/javascript", async (req, res) => {
  const { source, options = {} } = req.body;
  const { target = "nodejs", standard = "es2022" } = options;

  // Create a temporary directory for this request
  const tempDir = path.join(__dirname, "temp", Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });

  const sourceFile = path.join(tempDir, "source.js");
  fs.writeFileSync(sourceFile, source);

  try {
    // For JavaScript, we'll use Node.js to parse and generate basic info
    // Lexical and Syntax analysis: handled by frontend or we can use Node.js acorn for parsing
    let semanticResult = {};
    try {
      const { stdout } = await executeCommand(
        "node",
        [
          "-e",
          `const acorn = require('acorn');
        const fs = require('fs');
        const source = fs.readFileSync(process.argv[2], 'utf8');
        try {
          const ast = acorn.parse(source, { ecmaVersion: 2022, sourceType: 'script' });
          // Basic semantic info
          const checks = [];
          const warnings = [];
          const symbolTable = {};
          // We could walk the AST to collect identifiers, but keep simple for now
          console.log(JSON.stringify({ checks, warnings, symbolTable }));
        } catch (e) {
          console.log(JSON.stringify({ checks: [], warnings: [{ message: e.message }], symbolTable: {} }));
        }
        `,
          sourceFile,
        ],
        null,
        10000,
      );

      semanticResult = JSON.parse(stdout.trim());
    } catch (err) {
      semanticResult = {
        checks: [],
        warnings: [
          { message: `Syntax error: ${err.stderr || err.error.message}` },
        ],
        symbolTable: {},
      };
    }

    // Intermediate code generation: we could use acorn to walk and produce TAC-like IR
    // For simplicity, we'll rely on frontend's IR generation or produce a placeholder
    let irResult = {};
    try {
      const { stdout } = await executeCommand(
        "node",
        [
          "-e",
          `const acorn = require('acorn');
        const fs = require('fs');
        const source = fs.readFileSync(process.argv[2], 'utf8');
        const ast = acorn.parse(source, { ecmaVersion: 2022, sourceType: 'script' });
        // Very basic TAC generation placeholder
        const instructions = [
          '; JavaScript TAC generation (placeholder)',
          '; In a full implementation, we would walk the AST to generate three-address code',
          '; For now, we show that parsing succeeded'
        ];
        console.log(JSON.stringify({ instructions }));
        `,
          sourceFile,
        ],
        null,
        10000,
      );

      irResult = JSON.parse(stdout.trim());
    } catch (err) {
      irResult = {
        instructions: [
          `; Error generating JavaScript TAC: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Optimization: Note that JavaScript engines optimize at runtime (JIT)
    let optResult = {
      before: irResult.instructions,
      after: irResult.instructions,
      passes: ["JIT (runtime)"],
      note: "JavaScript bytecode - optimization performed by JIT at runtime",
    };

    // Target code generation: we can use Node.js to produce bytecode via v8::Compile? Not trivial.
    // We'll show that the target is the same as intermediate for now, or note that V8 bytecode is internal.
    let targetResult = {};
    try {
      targetResult = {
        targetLabel: `V8 Bytecode (${standard})`,
        instructions: irResult.instructions,
      };
    } catch (err) {
      targetResult = {
        targetLabel: `V8 Bytecode (${standard})`,
        instructions: [
          `; Error processing target: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Clean up temp directory
    setTimeout(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }, 5000);

    // Return the result in the expected format
    res.json({
      status: "completed",
      mode: "node-acorn",
      language: req.body.language || "javascript",
      diagnostics: [],
      phases: {
        lexical: { status: "completed" },
        syntax: { status: "completed" },
        semantic: {
          status: "completed",
          ...semanticResult,
        },
        intermediate: {
          status: "completed",
          representation: "JavaScript TAC",
          ...irResult,
        },
        optimization: {
          status: "completed",
          ...optResult,
        },
        target: {
          status: "completed",
          ...targetResult,
        },
      },
    });
  } catch (err) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error("Backend error:", err);
    res.status(500).json({
      status: "failed",
      error: err.message || "Unknown error",
    });
  }
});

// TypeScript backend using tsc
app.post("/api/analyze/typescript", async (req, res) => {
  const { source, options = {} } = req.body;
  const { target = "es2022", standard = "typescript5.0" } = options;

  // Create a temporary directory for this request
  const tempDir = path.join(__dirname, "temp", Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });

  const sourceFile = path.join(tempDir, "source.ts");
  fs.writeFileSync(sourceFile, source);

  try {
    // For TypeScript, we'll use tsc to check and emit JS
    // Semantic analysis: tsc provides type checking
    let semanticResult = {};
    try {
      const { stdout, stderr } = await executeCommand(
        "tsc",
        ["--noEmit", "--target", target, sourceFile],
        null,
        15000,
      );

      // If no error, semantic checks passed
      semanticResult = {
        checks: [],
        warnings: stderr
          .split("\n")
          .filter((line) => line.trim() && line.includes("warning"))
          .map((line) => ({ message: line.trim() })),
        symbolTable: {},
      };
    } catch (err) {
      // Compilation failed - semantic errors
      semanticResult = {
        checks: [],
        warnings: [],
        symbolTable: {},
      };
    }

    // Intermediate code generation: we can use tsc to emit JS and then treat that as source for further analysis
    // For simplicity, we'll consider the emitted JavaScript as intermediate representation
    let irResult = {};
    try {
      const { stdout } = await executeCommand(
        "tsc",
        ["--target", target, "--outDir", tempDir, sourceFile],
        null,
        15000,
      );

      // Read the emitted JS file
      const emittedFile = path.join(
        tempDir,
        path.basename(sourceFile, ".ts") + ".js",
      );
      if (fs.existsSync(emittedFile)) {
        const emittedCode = fs.readFileSync(emittedFile, "utf8");
        irResult = {
          instructions: [
            `// Emitted JavaScript from TypeScript compilation:\n${emittedCode}`,
          ],
        };
      } else {
        irResult = {
          instructions: [`; No JavaScript emitted`],
        };
      }
    } catch (err) {
      irResult = {
        instructions: [
          `; Error emitting JavaScript: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Optimization: Note that TypeScript emits JavaScript which is then JIT optimized
    let optResult = {
      before: irResult.instructions,
      after: irResult.instructions,
      passes: ["TypeScript to JavaScript transpilation"],
      note: "TypeScript compiled to JavaScript - optimization performed by JS engine JIT at runtime",
    };

    // Target code generation: JavaScript bytecode is our target
    let targetResult = {};
    try {
      targetResult = {
        targetLabel: `JavaScript Bytecode (from TypeScript, ${standard})`,
        instructions: irResult.instructions,
      };
    } catch (err) {
      targetResult = {
        targetLabel: `JavaScript Bytecode (from TypeScript, ${standard})`,
        instructions: [
          `; Error processing target: ${err.stderr || err.error.message}`,
        ],
      };
    }

    // Clean up temp directory
    setTimeout(() => {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }, 5000);

    // Return the result in the expected format
    res.json({
      status: "completed",
      mode: "typescript-tsc",
      language: req.body.language || "typescript",
      diagnostics: [],
      phases: {
        lexical: { status: "completed" },
        syntax: { status: "completed" },
        semantic: {
          status: "completed",
          ...semanticResult,
        },
        intermediate: {
          status: "completed",
          representation: "TypeScript -> JavaScript",
          ...irResult,
        },
        optimization: {
          status: "completed",
          ...optResult,
        },
        target: {
          status: "completed",
          ...targetResult,
        },
      },
    });
  } catch (err) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.error("Backend error:", err);
    res.status(500).json({
      status: "failed",
      error: err.message || "Unknown error",
    });
  }
});

// SQL backend using a simple parser (we'll use a placeholder since we don't have a SQL parser binary)
// In a full implementation, we could use postgres parser or sqlparse
app.post("/api/analyze/sql", async (req, res) => {
  const { source, options = {} } = req.body;
  const { target = "postgresql", standard = "sql:2016" } = options;

  // For SQL, we'll rely on the frontend's SQL module for most phases
  // but we can provide a basic validation using a simple regex or note that it's handled frontend
  try {
    // We'll return a completed result with placeholder data indicating SQL is handled by frontend
    // In reality, we could integrate with a SQL parser like pg-query-parser or use a database to EXPLAIN
    res.json({
      status: "completed",
      mode: "sql-frontend",
      language: req.body.language || "sql",
      diagnostics: [],
      phases: {
        lexical: { status: "completed" },
        syntax: { status: "completed" },
        semantic: {
          status: "completed",
          checks: [],
          warnings: [],
          symbolTable: {},
        },
        intermediate: {
          status: "completed",
          representation: "Logical Query Plan",
          instructions: [
            "; SQL analysis handled by frontend educational module",
          ],
        },
        optimization: {
          status: "completed",
          before: ["; SQL analysis handled by frontend educational module"],
          after: ["; SQL analysis handled by frontend educational module"],
          passes: [],
          note: "SQL optimization handled by frontend educational module",
        },
        target: {
          status: "completed",
          targetLabel: "SQL Execution Plan",
          instructions: [
            "; SQL target code handled by frontend educational module",
          ],
        },
      },
    });
  } catch (err) {
    console.error("SQL backend error:", err);
    res.status(500).json({
      status: "failed",
      error: err.message || "Unknown error",
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Compiler backend server listening at http://localhost:${port}`);
});

module.exports = app;
