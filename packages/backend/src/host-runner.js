/**
 * host-runner.js — Execute single-file code directly on the host machine.
 *
 * Uses child_process.spawn to run code without Docker/Piston dependency.
 * Supports 20+ languages with automatic command detection from file extension.
 *
 * Security: Runs in a temp directory, enforces timeouts, auto-cleans up.
 * This is a LOCAL DEV TOOL — no multi-tenant sandboxing.
 */
import { spawn } from 'node:child_process';
import { writeFile, mkdir, rm, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const COMPILE_TIMEOUT = 15_000; // 15s for compilation
const RUN_TIMEOUT     = 10_000; // 10s for execution

/**
 * Maps file extensions to execution strategies.
 *
 * Each entry can be:
 *   - { run: [cmd, ...args] }               — interpreted language
 *   - { compile: [cmd, ...args], run: [...] } — compiled language
 *
 * Placeholders:
 *   {file}   — the source file path
 *   {out}    — the compiled output binary path
 *   {dir}    — the temp directory path
 */
const EXEC_MAP = {
  // ═══════════════════════════════════════════════════════════════════
  // All 53 Piston languages + aliases — matching piston-client.js
  // ═══════════════════════════════════════════════════════════════════

  // ── 1. Python ──────────────────────────────────────
  py:     { run: ['python', '{file}'] },
  pyc:    { run: ['python', '{file}'] },

  // ── 2. JavaScript / Node.js ────────────────────────
  js:     { run: ['node', '{file}'] },
  mjs:    { run: ['node', '{file}'] },
  cjs:    { run: ['node', '{file}'] },

  // ── 3. TypeScript ──────────────────────────────────
  ts:     { run: ['npx', '--yes', 'tsx', '{file}'] },
  tsx:    { run: ['npx', '--yes', 'tsx', '{file}'] },

  // ── 4. Java (Java 11+ runs .java directly) ────────
  java:   { run: ['java', '{file}'] },

  // ── 5. C ───────────────────────────────────────────
  c:      { compile: ['gcc', '{file}', '-o', '{out}', '-lm'], run: ['{out}'] },
  h:      { compile: ['gcc', '{file}', '-o', '{out}', '-lm'], run: ['{out}'] },

  // ── 6. C++ ─────────────────────────────────────────
  cpp:    { compile: ['g++', '{file}', '-o', '{out}', '-std=c++17'], run: ['{out}'] },
  cc:     { compile: ['g++', '{file}', '-o', '{out}', '-std=c++17'], run: ['{out}'] },
  cxx:    { compile: ['g++', '{file}', '-o', '{out}', '-std=c++17'], run: ['{out}'] },
  hpp:    { compile: ['g++', '{file}', '-o', '{out}', '-std=c++17'], run: ['{out}'] },

  // ── 7. C# ──────────────────────────────────────────
  cs:     { run: ['dotnet-script', '{file}'] },

  // ── 8. Go ──────────────────────────────────────────
  go:     { run: ['go', 'run', '{file}'] },

  // ── 9. Rust ────────────────────────────────────────
  rs:     { compile: ['rustc', '{file}', '-o', '{out}'], run: ['{out}'] },

  // ── 10. Ruby ───────────────────────────────────────
  rb:     { run: ['ruby', '{file}'] },

  // ── 11. Kotlin ─────────────────────────────────────
  kt:     { run: ['kotlinc', '-script', '{file}'] },
  kts:    { run: ['kotlinc', '-script', '{file}'] },

  // ── 12. Swift ──────────────────────────────────────
  swift:  { run: ['swift', '{file}'] },

  // ── 13. PHP ────────────────────────────────────────
  php:    { run: ['php', '{file}'] },

  // ── 14. Lua ────────────────────────────────────────
  lua:    { run: ['lua', '{file}'] },

  // ── 15. Perl ───────────────────────────────────────
  pl:     { run: ['perl', '{file}'] },

  // ── 16. Scala ──────────────────────────────────────
  scala:  { run: ['scala', '{file}'] },
  sc:     { run: ['scala', '{file}'] },

  // ── 17. Haskell ────────────────────────────────────
  hs:     { run: ['runghc', '{file}'] },

  // ── 18. Elixir ─────────────────────────────────────
  ex:     { run: ['elixir', '{file}'] },
  exs:    { run: ['elixir', '{file}'] },

  // ── 19. Dart ───────────────────────────────────────
  dart:   { run: ['dart', 'run', '{file}'] },

  // ── 20. Julia ──────────────────────────────────────
  jl:     { run: ['julia', '{file}'] },

  // ── 21. Bash / Shell ───────────────────────────────
  sh:     { run: ['bash', '{file}'] },
  bash:   { run: ['bash', '{file}'] },

  // ── 22. Racket ─────────────────────────────────────
  rkt:    { run: ['racket', '{file}'] },

  // ── 23. Fortran ────────────────────────────────────
  f90:    { compile: ['gfortran', '{file}', '-o', '{out}'], run: ['{out}'] },
  f95:    { compile: ['gfortran', '{file}', '-o', '{out}'], run: ['{out}'] },
  f03:    { compile: ['gfortran', '{file}', '-o', '{out}'], run: ['{out}'] },
  f:      { compile: ['gfortran', '{file}', '-o', '{out}'], run: ['{out}'] },

  // ── 24. SQLite3 / SQL ──────────────────────────────
  sql:    { run: ['sqlite3', ':memory:', '-init', '{file}', '.quit'] },
  sqlite: { run: ['sqlite3', ':memory:', '-init', '{file}', '.quit'] },
  sqlite3:{ run: ['sqlite3', ':memory:', '-init', '{file}', '.quit'] },

  // ── 25. Brainfuck ──────────────────────────────────
  bf:     { run: ['beef', '{file}'] },

  // ── 26. Assembly (NASM) ────────────────────────────
  asm:    { compile: ['nasm', '-f', 'elf64', '{file}', '-o', '{out}.o'], run: ['{out}'] },
  s:      { compile: ['nasm', '-f', 'elf64', '{file}', '-o', '{out}.o'], run: ['{out}'] },
  nasm:   { compile: ['nasm', '-f', 'elf64', '{file}', '-o', '{out}.o'], run: ['{out}'] },

  // ── 27. AWK ────────────────────────────────────────
  awk:    { run: ['awk', '-f', '{file}'] },

  // ── 28. Clojure ────────────────────────────────────
  clj:    { run: ['clojure', '{file}'] },
  cljs:   { run: ['clojure', '{file}'] },

  // ── 29. COBOL ──────────────────────────────────────
  cob:    { compile: ['cobc', '-x', '-free', '{file}', '-o', '{out}'], run: ['{out}'] },
  cbl:    { compile: ['cobc', '-x', '-free', '{file}', '-o', '{out}'], run: ['{out}'] },

  // ── 30. Crystal ────────────────────────────────────
  cr:     { run: ['crystal', 'run', '{file}'] },

  // ── 31. D ──────────────────────────────────────────
  d:      { run: ['dmd', '-run', '{file}'] },

  // ── 32. Deno (TypeScript/JS runtime) ───────────────
  deno:   { run: ['deno', 'run', '--allow-all', '{file}'] },

  // ── 33. Dragon ─────────────────────────────────────
  dragon: { run: ['dragon', '{file}'] },

  // ── 34. Erlang ─────────────────────────────────────
  erl:    { run: ['escript', '{file}'] },
  hrl:    { run: ['escript', '{file}'] },

  // ── 35. Forth ──────────────────────────────────────
  forth:  { run: ['gforth', '{file}', '-e', 'bye'] },
  fth:    { run: ['gforth', '{file}', '-e', 'bye'] },

  // ── 36. FreeBASIC ──────────────────────────────────
  bas:    { compile: ['fbc', '{file}', '-x', '{out}'], run: ['{out}'] },
  bi:     { compile: ['fbc', '{file}', '-x', '{out}'], run: ['{out}'] },

  // ── 37. Groovy ─────────────────────────────────────
  groovy: { run: ['groovy', '{file}'] },
  gvy:    { run: ['groovy', '{file}'] },

  // ── 38. Haxe ───────────────────────────────────────
  hx:     { run: ['haxe', '--run', '{file}'] },

  // ── 39. Common Lisp ────────────────────────────────
  lisp:   { run: ['sbcl', '--script', '{file}'] },
  cl:     { run: ['sbcl', '--script', '{file}'] },

  // ── 40. Nim ────────────────────────────────────────
  nim:    { run: ['nim', 'r', '{file}'] },

  // ── 41. OCaml ──────────────────────────────────────
  ml:     { run: ['ocaml', '{file}'] },
  mli:    { run: ['ocaml', '{file}'] },

  // ── 42. Octave / Matlab ────────────────────────────
  m:      { run: ['octave', '--no-gui', '{file}'] },

  // ── 43. Pascal ─────────────────────────────────────
  pas:    { compile: ['fpc', '{file}', '-o{out}'], run: ['{out}'] },

  // ── 44. Prolog ─────────────────────────────────────
  prolog: { run: ['swipl', '-g', 'main', '-t', 'halt', '{file}'] },
  pro:    { run: ['swipl', '-g', 'main', '-t', 'halt', '{file}'] },

  // ── 45. PureBasic ──────────────────────────────────
  pb:     { compile: ['pbcompiler', '{file}', '/exe', '{out}'], run: ['{out}'] },

  // ── 46. R ──────────────────────────────────────────
  r:      { run: ['Rscript', '{file}'] },

  // ── 47. Raku / Perl 6 ─────────────────────────────
  raku:   { run: ['raku', '{file}'] },
  p6:     { run: ['raku', '{file}'] },

  // ── 48. Smalltalk ──────────────────────────────────
  st:     { run: ['gst', '{file}'] },

  // ── 49. TCL ────────────────────────────────────────
  tcl:    { run: ['tclsh', '{file}'] },

  // ── 50. VLang ──────────────────────────────────────
  v:      { run: ['v', 'run', '{file}'] },

  // ── 51. Zig ────────────────────────────────────────
  zig:    { run: ['zig', 'run', '{file}'] },

  // ── 52. Emacs Lisp ─────────────────────────────────
  el:     { run: ['emacs', '--batch', '--eval', `(load "{file}")` ] },

  // ── 53. F# ─────────────────────────────────────────
  fs:     { run: ['dotnet', 'fsi', '{file}'] },
  fsi:    { run: ['dotnet', 'fsi', '{file}'] },
};

// ── Windows-specific overrides ───────────────────────────────────────
if (os.platform() === 'win32') {
  // python command is 'python' on Windows (not 'python3')
  EXEC_MAP.py  = { run: ['python', '{file}'] };
  EXEC_MAP.pyc = { run: ['python', '{file}'] };

  // .exe suffix for compiled outputs
  EXEC_MAP.c   = { compile: ['gcc', '{file}', '-o', '{out}.exe', '-lm'], run: ['{out}.exe'] };
  EXEC_MAP.h   = EXEC_MAP.c;
  EXEC_MAP.cpp = { compile: ['g++', '{file}', '-o', '{out}.exe', '-std=c++17'], run: ['{out}.exe'] };
  EXEC_MAP.cc  = EXEC_MAP.cpp;
  EXEC_MAP.cxx = EXEC_MAP.cpp;
  EXEC_MAP.hpp = EXEC_MAP.cpp;
  EXEC_MAP.rs  = { compile: ['rustc', '{file}', '-o', '{out}.exe'], run: ['{out}.exe'] };
  EXEC_MAP.f90 = { compile: ['gfortran', '{file}', '-o', '{out}.exe'], run: ['{out}.exe'] };
  EXEC_MAP.f95 = EXEC_MAP.f90;
  EXEC_MAP.f03 = EXEC_MAP.f90;
  EXEC_MAP.f   = EXEC_MAP.f90;
  EXEC_MAP.cob = { compile: ['cobc', '-x', '-free', '{file}', '-o', '{out}.exe'], run: ['{out}.exe'] };
  EXEC_MAP.cbl = EXEC_MAP.cob;
  EXEC_MAP.bas = { compile: ['fbc', '{file}', '-x', '{out}.exe'], run: ['{out}.exe'] };
  EXEC_MAP.bi  = EXEC_MAP.bas;
  EXEC_MAP.pas = { compile: ['fpc', '{file}', '-o{out}.exe'], run: ['{out}.exe'] };

  // C# on Windows uses csc directly
  EXEC_MAP.cs  = { compile: ['csc', '/out:{out}.exe', '{file}'], run: ['{out}.exe'] };

  // Windows: use 'sh' from Git Bash if available, else skip
  EXEC_MAP.sh  = { run: ['bash', '{file}'] };
}

/**
 * Replace template placeholders in command arguments.
 */
function resolveArgs(args, vars) {
  return args.map(a =>
    a.replace(/\{file\}/g, vars.file)
     .replace(/\{out\}/g, vars.out)
     .replace(/\{dir\}/g, vars.dir)
  );
}

/**
 * Run a subprocess and capture stdout + stderr with timeout.
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number | null }>}
 */
function runProcess(cmd, args, options = {}) {
  const { timeout = RUN_TIMEOUT, cwd, stdin } = options;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const child = spawn(cmd, args, {
      cwd,
      timeout,
      shell: false,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      // Windows-specific: don't open a console window for each process
      windowsHide: true,
    });

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    if (stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    const timer = setTimeout(() => {
      killed = true;
      try { child.kill('SIGKILL'); } catch {}
    }, timeout);

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr || `Failed to execute '${cmd}': ${err.message}. Is '${cmd}' installed and on your PATH?`,
        exitCode: 1,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (killed) {
        stderr += `\n[Execution timed out after ${timeout / 1000}s]`;
      }
      resolve({ stdout, stderr, exitCode: code ?? (killed ? 124 : 1) });
    });
  });
}

