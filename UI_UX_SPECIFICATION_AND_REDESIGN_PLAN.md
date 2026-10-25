# Compiler Design Visualizer

## UI/UX Inventory and Redesign Plan

## 1. Purpose

This document records the current interface and defines an implementation-ready redesign plan. The redesign should preserve the current dark compiler-workbench theme and the six required compiler phases while making the product feel deliberate, calm, technical, and human-designed.

The interface should feel like an educational developer tool, not a marketing landing page and not a generated demo screen.

## 2. Design Principles

1. Keep the existing dark technical theme.
2. Make the compiler phases the primary information architecture.
3. Show one phase as the current focus while keeping the complete pipeline visible.
4. Use short, factual interface text.
5. Never present generic fallback traces as genuine machine code.
6. Prefer clear hierarchy, spacing, and status over decoration.
7. Keep controls predictable and keyboard accessible.
8. Preserve the existing compiler capabilities while making unsupported capabilities explicit.
9. Avoid ornamental copy, exaggerated claims, and generic assistant-like language.
10. Keep the output understandable at a glance before exposing deeper detail.

## 3. Current UI Structure

The current primary page is [index.html](index.html).

### 3.1 Global shell

- Sticky header across the top of the page.
- Brand title: `Compiler Design Visualizer`.
- Small version and product descriptor beside the title.
- Right-side mode badge showing the active language and analysis mode.
- Main content constrained to a maximum width of 1320px.
- Footer with a long product capability statement.

### 3.2 Main layout

At desktop widths, the page uses a two-column grid:

- Left column: fixed maximum width of approximately 420px.
- Right column: flexible output column.
- Gap between columns: 20px.
- Left column is sticky while the user scrolls through results.
- At narrower widths, the layout collapses into one column.

### 3.3 Source panel

The left source panel contains:

- Panel heading: `Source Input & Language`.
- Target language select.
- Program example select.
- Code editor with synchronized line numbers.
- Analyze button.
- File upload button.
- Clear button.
- Editor statistics badge showing line and character counts.
- Status hint below the controls.

### 3.4 Pipeline strip

The right column begins with a pipeline panel containing six horizontally scrollable phase buttons:

1. Lexical
2. Syntax
3. Semantic
4. Intermediate
5. Optimization
6. Target

Each phase button shows:

- phase number
- short phase name
- status text
- running spinner when active

Current statuses include:

- Not run yet
- Generating
- Completed
- Failed
- Not run
- Limited, retained for partial-status compatibility

### 3.5 Phase feed

Below the pipeline strip is a vertical feed of phase cards. Each card contains:

- phase number
- full phase name
- status badge
- phase-specific result body

Cards currently animate into view and scroll into view as phases update.

### 3.6 Lexical output

The lexical card uses a horizontally scrollable table with:

- Lexeme
- Category
- Location

Token categories use syntax colors:

- keyword: purple
- identifier: blue
- integer and float literal: orange
- string and character literal: green
- operator: cyan
- punctuation: muted gray
- type: yellow

### 3.7 Syntax output

The syntax card has two views:

- Visual Tree Diagram
- Indented AST Text

The visual tree includes:

- dark dotted viewport
- SVG node graph
- zoom in
- zoom out
- reset zoom
- collapse and expand controls
- node inspector
- category-colored nodes

The current Tree-sitter tree can show broad modern syntax. Language-specific AST lowering is used when the existing educational backend supports the source.

### 3.8 Semantic output

The semantic card currently supports:

- symbol table
- checks list
- warnings list
- explanatory text

The symbol table columns are:

- Identifier
- Kind
- Type
- Scope
- Value / Init

### 3.9 Intermediate output

The intermediate card contains tabs for:

- Three-Address Code
- Control Flow Graph
- Step-Through VM Animator

The TAC view includes a copy button and an explanatory note.

The CFG view uses block cards, status pills, block contents, and edge labels.

The animator includes:

- instruction list
- play controls
- speed control
- virtual machine status
- register cards
- console output

### 3.10 Optimization output

The optimization card compares:

- Before Optimization
- After Optimization

It also displays:

- pass names
- optimization note
- changed or unchanged state

### 3.11 Target output

The target card shows:

- target label
- copy button
- code block
- explanatory text

Target output must clearly identify whether it is:

- educational pseudo-assembly
- JVM bytecode
- Python bytecode
- a query plan
- real compiler output
- a generic Tree-sitter trace

## 4. Current Visual System

### 4.1 Color tokens

