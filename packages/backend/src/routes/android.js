import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import adbkit from '@devicefarmer/adbkit';

// 1048: lazy client — created on first use and retried, so starting ADB
// AFTER the backend no longer means `{ devices: [] }` forever.
let client = null;
function getAdbClient() {
  if (client) return client;
  try {
    const Adb = /** @type {any} */(adbkit).Adb || /** @type {any} */(adbkit).default?.Adb || /** @type {any} */(adbkit).default || adbkit;
    if (typeof Adb.createClient === 'function') {
      client = Adb.createClient();
    }
  } catch (e) {
    console.warn('[android] ADB client initialization skipped:', e.message);
    client = null;
  }
  return client;
}

/** @param {{ secret?: string }} [opts] */
export function androidRoutes({ secret } = {}) {
  const router = Router();
  // BSEC-002: fail closed — a missing secret must crash the mount, never
  // silently downgrade these routes to public.
  if (!secret) throw new Error('[route-policy] androidRoutes requires a secret (BSEC-002: fail closed)');
  router.use(authMiddleware({ secret }));

  router.get('/devices', async (req, res) => {
    try {
      const adb = getAdbClient();
      if (!adb) {
        return res.json({ devices: [] });
      }
      const devices = await adb.listDevices();
      res.json({ devices });
    } catch (err) {
      client = null; // force re-creation next time (daemon may come up)
      res.json({ devices: [], warning: 'ADB not running or not installed' });
    }
  });

  // AND-001: track emulator children (pid per AVD) so they can be stopped
  // and never silently outlive the backend. unref() lets the backend exit.
  const emulatorProcs = new Map();
  router.post('/devices/:id/start', async (req, res, next) => {
    try {
      const avdId = String(req.params.id || '');
      if (!/^[A-Za-z0-9._-]+$/.test(avdId)) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'invalid avd id' } });
      }
      const prev = emulatorProcs.get(avdId);
      if (prev && !prev.killed && prev.exitCode === null) {
        return res.json({ started: true, pid: prev.pid, alreadyRunning: true });
      }
      const { execa } = await import('execa');
      // 1049: missing emulator binary must not become an unhandled rejection.
      const child = execa('emulator', ['-avd', avdId], { detached: true });
      child.catch(() => {});
      child.unref?.();
      child.on('exit', () => emulatorProcs.delete(avdId));
      emulatorProcs.set(avdId, child);
      res.json({ started: true, pid: child.pid });
    } catch (err) {
      next(err);
    }
  });

  router.post('/devices/:id/stop', async (req, res, next) => {
    try {
      const avdId = String(req.params.id || '');
      const child = emulatorProcs.get(avdId);
      if (!child || child.killed || child.exitCode !== null) {
        emulatorProcs.delete(avdId);
        return res.json({ stopped: false, message: 'no running emulator for this avd' });
      }
      child.kill('SIGTERM');
      emulatorProcs.delete(avdId);
      res.json({ stopped: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
