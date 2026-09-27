/** Common secret patterns to redact from tool output before display.
 *  Each entry is a regex matching the secret; the matched secret value
 *  (or capture group) is replaced with the redaction marker. */
const SECRET_PATTERNS = [
  // OpenAI / Claude API keys: sk-..., sk-proj-..., sk-ant-...
  /\bsk-[A-Za-z0-9-_]{20,}/g,
  /\bsk-proj-[A-Za-z0-9-_]{20,}/g,
  /\bsk-ant-[A-Za-z0-9-_]{20,}/g,
  // Google API keys (AIza...) + OAuth tokens (ya29.)
  /\bAIza[0-9A-Za-z-_]{35}\b/g,
  /\bya29\.[A-Za-z0-9-_]{20,}/g,
  // GitHub tokens: ghp_, gho_, ghs_, ghu_
  /\bg[ghps]p?_?[A-Za-z0-9]{36}/g,
  // AWS access keys: AKIA...
  /\bAKIA[A-Z0-9]{16}/g,
  // Slack tokens: xox[bpoa]-...
  /\bxox[bpoa]-[A-Za-z0-9-]{10,}/g,
  // Azure access keys
  /\b[A-Za-z0-9+/]{86}==\b/g,
  // Bearer tokens (min length — skips "Bearer abc" doc noise)
  /Bearer\s+[A-Za-z0-9._-]{8,}/gi,
  // URL-embedded credentials: scheme://user:pass@host (pass may contain @)
  /(https?:\/\/)([^:]+):(.+)@([^/@\s]+)/gi,
  // Common env-style assignments
  /(api[_-]?key|secret|password|passwd|token|access[_-]?key|private[_-]?key)\s*=\s*(['"]?)([^\s'"&;]+)/gi,
  // export VAR=value
  /export\s+(\w+)\s*=\s*(['"]?)([^\s]+)/gi,
];

const REDACTED = '***REDACTED***';

/** Redact known secret patterns from a string. Returns cleaned string. */
export function redactSecrets(text) {
  if (!text || typeof text !== 'string') return text;
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (match, ...args) => {
      // For patterns with capture groups, replace the secret value only
      const groups = args.slice(0, -2); // Drop offset and full string args
      if (groups.length > 0) {
        // URL credential pattern: groups=[protocol, user, password, host]
        if (groups.length >= 4) {
          return `${groups[0]}${groups[1]}:${REDACTED}@${groups[3]}`;
        }
        // export VAR=value: groups=[varname, quote, value]
        if (pattern.source.startsWith('export')) {
          return `export ${groups[0]}=${groups[1] || ''}${REDACTED}`;
        }
        // env-style KEY=value: groups=[keyword, quote, value]
        if (groups.length >= 3) {
          return `${groups[0]}=${groups[1] || ''}${REDACTED}`;
        }
      }
      // For simple patterns (API keys, tokens), redact the match
      return match.length > 16 ? match.slice(0, 8) + REDACTED + match.slice(-8) : REDACTED;
    });
  }
  return out;
}

/** Check whether a URL's hostname is allowed by the network whitelist.
 *  whitelist is an array of strings (domain substrings or glob-like patterns).
 *  Empty/undefined whitelist means "allow all" (backward compatible). */
export function isNetworkAllowed(url, whitelist) {
  if (!whitelist || whitelist.length === 0) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    for (const entry of whitelist) {
      // Support glob patterns like *.example.com.
      // SEC-011: bound the translation — overlong entries or wildcard
      // storms degrade to a plain suffix match instead of a ReDoS-prone
      // `.*` chain.
      const src = String(entry);
      if (src.length > 100 || (src.match(/\*/g) || []).length > 3) {
        const suffix = src.split('*').pop().toLowerCase();
        if (suffix && (host.toLowerCase() === suffix || host.toLowerCase().endsWith(`.${suffix}`))) return true;
        continue;
      }
      const pattern = src.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]*');
      if (new RegExp(`^${pattern}$`).test(host)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
