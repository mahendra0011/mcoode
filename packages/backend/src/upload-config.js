import multer from 'multer';
import { join, basename } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';

// Single upload policy for every route (BUG-36): one size limit, zip-only
// MIME gate, sanitized filenames, and relative file refs in responses
// (never absolute homedir paths).
export const MAX_UPLOAD_MB = Number(process.env.MCODE_MAX_UPLOAD_MB) || 50;
export const UPLOADS_DIR = join(homedir(), '.mcode', 'uploads');

const ZIP_MIMES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'multipart/x-zip',
  'application/octet-stream',
]);

export function zipOnlyFilter(req, file, cb) {
  const name = String(file.originalname || '').toLowerCase();
  if (name.endsWith('.zip') || ZIP_MIMES.has(file.mimetype)) return cb(null, true);
  const err = new Error('only .zip archives are accepted');
  err.code = 'INVALID_FILE_TYPE';
  cb(err);
}

export function safeFilename(original) {
  const base = basename(String(original || 'upload.zip')).replace(/[^a-z0-9._-]/gi, '_');
  return `${Date.now()}-${base}`;
}

/** Multer instance factory — disk storage, shared limits + filter. */
export function uploadSingle(field, { mimeFilter = zipOnlyFilter } = {}) {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await mkdir(UPLOADS_DIR, { recursive: true });
        cb(null, UPLOADS_DIR);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
  });
  const mw = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
    fileFilter: mimeFilter,
  }).single(field);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: { code: 'FILE_TOO_LARGE', message: `archive exceeds the ${MAX_UPLOAD_MB}MB limit (MCODE_MAX_UPLOAD_MB)` },
          });
        }
        if (err.code === 'INVALID_FILE_TYPE') {
          return res.status(400).json({ error: { code: 'INVALID_FILE_TYPE', message: err.message } });
        }
        return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message || 'file upload error' } });
      }
      next();
    });
  };
}

/** Multer array factory for folder-tree uploads (any file type; the
 *  extraction path still enforces GLOBAL_SKIP_DIRS + safeJoin). */
export function uploadFieldArray(field, maxCount = 2000) {
  const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await mkdir(UPLOADS_DIR, { recursive: true });
        cb(null, UPLOADS_DIR);
      } catch (err) {
        cb(err);
      }
    },
    filename: (req, file, cb) => cb(null, safeFilename(file.originalname)),
  });
  const mw = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: maxCount },
  }).array(field, maxCount);
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT') {
          return res.status(413).json({
            error: { code: 'FILE_TOO_LARGE', message: `upload exceeds limits (${MAX_UPLOAD_MB}MB/file, ${maxCount} files)` },
          });
        }
        return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message || 'file upload error' } });
      }
      next();
    });
  };
}
/** Relative file ref for API responses (no homedir leak). */
export function uploadRef(file) {
  if (!file) return null;
  return { file: file.filename, size: file.size };
}
