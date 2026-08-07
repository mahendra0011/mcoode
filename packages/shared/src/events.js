export const EVENTS = Object.freeze({
  USER_PROMPT: 'USER_PROMPT',
  PLAN_GENERATED: 'PLAN_GENERATED',
  PLAN_APPROVED: 'PLAN_APPROVED',
  SUBAGENT_CREATED: 'SUBAGENT_CREATED',
  SUBAGENT_ASSIGNED: 'SUBAGENT_ASSIGNED',
  SUBAGENT_STARTED: 'SUBAGENT_STARTED',
  SUBAGENT_STEP: 'SUBAGENT_STEP',
  SUBAGENT_FILE: 'SUBAGENT_FILE',
  SUBAGENT_TOOL_CALL: 'SUBAGENT_TOOL_CALL',
  SUBAGENT_TOOL_RESULT: 'SUBAGENT_TOOL_RESULT',
  SUBAGENT_DONE: 'SUBAGENT_DONE',
  SUBAGENT_FAILED: 'SUBAGENT_FAILED',
  SUBAGENT_NEEDS_REVIEW: 'SUBAGENT_NEEDS_REVIEW',
  WAVE_START: 'WAVE_START',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  INTEGRATION_PASS: 'INTEGRATION_PASS',
  BUILD_COMPLETE: 'BUILD_COMPLETE',
  TOAST: 'TOAST',
  MESSAGE: 'MESSAGE',
  PERMISSION_ANSWER: 'PERMISSION_ANSWER',
  WATCH_SCAN: 'WATCH_SCAN',
  WATCH_CHANGE: 'WATCH_CHANGE',
  WATCH_FIX: 'WATCH_FIX',
  WATCH_STATUS: 'WATCH_STATUS',
  UNDO: 'UNDO',
  HOOK_EXECUTED: 'HOOK_EXECUTED'
});

export const SUBAGENT_STATUS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
  NEEDS_REVIEW: 'needs_review'
});

export const SESSION_MODES = Object.freeze({
  GOD: 'god',
  INIT: 'init',
  RUN: 'run',
  WATCH: 'watch',
  MANUAL: 'manual'
});

export const WATCH_OUTCOMES = Object.freeze({
  AUTO_FIXED: 'auto-fixed',
  NO_ISSUES: 'no-issues',
  NEEDS_REVIEW: 'needs-review'
});

export const SOCKET = Object.freeze({
  NS: '/live',
  CLIENT_TO_SERVER: {
    SESSION_START: 'session:start',
    PLAN_GENERATED: 'plan:generated',
    AGENT_STARTED: 'agent:started',
    AGENT_STEP: 'agent:step',
    AGENT_FILE: 'agent:file',
    AGENT_DONE: 'agent:done',
    AGENT_FAILED: 'agent:failed',
    AGENT_NEEDS_REVIEW: 'agent:needs_review',
    WAVE_START: 'wave:start',
    WAVE_COMPLETE: 'wave:complete',
    INTEGRATION_PASS: 'integration:pass',
    BUILD_COMPLETE: 'build:complete',
    TOAST: 'toast',
    WATCH_SCAN: 'watch:scan',
    WATCH_FIX: 'watch:fix',
    WATCH_STATUS: 'watch:status',
    // Web chat / agent events
    CHAT_START: 'chat:start',
    CHAT_SEND: 'chat:send',
    CHAT_PERMISSION_ANSWER: 'chat:permission_answer',
    CHAT_INTERRUPT: 'chat:interrupt'
  },
  SERVER_TO_CLIENT: {
    CHAT_READY: 'chat:ready',
    CHAT_STREAM: 'chat:stream',
    CHAT_MESSAGE: 'chat:message',
    CHAT_TOOL_CALL: 'chat:tool_call',
    CHAT_PERMISSION: 'chat:permission',
    CHAT_DONE: 'chat:done',
    CHAT_ERROR: 'chat:error'
  }
});
