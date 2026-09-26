/** CDP evaluate against a `node --inspect(-brk)=port` debuggee.
 *  Extracted for unit-testing (spawns a real inspector in tests). */
export async function evaluateInDebugger(port, expression, { timeoutMs = 10000 } = {}) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = (Array.isArray(targets) ? targets : []).find((t) => t.webSocketDebuggerUrl) || targets[0];
  if (!target?.webSocketDebuggerUrl) throw new Error('debugger target not ready yet');
  const { default: WebSocket } = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 1024 * 1024 });
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`evaluate timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true } }));
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        if (msg.id === 1) {
          clearTimeout(timer);
          try { ws.close(); } catch {}
          if (msg.error) reject(new Error(msg.error.message || 'evaluate failed'));
          else resolve(msg.result);
        }
      } catch {}
    });
    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
