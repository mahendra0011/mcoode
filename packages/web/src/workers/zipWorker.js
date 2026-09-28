// zipWorker.js
//
// Runs JSZip bundling inside a dedicated Web Worker instead of the main UI thread.
// JSZip has no DOM dependency, so it works fine in a worker — the only thing that
// changes is *where* the CPU-heavy CRC32/compression work happens.
//
// Previously, `zip.generateAsync(...)` ran on the main thread for every folder/ZIP
// upload. For large projects (thousands of files) this blocked React re-renders and
// Framer Motion animations for seconds at a time, which is what made the "Upload
// Folder" flow feel randomly frozen/stuck ("beech beech mein atak jaata hai").
//
// Message protocol:
//   -> { files: [{ path: string, buf: ArrayBuffer }, ...] } (buffers transferred)
//   <- { type: 'progress', percent: number }
//   <- { type: 'done', buf: Uint8Array } (transferred, zero-copy)
//   <- { type: 'error', message: string }

import JSZip from 'jszip';

// 007: hard caps so a pathological selection OOMs with a clear error
// instead of dying silently mid-zip.
const MAX_ZIP_ENTRIES = 20000;
const MAX_ZIP_BYTES = 500 * 1024 * 1024;
const MAX_ZIP_COMPRESSED_BYTES = 500 * 1024 * 1024;

self.onmessage = async (event) => {
  const { files } = event.data || {};

  if (!files || files.length === 0) {
    self.postMessage({ type: 'error', message: 'No files received by zip worker' });
    return;
  }
  if (files.length > MAX_ZIP_ENTRIES) {
    self.postMessage({ type: 'error', message: `Too many files (${files.length} > ${MAX_ZIP_ENTRIES}) — select a smaller folder` });
    return;
  }

  try {
    const zip = new JSZip();
    let totalBytes = 0;
    for (const { path, buf } of files) {
      totalBytes += buf?.byteLength || 0;
      if (totalBytes > MAX_ZIP_BYTES) {
        self.postMessage({ type: 'error', message: 'Selection exceeds 500MB — select fewer/smaller files' });
        return;
      }
      zip.file(path, new Uint8Array(buf));
    }

    // 006: generate raw bytes and TRANSFER the buffer (zero-copy) instead
    // of structured-cloning a Blob (which doubles peak memory).
    const uint8 = await zip.generateAsync(
      {
        type: 'uint8array',
        // STORE = no compression = fastest possible bundling (matches previous behavior).
        // Safe to switch to DEFLATE here later if upload bandwidth becomes the bottleneck
        // instead of CPU, since this now runs off the main thread either way.
        compression: 'STORE',
      },
      (metadata) => {
        self.postMessage({ type: 'progress', percent: Math.round(metadata.percent) });
    if (metadata.percent === 100 && uint8.byteLength > MAX_ZIP_COMPRESSED_BYTES) {
      self.postMessage({ type: 'error', message: 'Compressed selection exceeds 500MB — select fewer/smaller files' });
      return;
    }
      }
    );

    self.postMessage({ type: 'done', buf: uint8 }, [uint8.buffer]);
  } catch (err) {
    // 749: never send an empty reason — name the failure class as fallback.
    self.postMessage({ type: 'error', message: err?.message || String(err) || `${err?.name || 'Unknown'} error during zip generation` });
  }
};
