import { createSlice } from '@reduxjs/toolkit';
import type { ChatMessage } from '../types/chat';
import type { ProblemEntry } from '../components/ide/BottomPanel';

function safeHostname(url: string | null | undefined): string {
  try {
    return new URL(url as string).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '').slice(0, 30);
  }
}

function sanitizeToolArgs(args: any): any {
  if (typeof args === 'string') {
    const trimmed = args.trim();
    if (trimmed.startsWith('{') && (trimmed.includes('"path"') || trimmed.includes('"command"') || trimmed.includes('"content"'))) {
      try {
        const p = JSON.parse(trimmed);
        return p.path || p.file || p.command || p.query || p.url || args;
      } catch {
        const m = /"path"\s*:\s*"([^"]+)"/.exec(trimmed);
        if (m) return m[1];
      }
    }
    return args;
  }
  if (args && typeof args === 'object') {
    return args.path || args.file || args.command || args.query || args.url || '';
  }
  return args;
}

type Status = 'idle' | 'connecting' | 'ready' | 'error';
type Mode = 'chat' | 'agent' | 'plan' | 'explain' | 'review';

export interface Model { ref?: string; id?: string; provider?: string; name?: string }
export interface TodoItem { id: string | number; status: string; [k: string]: unknown }
export interface Plan {
  summary?: string;
  todos?: TodoItem[] | null;
  designSystem?: {
    colors: Record<string, string>;
    fonts: { heading: string; body: string; mono?: string };
    spacingScale?: string;
    componentStyle?: string;
    tone?: string;
  };
}
export interface PermissionRequest {
  requestId?: string;
  status?: string;
  kind?: 'shell' | 'plan-approval' | 'security-audit' | 'playwright-audit' | 'security-fix';
  command?: string;
  planSummary?: string;
  count?: number;
  [k: string]: unknown;
}
export interface RoleAssignment {
  domain: string;
  model: string;
  provider: string;
  todoCount: number;
}
export interface ComparisonRow {
  id: string;
  text: string;
  state: 'done' | 'incomplete' | 'checking';
}
export interface PlaywrightIssue {
  description: string;
  severity: 'low' | 'medium' | 'high';
  screenshotUrl?: string;
  route?: string;
}
export interface WatchActivityItem {
  file: string;
  outcome: 'fixed' | 'needs-review' | 'skipped' | 'routing' | string;
  detail: string;
  timestamp: string;
  domain?: string;
}
export interface BugcheckFinding {
  file: string;
  line?: number;
  column?: number;
  tier?: number;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'error' | 'warning' | 'info' | string;
  msg?: string;
  issue?: string;
  source?: string;
  category?: string;
  canCrashServer?: boolean;
}
export function toProblemEntries(findings: BugcheckFinding[]): ProblemEntry[] {
  return (findings || []).map((f, idx) => ({
    id: `bugcheck-${f.file}-${f.line || 0}-${f.tier || idx}`,
    severity: (f.severity === 'high' || f.severity === 'critical' || f.severity === 'error') ? 'error'
             : (f.severity === 'medium' || f.severity === 'warning') ? 'warning' : 'info',
    message: f.msg || f.issue || 'Issue detected',
    file: f.file,
    line: f.line || 0,
    column: f.column,
    source: f.source || 'static-analysis',
    ruleId: f.category || (f.canCrashServer ? 'crash-risk' : undefined),
    canCrashServer: f.canCrashServer,
  }));
}
export interface DeepFinding {
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  explanation?: string;
  canCrashServer?: boolean;
  flow?: string;
  files?: string[];
}
export interface BugcheckTierStatus {
  tier: number;
  label: string;
  done: boolean;
  count: number;
  costsAI: boolean;
}
export interface Toast { id: string; kind?: string; text?: string }
export interface Wave { wave: number; total: number; completed: number; status: string; subagentIds?: string[] }
export interface Subagent {
  todoId: string;
  domain?: string;
  status: string;
  message?: string;
  progress?: number;
  model?: string;
  title?: string;
  startedAt?: string;
  tokens?: number;
  latency?: number;
  secs?: number;
  lastFile?: string;
  lastTool?: string;
  lastToolArgs?: unknown;
  lastToolResult?: { tool?: string; ms?: number; risk?: string };
  reviewReason?: string;
}
export interface BuildSummary { done?: number; total?: number; failed?: number; needsReview?: number; elapsedSecs?: number; cost?: number }

interface ChatState {
  status: Status;
  keysError: string | null;
  mode: Mode;
  messages: ChatMessage[];
  plan: Plan | null;
  permissionRequest: PermissionRequest | null;
  lastUndoResult: unknown;
  isStreaming: boolean;
  models: Model[];
  selectedModel: string | null;
  godMode: boolean;
  waves: Wave[];
  subagents: Record<string, Subagent>;
  buildSummary: BuildSummary | null;
  buildIntegration?: unknown;
  toasts: Toast[];
  _turnDone: boolean;

