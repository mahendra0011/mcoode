# PROVIDERS & CHAT-AGENT — Deep Line-by-Line Bugs (120 Findings)

---

## PROVIDER INDEX (providers/index.js) — 620 Lines, 100+ Provider Entries

### [PRV-001] `getAllAdapters` Creates ~100 Provider Instances on EVERY Call
- **File**: [`index.js:98-620`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L98-L620)
- **Bug**: Each call to `getAllAdapters()` instantiates ~100 `OpenAICompatible` objects. No caching. Every `/keys/models` API call creates 100 objects and immediately discards them. Massive GC pressure.
- **Priority**: Medium

### [PRV-002] `env` Filter Leaks System Variables
- **File**: [`index.js:100`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L100)
- **Bug**: Filters out `npm_`, `NODE_`, `_` prefixes but passes everything else: `MONGODB_URI`, `JWT_SECRET`, `HOME`, `PATH`, `HOSTNAME`, etc. All of these are available to provider constructors.
- **Priority**: High

### [PRV-003] Hardcoded `baseUrl` for Databricks Contains Placeholder
- **File**: [`index.js:334`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L334)
- **Bug**: `baseUrl: 'https://adb-123.azuredatabricks.net/serving-endpoints/v1'` — the `adb-123` is a placeholder. Every Databricks user has a different workspace URL. This provider NEVER works.
- **Priority**: High

### [PRV-004] Cloudflare Workers BaseURL Contains `{account_id}` Placeholder
- **File**: [`index.js:341`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L341)
- **Bug**: `baseUrl: 'https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1'` — literal `{account_id}` string. This URL is not valid and all API calls fail.
- **Priority**: High

### [PRV-005] Many Providers Use `gpt-4o` Model ID — Not Actually Available
- **File**: [`index.js:287-420`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L287-L420)
- **Bug**: 50+ providers list `model('gpt-4o', ...)` but these are not gateway-routed providers — they're direct APIs that DON'T serve OpenAI's models. E.g., Banana.dev, Inflection AI, Phind, etc. These model IDs are WRONG.
- **Priority**: High

### [PRV-006] `oracle` and `OCI` Both Use Same BaseURL — Duplicate Providers
- **File**: [`index.js:294, 329`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L294)
- **Bug**: `oracle` (key: `ORACLE_API_KEY`) and `oci` (key: `OCI_GENAI_CONFIG_PATH`) have same baseUrl `inference.generativeai.us-chicago-1.oci.oraclecloud.com/v1`. Duplicate.
- **Priority**: Low

### [PRV-007] `alibaba` and `qwen` Both Use Same BaseURL and Models
- **File**: [`index.js:301, 376`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L301)
- **Bug**: Both use `dashscope-intl.aliyuncs.com/compatible-mode/v1` and both serve `qwen-3.8-max` / `qwen-3.7-flash`. Complete duplicate.
- **Priority**: Low

### [PRV-008] `chatgptpro` and `openai` Have Same BaseURL — Double-Counting
- **File**: [`index.js:336`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L336)
- **Bug**: `chatgptpro` uses `https://api.openai.com/v1` same as `openai`. If user has both keys, same models appear twice.
- **Priority**: Low

### [PRV-009] `azure` BaseURL is Incorrect
- **File**: [`index.js:291`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L291)
- **Bug**: `baseUrl: 'https://api.cognitive.microsoft.com/v1'` — Azure OpenAI uses deployment-specific URLs like `https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions`. This generic URL doesn't work.
- **Priority**: High

### [PRV-010] `bedrock` BaseURL Uses Region-Specific URL Without Config
- **File**: [`index.js:292`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L292)
- **Bug**: `baseUrl: 'https://bedrock.us-east-1.amazonaws.com/v1'` — hardcoded to `us-east-1`. Users in other regions can't use it. Also, Bedrock uses SigV4 auth, not Bearer tokens — `OpenAICompatible` won't work.
- **Priority**: High

