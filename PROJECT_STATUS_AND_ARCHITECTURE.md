# Compiler Design Visualizer

## Project Status, Architecture, and Roadmap

## 1. Project Summary

Compiler Design Visualizer is a browser-based educational compiler workbench. It exposes the major stages of a compilation pipeline instead of showing only source code and final output.

The core phases are:

1. Lexical analysis
2. Syntax analysis
3. Semantic analysis
4. Intermediate code generation
5. Optimization
6. Target code generation

The project currently combines three layers:

- Tree-sitter for syntax validation and syntax-tree generation.
- Existing language-specific educational parsers and lowering modules for supported subsets.
- Generic Tree-sitter-backed fallback output for valid syntax that is outside a language-specific lowering subset.

The fallback is intentionally educational. It must not be presented as a real typed IR or machine-code compiler backend.

## 2. Current Product Position

The project is an academic visualizer, not a complete compiler suite. It can demonstrate real transformations for supported examples and can inspect broader source files through Tree-sitter.

Current capabilities:

- Browser-based source editing.
- Example loading for multiple languages.
- Source upload for supported file extensions.
- Incremental six-phase pipeline animation.
- Syntax validation through Tree-sitter for C, C++, Java, Python, JavaScript, and TypeScript.
- Existing SQL parser path remains separate because the installed SQL grammar does not currently provide a browser WASM artifact.
- AST visualization with zoom, pan, node inspection, and collapse controls.
- Token tables, symbol tables, TAC views, optimization comparison, CFG views, and target output views.
- Diagnostics with phase, line, and column information.
- Reproducible browser bundling through esbuild.

Current limitations:

- Tree-sitter does not provide semantic analysis, type checking, TAC, optimization, or machine code by itself.
- The existing language-specific backends support educational subsets, not arbitrary modern source files.
- Generic Tree-sitter fallback output is a node trace, not genuine language-specific TAC or machine code.
- Full arbitrary-source output requires real compiler backends such as Clang/LLVM, javac, Python bytecode tooling, JavaScript tooling, and a SQL planner.
- The local server has backend routes for all registered languages, but some routes intentionally return educational or frontend-derived representations rather than a complete production compiler pipeline.
- SQL does not yet use the shared browser Tree-sitter path or a database-specific query planner.
- Opening the application directly with `file://` is not reliable for WASM loading. Use the local server.

## 3. Runtime Architecture

```text
index.html
  |
  +-- css/style.css
  +-- js/bundle.js
        |
        +-- js/main.js
              |
              +-- language selector and editor state
              +-- PipelineStrip
              +-- PhaseFeed
              +-- runPipeline
                    |
                    +-- lexical phase
                    +-- Tree-sitter syntax validation
                    +-- language-specific AST lowering when supported
                    +-- generic Tree-sitter fallback when lowering is unsupported
                    +-- semantic analysis
                    +-- intermediate representation
                    +-- optimization
                    +-- target output
```

### 3.1 Browser entry point

[index.html](index.html) is the primary current entry point. It loads the stylesheet and the generated browser bundle.

[Compiler Design Visualizer.html](Compiler%20Design%20Visualizer.html) is an older standalone fixture-backed page with inline CSS and inline JavaScript. It is not the primary modular application path and should either be archived, clearly labeled as legacy, or removed after confirming it is no longer used.

### 3.2 Application entry point

[js/main.js](js/main.js) owns application wiring:

- Selects the active language.
- Loads examples.
- Connects editor callbacks.
- Starts and stops the pipeline.
- Updates the phase strip and phase feed.
- Disables controls while a run is active.
- Displays final run status.

### 3.3 UI modules

- [js/ui/editor.js](js/ui/editor.js): source editor, line numbers, keyboard behavior, upload, drag and drop, statistics, and error-line highlighting.
- [js/ui/pipeline.js](js/ui/pipeline.js): six-phase status strip.
- [js/ui/feed.js](js/ui/feed.js): phase cards, skeleton states, result updates, and scrolling.
- [js/ui/renderer.js](js/ui/renderer.js): phase-specific result rendering.
- [js/ui/ast-tree.js](js/ui/ast-tree.js): interactive graphical AST.
- [js/ui/cfg.js](js/ui/cfg.js): control-flow graph view.
- [js/ui/animator.js](js/ui/animator.js): TAC step-through visualization.

### 3.4 Core modules

- [js/core/contract.js](js/core/contract.js): result schema, statuses, phase order, and phase names.
- [js/core/errors.js](js/core/errors.js): compiler error hierarchy and diagnostics.
- [js/core/runner.js](js/core/runner.js): asynchronous phase orchestration and error propagation.
- [js/core/tree-sitter.js](js/core/tree-sitter.js): browser Tree-sitter runtime, grammar loading, syntax error detection, and generic AST conversion.
- [js/core/tree-sitter-pipeline.js](js/core/tree-sitter-pipeline.js): generic semantic summary, node-trace IR, trace optimization, and target trace fallback.