  // WEB God Mode (Phases 0-11)
  enhancedPrompt: { original: string; enhanced: string; accepted: boolean; pending: boolean } | null;
  clarifyQuestions: { question: string; options: string[]; answer: string | null }[];
  permissionMode: 'ask' | 'full';
  codebaseReading: { active: boolean; filesRead: number; totalFiles: number; readers: number; currentAreas: string[] } | null;
  projectTier: 'scratch' | 'small' | 'medium' | 'large' | 'xlarge' | null;
  concurrency: number;
  comparisonRows: ComparisonRow[];
  verificationPass: number;
  securityAudit: { rows: ComparisonRow[]; pass: number } | null;
  playwrightAudit: { active: boolean; pass: number; issues: PlaywrightIssue[]; clean: boolean } | null;
  roleAssignments: RoleAssignment[];

  // WEB Watch Mode (docs 38-40)
  watch: {
    active: boolean;
    scansRun: number;
    fixesApplied: number;
    lastActivity: WatchActivityItem[];
  };

  // WEB Bug Check Mode (doc 44)
  problems: ProblemEntry[];
  bugcheck: {
    running: boolean;
    tierStatus: BugcheckTierStatus[];
    deepFindings: DeepFinding[];
    reportUrl: string | null;
  };

  // WEB Security Checkup Mode (doc 47)
  securityCheckup: {
    running: boolean;
    findings: import('../components/ide/SecurityChecklistCard').SecurityFinding[];
    passed: Array<{ id: string; category: string; label: string }>;
    reportUrl: string | null;
    fixing: boolean;
    fixResults: any[] | null;
  };

  // WEB Test Mode (doc 48) — autonomous self-healing testing agent
  testMode: {
    selecting: boolean;
    running: boolean;
    types: string[];
    inventoryCount: number;
    features: import('../components/ide/AutonomousTestPanel').TestFeatureStatus[];
    traditional: import('../components/ide/AutonomousTestPanel').TestTraditional[];
    summary: import('../components/ide/AutonomousTestPanel').TestModeSummary | null;
    reportUrl: string | null;
    targetUrl: string | null;
  };

  // WEB Review Mode (doc 49)
  reviewFindings: import('../components/ide/ReviewFindingsCard').ReviewFinding[];
  reviewRunning: boolean;

  // WEB Migrate Mode (doc 51)
  migration: {
    running: boolean;
    stage: string;
    pass: number;
    maxPasses: number;
    equivalenceRows: ComparisonRow[];
    equivalent: boolean | null;
    summary: any | null;
  };

  // WEB Audit Mode (doc 52)
  audit: {
    running: boolean;
    grades: Record<string, string>;
    overallGrade: string;
    results: Record<string, any>;
    reportUrl: string | null;
    pdfUrl: string | null;
  } | null;
}