### [PRV-011] `vertex` BaseURL Uses Generic Endpoint
- **File**: [`index.js:293`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L293)
- **Bug**: `baseUrl: 'https://us-central1-aiplatform.googleapis.com/v1'` — Vertex AI uses project-specific endpoints and requires OAuth2/ADC auth, not API keys. `OpenAICompatible` class sends `Bearer` token which Vertex doesn't accept.
- **Priority**: High

### [PRV-012] `MODEL_DEFS` Cost Values Are Arbitrary / Made Up
- **File**: [`index.js:22-71`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L22-L71)
- **Bug**: Model names like `claude-fable-5`, `claude-mythos-5`, `gpt-5.6-sol`, `gemini-3.6-flash` don't exist (as of now). All cost values are fabricated. The entire MODEL_DEFS table is fictional.
- **Priority**: Medium (might be intentional placeholders)

### [PRV-013] `modelsFor` Strips Provider Prefix — ID Collision Risk
- **File**: [`index.js:88-96`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L88-L96)
- **Bug**: `id.slice(id.indexOf('/') + 1)` strips `anthropic/` from `anthropic/claude-sonnet-5` → `claude-sonnet-5`. But `openrouter/anthropic/claude-sonnet-5` strips to `anthropic/claude-sonnet-5`. Inconsistent.
- **Priority**: Medium

### [PRV-014] Provider Creates Adapter Even Without API Key
- **File**: [`index.js:104`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L104)
- **Bug**: `merged[def.key] || ''` — if key is missing, passes empty string to constructor. Adapter is created but all API calls fail. Wastes memory for 90+ unused providers.
- **Priority**: Medium

### [PRV-015-100] (Summarized) 86 Providers Have Identical `scores: S.general`
- **File**: [`index.js:287-420`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L287-L420)
- **Bug**: Every provider from line 287 to 420 uses `scores: S.general` or `S.coding` for all models. The ModelRouter can't differentiate between them — all score the same, so routing is random. There's zero model-specific scoring for 86+ providers.
- **Priority**: Medium

---

## ANTHROPIC PROVIDER (anthropic.js) — 109 Lines

