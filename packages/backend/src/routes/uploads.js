import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { uploadSingle, uploadRef } from '../upload-config.js';

export function uploadRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  router.post('/project', uploadSingle('archive'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'NO_FILE', message: 'no archive uploaded' } });
    }
    res.status(201).json({ ...uploadRef(req.file) });
  });

  return router;
}