const initialState: ChatState = {
  status: 'idle',
  keysError: null,
  mode: 'chat',
  messages: [],
  plan: null,
  permissionRequest: null,
  lastUndoResult: null,
  isStreaming: false,
  models: [],
  selectedModel: null,
  godMode: false,
  waves: [],
  subagents: {},
  buildSummary: null,
  toasts: [],
  _turnDone: false,

  // WEB God Mode initial state
  enhancedPrompt: null,
  clarifyQuestions: [],
  permissionMode: 'ask',
  codebaseReading: null,
  projectTier: null,
  concurrency: 0,
  comparisonRows: [],
  verificationPass: 0,
  securityAudit: null,
  playwrightAudit: null,
  roleAssignments: [],

  // WEB Watch Mode initial state
  watch: {
    active: false,
    scansRun: 0,
    fixesApplied: 0,
    lastActivity: [],
  },

  // WEB Bug Check Mode initial state
  problems: [],
  bugcheck: {
    running: false,
    tierStatus: [
      { tier: 1, label: 'Syntax & Type Errors', done: false, count: 0, costsAI: false },
      { tier: 2, label: 'Known Crash Patterns', done: false, count: 0, costsAI: false },
      { tier: 3, label: 'Dependency Vulnerabilities', done: false, count: 0, costsAI: false },
      { tier: 4, label: 'Deep Logic & Flow Analysis', done: false, count: 0, costsAI: true },
    ],
    deepFindings: [],
    reportUrl: null,
  },

  // WEB Security Checkup Mode initial state (doc 47)
  securityCheckup: {
    running: false,
    findings: [],
    passed: [],
    reportUrl: null,
    fixing: false,
    fixResults: null,
  },

  // WEB Test Mode initial state (doc 48)
  testMode: {
    selecting: false,
    running: false,
    types: [],
    inventoryCount: 0,
    features: [],
    traditional: [],
    summary: null,
    reportUrl: null,
    targetUrl: null,
  },

  // WEB Review Mode initial state (doc 49)
  reviewFindings: [],
  reviewRunning: false,

  // WEB Migrate Mode initial state (doc 51)
  migration: {
    running: false,
    stage: 'idle',
    pass: 1,
    maxPasses: 5,
    equivalenceRows: [],
    equivalent: null,
    summary: null,
  },
  audit: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    chatReady: (state, action) => {
      state.status = 'ready';
      const payload: Model[] = action.payload || [];
      const hasModels = payload.length > 0 && payload.some((m) => m.ref);
      if (hasModels) {
        state.models = payload;
      }
      if (!state.selectedModel && state.models.length > 0) {
        const poolSide = state.models.find((m) => m.provider === 'poolside');
        const first = poolSide || state.models[0];
        state.selectedModel = first.ref || first.id || null;
      }
      state.keysError = null;
    },
    chatError: (state, action) => {
      const { kind, message } = action.payload || {};
      if (kind === 'keys') {
        state.keysError = message || 'please select your api keys to use mcode';
      }
      state.status = 'error';
      state.isStreaming = false;
      state._turnDone = true;
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.kind === 'stream') {
        lastMessage.kind = 'assistant';
        lastMessage.status = 'done';
      }
    },
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    setSelectedModel: (state, action) => {
      state.selectedModel = action.payload;
    },
    setModels: (state, action) => {
      state.models = action.payload || [];
      state.keysError = null;
      if (state.models.length > 0) {
        const valid = state.models.some((m) => m.ref === state.selectedModel);
        if (!valid) {
          const poolSide = state.models.find((m) => m.provider === 'poolside');
          const first = poolSide || state.models[0];
          state.selectedModel = first.ref || first.id || null;
        }
      } else {
        state.selectedModel = null;
      }
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      state.isStreaming = true;
      state._turnDone = false;
      state.keysError = null;
    },
    streamUpdate: (state, action) => {
      if (state._turnDone) return;

      const text = action.payload;
      const lastMessage = state.messages[state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.kind === 'stream') {
        lastMessage.text = text.startsWith(lastMessage.text)
          ? text
          : (lastMessage.text || '') + text;
      } else {
        state.messages.push({
          id: Date.now().toString(),
          role: 'assistant',
          kind: 'stream',
          text: text,
          blocks: []
        });
      }
    },
    agentMessage: (state, action) => {
      const payload = action.payload;
      if (!payload) return;

      const isWebTool =
        payload.kind === 'tool' &&
        (payload.tool === 'web_search' || payload.tool === 'web_fetch' || payload.searchResults);

      if (isWebTool) {
        // Consolidate into a single web tool component for the current assistant turn
        let existingWebMsg: ChatMessage | null = null;
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.role === 'user') break;
          if (m.kind === 'tool' && (m.tool === 'web_search' || m.tool === 'web_fetch' || m.searchResults)) {
            existingWebMsg = m;
            break;
          }
        }

        const incomingResults = payload.searchResults?.results || [];
        const fetchUrl =
          payload.tool === 'web_fetch'
            ? (typeof payload.args === 'string' ? payload.args : payload.args?.url || payload.path || '')
            : '';

        if (existingWebMsg) {
          if (!existingWebMsg.searchResults) {
            existingWebMsg.searchResults = {
              query: payload.searchResults?.query || payload.args?.query || fetchUrl || '',
              phase: payload.status === 'running' ? 'searching' : 'done',
              results: [],
              answer: ''
            };
          }

          const results = existingWebMsg.searchResults.results || [];
          const seen = new Set(results.map((r: any) => r.url).filter(Boolean));

          for (const r of incomingResults) {
            if (r.url && !seen.has(r.url)) {
              seen.add(r.url);
              results.push(r);
            }
          }

          if (fetchUrl && !seen.has(fetchUrl)) {
            seen.add(fetchUrl);
            results.push({
              title: payload.title || fetchUrl,
              url: fetchUrl,
              domain: safeHostname(fetchUrl),
              snippet: (payload.output || '').slice(0, 200)
            });
          }

          existingWebMsg.searchResults.results = results;
          if (payload.status === 'running') {
            existingWebMsg.status = 'running';
            existingWebMsg.searchResults.phase = payload.searchResults?.phase || 'searching';
          } else if (payload.status === 'done') {
            existingWebMsg.status = 'done';
            existingWebMsg.searchResults.phase = 'done';
          }
          return;
        }

        const initialResults = [...incomingResults];
        if (fetchUrl && !initialResults.some((r: any) => r.url === fetchUrl)) {
          initialResults.push({
            title: payload.title || fetchUrl,
            url: fetchUrl,
            domain: safeHostname(fetchUrl),
            snippet: (payload.output || '').slice(0, 200)
          });
        }

        state.messages.push({
          id: payload.replaceKey || Date.now().toString(),
          role: 'assistant',
          kind: 'tool',
          tool: 'web_search',
          status: payload.status || 'running',
          args: payload.args,
          searchResults: {
            query: payload.searchResults?.query || payload.args?.query || fetchUrl || 'web search',
            phase: payload.status === 'running' ? (payload.searchResults?.phase || 'searching') : 'done',
            results: initialResults,
            answer: ''
          },
          blocks: []
        });
        return;
      }

      const cleanArgs = sanitizeToolArgs(payload.args);
      const sanitizedPayload = payload.args !== undefined ? { ...payload, args: cleanArgs } : payload;

      if (payload.replaceKey) {
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.id === payload.replaceKey || (m as any).replaceKey === payload.replaceKey) {
            state.messages[i] = {
              ...state.messages[i],
              ...sanitizedPayload,
              id: payload.replaceKey
            };
            return;
          }
        }
      }

      state.messages.push({
        id: payload.replaceKey || Date.now().toString(),
        role: 'assistant',
        kind: payload.kind || 'tool',
        ...sanitizedPayload
      });
    },
    toolCallStarted: (state, action) => {
      const payload = action.payload;
      if (!payload) return;

      const cleanArgs = sanitizeToolArgs(payload.args);

      const isWebTool =
        payload.tool === 'web_search' || payload.tool === 'web_fetch' || payload.searchResults;

      if (isWebTool) {
        let existingWebMsg: ChatMessage | null = null;
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.role === 'user') break;
          if (m.kind === 'tool' && (m.tool === 'web_search' || m.tool === 'web_fetch' || m.searchResults)) {
            existingWebMsg = m;
            break;
          }
        }

        const fetchUrl =
          payload.tool === 'web_fetch'
            ? (typeof cleanArgs === 'string' ? cleanArgs : cleanArgs?.url || '')
            : '';

        if (existingWebMsg) {
          existingWebMsg.status = 'running';
          if (existingWebMsg.searchResults) {
            existingWebMsg.searchResults.phase = payload.searchResults?.phase || 'searching';
            if (fetchUrl) {
              const results = existingWebMsg.searchResults.results || [];
              if (!results.some((r: any) => r.url === fetchUrl)) {
                results.push({
                  title: fetchUrl,
                  url: fetchUrl,
                  domain: safeHostname(fetchUrl)
                });
                existingWebMsg.searchResults.results = results;
              }
            }
          }
          return;
        }

        state.messages.push({
          id: payload.replaceKey || Date.now().toString(),
          role: 'assistant',
          kind: 'tool',
          tool: 'web_search',
          status: 'running',
          args: cleanArgs,
          searchResults: payload.searchResults || {
            query: typeof cleanArgs === 'string' ? cleanArgs : fetchUrl || 'web search',
            phase: 'searching',
            results: fetchUrl ? [{ title: fetchUrl, url: fetchUrl, domain: safeHostname(fetchUrl) }] : [],
            answer: ''
          },
          blocks: []
        });
        return;
      }

      // Deduplicate: If replaceKey already exists, update in-place instead of creating duplicate
      if (payload.replaceKey) {
        for (let i = state.messages.length - 1; i >= 0; i--) {
          const m = state.messages[i];
          if (m.id === payload.replaceKey || (m as any).replaceKey === payload.replaceKey) {
            state.messages[i] = {
              ...state.messages[i],
              status: 'running',
              tool: payload.tool,
              args: cleanArgs,
              replaceKey: payload.replaceKey
            };
            return;
          }
        }
      }

      state.messages.push({
        id: payload.replaceKey || Date.now().toString(),
        role: 'assistant',
        kind: 'tool',
        tool: payload.tool,
        args: cleanArgs,
        status: 'running',
        replaceKey: payload.replaceKey,
        blocks: []
      });
    },
    permissionRequested: (state, action) => {
      state.permissionRequest = action.payload;
    },
    clearPermission: (state) => {
      state.permissionRequest = null;
    },
    permissionAnswered: (state, action) => {
      const { requestId, answer } = action.payload || {};
      if (!requestId || state.permissionRequest?.requestId === requestId) {
        if (answer === 'always' && state.permissionRequest?.kind === 'plan-approval') {
          state.permissionMode = 'full';
        }
        state.permissionRequest = null;
      }
    },
    resetStreaming: (state) => {
      state.isStreaming = false;
      state._turnDone = true;
    },
    setUndoResult: (state, action) => {
      state.lastUndoResult = action.payload;
    },
    setPlan: (state, action) => {
      state.plan = action.payload;
    },
    updateTodo: (state, action) => {
      if (state.plan && state.plan.todos) {
        const { id, status } = action.payload;
        const todo = state.plan.todos.find((t) => t.id === id);
        if (todo) {
          todo.status = status;
        }
      }
    },
    chatDone: (state, action) => {
      state.isStreaming = false;
      state._turnDone = true;
      const payloadText = action.payload?.text;
      let lastStreamIdx = -1;
      for (let i = state.messages.length - 1; i >= 0; i--) {
        if (state.messages[i].kind === 'stream') {
          lastStreamIdx = i;
          break;
        }
      }
      for (let i = state.messages.length - 1; i >= 0; i--) {
        const m = state.messages[i];
        if (m.kind === 'stream') {
          if (i === lastStreamIdx && payloadText && (!m.text || payloadText.startsWith(m.text))) {
            m.text = payloadText;
          }
          m.kind = 'assistant';
          m.status = 'done';
        }
      }
    },
    clearChat: (state) => {
      state.messages = [];
      state.plan = null;
      state.permissionRequest = null;
      state.isStreaming = false;
      state._turnDone = false;
      state.keysError = null;
      state.waves = [];
      state.subagents = {};
      state.buildSummary = null;
      state.enhancedPrompt = null;
      state.clarifyQuestions = [];
      state.codebaseReading = null;
      state.roleAssignments = [];
      state.comparisonRows = [];
      state.verificationPass = 0;
      state.securityAudit = null;
      state.playwrightAudit = null;
    },

    // ── God-mode reducers ───────────────────────────────────────────
    setGodMode: (state, action) => {
      state.godMode = action.payload;
    },
    setSubagentCreated: (state, action) => {
      const p = action.payload || {};
      state.subagents[p.todoId] = {
        todoId: p.todoId,
        domain: p.domain,
        status: 'pending',
        message: '',
        progress: 0
      };
    },
    setSubagentAssigned: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'assigned';
        state.subagents[p.todoId].model = p.model;
        state.subagents[p.todoId].title = p.title;
      }
    },
    setSubagentStarted: (state, action) => {
      const p = action.payload || {};
      if (!state.subagents[p.todoId]) {
        state.subagents[p.todoId] = {
          todoId: p.todoId,
          domain: p.domain,
          status: 'running',
          message: '',
          progress: 0
        };
      } else {
        state.subagents[p.todoId].status = 'running';
      }
      state.subagents[p.todoId].startedAt = p.startedAt;
      state.subagents[p.todoId].tokens = p.tokens;
      state.subagents[p.todoId].latency = p.latency;
    },
    setSubagentStep: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].message = p.message || state.subagents[p.todoId].message;
        if (p.tokens != null) state.subagents[p.todoId].tokens = p.tokens;
        if (p.secs != null) state.subagents[p.todoId].secs = p.secs;
      }
    },
    setSubagentDone: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'done';
        state.subagents[p.todoId].progress = 100;
      }
    },
    setSubagentFailed: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'failed';
      }
    },
    setSubagentFile: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].lastFile = p.file;
      }
    },
    setSubagentToolCall: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].lastTool = p.tool;
        state.subagents[p.todoId].lastToolArgs = p.args;
      }
    },
    setSubagentToolResult: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].lastToolResult = { tool: p.tool, ms: p.ms, risk: p.risk };
      }
    },
    setSubagentNeedsReview: (state, action) => {
      const p = action.payload || {};
      if (p.todoId && state.subagents[p.todoId]) {
        state.subagents[p.todoId].status = 'needs_review';
        state.subagents[p.todoId].reviewReason = p.reason;
      }
    },
    setWaveStart: (state, action) => {
      const p = action.payload || {};
      if (p.projectTier !== undefined) state.projectTier = p.projectTier;
      if (p.concurrency !== undefined) state.concurrency = p.concurrency;
      state.waves.push({
        wave: p.wave,
        total: p.total || 0,
        completed: 0,
        status: 'running',
        subagentIds: p.subagentIds
      });
    },
    setWaveComplete: (state, action) => {
      const p = action.payload || {};
      const wave = state.waves.find((w) => w.wave === p.wave);
      if (wave) {
        wave.status = 'complete';
        wave.completed = p.completed || wave.total;
      }
    },
    setIntegrationPass: (state, action) => {
      state.buildIntegration = action.payload || {};
    },
    setBuildComplete: (state, action) => {
      state.buildSummary = action.payload;
      state.isStreaming = false;
      state.godMode = false;
    },
    promptEnhancing: (state) => {
      state.enhancedPrompt = { original: '', enhanced: '', accepted: false, pending: true };
    },
    promptEnhanced: (state, action) => {
      state.enhancedPrompt = { ...action.payload, accepted: false, pending: false };
    },
    promptEnhancementResolved: (state, action) => {
      if (state.enhancedPrompt) {
        state.enhancedPrompt.accepted = !!action.payload;
        state.enhancedPrompt.pending = false;
      }
    },
    clarifyAsked: (state, action) => {
      state.clarifyQuestions.push({ ...action.payload, answer: null });
    },
    clarifyAnswered: (state, action) => {
      const q = state.clarifyQuestions.find((c) => c.question === action.payload.question);
      if (q) q.answer = action.payload.answer;
    },
    codebaseReadingProgress: (state, action) => {
      const p = action.payload || {};
      state.codebaseReading = {
        active: true,
        filesRead: p.filesRead || 0,
        totalFiles: p.totalFiles || 0,
        readers: p.readers || 1,
        currentAreas: p.currentAreas || []
      };
    },
    codebaseReadingDone: (state) => {
      if (state.codebaseReading) {
        state.codebaseReading.active = false;
      }
    },
    roleAssignmentsSet: (state, action) => {
      state.roleAssignments = action.payload || [];
    },
    comparisonUpdated: (state, action) => {
      const p = action.payload || {};
      state.comparisonRows = p.rows || [];
      state.verificationPass = p.pass || 1;
    },
    securityAuditUpdated: (state, action) => {
      const p = action.payload || {};
      state.securityAudit = {
        rows: p.rows || [],
        pass: p.pass || 1
      };
    },
    playwrightAuditUpdated: (state, action) => {
      const p = action.payload || {};
      state.playwrightAudit = {
        active: p.active !== undefined ? p.active : (state.playwrightAudit?.active ?? true),
        pass: p.pass !== undefined ? p.pass : (state.playwrightAudit?.pass ?? 1),
        issues: p.issues !== undefined ? p.issues : (state.playwrightAudit?.issues ?? []),
        clean: p.clean !== undefined ? p.clean : (state.playwrightAudit?.clean ?? false)
      };
    },
    playwrightIssueAdded: (state, action) => {
      if (!state.playwrightAudit) {
        state.playwrightAudit = { active: true, pass: 1, issues: [], clean: false };
      }
      state.playwrightAudit.issues.push(action.payload);
      state.playwrightAudit.clean = false;
    },
    // WEB Watch Mode reducers (docs 38-40)
    watchStatusUpdated: (state, action) => {
      const p = action.payload || {};
      state.watch.active = p.status === 'running';
      if (p.scansRun !== undefined) state.watch.scansRun = p.scansRun;
      if (p.fixesApplied !== undefined) state.watch.fixesApplied = p.fixesApplied;
    },
    watchActivityReceived: (state, action) => {
      const item = action.payload;
      if (item) {
        state.watch.lastActivity = [item, ...state.watch.lastActivity].slice(0, 20);
        if (item.outcome === 'fixed') {
          state.watch.fixesApplied = (state.watch.fixesApplied || 0) + 1;
        }
      }
    },
    addToast: (state, action) => {
      const { id, kind = 'info', text } = action.payload || {};
      state.toasts.push({ id: id || Date.now().toString(), kind, text });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    // WEB Bug Check Mode reducers (doc 44)
    problemsAppended: (state, action) => {
      const newItems: ProblemEntry[] = Array.isArray(action.payload) ? action.payload : [action.payload];
      const existingIds = new Set(state.problems.map((p) => p.id));
      for (const item of newItems) {
        if (!existingIds.has(item.id)) {
          state.problems.push(item);
          existingIds.add(item.id);
        }
      }
    },
    problemsCleared: (state) => {
      state.problems = [];
    },
    bugcheckStarted: (state) => {
      state.bugcheck.running = true;
      state.bugcheck.deepFindings = [];
      state.bugcheck.reportUrl = null;
      state.bugcheck.tierStatus = [
        { tier: 1, label: 'Syntax & Type Errors', done: false, count: 0, costsAI: false },
        { tier: 2, label: 'Known Crash Patterns', done: false, count: 0, costsAI: false },
        { tier: 3, label: 'Dependency Vulnerabilities', done: false, count: 0, costsAI: false },
        { tier: 4, label: 'Deep Logic & Flow Analysis', done: false, count: 0, costsAI: true },
      ];
      state.problems = state.problems.filter((p) => !p.id.startsWith('bugcheck-'));
    },
    bugcheckTierStarted: (state, action) => {
      const { tier, label, costsAI } = action.payload || {};
      const t = state.bugcheck.tierStatus.find((item) => item.tier === tier);
      if (t) {
        if (label) t.label = label;
        if (costsAI !== undefined) t.costsAI = costsAI;
      }
    },
    bugcheckTierDone: (state, action) => {
      const { tier, findings = [], isProblemEntry } = action.payload || {};
      const count = findings.length;
      const t = state.bugcheck.tierStatus.find((item) => item.tier === tier);
      if (t) {
        t.done = true;
        t.count = count;
      }
      if (tier <= 3 || isProblemEntry) {
        const problemEntries = toProblemEntries(findings);
        const existingIds = new Set(state.problems.map((p) => p.id));
        for (const pe of problemEntries) {
          if (!existingIds.has(pe.id)) {
            state.problems.push(pe);
            existingIds.add(pe.id);
          }
        }
      } else {
        state.bugcheck.deepFindings = [...state.bugcheck.deepFindings, ...findings];
      }
    },
    bugcheckDone: (state, action) => {
      state.bugcheck.running = false;
      if (action.payload?.reportUrl) {
        state.bugcheck.reportUrl = action.payload.reportUrl;
      }
    },
    // WEB Security Checkup Mode reducers (doc 47)
    securityCheckStarted: (state) => {
      state.securityCheckup.running = true;
      state.securityCheckup.findings = [];
      state.securityCheckup.passed = [];
      state.securityCheckup.reportUrl = null;
      state.securityCheckup.fixResults = null;
    },
    securityCheckDone: (state, action) => {
      state.securityCheckup.running = false;
      state.securityCheckup.findings = action.payload?.findings || [];
      state.securityCheckup.passed = action.payload?.passed || [];
      state.securityCheckup.reportUrl = action.payload?.reportUrl || null;
    },
    securityFixStarted: (state) => {
      state.securityCheckup.fixing = true;
    },
    securityFixDone: (state, action) => {
      state.securityCheckup.fixing = false;
      state.securityCheckup.fixResults = action.payload?.results || null;
      if (action.payload?.updatedFindings) {
        state.securityCheckup.findings = action.payload.updatedFindings;
      }
      if (action.payload?.reportUrl) {
        state.securityCheckup.reportUrl = action.payload.reportUrl;
      }
    },
    securityCheckDismissed: (state) => {
      state.securityCheckup.findings = [];
      state.securityCheckup.running = false;
    },
    // WEB Test Mode reducers (doc 48)
    testModeSelectorOpened: (state) => {
      state.testMode.selecting = true;
    },
    testModeSelectorClosed: (state) => {
      state.testMode.selecting = false;
    },
    testModeStarted: (state, action) => {
      state.testMode.selecting = false;
      state.testMode.running = true;
      state.testMode.types = action.payload?.types || [];
      state.testMode.inventoryCount = 0;
      state.testMode.features = [];
      state.testMode.traditional = [];
      state.testMode.summary = null;
      state.testMode.reportUrl = null;
      state.testMode.targetUrl = action.payload?.targetUrl || null;
    },
    testInventorySet: (state, action) => {
      const features = action.payload?.features || [];
      state.testMode.inventoryCount = features.length;
      state.testMode.features = features.map((f: any) => ({
        id: f.id,
        name: f.name,
        route: f.route,
        status: 'pending',
        selfHealed: 0,
        steps: [],
      }));
    },
    testFeatureUpdate: (state, action) => {
      const p = action.payload || {};
      const featureId = String(p.featureId || '');
      const byId = (f: any) => String(f.id) === featureId;
      // ensure the feature exists (inventory may not have listed it)
      if (featureId && !state.testMode.features.some(byId)) {
        state.testMode.features.push({
          id: featureId,
          name: p.feature || featureId,
          route: p.route,
          status: 'running',
          selfHealed: 0,
          steps: [],
        });
      }
      const feature = state.testMode.features.find(byId);
      if (!feature) return;
      if (p.status) feature.status = p.status;
      if (p.selfHealed !== undefined) feature.selfHealed = p.selfHealed;
      if (p.error !== undefined) feature.error = p.error;
      if (p.desc) {
        feature.steps = [...(feature.steps || []), { desc: p.desc, status: p.stepStatus || 'ok' }];
      }
    },
    testTraditionalUpdate: (state, action) => {
      const p = action.payload || {};
      const existing = state.testMode.traditional.find((t) => t.kind === p.kind);
      if (existing) {
        Object.assign(existing, p);
      } else {
        state.testMode.traditional.push(p);
      }
    },
    testModeSummary: (state, action) => {
      state.testMode.running = false;
      state.testMode.summary = action.payload || null;
      if (action.payload?.reportFileName) {
        state.testMode.reportUrl = `/api/v1/workspaces/report/${action.payload.reportFileName}`;
      }
      // Sync final per-feature statuses from the authoritative summary
      const finalFeatures = action.payload?.autonomous || [];
      for (const r of finalFeatures) {
        const feature = state.testMode.features.find((f: any) => String(f.id) === String(r.featureId) || f.name === r.feature);
        if (feature) {
          feature.status = r.status;
          feature.selfHealed = r.selfHealed || feature.selfHealed;
          if (r.error) feature.error = r.error;
        }
      }
    },
    testModeReset: (state) => {
      state.testMode.selecting = false;
      state.testMode.running = false;
      state.testMode.features = [];
      state.testMode.traditional = [];
      state.testMode.summary = null;
      state.testMode.reportUrl = null;
      state.testMode.inventoryCount = 0;
    },
    // WEB Review Mode reducers (doc 49)
    reviewStarted: (state) => {
      state.reviewRunning = true;
      state.reviewFindings = [];
    },
    reviewDone: (state, action) => {
      state.reviewRunning = false;
      state.reviewFindings = action.payload?.findings || [];
    },
    reviewDismissed: (state) => {
      state.reviewRunning = false;
      state.reviewFindings = [];
    },
    // WEB Migrate Mode reducers (doc 51)
    migrationStarted: (state) => {
      state.migration.running = true;
      state.migration.stage = 'starting';
      state.migration.equivalenceRows = [];
      state.migration.equivalent = null;
      state.migration.pass = 1;
      state.migration.summary = null;
    },
    migrationStatusUpdated: (state, action) => {
      if (action.payload.stage) state.migration.stage = action.payload.stage;
      if (action.payload.pass) state.migration.pass = action.payload.pass;
      if (action.payload.maxPasses) state.migration.maxPasses = action.payload.maxPasses;
    },
    migrationPassResult: (state, action) => {
      if (action.payload.pass) state.migration.pass = action.payload.pass;
      if (action.payload.maxPasses) state.migration.maxPasses = action.payload.maxPasses;
      if (Array.isArray(action.payload.rows)) {
        state.migration.equivalenceRows = action.payload.rows;
      }
    },
    migrationDone: (state, action) => {
      state.migration.running = false;
      state.migration.stage = 'done';
      state.migration.equivalent = action.payload?.equivalent ?? null;
      state.migration.summary = action.payload || null;
    },
    migrationDismissed: (state) => {
      state.migration.running = false;
      state.migration.stage = 'idle';
      state.migration.equivalenceRows = [];
      state.migration.equivalent = null;
    },
    // WEB Audit Mode reducers (doc 52)
    auditStarted: (state) => {
      state.audit = {
        running: true,
        grades: {},
        overallGrade: '',
        results: {},
        reportUrl: null,
        pdfUrl: null
      };
    },
    auditDone: (state, action) => {
      state.audit = {
        running: false,
        grades: action.payload?.grades || {},
        overallGrade: action.payload?.overallGrade || 'A',
        results: action.payload?.results || {},
        reportUrl: action.payload?.reportUrl || null,
        pdfUrl: action.payload?.pdfUrl || null
      };
    },
    auditDismissed: (state) => {
      state.audit = null;
    }
  }
});

