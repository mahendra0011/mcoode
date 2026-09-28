import { readdir, readFile, writeFile, rename, mkdir, chmod, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { SUBAGENT_STATUS } from '@mcode/shared';
import { MCCODE_DIR, getProjectId } from './store.js';

/**
 * MF-001: resumable god-run checkpoints.
 *
 * The data needed to continue a run already existed (`history/*.json` +
 * `persistSession()`), but it was write-only and post-completion: a crash, a
 * closed terminal, or a subagent hitting the 25-turn cap lost the wave state,
 * so the next `mcode god "<same prompt>"` re-planned (non-deterministic LLM
 * output), re-dispatched todos that were already DONE (double provider spend on
 * the user's own key) and re-applied edits on an already-modified tree.
 *
 * This module is the missing read-back half: a versioned, atomically written
 * `~/.mcode/sessions/<projectId>/state.json` that `SubagentManager` rewrites at
 * every wave boundary and that `mcode god --resume` / `--list-sessions` consumes.
 */

export const SESSIONS_DIR = join(MCCODE_DIR, 'sessions');
export const STATE_VERSION = 1;
export const STATE_FILE = 'state.json';

/** Normalize a path for comparisons (both sides use forward slashes). */
export function normalizeRelPath(p) {
  return String(p ?? '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function sanitizeId(id) {
  return String(id ?? '').replace(/[^a-zA-Z0-9._-]/g, '') || 'unknown';
}

export function sessionDirFor(projectId) {
  return join(SESSIONS_DIR, sanitizeId(projectId));
}

export function statePathFor(projectId) {
  return join(sessionDirFor(projectId), STATE_FILE);
}

/** Errors that callers surface as "nothing to resume" + a `--list-sessions` hint. */
export class SessionStateError extends Error {
  constructor(message, { code = 'SESSION_STATE_ERROR', sessions = [] } = {}) {
    super(message);
    this.name = 'SessionStateError';
    this.code = code;
    this.sessions = sessions;
  }
}

/**
 * Atomic checkpoint write (tmp + rename, same pattern as `CostLedger.save()`
 * and `store.js`): a crash mid-write can never leave a torn state file that
 * would make the next resume read half a plan.
 */
export async function writeSessionState(projectId, state = {}) {
  const id = sanitizeId(projectId);
  const dir = sessionDirFor(id);
  await mkdir(dir, { recursive: true });
  const file = join(dir, STATE_FILE);
  const payload = {
    ...state,
    v: STATE_VERSION,
    projectId: id,
    sessionId: state.sessionId || id,
    updatedAt: new Date().toISOString()
  };
  const tmp = `${file}.tmp.${process.pid}`;
  try {
    await writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
    await rename(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw err;
  }
  // Session state carries the prompt + plan — keep it private to the user.
  await chmod(file, 0o600).catch(() => {});
  return file;
}

/** Read a checkpoint. Missing/corrupt → null (treated as "no session"). */
export async function readSessionState(projectId) {
  try {
    const raw = await readFile(statePathFor(projectId), 'utf8');
    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
    if (Number(state.v) > STATE_VERSION) {
      // A newer CLI wrote this — refuse rather than resume it wrongly.
      throw new SessionStateError(
        `session state is v${state.v}, this CLI only understands v${STATE_VERSION} — upgrade mcode`,
        { code: 'SESSION_STATE_TOO_NEW' }
      );
    }
    return state;
  } catch (err) {
    if (err instanceof SessionStateError) throw err;
    return null;
  }
}

/** Every saved session, newest first (used by `mcode god --list-sessions`). */
export async function listSessionStates() {
  let ids = [];
  try {
    ids = await readdir(SESSIONS_DIR);
  } catch {
    return [];
  }
  const out = [];
  for (const id of ids) {
    let state = null;
    try {
      state = await readSessionState(id);
    } catch {
      state = null; // a too-new state must not break the listing
    }
    if (state) out.push(state);
  }
  return out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

export async function deleteSessionState(projectId) {
  await rm(sessionDirFor(projectId), { recursive: true, force: true }).catch(() => {});
}

/** Roll up a `{ todoId → status }` map into counters for tables/summaries. */
export function summarizeTodoStatus(todoStatus = {}) {
  const counts = { total: 0, done: 0, failed: 0, needsReview: 0, running: 0, pending: 0 };
  for (const status of Object.values(todoStatus || {})) {
    counts.total += 1;
    if (status === SUBAGENT_STATUS.DONE) counts.done += 1;
    else if (status === SUBAGENT_STATUS.FAILED) counts.failed += 1;
    else if (status === SUBAGENT_STATUS.NEEDS_REVIEW) counts.needsReview += 1;
    else if (status === SUBAGENT_STATUS.RUNNING) counts.running += 1;
    else counts.pending += 1;
  }
  return counts;
}

/**
 * Todos that were mid-flight when the process died. Their edits are already on
 * disk, so `--resume` must tell the user (keep/revert) instead of silently
 * re-writing over them.
 */
export function interruptedTodos(state) {
  const inflight = state?.inflight || {};
  const todoStatus = state?.todoStatus || {};
  const byId = new Map((state?.plan?.todos || []).map((t) => [t.id, t]));
  const out = [];
  for (const [id, info] of Object.entries(inflight)) {
    const status = todoStatus[id] || SUBAGENT_STATUS.PENDING;
    if (status === SUBAGENT_STATUS.DONE) continue; // finished before the crash
    const todo = byId.get(id) || {};
    const files = (info?.files?.length ? info.files : todo.files || []).map(normalizeRelPath).filter(Boolean);
    if (!files.length) continue;
    out.push({
      id,
      title: todo.title || '',
      domain: todo.domain || '',
      status,
      startedAt: info?.startedAt || null,
      files
    });
  }
  return out;
}

/**
 * Roll back the files an interrupted subagent wrote, using the per-project undo
 * stack (`~/.mcode/projects/<projectId>/undo.json`). Returns which files were
 * restored and which were written without a snapshot (nothing to revert to).
 */
export async function revertInterruptedFiles({ state, undoStack }) {
  const interrupted = interruptedTodos(state);
  const files = new Set(interrupted.flatMap((t) => t.files));
  const reverted = [];
  const missing = [];
  if (!undoStack || files.size === 0) return { reverted, missing: [...files] };
  await undoStack.load?.();
  const entries = [...(undoStack.entries || [])]
    .filter((e) => files.has(normalizeRelPath(e.file)))
    .sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const hit = new Set();
  for (const entry of entries) {
    const file = await undoStack.undo(entry.id);
    if (file) {
      const norm = normalizeRelPath(file);
      reverted.push(norm);
      hit.add(norm);
    }
  }
  for (const f of files) if (!hit.has(f)) missing.push(f);
  return { reverted, missing };
}

/**
 * Resolve a resume target.
 *  - no id (or `true`)  → the checkpoint for the current projectPath
 *  - projectId/sessionId (exact or unique prefix), project path, or unique
 *    project name → that session
 * Throws `SessionStateError` (with the full session list) when nothing matches,
 * so the CLI fails loudly instead of re-planning from scratch.
 */
export async function loadResumableState(idOrNull = null, { projectPath = process.cwd() } = {}) {
  if (idOrNull === null || idOrNull === undefined || idOrNull === '' || idOrNull === true) {
    const projectId = await getProjectId(projectPath);
    const state = await readSessionState(projectId);
    if (!state) {
      throw new SessionStateError(`no saved session for ${projectPath}`, {
        code: 'SESSION_NOT_FOUND',
        sessions: await listSessionStates()
      });
    }
    return state;
  }

  const wanted = String(idOrNull).trim();
  const sessions = await listSessionStates();
  const byId = sessions.find((s) => s.projectId === wanted || s.sessionId === wanted);
  if (byId) return byId;
  const byPrefix = sessions.find(
    (s) => String(s.projectId || '').startsWith(wanted) || String(s.sessionId || '').startsWith(wanted)
  );
  if (byPrefix) return byPrefix;
  const norm = normalizeRelPath(wanted).replace(/\/+$/, '');
  const byPath = sessions.find((s) => normalizeRelPath(s.projectPath).replace(/\/+$/, '') === norm);
  if (byPath) return byPath;
  const lower = wanted.toLowerCase();
  const byName = sessions.filter((s) => String(s.projectName || '').toLowerCase() === lower);
  if (byName.length === 1) return byName[0];
  throw new SessionStateError(`no saved session matches "${wanted}"`, {
    code: 'SESSION_NOT_FOUND',
    sessions
  });
}
