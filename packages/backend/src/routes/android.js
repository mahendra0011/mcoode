import { Router } from 'express';
import adbkit from '@devicefarmer/adbkit';

let client = null;
try {
  const Adb = adbkit.Adb || adbkit.default?.Adb || adbkit.default || adbkit;
  if (typeof Adb.createClient === 'function') {
    client = Adb.createClient();
  }
} catch (e) {
  console.warn('[android] ADB client initialization skipped:', e.message);
}

export function androidRoutes() {
  const router = Router();

  router.get('/devices', async (req, res) => {
    try {
      if (!client) {
        return res.json({ devices: [] });
      }
      const devices = await client.listDevices();
      res.json({ devices });
    } catch (err) {
      res.json({ devices: [], warning: 'ADB not running or not installed' });
    }
  });

  router.post('/devices/:id/start', async (req, res, next) => {
    try {
      const { execa } = await import('execa');
      execa('emulator', ['-avd', req.params.id], { detached: true });
      res.json({ started: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