export const {
  setStatus,
  chatReady,
  chatError,
  setMode,
  setSelectedModel,
  setModels,
  addMessage,
  streamUpdate,
  agentMessage,
  toolCallStarted,
  permissionRequested,
  clearPermission,
  permissionAnswered,
  setUndoResult,
  setPlan,
  updateTodo,
  chatDone,
  resetStreaming,
  clearChat,
  // God-mode
  setGodMode,
  setSubagentCreated,
  setSubagentAssigned,
  setSubagentStarted,
  setSubagentStep,
  setSubagentDone,
  setSubagentFailed,
  setSubagentFile,
  setSubagentToolCall,
  setSubagentToolResult,
  setSubagentNeedsReview,
  setWaveStart,
  setWaveComplete,
  setIntegrationPass,
  setBuildComplete,
  promptEnhancing,
  promptEnhanced,
  promptEnhancementResolved,
  clarifyAsked,
  clarifyAnswered,
  codebaseReadingProgress,
  codebaseReadingDone,
  roleAssignmentsSet,
  comparisonUpdated,
  securityAuditUpdated,
  playwrightAuditUpdated,
  playwrightIssueAdded,
  // Watch mode
  watchStatusUpdated,
  watchActivityReceived,
  // Bug check mode (doc 44)
  problemsAppended,
  problemsCleared,
  bugcheckStarted,
  bugcheckTierStarted,
  bugcheckTierDone,
  bugcheckDone,
  // Security checkup mode (doc 47)
  securityCheckStarted,
  securityCheckDone,
  securityFixStarted,
  securityFixDone,
  securityCheckDismissed,
  // Test mode (doc 48)
  testModeSelectorOpened,
  testModeSelectorClosed,
  testModeStarted,
  testInventorySet,
  testFeatureUpdate,
  testTraditionalUpdate,
  testModeSummary,
  testModeReset,
  // Review mode (doc 49)
  reviewStarted,
  reviewDone,
  reviewDismissed,
  // Migrate mode (doc 51)
  migrationStarted,
  migrationStatusUpdated,
  migrationPassResult,
  migrationDone,
  migrationDismissed,
  // Audit mode (doc 52)
  auditStarted,
  auditDone,
  auditDismissed,
  addToast,
  removeToast
} = chatSlice.actions;

export default chatSlice.reducer;
