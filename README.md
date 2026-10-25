# Compiler Design Visualizer

Compiler Design Visualizer is an educational browser workbench for exploring how source code moves through a compiler pipeline. Instead of showing only a final executable or result, it exposes six stages independently:

1. Lexical analysis
2. Syntax analysis
3. Semantic analysis
4. Intermediate code generation
5. Optimization
6. Target code generation

The project is designed for compiler-design coursework, demonstrations, and experimentation. It combines a browser-based visualizer, educational language implementations, Tree-sitter syntax inspection, and an optional local Node.js backend for deeper compiler-tool integrations.

> **Important:** This is an educational visualizer, not a production compiler or a secure code-execution service. Some outputs are genuine compiler output, while others are deliberately labeled educational representations or generic syntax traces.

## Contents

- [What the project does](#what-the-project-does)
- [Current status](#current-status)
- [Features](#features)
- [Supported languages](#supported-languages)
- [How the pipeline works](#how-the-pipeline-works)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Installation](#installation)
- [Running the application](#running-the-application)
- [Using the visualizer](#using-the-visualizer)
- [Backend API](#backend-api)
- [Backend and fallback behavior](#backend-and-fallback-behavior)
- [Output terminology](#output-terminology)
- [Development workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Limitations and roadmap](#limitations-and-roadmap)
- [Security and deployment considerations](#security-and-deployment-considerations)

## What the project does

The application provides a source editor and a phase-by-phase result feed. A user can select a language, load a built-in example, paste or upload source code, and run the complete pipeline. The interface then exposes the intermediate artifacts produced by each phase:

- Tokens and lexical diagnostics
- A textual and graphical abstract syntax tree
- Symbol/declaration summaries and semantic checks
- Three-address code (TAC), a node trace, or another intermediate representation
- Before/after optimization output and named optimization passes
- Educational pseudo-assembly, LLVM-derived output, JVM-oriented output, a query-plan-style result, or another explicitly labeled target representation

The visualizer keeps syntax validation centralized around Tree-sitter for the browser-supported grammars. Language-specific educational modules are used where their subset parser can represent the program. When syntax is valid but the educational parser cannot lower a construct, the application uses a bounded generic Tree-sitter fallback rather than pretending that it produced a complete language-specific compilation.

## Current status

The modular browser application, six-phase result contract, language registry, Tree-sitter integration, interactive AST/CFG views, file upload flow, and local Express backend are implemented.

The C and C++ server route can integrate with Clang/LLVM when the required tools are installed. Java, Python, JavaScript, TypeScript, and SQL also have backend routes, but their behavior varies from compiler-tool integration to textbook/educational output. The [project status and architecture document](./PROJECT_STATUS_AND_ARCHITECTURE.md) is the authoritative detailed status record.

The older [Compiler Design Visualizer.html](./Compiler%20Design%20Visualizer.html) page is a legacy standalone fixture and is not the primary application entry point. Use [index.html](./index.html).

## Features

### Browser workbench

- Dark compiler-workbench interface with responsive layout
- Language selector and built-in examples
- Source editor with synchronized line numbers
- Character and line statistics
- Source upload and drag-and-drop handling
- Copy and clear controls
- Error-line highlighting
- Keyboard-accessible controls and status announcements

### Pipeline visualization

- Six phase status strip
- Incremental phase execution and animated result feed
- Phase-specific rendering
- Active phase selection
- Explicit statuses: pending, running, completed, partial, failed, and not run
- Diagnostic phase, line, and column information where available

### Analysis views

- Token tables
- AST text and interactive AST tree
- Symbol tables and semantic checks
- Three-address code
- Optimization comparisons
- Control-flow graph rendering where the result supports it
- Target output and capability notes

### Language coverage

The registry currently contains C, C++, Java, Python, JavaScript, TypeScript, and SQL. Each module supplies examples and educational phase implementations; several also expose a backend adapter that the runner attempts before falling back to the browser implementation.

## Supported languages

| Language | Browser grammar | Educational frontend | Backend route | Current target/output scope |
| --- | --- | --- | --- | --- |
| C | Tree-sitter C WASM | Yes | `/api/analyze/ccpp` | Clang/LLVM output when tools are available; otherwise frontend fallback |
| C++ | Tree-sitter C++ WASM | Yes, using a C-derived subset | `/api/analyze/ccpp` | Clang/LLVM output when tools are available; otherwise frontend fallback |
| Java | Tree-sitter Java WASM | Yes | `/api/analyze/java` | JVM-oriented analysis when local Java tools are available |
| Python | Tree-sitter Python WASM | Yes, including indentation-aware lexing | `/api/compile` and `/api/analyze/python` | Textbook TAC/backend output; not native machine code |
| JavaScript | Tree-sitter JavaScript WASM | Yes | `/api/compile` and `/api/analyze/javascript` | Educational/runtime-oriented output |
| TypeScript | Tree-sitter TypeScript WASM | Yes | `/api/compile` and `/api/analyze/typescript` | TypeScript-to-JavaScript-oriented output |
| SQL | No shared browser Tree-sitter grammar currently used | Yes | `/api/analyze/sql` | Educational logical/query-plan-style output |

Support means that the language is registered and can be inspected; it does not mean that every legal feature is handled by every phase.

## How the pipeline works

### 1. Lexical analysis

The selected language lexer converts source text into tokens and reports lexical errors. The UI displays token type, lexeme, and source position where the language module provides them.

### 2. Syntax analysis

The browser loads the appropriate Tree-sitter WASM grammar and parses the source. Syntax errors and missing nodes stop the pipeline with a diagnostic. If the language-specific educational parser can represent the valid source, its AST is used; otherwise the Tree-sitter AST is retained for visualization.

### 3. Semantic analysis

Language-specific semantic passes produce symbol tables, checks, and warnings for their supported subsets. Generic fallback analysis reports declaration-like syntax nodes and explicitly warns that full type and scope rules were not inferred.

### 4. Intermediate code

Supported educational subsets may produce TAC or a comparable instruction list. Generic fallback mode produces a bounded Tree-sitter node trace. A node trace is an inspection artifact, not genuine TAC.

### 5. Optimization

Language-specific optimizers may perform transformations such as constant folding, propagation, dead-code handling, or control-flow cleanup. Generic fallback mode only performs trace-level cleanup, such as removing adjacent duplicate node entries.

### 6. Target code

The final view is always labeled according to its source. It may contain Clang/LLVM-derived assembly, educational pseudo-assembly, a JVM-oriented representation, a runtime/interpreter-oriented output, a logical query plan, or a generic syntax trace. JavaScript JIT output and Python bytecode must not be interpreted as stable native machine code.

## Architecture

```text
index.html
  |
  +-- css/style.css
  +-- js/bundle.js                  Generated browser bundle
        |
        +-- js/main.js              UI/application wiring
              |
              +-- js/core/runner.js
                    |
                    +-- language backend, when available
                    +-- lexer
                    +-- Tree-sitter syntax parser
                    +-- educational parser or generic AST fallback
                    +-- semantic analysis
                    +-- IR/TAC
                    +-- optimization
                    +-- target output

server/index.js                     Optional local Express backend
  |
  +-- compiler tools and textbook TAC adapters
  +-- normalized phase responses
```

### Frontend modules

- [`js/main.js`](./js/main.js) initializes controls, language selection, editor events, and pipeline execution.
- [`js/core/contract.js`](./js/core/contract.js) defines the shared result schema, phase order, and status values.
- [`js/core/runner.js`](./js/core/runner.js) attempts a backend first, then executes the browser pipeline and propagates failures.
- [`js/core/tree-sitter.js`](./js/core/tree-sitter.js) loads browser WASM runtimes/grammars, parses source, and converts trees for the UI.
- [`js/core/tree-sitter-pipeline.js`](./js/core/tree-sitter-pipeline.js) provides generic semantic, IR, optimization, and target fallbacks.
- [`js/languages/index.js`](./js/languages/index.js) is the language registry.
- [`js/languages/`](./js/languages/) contains per-language lexers, parsers, semantic passes, IR generators, optimizers, code generators, examples, and backend adapters.
- [`js/ui/editor.js`](./js/ui/editor.js) owns source editing, uploads, line numbers, statistics, and error highlighting.
- [`js/ui/pipeline.js`](./js/ui/pipeline.js) renders the phase strip.
- [`js/ui/feed.js`](./js/ui/feed.js) manages phase cards and live updates.
- [`js/ui/renderer.js`](./js/ui/renderer.js) renders phase-specific result content.
- [`js/ui/ast-tree.js`](./js/ui/ast-tree.js) renders the interactive AST.
- [`js/ui/cfg.js`](./js/ui/cfg.js) renders control-flow graphs.
- [`js/ui/animator.js`](./js/ui/animator.js) animates TAC steps.

### Shared result contract

Every run follows the structure defined in [`js/core/contract.js`](./js/core/contract.js):

```js
{
  schemaVersion: "2.0",
  runId: "run-...",
  mode: "live" | "backend",
  language: "c",
  sourceHash: "........",
  status: "pending" | "completed" | "partial" | "failed",
  phases: {
    lexical: { status: "..." },
    syntax: { status: "..." },
    semantic: { status: "..." },
    intermediate: { status: "..." },
    optimization: { status: "..." },
    target: { status: "..." }
  },
  diagnostics: []
}
```

The runner marks downstream phases as `not_run` after an upstream failure. A backend response is merged with browser lexical and Tree-sitter syntax data so the UI remains useful even when later phases come from an external compiler.

## Repository layout

```text
compiler_project/
├── index.html                         Primary browser entry point
├── README.md                           This guide
├── PROJECT_STATUS_AND_ARCHITECTURE.md  Detailed status and roadmap
├── UI_UX_SPECIFICATION_AND_REDESIGN_PLAN.md
├── package.json                         Scripts and dependencies
├── css/style.css                       Application styles
├── js/
│   ├── main.js                         Frontend entry point
│   ├── bundle.js                       Generated browser bundle
│   ├── core/                           Contract, runner, errors, Tree-sitter
│   ├── languages/                      Language implementations
│   └── ui/                             Editor and result components
├── server/
│   ├── index.js                        Express API and compiler adapters
│   └── tac/                            Textbook TAC implementation
└── vendor/tree-sitter/                 Browser WASM runtime and grammars
```

Generated/request artifacts may appear under `server/temp/` or `test_temp/` during local development. They should not be treated as source.

## Requirements

### Required

- Node.js with npm
- A modern browser with WebAssembly support
- A local HTTP server for the browser assets

### Optional

- Clang/LLVM tools for C/C++ backend output
- A JDK (`javac` and `javap`) for Java backend output
- Python for the optional static file server command
- Platform-specific compiler/runtime tools used by any backend route

The browser frontend still has educational fallback behavior when optional compiler tools are unavailable, but the local server is required for the backend requests and reliable WASM loading.

## Installation

From the repository root:

```powershell
npm install
npm run build
```

`npm install` installs the runtime and development dependencies listed in [`package.json`](./package.json), including Express, esbuild, Tree-sitter grammars, and the browser Tree-sitter runtime.

## Running the application

### Recommended: run both services

```powershell
npm start
```

This runs:

- The Express compiler backend at `http://localhost:4174`
- A static HTTP server for the browser at `http://localhost:4173`

Open [http://localhost:4173/index.html](http://localhost:4173/index.html).

### Run services separately

Backend:

```powershell
node server/index.js
```

Frontend static server:

```powershell
python -m http.server 4173
```

If Python is not installed, use another static server that serves the repository root. Do not rely on opening `index.html` directly with `file://`; browser WASM loading and backend requests are more reliable over HTTP.

### Rebuild after frontend changes

The source modules are bundled into `js/bundle.js`:

```powershell
npm run build
```

Run this after changing `js/main.js`, `js/core/`, `js/languages/`, or `js/ui/`. The checked-in bundle is the file loaded by [index.html](./index.html).

## Using the visualizer

1. Start the application with `npm start`.
2. Open `http://localhost:4173/index.html`.
3. Choose a target language.
4. Select a built-in example or paste source code into the editor.
5. Optionally upload a supported file (`.c`, `.h`, `.cpp`, `.hpp`, `.cc`, `.cxx`, `.java`, `.py`, `.js`, `.mjs`, `.ts`, or `.sql`).
6. Click **Analyze**.
7. Select a phase in the pipeline strip to focus its output.
8. Inspect the phase card, diagnostics, AST, symbols, IR, optimization comparison, or target representation.
9. Change the source and analyze again; the feed marks previous results stale until the next run.

The built-in examples intentionally include valid programs, optimization examples, control flow, syntax errors, and semantic errors. They are useful smoke tests for the UI and for demonstrating how failures prevent downstream phases from running.

## Backend API

The server listens on port `4174` by default. Set `PORT` to use another port:

```powershell
$env:PORT=5000
node server/index.js
```

The frontend backend adapters currently use `http://localhost:4174`. If you change the port, update the adapter configuration or run the server on the default port.

### Health check

```http
GET /health
```

Response:

```json
{"status":"ok"}
```

### Shared textbook TAC endpoint

```http
POST /api/compile
Content-Type: application/json
```

Request:

```json
{
  "language": "python",
  "source": "x = 1 + 2"
}
```

The route accepts `python`, `javascript`, `typescript`, `java`, `c`, and `cpp`. It returns normalized phase fields with TAC instructions, optimization before/after lists, and target instructions. The route is educational and should not be treated as a universal compiler.

### C/C++ endpoint

```http
POST /api/analyze/ccpp
Content-Type: application/json
```

Request:

```json
{
  "language": "cpp",
  "source": "int main() { return 0; }",
  "options": {
    "target": "x86-64",
    "standard": "c++17"
  }
}
```

The route creates a temporary source workspace, probes for Clang/LLVM tools, and returns normalized phase output. Exact fields depend on tool availability and compiler diagnostics.

### Other language routes

The server also exposes:

- `POST /api/analyze/java`
- `POST /api/analyze/python`
- `POST /api/analyze/javascript`
- `POST /api/analyze/typescript`
- `POST /api/analyze/sql`

All routes accept JSON with at least a `source` property and return a phase-oriented response. Their representations are intentionally labeled by the server (`mode`, `representation`, `targetLabel`, and `note`) so consumers can distinguish compiler output from educational output.

## Backend and fallback behavior

For a language module with a backend adapter, [`runPipeline`](./js/core/runner.js) follows this sequence:

1. Request the local backend.
2. If a backend result is returned, preserve it for semantic and later phases.
3. Always obtain browser lexical and Tree-sitter syntax data for the UI.
4. If the backend request fails, log the failure and continue with the frontend educational pipeline.
5. If the language-specific parser cannot lower valid syntax, use the generic Tree-sitter fallback.

This makes the browser useful without requiring every optional tool, but it also means the same source can produce a different mode depending on server availability and installed compiler tools. Always inspect the displayed mode and representation labels.

## Output terminology

The UI uses these distinctions:

- **Language-specific output:** produced by a language module or compiler backend for a supported subset.
- **Tree-sitter AST:** a syntax tree useful for structure inspection; it is not a typed semantic AST.
- **TAC:** three-address code generated by an educational IR pass or a backend adapter.
- **Node trace:** a bounded list of Tree-sitter nodes used as a generic fallback; it is not TAC.
- **Pseudo-assembly:** educational target-like instructions; it is not guaranteed to assemble.
- **LLVM assembly:** compiler-generated target output when the Clang/LLVM route succeeds.
- **JVM bytecode:** Java virtual-machine instructions, not native CPU assembly.
- **Python bytecode:** CPython interpreter bytecode, not native machine code.
- **Logical query plan:** an educational/database-oriented representation of SQL processing, not machine code.

## Development workflow

### Frontend changes

1. Edit the relevant source module under `js/`, `css/`, or `index.html`.
2. Run `npm run build`.
3. Start or restart the local services with `npm start`.
4. Exercise at least one valid example and one failing example.
5. Confirm that the generated bundle is consistent with the source change.

### Language module changes

Keep the language module shape consistent with the registry:

```js
{
  id,
  label,
  examples,
  lexer,
  parser,
  semantic,
  ir,
  optimizer,
  codegen
}
```

If a backend is added, expose a `backend.run(source)` function that returns the shared phase-oriented response. Do not label generic fallback output as real machine code.

### Backend changes

Backend routes should:

- Validate the requested language and input shape.
- Use bounded subprocess execution.
- Return explicit phase status and diagnostics.
- Label educational or partial output.
- Clean temporary workspaces.
- Avoid executing uploaded source as a program.

The existing backend is a development/educational service. Additional process isolation, memory limits, network restrictions, and more comprehensive automated tests are required before exposing it beyond a trusted local machine.

## Troubleshooting

### The page is blank or WASM grammars fail to load

Serve the repository over HTTP and open `http://localhost:4173/index.html`. Do not open the file directly with `file://`. Rebuild the bundle if `js/bundle.js` is missing or stale.

### Backend requests fail

Check both processes:

```powershell
Invoke-WebRequest http://localhost:4174/health
```

Then inspect the terminal running `node server/index.js`. The frontend will fall back to its educational pipeline, but backend-only output will not be available.

### C/C++ output is unavailable

Install Clang/LLVM and ensure the required executables are on `PATH`, or install them in one of the locations probed by `server/index.js`. The browser frontend can still analyze supported educational subsets without Clang.

### Java output is unavailable

Verify that `javac` and `javap` are installed and available to the Node.js process. A JRE alone is not enough for compilation.

### Changes do not appear

Run:

```powershell
npm run build
```

Then refresh the browser. The application loads `js/bundle.js`, not the individual ES modules directly.

### A valid modern program gets generic output

This is expected when Tree-sitter accepts the syntax but the educational parser does not support the construct. The generic mode is an inspection fallback, not a failed syntax parse.

## Limitations and roadmap

Known limitations include:

- Educational language parsers support subsets, not every legal language feature.
- Generic Tree-sitter output does not provide type checking, scope resolution, TAC, or machine code.
- SQL does not currently use the shared browser Tree-sitter path or a real database planner.
- Backend tool availability varies by machine.
- Backend capability labels and automated coverage are still being expanded.
- The legacy standalone HTML page has not yet been retired.
- The local server is not a hardened multi-tenant compilation sandbox.

The prioritized roadmap is maintained in [PROJECT_STATUS_AND_ARCHITECTURE.md](./PROJECT_STATUS_AND_ARCHITECTURE.md). The next engineering priorities are capability metadata, stronger backend normalization, subprocess isolation/resource controls, tests for each failure mode, and retirement of the legacy page.

## Security and deployment considerations

Do not expose the local backend to untrusted users in its current form. It accepts source input and may invoke compiler tools. A production or classroom-hosted deployment needs:

- Per-request temporary directories
- Strict CPU, memory, wall-clock, and output-size limits
- Sanitized compiler arguments
- Disabled network access for compiler workers
- Process/container isolation
- Guaranteed cleanup on success, failure, and timeout
- No execution of compiled user programs
- Authentication and rate limiting if the service is network accessible

The frontend is safe to use as a local visualization tool, but compiler output should still be treated as untrusted text when integrated into another application.