/**
 * Execute a single file on the host machine.
 *
 * @param {string} filename - e.g. "main.py", "hello.cpp"
 * @param {string} code     - the source code
 * @param {string} [stdin]  - optional stdin input
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number|null, compileOutput: string|null }>}
 */
export async function runOnHost(filename, code, stdin = '') {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext || !EXEC_MAP[ext]) {
    throw new Error(
      `Language for '.${ext}' is not supported for host execution. ` +
      `Supported: ${Object.keys(EXEC_MAP).join(', ')}`
    );
  }

  const strategy = EXEC_MAP[ext];
  let tmpDir = null;

  try {
    // Create temp directory for isolation
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'mcode-run-'));
    const filePath = path.join(tmpDir, filename);
    const outPath = path.join(tmpDir, 'a.out');

    // Write source file
    await writeFile(filePath, code, 'utf-8');

    const vars = { file: filePath, out: outPath, dir: tmpDir };
    let compileOutput = null;

    // ── Compile step (if needed) ───────────────────────────────
    if (strategy.compile) {
      const compileArgs = resolveArgs(strategy.compile, vars);
      const [compileCmd, ...compileRest] = compileArgs;
      const compileResult = await runProcess(compileCmd, compileRest, {
        timeout: COMPILE_TIMEOUT,
        cwd: tmpDir,
      });

      compileOutput = (compileResult.stdout + compileResult.stderr).trim() || null;

      if (compileResult.exitCode !== 0) {
        return {
          stdout: '',
          stderr: compileResult.stderr || 'Compilation failed',
          exitCode: compileResult.exitCode,
          compileOutput,
        };
      }
    }

    // ── Run step ───────────────────────────────────────────────
    const runArgs = resolveArgs(strategy.run, vars);
    const [runCmd, ...runRest] = runArgs;
    const result = await runProcess(runCmd, runRest, {
      timeout: RUN_TIMEOUT,
      cwd: tmpDir,
      stdin,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      compileOutput,
    };

  } finally {
    // ── Cleanup temp directory ──────────────────────────────────
    if (tmpDir) {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/**
 * Check if a command exists on the host PATH.
 * @param {string} cmd
 * @returns {Promise<boolean>}
 */
export async function commandExists(cmd) {
  const checkCmd = os.platform() === 'win32' ? 'where' : 'which';
  const result = await runProcess(checkCmd, [cmd], { timeout: 3000 });
  return result.exitCode === 0;
}

/**
 * Returns a list of supported extensions that have the required
 * runtime/compiler available on this machine.
 */
export async function detectAvailableLanguages() {
  // Maps runtime/compiler command → file extensions it enables
  // Covers all 53 Piston languages + aliases
  const runtimeChecks = {
    // Core languages
    node:       ['js', 'mjs', 'cjs'],
    npx:        ['ts', 'tsx'],
    python:     ['py', 'pyc'],
    java:       ['java'],
    gcc:        ['c', 'h'],
    'g++':      ['cpp', 'cc', 'cxx', 'hpp'],
    'dotnet-script': ['cs'],
    go:         ['go'],
    rustc:      ['rs'],
    ruby:       ['rb'],
    kotlinc:    ['kt', 'kts'],
    swift:      ['swift'],
    php:        ['php'],
    lua:        ['lua'],
    perl:       ['pl'],
    scala:      ['scala', 'sc'],
    runghc:     ['hs'],
    elixir:     ['ex', 'exs'],
    dart:       ['dart'],
    julia:      ['jl'],
    bash:       ['sh', 'bash'],
    racket:     ['rkt'],
    gfortran:   ['f90', 'f95', 'f03', 'f'],
    sqlite3:    ['sql', 'sqlite', 'sqlite3'],
    // Niche / esoteric
    beef:       ['bf'],
    nasm:       ['asm', 's', 'nasm'],
    awk:        ['awk'],
    clojure:    ['clj', 'cljs'],
    cobc:       ['cob', 'cbl'],
    crystal:    ['cr'],
    dmd:        ['d'],
    deno:       ['deno'],
    dragon:     ['dragon'],
    escript:    ['erl', 'hrl'],
    gforth:     ['forth', 'fth'],
    fbc:        ['bas', 'bi'],
    groovy:     ['groovy', 'gvy'],
    haxe:       ['hx'],
    sbcl:       ['lisp', 'cl'],
    nim:        ['nim'],
    ocaml:      ['ml', 'mli'],
    octave:     ['m'],
    fpc:        ['pas'],
    swipl:      ['prolog', 'pro'],
    pbcompiler: ['pb'],
    Rscript:    ['r'],
    raku:       ['raku', 'p6'],
    gst:        ['st'],
    tclsh:      ['tcl'],
    v:          ['v'],
    zig:        ['zig'],
    emacs:      ['el'],
    dotnet:     ['fs', 'fsi'],
  };

  const available = [];
  const unavailable = [];

  for (const [cmd, exts] of Object.entries(runtimeChecks)) {
    if (await commandExists(cmd)) {
      available.push(...exts);
    } else {
      unavailable.push(...exts);
    }
  }

  return { available, unavailable };
}

/**
 * Returns list of all extensions the host-runner knows about.
 */
export function getSupportedExtensions() {
  return Object.keys(EXEC_MAP);
}
