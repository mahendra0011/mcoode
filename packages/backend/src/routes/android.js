import { Router } from 'express';
import adb from '@devicefarmer/adbkit';

const client = adb.createClient();

export function androidRoutes() {
  const router = Router();

  router.get('/devices', async (req, res, next) => {
    try {
      const devices = await client.listDevices();
      res.json({ devices });
    } catch (err) {
      res.status(500).json({ error: { message: 'ADB not available. Install Android SDK on server.' } });
    }
  });

  router.post('/devices/:id/start', async (req, res, next) => {
    try {
      // Emulator start karne ke liye `emulator -avd <name>` command chalao
      const { execa } = await import('execa');
      execa('emulator', ['-avd', req.params.id], { detached: true });
      res.json({ started: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
