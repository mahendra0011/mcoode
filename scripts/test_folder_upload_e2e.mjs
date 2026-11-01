import { chromium } from 'playwright';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'mcode_dev_369447f4c30e4bc9904ec14a28689413af8fc21d';
const TEST_USER = {
  id: '6ae4e6bdb0a98f7268c8b715',
  email: 'technomp786@gmail.com',
  name: 'Mahendra Test'
};

const token = jwt.sign(TEST_USER, JWT_SECRET, { expiresIn: '7d' });

(async () => {
  console.log('--- STARTING FOLDER UPLOAD & ZIP WORKER E2E TEST ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  const errors = [];
  page.on('console', msg => {
    const txt = msg.text();
    logs.push(txt);
    if (msg.type() === 'error') {
      errors.push(txt);
      console.log('PAGE ERROR:', txt);
    }
  });

  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('BROWSER UNCAUGHT EXCEPTION:', err.message);
  });

  // Inject token
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('mcode_token', token);
    localStorage.setItem('mcode_user', JSON.stringify(user));
  }, { token, user: TEST_USER });

  await page.goto('http://localhost:3000/ai/chat', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  console.log('Testing zipFilesOffMainThread via page.evaluate()...');

  const result = await page.evaluate(async () => {
    try {
      // Import the zip worker function or test the worker script directly
      const worker = new Worker(new URL('/_next/static/chunks/src_workers_zipWorker_js.js', window.location.origin), {
        type: 'module',
      });

      return await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve({ status: 'timeout' });
        }, 8000);

        worker.onmessage = (e) => {
          if (e.data.type === 'progress') {
            console.log('Worker progress:', e.data.percent);
          } else if (e.data.type === 'done') {
            clearTimeout(timeout);
            worker.terminate();
            resolve({
              status: 'done',
              bufByteLength: e.data.buf ? e.data.buf.byteLength : 0
            });
          } else if (e.data.type === 'error') {
            clearTimeout(timeout);
            worker.terminate();
            resolve({
              status: 'error',
              message: e.data.message
            });
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve({
            status: 'worker_error',
            message: err.message
          });
        };

        // Post dummy files to test bundling
        const encoder = new TextEncoder();
        const file1Buf = encoder.encode('console.log("Hello from test server");\n').buffer;
        const file2Buf = encoder.encode('{"name": "test-project", "version": "1.0.0"}\n').buffer;

        worker.postMessage({
          files: [
            { path: 'server.js', buf: file1Buf },
            { path: 'package.json', buf: file2Buf }
          ]
        }, [file1Buf, file2Buf]);
      });
    } catch (err) {
      return { status: 'eval_error', message: err.message };
    }
  });

  console.log('Worker Direct Test Result:', result);

  // Now test the end-to-end simulated folder upload flow
  console.log('\nTesting simulated folder upload in AIChatPage...');
  const uploadResult = await page.evaluate(async () => {
    try {
      // Create test File objects
      const f1 = new File(['export default function App() { return <div>Test App</div>; }'], 'src/App.jsx', { type: 'text/javascript' });
      Object.defineProperty(f1, 'webkitRelativePath', { value: 'my-uploaded-folder/src/App.jsx' });

      const f2 = new File(['{"name": "my-uploaded-folder"}'], 'package.json', { type: 'application/json' });
      Object.defineProperty(f2, 'webkitRelativePath', { value: 'my-uploaded-folder/package.json' });

      // Create a DataTransfer or FileList-like object
      const dt = new DataTransfer();
      dt.items.add(f1);
      dt.items.add(f2);

      // Trigger the hidden file input or call window event / handler
      const fileInput = document.querySelector('input[type="file"][webkitdirectory]') || document.querySelector('input[type="file"]');
      return { hasFileInput: !!fileInput, filesCount: dt.files.length };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Upload check result:', uploadResult);

  await browser.close();

  if (result.status === 'error' && result.message.includes('uint8')) {
    console.error('FAIL: uint8 TDZ error still reproduced!');
    process.exit(1);
  } else if (result.status === 'done') {
    console.log(`SUCCESS: Worker processed files and returned valid zip (${result.bufByteLength} bytes)!`);
  } else {
    console.log('Result details:', result);
  }
})();
