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
    statusHint.textContent =
      "Source changed — select Analyze to run live compilation.";
  },
  onFileLoaded: ({ content, langId, label, fileName }) => {
    if (langId !== currentLangId) {
      setLanguage(langId, false);
      langSelect.value = langId;
    }
    pipeline.reset();
    feed.showEmpty(
      `Loaded file <strong>${fileName}</strong> (${label}). Click Analyze Pipeline to compile.`,
    );
    statusHint.textContent = `Successfully loaded ${fileName} (${label}). Ready to compile.`;
  },
});

// Initialize Pipeline Strip
const pipeline = new PipelineStrip({
  containerId: "pipeline",
  onPhaseClick: (phaseId) => feed.scrollToPhase(phaseId),
});

// Initialize Phase Feed
const feed = new PhaseFeed({
  containerId: "feed",
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
    modeBadge.textContent = `Live Analysis · ${mod.label || langId.toUpperCase()} (v2.0)`;
  }

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
      `Choose an example or type custom <strong>${mod.label || langId}</strong> code, then click Analyze.`,
    );
    statusHint.textContent = `Language switched to ${mod.label || langId}. Ready to analyze.`;
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
  statusHint.textContent = `Loaded ${example.label}. Ready to compile.`;
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
  statusHint.textContent = `Analyzing ${langModule.label || currentLangId} source code…`;

  feed.startRun();
  pipeline.reset();

  try {
    const result = await runPipeline(langModule, source, {
      onPhaseStart: (phaseId) => {
        pipeline.setStatus(phaseId, "running");
      },
      onPhaseEnd: (phaseId, phaseData) => {
        pipeline.setStatus(phaseId, phaseData.status);
        feed.updatePhase(phaseId, phaseData);

        // Highlight error line in editor if a diagnostic fired
        if (phaseData.diagnostic && phaseData.diagnostic.line != null) {
          editor.highlightErrorLine(phaseData.diagnostic.line);
        }
      },
    });

    if (result.status === "completed") {
      statusHint.textContent = `Analysis complete — all phases processed successfully.`;
    } else if (result.status === "partial") {
      statusHint.textContent = `Syntax analysis complete — later educational phases are unavailable for this AST.`;
    } else {
      statusHint.textContent = `Compilation stopped due to diagnostic error. Check error line in editor.`;
    }
  } catch (err) {
    console.error("Fatal pipeline error:", err);
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
  statusHint.textContent = "Source code cleared.";
});

if (uploadBtn && fileInput) {
  uploadBtn.addEventListener("click", () => {
    if (!isRunning) fileInput.click();
  });
}

// ── Initialize ────────────────────────────────────────────────────────────────
initLanguageSelector();
setLanguage("c");