Current primary tokens from [css/style.css](css/style.css):

```text
Background:       #0e1117
Panel:            #161b22
Secondary panel:  #1c2230
Tertiary panel:   #1f2937
Border:           #2a3040
Primary text:     #e6edf3
Muted text:       #7d8590
Accent blue:      #58a6ff
Accent dark:      #1c3a5e
Success green:    #3fb950
Success dark:     #1a3226
Error red:        #f85149
Error dark:       #3d1a1a
Warning gold:     #d29922
Warning dark:     #3d2e0a
Idle gray:        #484f58
```

The theme is a dark blue-gray workbench with blue interaction accents and semantic state colors.

### 4.2 Typography

Current fonts:

- Inter for interface text.
- IBM Plex Mono for code, statuses, token values, and technical metadata.

Font sizes are compact and optimized for dense technical content. This should remain the direction, but headings and labels should have a clearer scale hierarchy.

### 4.3 Shape and depth

- Main cards use 8px radius.
- Small controls use 4px radius.
- Borders are subtle and use the shared border token.
- Panels use solid dark surfaces rather than floating white cards.
- Shadows are restrained and mostly used for overlays such as the AST inspector.

### 4.4 Motion

Current motion includes:

- phase-card entrance animation
- skeleton shimmer
- spinner animation
- status dot pulse
- button press scale
- AST zoom transform
- smooth card scrolling

Motion should remain purposeful. It should show progress or state changes, not decorate every interaction.

## 5. Current UX Problems

### 5.1 The output hierarchy is too flat

The pipeline strip and the six full cards repeat similar information. A user can see all phases, but the relationship between one phase output and the next is not visually strong enough.

### 5.2 Output cards are too large and repetitive

Every phase is presented as a similarly weighted card, even though the user usually needs one active phase at a time. Long tables, ASTs, graphs, and code blocks can make the page feel vertically endless.

### 5.3 Copy is too verbose in places

Examples of text that should be reduced or rewritten:

- long footer capability claims
- repeated explanatory paragraphs
- phrases such as `Generating...` when a shorter `Running` is sufficient
- generic empty-state instructions repeated in multiple locations
- decorative labels that do not help with the current task

### 5.4 Some visible text feels generated rather than product-authored

Remove:

- exaggerated claims
- filler explanations
- unnecessary em dashes
- decorative emoji in operational controls
- generic phrases such as `Fully functional platform`
- messages that describe the interface instead of reporting state

### 5.5 Editor workflow needs stronger feedback

The editor supports upload and drag and drop, but the UI should make these states more explicit:

- file selected
- file read successfully
- language inferred from extension
- unsupported extension
- file too large
- upload read failure
- source changed after a previous analysis
- current results stale

### 5.6 Capability boundaries need to be visible

A syntax-valid source file may not have a language-specific semantic or machine-code backend. The interface should distinguish:

- validated syntax
- language-specific compilation
- generic educational fallback
- unsupported backend
- failed analysis

These should never all look like `Completed`.

## 6. Redesign Direction

### 6.1 Preserve

Keep:

- dark technical theme
- blue accent
- six compiler phases
- left source workspace
- language and example controls
- AST, CFG, TAC, optimization, and target views
- copy controls
- responsive desktop and mobile behavior
- current compiler terminology

### 6.2 Change

Change:

- flat vertical output feed into a connected phase workspace
- repeated phase headings into a single clear phase navigation system
- generic status text into short operational labels
- emoji-heavy or generic buttons into familiar icons with tooltips
- long explanatory copy into compact details or expandable sections
- fake or generic output labels into capability-aware labels
- editor controls into a stronger source-workbench toolbar

## 7. Proposed Information Architecture

### Desktop

```text
Header
  language + analysis mode + run state

Workspace
  Source column              Phase workspace
  -------------------        ----------------------------
  language selector           connected phase rail
  example selector            active phase header
  editor                      phase input/output summary
  editor toolbar              primary visualization
  diagnostics                 secondary details
```

### Mobile

```text
Header
Source controls
Editor
Run controls
Horizontal phase rail
Active phase output
Previous / next phase controls
```

### Connected phase model

Use a connected horizontal or vertical phase rail:

```text
Lexical -> Syntax -> Semantic -> IR -> Optimization -> Target
```

Each phase node should show:

- number
- short title
- state color
- connector line to the next phase
- compact one-line result summary

Selecting a phase should update one active detail panel rather than expanding every phase into equal-size content.

On desktop, show the active phase beside the rail. On mobile, show the rail above the active phase detail.

