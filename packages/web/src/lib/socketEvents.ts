/**
 * Canonical socket event names for the web client.
 *
 * WHY THIS FILE EXISTS (audit WEB-001)
 * ------------------------------------
 * `useChatSocket` used to subscribe to `subagent:*` while the CLI→backend relay
 * (`packages/shared/src/events.js` → `EVENT_TO_SOCKET`) only ever emits `agent:*`.
 * Ten handlers, ten reducers and the whole god-mode progress UI were therefore
 * unreachable. `packages/shared/src/events.js` also still *declares* a
 * `subagent:*` family under `SOCKET.CLIENT_TO_SERVER`, which is exactly what made
 * the wrong names look right in review.
 *
 * RULES
 *  1. A socket name is written down **here** and nowhere else.
 *  2. The values below are the ones the backend actually emits, i.e. the values of
 *     `EVENT_TO_SOCKET` in `packages/shared/src/events.js`. `packages/web/tests/
 *     socket-contract.test.js` asserts that this map stays equal to that object,
 *     so a rename in shared fails CI instead of silently killing the UI.
 *  3. The `subagent:*` block at the bottom is the **legacy** vocabulary used by
 *     the web-driven god mode (`ChatSession.runGod`) and is bound next to the
 *     `agent:*` handlers (audit WEB-032). Any other `subagent:*` name has no
 *     wire event and must not be subscribed to — `socket-contract.test.js`
 *     enforces exactly that split.
 */

export const SOCKET_EVENTS = {
  // ── Chat / agent turn ────────────────────────────────────────────────
  CHAT_STREAM: 'chat:stream',
  CHAT_MESSAGE: 'chat:message',
  CHAT_TOOL_CALL: 'chat:tool_call',
  CHAT_PERMISSION: 'chat:permission',
  CHAT_TODO_PLAN: 'chat:todo_plan',
  CHAT_TODO_UPDATE: 'chat:todo_update',
  CHAT_DONE: 'chat:done',
  CHAT_ERROR: 'chat:error',
  CHAT_UNDO_RESULT: 'chat:undo_result',
  CHAT_SHELL_STREAM: 'chat:shell_stream',

  // ── God mode: the ONLY subagent namespace the relay emits ─────────────
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

  // ── Watch mode ───────────────────────────────────────────────────────
  WATCH_FIX: 'watch:fix',

  // ── God mode: legacy `subagent:*` vocabulary (audit WEB-032) ──────────
  // WEB-001 removed every `subagent:*` subscription because the CLI→backend
  // relay (sockets.js `agent:*` allow-list) never emits them. That was only
  // half the story: the **web-driven** god mode (`ChatSession.runGod` in
  // packages/backend/src/chat-session.js) forwards the same bus events under
  // exactly these legacy names. With no listener, `chat:send {mode:'god'}`
  // showed no subagent activity at all. Both vocabularies are bound now;
  // these values mirror `SOCKET.SERVER_TO_CLIENT.SUBAGENT_*`.
  SUBAGENT_CREATED: 'subagent:created',
  SUBAGENT_ASSIGNED: 'subagent:assigned',
  SUBAGENT_STARTED: 'subagent:started',
  SUBAGENT_STEP: 'subagent:step',
  SUBAGENT_FILE: 'subagent:file',
  SUBAGENT_DONE: 'subagent:done',
  SUBAGENT_FAILED: 'subagent:failed',
  SUBAGENT_NEEDS_REVIEW: 'subagent:needs_review',
  SUBAGENT_TOOL_CALL: 'subagent:tool_call',
  SUBAGENT_TOOL_RESULT: 'subagent:tool_result',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
