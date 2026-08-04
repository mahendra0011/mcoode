import { io } from 'socket.io-client';
import { store } from '../store/index.js';
import {
  agentStarted,
  agentStep,
  agentDone,
  agentFailed,
  agentNeedsReview,
  planGenerated,
  removeAgent
} from '../store/slices/agentsSlice.js';
import { pushToast } from '../store/slices/toastSlice.js';
import { watchScan, watchFix, watchStatus } from '../store/slices/watchSlice.js';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  const token = localStorage.getItem('mcode_access');
  if (!token) return null;

  socket = io({ path: '/live', auth: { token }, autoConnect: true });
  const s = store;

  socket.on('agent:started', (p) => s.dispatch(agentStarted(p)));
  socket.on('agent:step', (p) => s.dispatch(agentStep(p)));
  socket.on('agent:done', (p) => {
    s.dispatch(agentDone(p));
    setTimeout(() => s.dispatch(removeAgent(p.todoId)), 8000);
  });
  socket.on('agent:failed', (p) => {
    s.dispatch(agentFailed(p));
    setTimeout(() => s.dispatch(removeAgent(p.todoId)), 8000);
  });
  socket.on('agent:needs_review', (p) => {
    s.dispatch(agentNeedsReview(p));
    setTimeout(() => s.dispatch(removeAgent(p.todoId)), 8000);
  });
  socket.on('integration:pass', (p) => {
    const summary = p.ran && p.status === 'running'
      ? 'integration tests running…'
      : p.status === 'error' ? `integration failed: ${p.error || ''}`
        : p.ran ? `integration ${p.status || 'passed'}` : 'integration skipped';
    s.dispatch(pushToast({ kind: p.status === 'error' ? 'err' : 'info', text: summary }));
  });
  socket.on('build:complete', (p) => {
    s.dispatch(pushToast({
      kind: p.failed > 0 ? 'warn' : 'ok',
      text: `build complete — ${p.done}/${p.total} todos${p.failed ? ` · ${p.failed} failed` : ''}`
    }));
  });
  socket.on('toast', (p) => {
    s.dispatch(pushToast({ kind: p.kind || 'info', text: p.text || '' }));
  });
  socket.on('plan:generated', (p) => s.dispatch(planGenerated(p)));
  socket.on('watch:scan', (p) => s.dispatch(watchScan(p)));
  socket.on('watch:fix', (p) => s.dispatch(watchFix(p)));
  socket.on('watch:status', (p) => s.dispatch(watchStatus(p)));

  return socket;
}

export function getSocket() {
  return socket;
}

export function joinSession(sessionId) {
  socket?.emit('session:join', { sessionId });
}

export function joinProject(projectId) {
  socket?.emit('project:join', { projectId });
}