## 4. Pipeline Contract

The shared result model is defined in [js/core/contract.js](js/core/contract.js).

Each run contains:

```javascript
{
  (schemaVersion,
    runId,
    mode,
    language,
    sourceHash,
    status,
    phases,
    diagnostics);
}
```

Each phase should expose one of these statuses:

- `pending`: not started.
- `running`: currently being generated.
- `completed`: produced an output.
- `failed`: stopped with a diagnostic.
- `not_run`: intentionally skipped because an earlier phase failed or the backend is unavailable.
- `partial`: reserved for incomplete pipeline results. Current successful Tree-sitter fallback runs are reported as completed with an explanatory note.

A phase output must never claim successful language-specific compilation when it only contains a generic syntax trace.

## 5. Tree-sitter Integration

[tree-sitter.js](js/core/tree-sitter.js) loads:

- `vendor/tree-sitter/web-tree-sitter.wasm`
- `vendor/tree-sitter/tree-sitter-c.wasm`
- `vendor/tree-sitter/tree-sitter-cpp.wasm`
- `vendor/tree-sitter/tree-sitter-java.wasm`
- `vendor/tree-sitter/tree-sitter-python.wasm`
- `vendor/tree-sitter/tree-sitter-javascript.wasm`
- `vendor/tree-sitter/tree-sitter-typescript.wasm`

The syntax flow is:

1. Load or reuse the shared Tree-sitter runtime.
2. Load the grammar for the selected language.
3. Parse the source.
4. Detect `ERROR` and missing nodes.
5. Convert the syntax tree into the project AST shape for visualization.
6. Attempt existing language-specific lowering for supported subsets.
7. Use generic fallback output when valid syntax cannot be lowered by the educational backend.

Tree-sitter should remain the authority for syntax validity. Language-specific parsers may still be used as lowering adapters for supported educational subsets, but they must not override a Tree-sitter syntax failure.

## 6. Language Module Structure

Language modules live under [js/languages](js/languages):

- `c`
- `cpp`
- `java`
- `python`
- `javascript`
- `typescript`
- `sql`

A language module may expose:

```javascript
{
  (id, label, examples, lexer, parser, semantic, ir, optimizer, codegen);
}
```

The current modules are educational backends. They are not guaranteed to process every legal source file for their language.

## 7. Output Modes

### 7.1 Language-specific mode

Used when the existing language lowering can consume the source.

Expected outputs:

- meaningful tokens
- language-specific AST
- symbol table and semantic checks
- TAC or equivalent IR
- optimization comparison
- educational target output or backend output

### 7.2 Generic Tree-sitter mode

Used when Tree-sitter validates the source but the existing lowering cannot represent it.

Expected outputs:

- syntax tree visualization
- declaration summary
- bounded node-trace IR
- trace-level optimization
- generic target trace

This mode is useful for inspection, but it is not a substitute for Clang/LLVM, javac, Python bytecode, or JavaScript runtime backends.

## 8. Backend Status and Roadmap

The project now has a local Express backend with language-specific routes. The browser attempts a backend run first and falls back to the frontend pipeline when the server or an external compiler is unavailable. The backend is therefore an optional enhancement for the UI, not a requirement for the educational browser pipeline.

Current backend routes:

- `POST /api/compile`: shared textbook TAC route used by Python and JavaScript-family modules.
- `POST /api/analyze/ccpp`: C and C++ Clang/LLVM route.
- `POST /api/analyze/java`: Java compiler/bytecode route.
- `POST /api/analyze/python`: Python analysis route.
- `POST /api/analyze/javascript`: JavaScript analysis route.
- `POST /api/analyze/typescript`: TypeScript compiler route.
- `POST /api/analyze/sql`: SQL frontend/educational route.
- `GET /health`: server health check.

The remaining roadmap is to make each route a deeper, more consistent adapter while preserving the shared browser result contract.

### C and C++

Implemented backend:

- The server probes configured/local Clang, `opt`, `llc`, and LLVM extraction tools.
- Clang provides diagnostics and frontend output.
- LLVM IR, optimization, and target assembly are normalized for display where the required tools are available.
- Temporary request directories are used for generated source and intermediate files.

Remaining work:

- Make tool discovery and availability reporting explicit in the UI.
- Harden isolation and resource controls before treating this as a general-purpose compiler service.

### Java

Implemented route, with scope dependent on local Java tooling:

- `server/index.js` exposes `/api/analyze/java`.
- The route can use `javac` and `javap` when they are installed and available on the server process path.
- The frontend retains its educational Java parser and fallback path.

