import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../auth.js';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';

export function uploadRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  const uploadsDir = join(homedir(), '.mcode', 'uploads');
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      await mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-z0-9._-]/gi, '_');
      cb(null, `${Date.now()}-${safe}`);
    }
  });
  const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

  router.post('/project', upload.single('archive'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'no archive uploaded' } });
    }
    res.status(201).json({ file: req.file.filename, path: req.file.path, size: req.file.size });
  });

  return router;
}
