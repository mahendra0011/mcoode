import axios from 'axios';
import { runOnHost, getSupportedExtensions } from './host-runner.js';

const PISTON_URL = process.env.PISTON_URL || 'http://localhost:2000';

// Cache Piston availability (re-checked periodically)
let _pistonAvailable = null;
let _pistonCheckedAt = 0;
const PISTON_CHECK_INTERVAL = 30_000; // re-check every 30s

// Comprehensive Extension → Piston language mapping (All 53 Piston Languages)
export const LANGUAGE_MAP = {
  // 1. Python
  py: { language: 'python', version: '*' },
  pyc: { language: 'python', version: '*' },
  // 2. JavaScript / Node.js
  js: { language: 'javascript', version: '*' },
  mjs: { language: 'javascript', version: '*' },
  cjs: { language: 'javascript', version: '*' },
  // 3. TypeScript
  ts: { language: 'typescript', version: '*' },
  tsx: { language: 'typescript', version: '*' },
  // 4. Java
  java: { language: 'java', version: '*' },
  // 5. C
  c: { language: 'c', version: '*' },
  h: { language: 'c', version: '*' },
  // 6. C++
  cpp: { language: 'cpp', version: '*' },
  cc: { language: 'cpp', version: '*' },
  cxx: { language: 'cpp', version: '*' },
  hpp: { language: 'cpp', version: '*' },
  // 7. C#
  cs: { language: 'csharp', version: '*' },
  // 8. Go
  go: { language: 'go', version: '*' },
  // 9. Rust
  rs: { language: 'rust', version: '*' },
  // 10. Ruby
  rb: { language: 'ruby', version: '*' },
  // 11. Kotlin
  kt: { language: 'kotlin', version: '*' },
  kts: { language: 'kotlin', version: '*' },
  // 12. Swift
  swift: { language: 'swift', version: '*' },
  // 13. PHP
  php: { language: 'php', version: '*' },
  // 14. Lua
  lua: { language: 'lua', version: '*' },
  // 15. Perl
  pl: { language: 'perl', version: '*' },
  // 16. Scala
  scala: { language: 'scala', version: '*' },
  sc: { language: 'scala', version: '*' },
  // 17. Haskell
  hs: { language: 'haskell', version: '*' },
  // 18. Elixir
  ex: { language: 'elixir', version: '*' },
  exs: { language: 'elixir', version: '*' },
  // 19. Dart
  dart: { language: 'dart', version: '*' },
  // 20. Julia
  jl: { language: 'julia', version: '*' },
  // 21. Bash / Shell
  sh: { language: 'bash', version: '*' },
  bash: { language: 'bash', version: '*' },
  // 22. Racket
  rkt: { language: 'racket', version: '*' },
  // 23. Fortran
  f90: { language: 'fortran', version: '*' },
  f95: { language: 'fortran', version: '*' },
  f03: { language: 'fortran', version: '*' },
  f: { language: 'fortran', version: '*' },
  // 24. SQLite3 / SQL
  sql: { language: 'sqlite3', version: '*' },
  sqlite: { language: 'sqlite3', version: '*' },
  sqlite3: { language: 'sqlite3', version: '*' },
  // 25. Brainfuck
  bf: { language: 'brainfuck', version: '*' },
  // 26. Assembly (NASM)
  asm: { language: 'nasm', version: '*' },
  s: { language: 'nasm', version: '*' },
  nasm: { language: 'nasm', version: '*' },
  // 27. AWK
  awk: { language: 'awk', version: '*' },
  // 28. Clojure
  clj: { language: 'clojure', version: '*' },
  cljs: { language: 'clojure', version: '*' },
  // 29. COBOL
  cob: { language: 'cobol', version: '*' },
  cbl: { language: 'cobol', version: '*' },
  // 30. Crystal
  cr: { language: 'crystal', version: '*' },
  // 31. D
  d: { language: 'd', version: '*' },
  // 32. Deno
  deno: { language: 'deno', version: '*' },
  // 33. Dragon
  dragon: { language: 'dragon', version: '*' },
  // 34. Erlang
  erl: { language: 'erlang', version: '*' },
  hrl: { language: 'erlang', version: '*' },
  // 35. Forth
  forth: { language: 'forth', version: '*' },
  fth: { language: 'forth', version: '*' },
  // 36. FreeBASIC
  bas: { language: 'freebasic', version: '*' },
  bi: { language: 'freebasic', version: '*' },
  // 37. Groovy
  groovy: { language: 'groovy', version: '*' },
  gvy: { language: 'groovy', version: '*' },
  // 38. Haxe
  hx: { language: 'haxe', version: '*' },
  // 39. Common Lisp
  lisp: { language: 'lisp', version: '*' },
  cl: { language: 'lisp', version: '*' },
  // 40. Nim
  nim: { language: 'nim', version: '*' },
  // 41. OCaml
  ml: { language: 'ocaml', version: '*' },
  mli: { language: 'ocaml', version: '*' },
  // 42. Octave / Matlab
  m: { language: 'octave', version: '*' },
  // 43. Pascal
  pas: { language: 'pascal', version: '*' },
  // 44. Prolog
  prolog: { language: 'prolog', version: '*' },
  pro: { language: 'prolog', version: '*' },
  // 45. PureBasic
  pb: { language: 'purebasic', version: '*' },
  // 46. R
  r: { language: 'r', version: '*' },
  // 47. Raku / Perl 6
  raku: { language: 'raku', version: '*' },
  p6: { language: 'raku', version: '*' },
  // 48. Smalltalk
  st: { language: 'smalltalk', version: '*' },
  // 49. TCL
  tcl: { language: 'tcl', version: '*' },
  // 50. VLang
  v: { language: 'vlang', version: '*' },
  // 51. Zig
  zig: { language: 'zig', version: '*' },
  // 52. Emacs Lisp
  el: { language: 'elisp', version: '*' },
  // 53. F#
  fs: { language: 'fsharp', version: '*' },
  fsi: { language: 'fsharp', version: '*' },
};

