// ─── Application Entry Point ───────────────────────────────────────────────
import { getAllLanguages, getLanguage } from "./languages/index.js";
import { Editor } from "./ui/editor.js";
import { PipelineStrip } from "./ui/pipeline.js";
import { PhaseFeed } from "./ui/feed.js";
import { runPipeline } from "./core/runner.js";

// DOM elements
const langSelect = document.getElementById("langSelect");
const exampleSelect = document.getElementById("exampleSelect");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileUploadInput");
const statusHint = document.getElementById("statusHint");
const modeBadge = document.getElementById("modeBadge");
const sourceState = document.getElementById("sourceState");
const fileNameEl = document.getElementById("fileName");
const editorLanguage = document.getElementById("editorLanguage");
const copySourceBtn = document.getElementById("copySourceBtn");

let currentLangId = "c";
let isRunning = false;

// Initialize Editor with upload support and stats
const editor = new Editor({
  textareaId: "source",
  linenosId: "linenos",
  fileInputId: "fileUploadInput",
  statsBadgeId: "editorStatsBadge",
  onInput: () => {
    feed.markStale();
    if (sourceState) sourceState.textContent = "Source changed";
    statusHint.textContent = "Source changed. Analyze to update results.";
  },
  onFileLoaded: ({ content, langId, label, fileName: uploadedFileName }) => {
    if (langId !== currentLangId) {
      setLanguage(langId, false);
      langSelect.value = langId;
    }
    pipeline.reset();
    if (fileNameEl) fileNameEl.textContent = uploadedFileName || "Untitled source";
    if (editorLanguage) editorLanguage.textContent = label;
    if (sourceState) sourceState.textContent = "Loaded";
    feed.showEmpty(
      `Loaded <strong>${uploadedFileName}</strong>. ${label} selected.`,
    );
    statusHint.textContent = `Loaded ${uploadedFileName}. ${label} selected.`;
  },
  onFileError: (message) => {
    if (sourceState) sourceState.textContent = "Upload error";
    statusHint.textContent = message;
  },
});

// Initialize Pipeline Strip
const pipeline = new PipelineStrip({
  containerId: "pipeline",
  onPhaseClick: (phaseId) => feed.activatePhase(phaseId),
});

// Initialize Phase Feed
const feed = new PhaseFeed({
  containerId: "feed",
  onActivePhaseChange: (phaseId) => pipeline.setActive(phaseId),
});

// ── Populate Language Selector ────────────────────────────────────────────────
function initLanguageSelector() {
  langSelect.innerHTML = "";
  getAllLanguages().forEach((lang) => {
    const opt = document.createElement("option");
    opt.value = lang.id;
    opt.textContent = `${lang.label} (${lang.badge})`;
    langSelect.appendChild(opt);
  });

  langSelect.value = currentLangId;
  langSelect.addEventListener("change", (e) => {
    setLanguage(e.target.value);
  });
}

// ── Set active language ───────────────────────────────────────────────────────
function setLanguage(langId, loadDefaultExample = true) {
  currentLangId = langId;
  const mod = getLanguage(langId);

  // Update mode badge
  if (modeBadge) {
    modeBadge.textContent = `${mod.label || langId.toUpperCase()} · Ready`;
  }
  if (editorLanguage) editorLanguage.textContent = mod.label || langId.toUpperCase();

  // Populate examples
  populateExamples(mod);

  // Load first example if requested
  if (loadDefaultExample) {
    if (mod.examples && mod.examples.length > 0) {
      loadExample(mod.examples[0]);
    } else {
      editor.clear();
    }
  }

  pipeline.reset();
  if (loadDefaultExample) {
    feed.showEmpty(
      `Ready to analyze ${mod.label || langId} source.`,
    );
    statusHint.textContent = `${mod.label || langId} selected. Ready to analyze.`;
  }
}

