// ─── Language Registry ────────────────────────────────────────────────────────
import * as c from './c/index.js';
import * as cpp from './cpp/index.js';
import * as java from './java/index.js';
import * as python from './python/index.js';
import * as javascript from './javascript/index.js';
import * as typescript from './typescript/index.js';
import * as sql from './sql/index.js';

export const LANGUAGES = {
  c,
  cpp,
  java,
  python,
  javascript,
  typescript,
  sql
};

export const LANGUAGE_LIST = [
  { id: 'c',          label: 'C',          badge: 'Reference Pipeline' },
  { id: 'cpp',        label: 'C++',        badge: 'Object-Oriented' },
  { id: 'java',       label: 'Java',       badge: 'JVM Bytecode Target' },
  { id: 'python',     label: 'Python',     badge: 'Indent-Aware Grammar' },
  { id: 'javascript', label: 'JavaScript', badge: 'Dynamic Scoping & V8' },
  { id: 'typescript', label: 'TypeScript', badge: 'Static Type Checking' },
  { id: 'sql',        label: 'SQL',        badge: 'Relational Plan & Opt' }
];

export function getLanguage(id) {
  return LANGUAGES[id] || LANGUAGES['c'];
}

export function getAllLanguages() {
  return LANGUAGE_LIST;
}