export function detectLanguage(filename) {
  if (!filename) return null;
  const ext = filename.split('.').pop().toLowerCase();
  if (LANGUAGE_MAP[ext]) return LANGUAGE_MAP[ext];
  // Fallback: match by language name if extension equals language
  const langMatch = Object.values(LANGUAGE_MAP).find(l => l.language === ext);
  return langMatch || null;
}

/**
 * Fetch list of installed runtimes from Piston server.
 */
export async function getInstalledRuntimes() {
  try {
    const { data } = await axios.get(`${PISTON_URL}/api/v2/runtimes`);
    return data; // returns array of { language, version, aliases }
  } catch (err) {
    console.error('[Piston] Failed to fetch installed runtimes:', err.message);
    return [];
  }
}

/**
 * Runs a single file's code through self-hosted Piston.
 * @param {string} filename - e.g. "main.py" (used to detect language)
 * @param {string} code - the source code
 * @param {string} stdin - optional input for the program
 */
export async function runSingleFile(filename, code, stdin = '') {
  const lang = detectLanguage(filename);
  if (!lang) {
    throw new Error(`Language not supported for file: ${filename}`);
  }

  const payload = {
    language: lang.language,
    version: lang.version,
    files: [{ name: filename, content: code }],
    stdin,
    compile_timeout: 10000,
    run_timeout: 5000,
  };

  const { data } = await axios.post(`${PISTON_URL}/api/v2/execute`, payload);

  return {
    stdout: data.run?.stdout || '',
    stderr: data.run?.stderr || '',
    exitCode: data.run?.code ?? null,
    compileOutput: data.compile?.stdout || data.compile?.stderr || null,
  };
}

/**
 * Checks if the Piston sandbox service is reachable.
 * Caches the result for 30s to avoid hammering the endpoint.
 * @returns {Promise<boolean>}
 */
export async function isPistonAvailable() {
  const now = Date.now();
  if (_pistonAvailable !== null && (now - _pistonCheckedAt) < PISTON_CHECK_INTERVAL) {
    return _pistonAvailable;
  }

  try {
    await axios.get(`${PISTON_URL}/api/v2/runtimes`, { timeout: 2000 });
    _pistonAvailable = true;
  } catch {
    _pistonAvailable = false;
  }
  _pistonCheckedAt = now;
  return _pistonAvailable;
}

/**
 * Smart execution router — runs code through the best available backend:
 *   1. Host-based execution (always available, no Docker needed)
 *   2. Piston sandbox (if running — better isolation)
 *
 * @param {string} filename - e.g. "main.py"
 * @param {string} code     - source code
 * @param {string} [stdin]  - optional stdin
 * @returns {Promise<{ stdout, stderr, exitCode, compileOutput, backend: 'host'|'piston' }>}
 */
export async function runSmart(filename, code, stdin = '') {
  // Strategy: Try Piston first (sandboxed), fall back to host
  const pistonReady = await isPistonAvailable();

  if (pistonReady) {
    try {
      const result = await runSingleFile(filename, code, stdin);
      return { ...result, backend: 'piston' };
    } catch (err) {
      // Piston failed (unsupported language, timeout, etc.) — fall through to host
      console.warn(`[runSmart] Piston failed for ${filename}: ${err.message}, trying host runner`);
    }
  }

  // Host-based execution
  try {
    const result = await runOnHost(filename, code, stdin);
    return { ...result, backend: 'host' };
  } catch (err) {
    throw new Error(
      `Code execution failed. ${pistonReady ? 'Piston and host' : 'Host'} runner error: ${err.message}`
    );
  }
}
