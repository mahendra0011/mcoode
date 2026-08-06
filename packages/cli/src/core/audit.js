import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';

const AUDIT_DIR = join(homedir(), '.mcode', 'audit');

export const RISK_LEVELS = Object.freeze({
  SAFE: 'safe',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

/** Risk scoring for operations. Returns a score 0-10 and a RISK_LEVELS label. */
export function scoreRisk(operation, details = {}) {
  const op = String(operation || '').toLowerCase();
  let score = 0;

  // Shell commands
  if (op === 'shell' || op === 'run_shell') {
    const cmd = String(details.command || '').toLowerCase();
    // Dangerous commands
    if (/\brm\s+-rf?\s+\//.test(cmd) || /\brm\s+-rf?\s+\.\./.test(cmd)) score = 10;
    else if (/\bdd\b/.test(cmd) && /\/dev\/sd/.test(cmd)) score = 10;
    else if (/\bmkfs\b/.test(cmd)) score = 9;
    else if (/\bformat\b.*:[a-z]/i.test(cmd)) score = 9;
    else if (/\bshutdown\b|\breboot\b|\bhalt\b/.test(cmd)) score = 8;
    else if (/\beval\b|\bexec\b/.test(cmd)) score = 6;
    // Medium risk: network, git push, etc.
    else if (/\bcurl\b|\bwget\b/.test(cmd)) score = 4;
    else if (/\bgpg\b|\bsudo\b|\bsu\b/.test(cmd)) score = 5;
    else if (/\bgit\s+push\b/.test(cmd)) score = 3;
    // Low risk: read-only
    else if (/\bls\b|\bcat\b|\bgrep\b|\bfind\b/.test(cmd)) score = 1;
    else score = 3;
  }

  // File operations
  if (op === 'edit_file' || op === 'write_file') {
    const path = String(details.path || '');
    if (path.includes('package.json') || path.includes('tsconfig')) score = 4;
    else if (path.includes('src/') && path.endsWith('.js')) score = 3;
    else if (path.includes('config') || path.includes('.env')) score = 6;
    else score = 2;
  }
  if (op === 'delete_file' || op === 'rm') score = 7;
  if (op === 'read_file') score = 0;

  // Network operations
  if (op === 'web_search') score = 2;
  if (op === 'web_fetch') score = 3;

  const level = score >= 8 ? RISK_LEVELS.CRITICAL
    : score >= 6 ? RISK_LEVELS.HIGH
    : score >= 4 ? RISK_LEVELS.MEDIUM
    : score >= 2 ? RISK_LEVELS.LOW
    : RISK_LEVELS.SAFE;

  return { score, level };
}

/** Audit log — persists a chronological record of all operations and decisions. */
export class AuditLog {
  constructor({ projectId = 'default', maxEntries = 500 } = {}) {
    this.projectId = projectId;
    this.maxEntries = maxEntries;
    this.entries = [];
    this._path = null;
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    try {
      await mkdir(AUDIT_DIR, { recursive: true });
      this._path = join(AUDIT_DIR, `${this.projectId}.json`);
      const raw = await readFile(this._path, 'utf8').catch(() => null);
      if (raw) this.entries = JSON.parse(raw);
      this._initialized = true;
    } catch {
      this._initialized = true;
    }
  }

  /** Log an entry: { type, operation, risk, decision, timestamp, ...details } */
  async log(entry) {
    await this.init();
    const record = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      risk: RISK_LEVELS.SAFE,
      ...entry,
    };
    this.entries.push(record);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
    await this._persist();
    return record;
  }

  /** Log a tool call with risk assessment. */
  async logToolCall(operation, details) {
    const { score, level } = scoreRisk(operation, details);
    return this.log({
      type: 'tool_call',
      operation,
      risk: level,
      riskScore: score,
      ...details,
    });
  }

  /** Log a permission decision. */
  async logPermission(operation, decision, details = {}) {
    return this.log({
      type: 'permission',
      operation,
      decision,
      ...details,
    });
  }

  /** Log a file mutation (create/replace/delete). */
  async logFileChange(action, path, details = {}) {
    const { score, level } = scoreRisk(action, { path, ...details });
    return this.log({
      type: 'file_change',
      action,
      file: path,
      risk: level,
      riskScore: score,
      ...details,
    });
  }

  async _persist() {
    if (!this._path) return;
    try {
      await writeFile(this._path, JSON.stringify(this.entries), 'utf8');
    } catch {
      /* best-effort */
    }
  }

  /** Read recent audit entries (last N). */
  async recent(n = 50) {
    await this.init();
    return this.entries.slice(-n).reverse();
  }

  /** Filter entries by risk level. */
  async byRisk(level) {
    await this.init();
    return this.entries.filter((e) => e.risk === level);
  }
}
