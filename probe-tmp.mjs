import { chromium } from '@playwright/test';

const url = process.argv[2] || 'http://localhost:3000/ai/chat';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.addInitScript(() => {
  localStorage.setItem('mcode_tokens', JSON.stringify({ access: 'fake-token-for-testing', refresh: 'fake-refresh' }));
});

const errs = [];
page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errs.push(`[console] ${m.text()}`); });

const pending = new Map();
page.on('request', (r) => pending.set(`${r.method()} ${r.url()}`, Date.now()));
page.on('requestfinished', (r) => pending.delete(`${r.method()} ${r.url()}`));
page.on('requestfailed', (r) => pending.delete(`${r.method()} ${r.url()}`));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(5000);
const before = await page.evaluate(() => document.readyState);
let loadError = '';
try {
  await page.reload({ waitUntil: 'load', timeout: 20000 });
} catch (e) {
  loadError = String(e && e.message ? e.message : e).split('\n')[0];
}
const after = await page.evaluate(() => ({
  readyState: document.readyState,
  pending: performance.getEntriesByType('resource').filter((x) => x.responseEnd === 0).map((x) => x.name).slice(0, 20),
}));

const info = await page.evaluate(() => {
  const aside = document.querySelector('aside');
  const r = aside?.getBoundingClientRect();
  return {
    url: location.pathname,
    asideFound: !!aside,
    asideBox: r ? `${Math.round(r.width)}x${Math.round(r.height)}` : null,
    asideVisible: aside ? !!(r && r.width > 0 && r.height > 0) : false,
    buttons: document.querySelectorAll('button').length,
    hasGod: /god/i.test(document.body.innerText),
    hasChat: /chat/i.test(document.body.innerText),
  };
});

console.log('=== ERRORS ===');
console.log(errs.filter((e) => !/WebSocket|3100|themeColor/.test(e)).join('\n') || '(none relevant)');
console.log('=== PAGE ===');
console.log(JSON.stringify({ ...info, beforeLoadReadyState: before, loadError, after }, null, 2));

await browser.close();
