// ─── Enhanced Editor UI Module ───────────────────────────────────────────────
// Features: Line numbers, tab handling, auto-indent, bracket auto-close,
// file upload with extension validation, drag & drop support, and stats badge.

export const SUPPORTED_EXTENSIONS = {
  '.c':    { langId: 'c',          label: 'C Source' },
  '.h':    { langId: 'c',          label: 'C Header' },
  '.cpp':  { langId: 'cpp',        label: 'C++ Source' },
  '.hpp':  { langId: 'cpp',        label: 'C++ Header' },
  '.cc':   { langId: 'cpp',        label: 'C++ Source' },
  '.cxx':  { langId: 'cpp',        label: 'C++ Source' },
  '.java': { langId: 'java',       label: 'Java Class' },
  '.py':   { langId: 'python',     label: 'Python Script' },
  '.js':   { langId: 'javascript', label: 'JavaScript' },
  '.mjs':  { langId: 'javascript', label: 'JavaScript' },
  '.ts':   { langId: 'typescript', label: 'TypeScript' },
  '.sql':  { langId: 'sql',        label: 'SQL Query' },
};

export class Editor {
  constructor({ textareaId, linenosId, fileInputId, statsBadgeId, onInput, onFileLoaded, onFileError }) {
    this.textarea     = document.getElementById(textareaId);
    this.linenos      = document.getElementById(linenosId);
    this.fileInput    = document.getElementById(fileInputId);
    this.statsBadge   = document.getElementById(statsBadgeId);
    this.onInput      = onInput ?? (() => {});
    this.onFileLoaded = onFileLoaded ?? (() => {});
    this.onFileError = onFileError ?? (() => {});

    this._bindEvents();
    this.updateLineNumbers();
  }

  _bindEvents() {
    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
      this.clearErrorHighlights();
      this.onInput();
    });

    this.textarea.addEventListener('scroll', () => {
      this.linenos.scrollTop = this.textarea.scrollTop;
    });

    this.textarea.addEventListener('keydown', e => this._handleKeydown(e));

    // File Upload input listener
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => this._handleFileInput(e));
    }

    // Drag and Drop onto editor wrapper
    const wrap = this.textarea.closest('.editor-wrap');
    if (wrap) {
      wrap.addEventListener('dragover', (e) => {
        e.preventDefault();
        wrap.classList.add('drag-active');
      });
      wrap.addEventListener('dragleave', () => {
        wrap.classList.remove('drag-active');
      });
      wrap.addEventListener('drop', (e) => {
        e.preventDefault();
        wrap.classList.remove('drag-active');
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          this.loadFile(e.dataTransfer.files[0]);
        }
      });
    }
  }

  _handleKeydown(e) {
    // 1. Tab indentation (4 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en } = this.textarea;
      const val = this.textarea.value;
      this.textarea.value = val.slice(0, s) + '    ' + val.slice(en);
      this.textarea.selectionStart = this.textarea.selectionEnd = s + 4;
      this.updateLineNumbers();
      this.onInput();
      return;
    }

    // 2. Auto-indent on Enter
    if (e.key === 'Enter') {
      const { selectionStart: s } = this.textarea;
      const val = this.textarea.value;
      const curLine = val.slice(0, s).split('\n').pop() || '';
      const matchIndent = /^(\s+)/.exec(curLine);
      if (matchIndent) {
        e.preventDefault();
        const indent = matchIndent[1];
        const extraIndent = curLine.trim().endsWith('{') || curLine.trim().endsWith(':') ? '    ' : '';
        const insert = '\n' + indent + extraIndent;
        this.textarea.value = val.slice(0, s) + insert + val.slice(s);
        this.textarea.selectionStart = this.textarea.selectionEnd = s + insert.length;
        this.updateLineNumbers();
        this.onInput();
        return;
      }
    }

    // 3. Auto-close paired brackets
    const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
    if (pairs[e.key]) {
      const { selectionStart: s, selectionEnd: en } = this.textarea;
      const val = this.textarea.value;
      if (s === en) {
        e.preventDefault();
        const closing = pairs[e.key];
        this.textarea.value = val.slice(0, s) + e.key + closing + val.slice(en);
        this.textarea.selectionStart = this.textarea.selectionEnd = s + 1;
        this.updateLineNumbers();
        this.onInput();
      }
    }
  }

  _handleFileInput(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      this.loadFile(file);
      // Reset input value so same file can be reloaded if needed
      e.target.value = '';
    }
  }

  loadFile(file) {
    const extMatch = /\.[^.]+$/.exec(file.name);
    const ext = extMatch ? extMatch[0].toLowerCase() : '';

    if (!SUPPORTED_EXTENSIONS[ext]) {
      const supportedList = Object.keys(SUPPORTED_EXTENSIONS).join(', ');
      this.onFileError(`Unsupported file type. Use: ${supportedList}`);
      return;
    }

    if (file.size > 1024 * 1024) {
      this.onFileError('File is too large. Maximum size is 1 MB.');
      return;
    }

    const { langId, label } = SUPPORTED_EXTENSIONS[ext];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const content = evt.target.result;
      this.setValue(content);
      this.onFileLoaded({ content, langId, label, fileName: file.name });
    };

    reader.onerror = () => {
      this.onFileError(`Could not read ${file.name}. Existing source was kept.`);
    };

    reader.readAsText(file);
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split('\n');
    const lineCount = lines.length || 1;
    this.linenos.innerHTML = Array.from({ length: lineCount }, (_, i) =>
      `<span class="line-num" id="ln-${i + 1}">${i + 1}</span>`
    ).join('\n');

    if (this.statsBadge) {
      const chars = this.textarea.value.length;
      this.statsBadge.textContent = `${lineCount} lines · ${chars} chars`;
    }
  }

  highlightErrorLine(lineNo) {
    this.clearErrorHighlights();
    const el = document.getElementById(`ln-${lineNo}`);
    if (el) {
      el.classList.add('line-error');
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  clearErrorHighlights() {
    this.linenos.querySelectorAll('.line-error').forEach(el => el.classList.remove('line-error'));
  }

  getValue()     { return this.textarea.value; }
  setValue(v)    { this.textarea.value = v; this.updateLineNumbers(); }
  setDisabled(v) { this.textarea.disabled = v; }
  clear()        { this.setValue(''); this.clearErrorHighlights(); }
  focus()        { this.textarea.focus(); }
}