// ── Populate Examples Selector ────────────────────────────────────────────────
function populateExamples(mod) {
  exampleSelect.innerHTML = "";
  (mod.examples || []).forEach((ex, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = ex.label;
    exampleSelect.appendChild(opt);
  });

  exampleSelect.onchange = (e) => {
    const idx = Number(e.target.value);
    if (mod.examples && mod.examples[idx]) {
      loadExample(mod.examples[idx]);
    }
  };
}

function loadExample(example) {
  editor.setValue(example.code);
  pipeline.reset();
  feed.showEmpty(
    `Loaded <strong>${example.label}</strong>. Click Analyze to run all 6 phases.`,
  );
  if (fileNameEl) fileNameEl.textContent = "Example source";
  if (sourceState) sourceState.textContent = "Ready";
  statusHint.textContent = `Loaded ${example.label}. Ready to analyze.`;
}

// ── Run Compilation ───────────────────────────────────────────────────────────
async function executeRun() {
  if (isRunning) return;
  const source = editor.getValue();
  if (!source.trim()) {
    statusHint.textContent =
      "Please enter or select source code before analyzing.";
    return;
  }

  const langModule = getLanguage(currentLangId);
  isRunning = true;
  setControlsDisabled(true);
  editor.clearErrorHighlights();
  if (sourceState) sourceState.textContent = "Analyzing";
  statusHint.textContent = `Analyzing ${langModule.label || currentLangId} source code...`;

  feed.startRun();
  pipeline.reset(true);

  try {
    const result = await runPipeline(langModule, source, {
      onPhaseStart: (phaseId) => {
        pipeline.setStatus(phaseId, "running");
      },
      onPhaseEnd: (phaseId, phaseData) => {
        pipeline.setStatus(phaseId, phaseData.status, phaseData.summary);
        feed.updatePhase(phaseId, phaseData);

        // Highlight error line in editor if a diagnostic fired
        if (phaseData.diagnostic && phaseData.diagnostic.line != null) {
          editor.highlightErrorLine(phaseData.diagnostic.line);
        }
      },
    });

    if (result.status === "completed") {
      if (sourceState) sourceState.textContent = "Analyzed";
      statusHint.textContent = "Analysis complete. All phases processed.";
    } else if (result.status === "partial") {
      if (sourceState) sourceState.textContent = "Limited";
      statusHint.textContent = "Syntax analysis complete. Later educational phases are unavailable.";
    } else {
      if (sourceState) sourceState.textContent = "Failed";
      statusHint.textContent = "Analysis stopped. Check the highlighted line.";
    }
  } catch (err) {
    console.error("Fatal pipeline error:", err);
    if (sourceState) sourceState.textContent = "Failed";
    statusHint.textContent = `Pipeline error: ${err.message}`;
  } finally {
    isRunning = false;
    setControlsDisabled(false);
  }
}

function setControlsDisabled(disabled) {
  analyzeBtn.disabled = disabled;
  clearBtn.disabled = disabled;
  if (uploadBtn) uploadBtn.disabled = disabled;
  langSelect.disabled = disabled;
  exampleSelect.disabled = disabled;
  editor.setDisabled(disabled);
}

// ── Wire Buttons ──────────────────────────────────────────────────────────────
analyzeBtn.addEventListener("click", executeRun);

clearBtn.addEventListener("click", () => {
  if (isRunning) return;
  editor.clear();
  pipeline.reset();
  feed.showEmpty("Editor cleared. Enter source code to analyze.");
  if (fileNameEl) fileNameEl.textContent = "Untitled source";
  if (sourceState) sourceState.textContent = "Ready";
  statusHint.textContent = "Source cleared.";
});

copySourceBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(editor.getValue());
    statusHint.textContent = "Source copied to clipboard.";
  } catch {
    statusHint.textContent = "Clipboard unavailable.";
  }
});

if (uploadBtn && fileInput) {
  uploadBtn.addEventListener("click", () => {
    if (!isRunning) fileInput.click();
  });
}

// ── Initialize ────────────────────────────────────────────────────────────────
initLanguageSelector();
setLanguage("c");
