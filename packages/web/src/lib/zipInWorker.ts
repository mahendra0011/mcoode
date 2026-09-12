// zipInWorker.ts
//
// Bundles { path, file } entries into a single ZIP Blob using a dedicated Web Worker,
// so the main UI thread stays responsive while a large project folder is zipped.
// Falls back to main-thread JSZip (old behavior) only if Workers are unavailable.

export interface ZipEntry {
  path: string;
  file: File;
}

/**
 * Large uploads (full projects, sometimes with big binary assets) can legitimately
 * take a while on slower connections. 120s was too tight and caused uploads that were
 * progressing fine to get killed mid-way ("beech beech mein fail ho jaata tha").
 */
export const WORKSPACE_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function zipFilesOffMainThread(
  entries: ZipEntry[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  if (typeof Worker === 'undefined') {
    // Extremely old / unusual environment without Worker support — fall back to
    // main-thread JSZip so upload still works, just without the responsiveness win.
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (const { path, file } of entries) zip.file(path, file);
    return zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => {
      onProgress?.(Math.round(meta.percent));
    });
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/zipWorker.js', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (e: MessageEvent<{ type: string; percent?: number; blob?: Blob; message?: string }>) => {
      const { type, percent, blob, message } = e.data;
      if (type === 'progress' && typeof percent === 'number') {
        onProgress?.(percent);
      } else if (type === 'done' && blob) {
        worker.terminate();
        resolve(blob);
      } else if (type === 'error') {
        worker.terminate();
        reject(new Error(message || 'Zip worker failed'));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err instanceof ErrorEvent ? new Error(err.message) : err);
    };

    worker.postMessage({ files: entries });
  });
}