## 8. Proposed Phase Workspace

Each active phase should use the same internal structure:

```text
Phase header
  number, title, status, source location or result count

Phase summary
  one short sentence describing the result

Primary output
  table, AST, TAC, CFG, optimization comparison, or target output

Secondary details
  checks, warnings, explanation, copy action, metadata
```

Examples:

### Lexical

- Summary: `28 tokens emitted`
- Primary output: token table
- Secondary details: skipped comments, lexer diagnostics

### Syntax

- Summary: `Valid JavaScript syntax`
- Primary output: AST tree
- Secondary details: indented text tree, parser diagnostics

### Semantic

- Summary: `4 declarations, 0 errors`
- Primary output: symbol table
- Secondary details: checks and warnings

### Intermediate

- Summary: `12 TAC instructions`
- Primary output: TAC
- Secondary details: CFG and step-through view in tabs

### Optimization

- Summary: `2 optimization passes`
- Primary output: before/after comparison
- Secondary details: pass descriptions

### Target

- Summary: `Educational pseudo-assembly`
- Primary output: code block
- Secondary details: instruction mapping and copy action

## 9. Editor Redesign

Keep the current editor behavior but refine the presentation.

### Editor header

Show:

- inferred language
- file name or `Untitled source`
- dirty indicator when source changed
- line and character count

### Editor toolbar

Use icon buttons with tooltips for:

- upload
- clear
- copy source
- download source, if added later

Keep one prominent text button for the primary action:

- `Analyze`

Do not use generic rounded text buttons when a familiar icon is sufficient.

### Upload behavior

On file selection:

1. Validate extension.
2. Validate file size.
3. Read the file.
4. Infer language.
5. Replace editor contents.
6. Clear previous diagnostics and phase results.
7. Show a short status line such as `Loaded index.js. JavaScript selected.`
8. Keep the source available for editing before analysis.

On upload failure:

- keep existing source unchanged
- show a compact inline error
- do not use a blocking alert unless the browser prevents another option

### Source state

When source changes after analysis:

- mark the previous result stale
- dim old phase content or replace it with a stale indicator
- update the action label or status line to `Source changed. Analyze to update results.`

## 10. Text and Content Rules

Use short, factual labels.

Preferred:

- `Analyze`
- `Running`
- `Completed`
- `Failed`
- `Not run`
- `Syntax valid`
- `Syntax error`
- `Generic output`
- `Backend unavailable`
- `Source changed`

Avoid:

- marketing language
- exaggerated feature claims
- repeated explanations of obvious controls
- phrases that address the user conversationally
- unnecessary emoji
- em dashes in visible product text
- generic assistant-style filler
- claims that an educational trace is machine code

Every result should answer one of these questions:

- What phase is this?
- What was produced?
- Did it succeed?
- Where is the error?
- What can the user inspect next?

## 11. Status and Capability Design

Use distinct status styles:

- Running: blue
- Completed: green
- Failed: red
- Not run: gray
- Generic fallback: gold or neutral blue
- Backend unavailable: muted amber
- Stale: reduced opacity and muted border

Do not label a generic Tree-sitter node trace as `Machine Code`.

Use explicit output labels:

- `Three-address code`
- `Educational pseudo-assembly`
- `JVM bytecode`
- `Python bytecode`
- `SQL query plan`
- `Generic syntax trace`

## 12. Detailed Implementation Plan

### Phase A: structure

1. Keep the left source workspace.
2. Replace the pipeline strip with a connected phase rail.
3. Keep one active phase detail panel.
4. Add previous and next phase navigation.
5. Preserve direct phase selection from the rail.
6. Keep phase IDs and result contracts unchanged.

### Phase B: state model

1. Add explicit capability metadata to each phase result.
2. Distinguish `completed`, `failed`, `not_run`, `stale`, and `fallback`.
3. Include output labels in every result.
4. Make the active phase persist when results update.
5. Preserve diagnostics and error-line highlighting.

### Phase C: component cleanup

1. Extract a reusable `PhaseHeader` pattern.
2. Extract a reusable `PhaseSummary` pattern.
3. Extract a reusable `CapabilityBadge` pattern.
4. Extract reusable icon-button styles and tooltip behavior.
5. Keep tables, code blocks, AST, CFG, and animator as specialized primary outputs.
6. Remove repeated explanatory text from individual cards.

### Phase D: editor improvements

