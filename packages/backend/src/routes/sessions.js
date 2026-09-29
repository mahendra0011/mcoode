import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { validate } from '../validate.js';

export function sessionRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  router.get('/workspaces', async (req, res, next) => {
    try {
      const sessions = await db().session.find({ userId: req.userId });
      // Group sessions by workspace (or by project name if no workspace)
      const workspaceMap = new Map();
      for (const s of sessions) {
        const ws = s.workspace || s.projectName || 'default';
        const entry = workspaceMap.get(ws) || { name: ws, sessions: 0, lastActive: null };
        entry.sessions++;
        if (!entry.lastActive || (s.createdAt && s.createdAt > entry.lastActive)) {
          entry.lastActive = s.createdAt;
        }
        workspaceMap.set(ws, entry);
      }
      const workspaces = [...workspaceMap.values()].sort((a, b) => {
        if (!b.lastActive) return -1;
        if (!a.lastActive) return 1;
        return b.lastActive - a.lastActive;
      });
      res.json({ workspaces });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      const store = db();
      res.json(await store.paginate(store.session, { userId: req.userId }, 'createdAt', req.query.page, req.query.limit));
    } catch (err) {
      next(err);
    }
  });

  // WEB-018: local-desktop bridge — god-run checkpoints.
  // The CLI persists resumable god-run state to
  // `~/.mcode/sessions/<projectId>/state.json` (see
  // `packages/cli/src/core/session-state.js`, imported relatively below —
  // same pattern as routes/settings.js → cli store.js). This endpoint
  // best-effort surfaces that local state to the web dashboard as
  // [{ projectId, status, done, total, prompt, updatedAt, spendUsd }].
  // It NEVER executes anything: the web renders the exact CLI resume /
  // dry-run commands (`mcode god --resume <id>`, `mcode god --dry-run`)
  // and the user runs them in a terminal. Absent/corrupt state → [].
  // NOTE: full path is /api/v1/sessions/god-runs (router mount). Defined
  // before `/:id` so the param route does not swallow it.
  router.get('/god-runs', async (_req, res, next) => {
    try {
      // Relative import of the CLI's session-state module (SESSIONS_DIR /
      // STATE_FILE live there). Dynamic + best-effort so the backend still
      // starts when the CLI tree is absent.
      let cli = null;
      try {
        cli = await import('../../../cli/src/core/session-state.js');
      } catch {
        cli = null;
      }
      let states = [];
      if (cli && typeof cli.listSessionStates === 'function') {
        try {
          states = (await cli.listSessionStates()) || [];
        } catch {
          states = [];
        }
      } else {
        states = await readGodCheckpointsFallback();
      }
      const runs = states.map((s) => toGodRunSummary(s, cli)).filter(Boolean);
      res.json({ runs });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const session = await db().session.findById(req.params.id);
      if (!session || String(session.userId) !== String(req.userId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      }
      const transcripts = await db().agentTranscript.find({ sessionId: session._id });
      const messages = await db().chatMessage.find({ sessionId: session._id }, { timestamp: 1 });
      res.json({ ...session, transcripts, messages });
    } catch (err) {
      next(err);
    }
  });

  // GET /sessions/:id/replay — ordered user prompts for client-side replay.
  router.get('/:id/replay', async (req, res, next) => {
    try {
      const session = await db().session.findById(req.params.id);
      if (!session || String(session.userId) !== String(req.userId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      }
      const messages = await db().chatMessage.find({ sessionId: session._id }, { timestamp: 1 });
      const prompts = messages.filter((m) => m.role === 'user').map((m) => m.content);
      res.json({ sessionId: session._id, prompts });
    } catch (err) {
      next(err);
    }
  });

  router.post('/', validate('createSession'), async (req, res, next) => {
    try {
      const session = await db().session.create({
        userId: req.userId,
        projectName: req.body.projectName,
        mode: req.body.mode,
        status: 'planning',
        plan: req.body.plan,
        createdAt: new Date()
      });
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', validate('updateSession'), async (req, res, next) => {
    try {
      const session = await db().session.findById(req.params.id);
      if (!session || String(session.userId) !== String(req.userId)) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      }
      const patch = { ...req.body };
      if (patch.status === 'completed') patch.completedAt = new Date();
      const updated = await db().session.findByIdAndUpdate(session._id, patch);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const result = await db().session.deleteOne({ _id: req.params.id, userId: req.userId });
      if (!result.deletedCount) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'session not found' } });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Roll one CLI checkpoint into the `{ projectId, status, done, total, prompt, updatedAt, spendUsd }` shape. */
function toGodRunSummary(state, cli) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const projectId = state.projectId || state.sessionId || null;
  if (!projectId) return null;
  let done = 0;
  let total = 0;
  try {
    if (cli && typeof cli.summarizeTodoStatus === 'function') {
      const counts = cli.summarizeTodoStatus(state.todoStatus || {});
      done = Number(counts.done) || 0;
      total = Number(counts.total) || 0;
    } else if (Array.isArray(state.plan?.todos)) {
      total = state.plan.todos.length;
      done = Object.values(state.todoStatus || {}).filter((v) => v === 'done').length;
    }
  } catch {
    // best-effort counters — a weird checkpoint still lists
  }
  return {
    projectId: String(projectId),
    status: state.status || 'unknown',
    done,
    total,
    prompt: typeof state.prompt === 'string' ? state.prompt : '',
    updatedAt: state.updatedAt || state.startedAt || null,
    // Checkpoints carry no ledger spend today — null (not 0) so the UI can
    // distinguish "unknown" from "free".
    spendUsd: typeof state.spendUsd === 'number' ? state.spendUsd : null
  };
}

/**
 * Fallback reader for when the CLI module cannot be imported: mirrors the
 * CLI's SESSIONS_DIR layout (`~/.mcode/sessions/<id>/state.json`) directly.
 * Missing dir / corrupt entries → skipped, never thrown.
 */
async function readGodCheckpointsFallback() {
  try {
    const { readdir, readFile } = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const dir = path.join(os.homedir(), '.mcode', 'sessions');
    let ids;
    try {
      ids = await readdir(dir);
    } catch {
      return [];
    }
    const out = [];
    for (const id of ids) {
      try {
        const raw = await readFile(path.join(dir, id, 'state.json'), 'utf8');
        const state = JSON.parse(raw);
        if (state && typeof state === 'object' && !Array.isArray(state)) out.push(state);
      } catch {
        // skip corrupt/unreadable checkpoints
      }
    }
    return out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  } catch {
    return [];
  }
}