Remaining work:

- Normalize compiler availability and diagnostics consistently with the C/C++ route.
- Add structured bytecode inspection and stronger Java semantic coverage.

### JavaScript and TypeScript

Implemented routes:

- JavaScript is exposed through `/api/analyze/javascript` and the shared `/api/compile` path.
- TypeScript is exposed through `/api/analyze/typescript` and the shared `/api/compile` path.
- The frontend also provides Tree-sitter syntax inspection and educational language modules.

Remaining work:

- Use a consistent AST/diagnostic adapter for arbitrary modern syntax.
- Keep JavaScript output labeled as runtime- or interpreter-specific; do not represent JIT output as stable machine code.

### Python

Implemented route:

- Python is exposed through `/api/analyze/python` and `/api/compile`.
- The frontend includes an indentation-aware educational lexer/parser.

Remaining work:

- Add robust `ast` and `dis` integration with explicit interpreter-version labels.
- Clearly distinguish CPython bytecode from native target code.

### SQL

Implemented route:

- `/api/analyze/sql` returns an explicitly labeled frontend/educational result.
- The frontend SQL module provides tokenization, parsing, semantic checks, optimization demonstrations, and a logical-plan-style output.

Remaining work:

- Add a browser-compatible grammar or a real SQL parser.
- Add an optional database-specific `EXPLAIN` adapter.
- Label logical and physical query plans separately from compiler target code.

## 9. Recommended Backend API

Use a local Node.js or Python server between the browser and compiler tools.

```text
POST /api/analyze
```

Request:

```json
{
  "language": "cpp",
  "source": "int main() { return 0; }",
  "options": {
    "target": "x86-64",
    "standard": "c++20"
  }
}
```

Response:

```json
{
  "status": "completed",
  "mode": "clang-llvm",
  "language": "cpp",
  "diagnostics": [],
  "phases": {
    "lexical": {},
    "syntax": {},
    "semantic": {},
    "intermediate": {},
    "optimization": {},
    "target": {}
  }
}
```

Every adapter should normalize its result into the same phase contract. The browser should not need to know how a language was compiled.

## 10. Safety Requirements for Uploaded Files

Do not execute uploaded code directly on the host process.

A real backend must use:

- temporary working directories
- strict execution timeouts
- memory and output-size limits
- disabled network access
- process isolation or containers
- sanitized compiler arguments
- cleanup after every request
- no persistent execution permissions

## 11. Current Progress (2026-10-25)

### Complete

- Six-phase UI and result model.
- Modular language registry.
- Existing educational compiler implementations.
- Tree-sitter browser runtime and grammars for six languages.
- Tree-sitter syntax diagnostics.
- Generic AST visualization.
- Generic fallback outputs for broad syntax coverage.
- Proper TAC and target output for supported language-specific subsets.
- Error propagation for lexer and parser result errors.
- Responsive layout corrections for long phase output.
- AST viewport and parent-node positioning corrections.
- npm build and local HTTP server commands.
- Express backend API with health check and language-specific routes.
- C/C++ Clang/LLVM integration with temporary request workspaces and output normalization.
- Java, Python, JavaScript, TypeScript, and SQL backend entry points with explicit educational/fallback behavior.
- Frontend-first backend fallback behavior in the shared pipeline runner.

### In progress or incomplete

- Full language-specific lowering for arbitrary source files.
- Production-grade backend integration and capability reporting for Java, Python, JavaScript, TypeScript, and SQL.
- Browser-compatible SQL grammar.
- Full process isolation, resource limits, and cleanup guarantees for every compiler tool invocation.
- Consistent capability labels across all phases.
- Automated tests for every language and failure mode.
- Retirement of the legacy standalone HTML implementation.

## 12. Immediate Next Steps

1. Keep Tree-sitter as the shared syntax layer.
2. Add explicit capability metadata per language and backend mode.
3. Stop generic output from being labeled as machine code.
4. Consolidate the existing routes behind a documented `/api/analyze` contract while retaining compatibility routes.
5. Add explicit capability metadata so the UI can distinguish real compiler output, educational output, and generic Tree-sitter traces.
6. Harden all backend subprocess execution with isolation, resource limits, sanitized arguments, and guaranteed cleanup.
7. Add tests for valid source, syntax errors, semantic errors, unavailable tools, unsupported constructs, backend failures, and uploaded files.
8. Remove or archive the legacy standalone HTML page once the modular app is the only supported entry point.

## 13. Development Commands

Install dependencies:

```powershell
npm install
```

Build the browser bundle:

```powershell
npm run build
```

Start the local server required for WASM assets:

```powershell
npm start
```

Open:

```text
http://localhost:4173/index.html
```