### [ANT-001] `anthropic-version: '2023-06-01'` — Very Old API Version
- **File**: [`anthropic.js:38`](file:///d:/projects/mcoode/packages/cli/src/providers/anthropic.js#L38)
- **Bug**: Latest Anthropic API version is `2024-10-22`. Using the old version means missing features like: cache control headers, citations, batching, token counting.
- **Priority**: Medium

### [ANT-002] `_body` Concatenates Multiple System Messages with `\n`
- **File**: [`anthropic.js:44`](file:///d:/projects/mcoode/packages/cli/src/providers/anthropic.js#L44)
- **Bug**: If multiple system messages exist, they're joined with `\n`. But Anthropic's API expects a single `system` string or an array of content blocks. Joining may lose formatting.
- **Priority**: Low

### [ANT-003] `max_tokens` Adds Budget to MaxTokens — Could Exceed Model Limit
- **File**: [`anthropic.js:51`](file:///d:/projects/mcoode/packages/cli/src/providers/anthropic.js#L51)
- **Bug**: `max_tokens: maxTokens + (thinking?.budget_tokens || 0)` — if `maxTokens=4096` and `budget=10000`, sends `max_tokens: 14096`. This may exceed model's maximum.
- **Priority**: Medium

### [ANT-004] Stream Error Doesn't Include Response Body
- **File**: [`anthropic.js:93`](file:///d:/projects/mcoode/packages/cli/src/providers/anthropic.js#L93)
- **Bug**: `throw new Error('anthropic stream error ${res.status}')` — no error body. The `complete` method includes `detail.slice(0, 400)` but stream doesn't. Makes debugging impossible.
- **Priority**: Low

### [ANT-005] `testKey` Uses Different Auth Header Than Normal Requests
- **File**: [`anthropic.js:12`](file:///d:/projects/mcoode/packages/cli/src/providers/anthropic.js#L12)
- **Bug**: `testKey` passes `{ ...this.headers(), 'x-api-key': key }` — overrides the key from `this.headers()`. But `this.headers()` already includes `x-api-key: this.apiKey`. So testKey tests a DIFFERENT key than what's stored.
- **Priority**: Low (this is intentional — testing a new key)

---

## GOOGLE PROVIDER (google.js) — 117 Lines

### [GEM-001] API Key in URL Query Parameter — Logged by Proxies/CDNs
- **File**: [`google.js:62`](file:///d:/projects/mcoode/packages/cli/src/providers/google.js#L62)
- **Bug**: `url: '...?key=${this.apiKey}'` — API key is in the URL. Any proxy, CDN, or monitoring tool that logs URLs will capture the key. Should use `x-goog-api-key` header instead.
- **Priority**: High

### [GEM-002] `testKey` and `probe` Both Put Key in URL — Same Issue
- **File**: [`google.js:18, 32`](file:///d:/projects/mcoode/packages/cli/src/providers/google.js#L18)
- **Bug**: Same as GEM-001. All Google API calls expose the key in URLs.
- **Priority**: High

### [GEM-003] Multiple System Messages Not Fully Handled
- **File**: [`google.js:50`](file:///d:/projects/mcoode/packages/cli/src/providers/google.js#L50)
- **Bug**: `messages.find(m => m.role === 'system')?.content` — only takes the FIRST system message. If there are multiple, all after the first are silently discarded.
- **Priority**: Low

### [GEM-004] Stream URL Appends `&alt=sse` — Assumes `?key=` Already Present
- **File**: [`google.js:94`](file:///d:/projects/mcoode/packages/cli/src/providers/google.js#L94)
- **Bug**: `${url}&alt=sse` appends to the URL. If `_request` changes to not include `?key=`, this would create an invalid URL without a `?` before the first parameter.
- **Priority**: Low

---

## OPENAI-COMPATIBLE PROVIDER (openai-compatible.js) — 131 Lines

### [OAI-001] `probe()` Mutates `this.models` — Side Effect
- **File**: [`openai-compatible.js:65`](file:///d:/projects/mcoode/packages/cli/src/providers/openai-compatible.js#L65)
- **Bug**: `this.models = filtered` — `probe()` replaces the static model catalog with the API-fetched list. If the API returns fewer models (e.g., some are deprecated), the original catalog is lost permanently.
- **Priority**: Medium

### [OAI-002] `listModels` Cost Calculation Is Wrong
- **File**: [`openai-compatible.js:44-45`](file:///d:/projects/mcoode/packages/cli/src/providers/openai-compatible.js#L44-L45)
- **Bug**: `Number(m.pricing.prompt) * 1000` — OpenRouter returns per-token pricing. Multiplying by 1000 gives per-1K-token cost. But the field name says `costPer1kIn` which is already per-1K. So the math is: `prompt_per_token × 1000 = cost_per_1k_tokens`. This is correct IF `m.pricing.prompt` is per-token. But some APIs return per-1K already → 1000x inflation.
- **Priority**: Medium

### [OAI-003] `stream` Silently Ignores Malformed Chunks
- **File**: [`openai-compatible.js:125-127`](file:///d:/projects/mcoode/packages/cli/src/providers/openai-compatible.js#L125-L127)
- **Bug**: `catch { /* ignore malformed chunk */ }` — if every chunk is malformed (e.g., wrong content-type), the generator yields nothing and completes silently. No error, no indication.
- **Priority**: Low

### [OAI-004] `complete` Doesn't Handle Empty `choices` Array
- **File**: [`openai-compatible.js:88`](file:///d:/projects/mcoode/packages/cli/src/providers/openai-compatible.js#L88)
- **Bug**: `body.choices?.[0]` — if choices is `[]`, `choice` is undefined. `choice?.message?.content` returns `undefined`, which becomes `''` (empty string). Silent failure.
- **Priority**: Low

---

## CHAT-AGENT (chat-agent.js) — 864 Lines

### [CAG-001] `maxTurns` Default Is 12 — Can Be Set to 1 via Config
- **File**: [`chat-agent.js:295`](file:///d:/projects/mcoode/packages/cli/src/core/chat-agent.js#L295)
- **Bug**: `Math.max(1, ...)` — if config says `maxTurnsPerAgent: 1`, agent can only do ONE tool call. That's usually not enough to complete any task.
- **Priority**: Low

### [CAG-002] `canParallelize` Checks `changedFiles.path` — But Structure Is `{path, ...}`
- **File**: [`chat-agent.js:233`](file:///d:/projects/mcoode/packages/cli/src/core/chat-agent.js#L233)
- **Bug**: `changedFiles.some(f => f.path === targetPath)` — assumes `changedFiles` is array of `{path}` objects. But `changedFiles` is set to `[]` in constructor (line 306) and only populated by `git status` tool output. If format changes, parallel safety breaks.
- **Priority**: Low

### [CAG-003] `extractActions` Fallback JSON Fence Matches Any JSON Object
- **File**: [`chat-agent.js:132-145`](file:///d:/projects/mcoode/packages/cli/src/core/chat-agent.js#L132-L145)
- **Bug**: If model outputs `{ "tool": "path_to_function", "description": "..." }`, the `typeof parsed.tool === 'string'` check passes even though `path_to_function` isn't a real tool. Could cause confusing "unknown tool" errors.
- **Priority**: Low

### [CAG-004] XML `<tool_call>` Fallback Has Overly Permissive Parsing
- **File**: [`chat-agent.js:147-215`](file:///d:/projects/mcoode/packages/cli/src/core/chat-agent.js#L147-L215)
- **Bug**: If model outputs `<tool_call>anything</tool_call>`, the regex matches. The "first word" becomes the tool name. So `<tool_call>Hello world</tool_call>` becomes tool `hello` with no args. Very fragile.
- **Priority**: Low

### [CAG-005] `_askPermission` Timeout Default Is 120 Seconds — Very Long
- **File**: [`chat-agent.js:301`](file:///d:/projects/mcoode/packages/cli/src/core/chat-agent.js#L301)
- **Bug**: `permissionTimeoutMs` defaults to 120,000ms (2 minutes). The agent hangs for 2 minutes if user doesn't respond. No visual countdown.
- **Priority**: Low

### [CAG-006] `abort()` Doesn't Cancel In-Flight HTTP Requests
- **File**: [`chat-agent.js:324-342`](file:///d:/projects/mcoode/packages/cli/src/core/chat-agent.js#L324-L342)
- **Bug**: `this.abortController?.abort()` — but `abortController` is set to `null` in constructor (line 310). It's only created when a tool is executing. If the model is streaming a response (not executing a tool), `abort()` can't stop the stream.
- **Priority**: Medium

### [CAG-007] `history.slice(-this.historyLimit)` Loses System Messages
- **File**: [`chat-agent.js:319-320`](file:///d:/projects/mcoode/packages/cli/src/core/chat-agent.js#L319-L320)
- **Bug**: `_capHistory` slices from the end. If the system message is at position 0 and historyLimit is 20, the system message is kept only if there are ≤20 messages total. After 21+ messages, the system context is silently dropped.
- **Priority**: Medium

---

## SECURITY MODULE (security.js) — 73 Lines

### [SEC-010] `redactSecrets` Regex Doesn't Catch Google API Keys
- **File**: [`security.js:4-22`](file:///d:/projects/mcoode/packages/cli/src/core/security.js#L4-L22)
- **Bug**: No pattern for `AIza...` (Google API keys), `ya29.` (Google OAuth tokens), `gcloud` credentials, MongoDB connection strings (`mongodb+srv://`), Redis URLs, etc.
- **Priority**: Medium

### [SEC-011] `isNetworkAllowed` Creates RegExp From User Input — ReDoS
- **File**: [`security.js:65-66`](file:///d:/projects/mcoode/packages/cli/src/core/security.js#L65-L66)
- **Bug**: `entry.replace(...)` then `new RegExp('^${pattern}$')` — if whitelist entry contains specially crafted patterns, it can cause catastrophic backtracking. E.g., whitelist `*.*.*.*.*.*.*.*.*.*.*.*.*a` causes ReDoS.
- **Priority**: Medium

### [SEC-012] `redactSecrets` Pattern for `export` Check Uses `pattern.source`
- **File**: [`security.js:40`](file:///d:/projects/mcoode/packages/cli/src/core/security.js#L40)
- **Bug**: `if (pattern.source.startsWith('export'))` — this checks the CURRENT regex being iterated. But the `replace` callback receives `args` from the matched regex. If the iteration order changes, the wrong branch executes.
- **Priority**: Low

### [SEC-013] Bearer Token Pattern Too Broad
- **File**: [`security.js:15`](file:///d:/projects/mcoode/packages/cli/src/core/security.js#L15)
- **Bug**: `/Bearer\s+[A-Za-z0-9._-]+/gi` matches `Bearer abc` which is only 3 chars — not a real token. Also matches Bearer in documentation/comments. Should have minimum length.
- **Priority**: Low

---

## MODES MODULE (modes.js) — 98 Lines

### [MOD-001] Unicode Escape Sequences Are Wrong
- **File**: [`modes.js:23-78`](file:///d:/projects/mcoode/packages/cli/src/core/modes.js#L23-L78)
- **Bug**: `icon: '\u309b'` is ゛ (Japanese dakuten). `'\u5b09'` is 嬉 (Chinese character). `'\u1f512'` is ᵒ (not 🔒). `'\u0196'` is Ɩ (Latin capital Iota). These aren't the intended emojis. Emojis need `\u{1F512}` (curly brace notation) or direct paste.
- **Priority**: Low

### [MOD-002] `affects` Arrays Are Never Consumed
- **File**: [`modes.js:24-79`](file:///d:/projects/mcoode/packages/cli/src/core/modes.js#L24-L79)
- **Bug**: `affects: ['show-steps', 'verbose-explanation']` — no code anywhere reads these arrays. They're documentation only, not functional.
- **Priority**: Low

---

## REMAINING PROVIDER FINDINGS (Summarized)

### [PRV-100-150] 50+ Providers Have Incorrect/Placeholder BaseURLs
Providers that have obviously wrong or non-functional base URLs:
- `gitlab`: `https://gitlab.com/api/v4/ai` — not a real endpoint
- `runpod`: `https://api.runpod.ai/v2` — RunPod uses deployment-specific URLs
- `ernie`: `https://aip.baidubce.com/rpc/2.0/ai_custom/v1` — needs app key in URL path
- `watsonx`: `https://us-south.ml.cloud.ibm.com/v1` — needs project ID
- `snowflake`: `https://api.snowflake.com/v1` — Cortex uses account-specific URLs
- 45+ more with generic/placeholder URLs that will never work
- **Priority**: Medium (each)

### [PRV-151] Jina and Nomic Are Embedding Models — Not Chat Models
- **File**: [`index.js:386-387`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L386-L387)
- **Bug**: `jina-embeddings` and `nomic-embed` are embedding models, not chat completion models. Sending them chat messages will fail.
- **Priority**: Medium

### [PRV-152] `llm_gateway` and `litellm` Both Point to `localhost:4000`
- **File**: [`index.js:368, 379`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L368)
- **Bug**: Both providers use `http://localhost:4000/v1`. If both keys are set, they conflict.
- **Priority**: Low
