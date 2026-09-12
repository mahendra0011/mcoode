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
//   -> { files: [{ path: string, file: File }, ...] }
//   <- { type: 'progress', percent: number }
//   <- { type: 'done', blob: Blob }
//   <- { type: 'error', message: string }

import JSZip from 'jszip';

self.onmessage = async (event) => {
  const { files } = event.data || {};

  if (!files || files.length === 0) {
    self.postMessage({ type: 'error', message: 'No files received by zip worker' });
    return;
  }

  try {
    const zip = new JSZip();
    for (const { path, file } of files) {
      zip.file(path, file);
    }

    const blob = await zip.generateAsync(
      {
        type: 'blob',
        // STORE = no compression = fastest possible bundling (matches previous behavior).
        // Safe to switch to DEFLATE here later if upload bandwidth becomes the bottleneck
        // instead of CPU, since this now runs off the main thread either way.
        compression: 'STORE',
      },
      (metadata) => {
        self.postMessage({ type: 'progress', percent: Math.round(metadata.percent) });
      }
    );

    self.postMessage({ type: 'done', blob });
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message || 'Zip generation failed' });
  }
};