1. Add file name and language metadata above the editor.
2. Add dirty and stale states.
3. Replace blocking upload alerts with inline status where possible.
4. Validate file size before reading.
5. Preserve source when an upload fails.
6. Add clear focus states and keyboard labels.
7. Keep line numbers synchronized after upload and editing.

### Phase E: visual refinement

1. Keep the existing background, panel, border, and accent tokens.
2. Reduce unnecessary gradients and decorative color changes.
3. Use one accent color for primary actions and navigation.
4. Reserve green, red, amber, and gray for semantic state.
5. Reduce card nesting.
6. Keep border radii at 8px or less.
7. Use stable heights for the phase rail, editor toolbar, and output viewport.
8. Preserve horizontal scrolling for wide code and tables.
9. Avoid layout shifts when phase output changes.

### Phase F: content cleanup

1. Rewrite footer copy as one short product statement or remove it.
2. Replace `Analyze Pipeline` with `Analyze` unless the longer label is needed for clarity.
3. Replace `Generating...` with `Running`.
4. Replace repeated empty instructions with one concise state message.
5. Remove visible claims that the application is fully functional for all languages.
6. Add concise capability labels for generic and backend-specific results.

### Phase G: validation

Test these states at desktop and mobile widths:

- initial empty state
- example selected but not analyzed
- valid run
- syntax failure
- semantic failure
- backend unavailable
- generic Tree-sitter fallback
- source changed after a run
- file uploaded successfully
- unsupported file type
- empty file
- large file
- upload read failure
- long token table
- wide TAC output
- large AST
- CFG with many blocks
- animator with many instructions

Acceptance criteria:

- The six phases remain visible and connected.
- The active phase is obvious without reading every card.
- No phase reports success with an empty body.
- Generic output is visibly distinguished from real backend output.
- Upload errors do not destroy existing source.
- Long output does not widen or distort the page.
- All primary controls work with keyboard navigation.
- Visible text is concise, factual, and free of filler.
- The theme remains recognizably the current dark compiler workbench.

## 13. Ready-to-Use Implementation Prompt

Use the following prompt when implementing the redesign:

```text
Redesign the existing Compiler Design Visualizer UI without changing its core product identity.

Preserve the current dark technical theme, six compiler phases, language selector, source editor, upload workflow, AST visualizer, TAC view, CFG view, optimizer comparison, target output, diagnostics, and responsive behavior.

Replace the flat output-card experience with a connected phase workspace:

Lexical -> Syntax -> Semantic -> Intermediate Code -> Optimization -> Target Code

Show the phase rail persistently. Each phase should have a number, short title, state, connector, and compact result summary. Selecting a phase should display one active detail view containing a phase header, short summary, primary visualization, and optional secondary details. Keep direct navigation between phases and support previous/next controls on small screens.

Keep the existing colors and typography direction:

- background #0e1117
- panel #161b22
- secondary panel #1c2230
- border #2a3040
- primary text #e6edf3
- muted text #7d8590
- accent #58a6ff
- success #3fb950
- error #f85149
- warning #d29922
- Inter for interface text
- IBM Plex Mono for code and technical metadata

Improve hierarchy, spacing, and responsive sizing without introducing a new visual theme. Avoid excessive gradients, nested cards, decorative blobs, oversized headings, and unstable layout dimensions.

Clean up all visible text. Use short operational labels such as Analyze, Running, Completed, Failed, Not run, Syntax valid, Backend unavailable, Generic output, and Source changed. Remove marketing claims, filler explanations, corny messages, unnecessary emoji, em dashes, and assistant-like language. Do not describe obvious UI behavior in long paragraphs.

Improve the editor while preserving its behavior. Add file name, inferred language, dirty state, source statistics, inline upload errors, upload success status, unsupported-file handling, stale-result handling, and synchronized line numbers. Preserve the source when an upload fails.

Make capability boundaries explicit. A Tree-sitter syntax tree is not automatically semantic analysis, TAC, optimization, or machine code. Label generic fallback output as Generic syntax trace or Tree-sitter educational output. Label real backend output according to its actual format, such as LLVM IR, JVM bytecode, Python bytecode, SQL query plan, or educational pseudo-assembly.

Keep the existing result contract and phase IDs stable. Do not remove compiler phases. Do not replace the application with a marketing landing page. Build the usable compiler workbench as the first screen.

Validate the implementation at desktop and mobile sizes, including empty, running, completed, failed, stale, upload-error, generic-fallback, long-code, wide-table, large-AST, CFG, and animator states. Ensure text does not overflow, phase output does not distort the layout, and all primary controls are keyboard accessible.
```
