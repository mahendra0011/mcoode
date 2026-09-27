# Model Router & Providers — Bugs & Issues

---

## [RTR-001] `DOMAIN_ALIASES` Maps 'chat' to 'planning' — Wrong Domain for Chat

- **Description**: When the user starts a chat session, the router resolves domain `'chat'` to `'planning'` via `DOMAIN_ALIASES`. Planning models are optimized for structured plan generation, not conversational interaction.
- **Current vs Expected Behavior**: Chat sessions use planning-optimized models (DeepSeek V4 Pro, GPT-5.5, Claude Sonnet 5) instead of conversational models. Expected: Chat should use general-purpose or conversational models.
- **Flow**: `mcode` (interactive) → sends chat → router picks 'chat' → resolved to 'planning' → gets DeepSeek V4 Pro → suboptimal for conversation
- **Root Cause / Logic**: [domains.js L44-48](file:///d:/projects/mcoode/packages/shared/src/domains.js#L44-L48) — `chat: 'planning'`
- **Affected Files**: [`packages/shared/src/domains.js`](file:///d:/projects/mcoode/packages/shared/src/domains.js)
- **Suggested Fix**: Add a `chat` domain with its own routing preferences (conversational models)
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add dedicated 'chat' domain to TASK_DOMAINS
  - [ ] Add chat-specific DEFAULT_ROUTING

---

## [RTR-002] Provider Constructor Accepts Empty String as Key — Silently Creates Non-Functional Provider

- **Description**: `getAllAdapters` always creates ALL provider instances, passing `merged[def.key] || ''` as the API key. Providers with empty-string keys are added to the router but will fail on every API call.
- **Current vs Expected Behavior**: All ~12 providers are always instantiated. The router considers them "available" during scoring, picks one, and only discovers it has no key when the API call fails. Expected: Only create providers whose keys exist.
- **Flow**: No OpenAI key set → OpenAI provider created with key `''` → router picks OpenAI → API call fails → "no key" error mid-subagent
- **Root Cause / Logic**: [providers/index.js L98-106](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L98-L106) — `merged[def.key] || ''` always resolves to string.
- **Affected Files**: [`packages/cli/src/providers/index.js`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js)
- **Suggested Fix**: Skip provider creation if `!merged[def.key]`; or add `isReady()` check before scoring
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Only instantiate providers with non-empty keys
  - [ ] Or add `isReady()` gate in router scoring

---

## [RTR-003] CostLedger `save()` Never Called — Usage Data Lost on Restart

- **Description**: `CostLedger` has `save()` and `load()` methods for file-backed persistence, but neither is called anywhere in the codebase. Usage data (RPM/TPM tracking) is entirely in-memory and lost on every restart.
- **Current vs Expected Behavior**: Rate limiting is effective only within a single session. After restart, the router has no history and may immediately hit provider rate limits. Expected: Persist ledger between sessions.
- **Flow**: 50 RPM with OpenRouter → restart CLI → ledger empty → sends 50 more RPM immediately → rate limited by provider
- **Root Cause / Logic**: [shared/index.js L53-92](file:///d:/projects/mcoode/packages/shared/src/index.js#L53-L92) — methods exist but are never invoked
- **Affected Files**: [`packages/shared/src/index.js`](file:///d:/projects/mcoode/packages/shared/src/index.js), [`packages/cli/src/core/router.js`](file:///d:/projects/mcoode/packages/cli/src/core/router.js)
- **Suggested Fix**: Call `ledger.save()` periodically (every 30s) and on graceful shutdown; `ledger.load()` on startup
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Add periodic ledger persistence
  - [ ] Load ledger on startup

---

## [RTR-004] `estimateTokens` Uses ~4 chars/token — Inaccurate for Non-English and Code

- **Description**: Token estimation uses `Math.ceil(text.length / 4)` which is reasonable for English prose but significantly underestimates tokens for: CJK characters (1 char ≈ 2-3 tokens), code with many special characters, and base64 data.
- **Current vs Expected Behavior**: Token counts can be 2-3x off for non-English text, leading to incorrect rate-limit tracking and cost estimates.
- **Flow**: User sends CJK text → estimated at 500 tokens → actual is 1500 → rate limit tracking is wrong
- **Root Cause / Logic**: [shared/index.js L97-100](file:///d:/projects/mcoode/packages/shared/src/index.js#L97-L100)
- **Affected Files**: [`packages/shared/src/index.js`](file:///d:/projects/mcoode/packages/shared/src/index.js)
- **Suggested Fix**: Use `tiktoken` or `gpt-tokenizer` for accurate counts; or use provider-reported usage when available
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Consider using tiktoken for accurate estimation
  - [ ] Use provider-reported usage when available

---

## [RTR-005] Router Static Benchmark Scores Are Hardcoded — Cannot Be Updated

- **Description**: MODEL_DEFS in `providers/index.js` hardcodes scores like `{ planning: 95, backend: 95 }` for each model. These can never be updated without a code change and new release.
- **Current vs Expected Behavior**: When model capabilities change (fine-tuning, deprecation), the scores are stale. Expected: Load scores from a remote config or allow user overrides.
- **Flow**: Model X gets significantly better at frontend → hardcoded score still says 75 → router picks inferior model
- **Root Cause / Logic**: [providers/index.js L22-70](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L22-L70) — all scores defined as constants
- **Affected Files**: [`packages/cli/src/providers/index.js`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js)
- **Suggested Fix**: Allow `~/.mcode/config.json` to override model scores; add a `mcode model benchmark` command for live testing
- **Priority**: Low
- **Phase**: Phase 3
- **TODOs**:
  - [ ] Add user-overridable model scores in config
  - [ ] Consider remote score updates

---

## [RTR-006] MODEL_DEFS Uses Slash-Separated Keys, DEFAULT_ROUTING Uses Colon-Separated — Inconsistent

- **Description**: `MODEL_DEFS` keys are `'anthropic/claude-sonnet-5'` (slash-separated). `DEFAULT_ROUTING` values are `'anthropic:claude-sonnet-5'` (colon-separated). The `modelsFor()` function strips the prefix after `/`, but `router.pick()` uses `:` format.
- **Current vs Expected Behavior**: The ID transform chain works through several normalization layers but is fragile and hard to debug. Any new provider/model might break if the prefix convention is inconsistent.
- **Flow**: MODEL_DEFS → `anthropic/claude-sonnet-5` → `modelsFor()` strips to `claude-sonnet-5` → DEFAULT_ROUTING has `anthropic:claude-sonnet-5` → router lookups use `:` → BUG-47 comment mentions double-prefix issues
- **Root Cause / Logic**: [providers/index.js L82-96](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L82-L96) — normalization needed because of inconsistent convention
- **Affected Files**: [`packages/cli/src/providers/index.js`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js), [`packages/shared/src/domains.js`](file:///d:/projects/mcoode/packages/shared/src/domains.js)
- **Suggested Fix**: Standardize on ONE format (`:` colon) everywhere; update MODEL_DEFS to use colon
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Standardize model ID format across codebase

---

## [RTR-007] OpenRouter Provider Gets ALL Model Defs Except Google — Including Models Not on OpenRouter

- **Description**: The OpenRouter adapter receives all MODEL_DEFS entries `filter((id) => !id.startsWith('google/'))`. But not all models in MODEL_DEFS are actually available on OpenRouter (e.g., `poolside/laguna-*`, `moonshot/kimi-k3` may not be).
- **Current vs Expected Behavior**: Router might pick `poolside/laguna-s-2.1` via OpenRouter → API call fails because the model doesn't exist on OpenRouter.
- **Flow**: User has OPENROUTER_API_KEY → router picks `moonshot/kimi-k3` via openrouter → 404 from API
- **Root Cause / Logic**: [providers/index.js L107-116](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L107-L116) — blanket inclusion of all non-Google models
- **Affected Files**: [`packages/cli/src/providers/index.js`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js)
- **Suggested Fix**: Curate the OpenRouter model list to only include actually available models; or validate against OpenRouter's `/models` endpoint at startup
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Curate OpenRouter model list
  - [ ] Consider runtime model availability check

---

## [RTR-008] DEFAULT_ROUTING References Non-Existent Model IDs

- **Description**: `DEFAULT_ROUTING` references `'mistral:codestral'` but MODEL_DEFS has `'mistralai/codestral'`. The provider ID is `mistral` but the registry key prefix is `mistralai`. This ID mismatch means the preference lookup may never match.
- **Current vs Expected Behavior**: Router preference for `mistral:codestral` never matches because the provider is registered as `mistralai` in some contexts.
- **Flow**: Router tries preference `mistral:codestral` → no provider named `mistral` → falls back to scoring → picks wrong model
- **Root Cause / Logic**: [domains.js L76](file:///d:/projects/mcoode/packages/shared/src/domains.js#L76) vs [providers/index.js L51-52](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L51-L52)
- **Affected Files**: [`packages/shared/src/domains.js`](file:///d:/projects/mcoode/packages/shared/src/domains.js), [`packages/cli/src/providers/index.js`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js)
- **Suggested Fix**: Align provider IDs across DEFAULT_ROUTING and provider registrations
- **Priority**: High
- **Phase**: Phase 1
- **TODOs**:
  - [ ] Audit all provider ID references for consistency
  - [ ] Fix mistral/mistralai ID mismatch

---

## [RTR-009] `bcryptjs` Uses `hashSync`/`compareSync` — Blocks Event Loop

- **Description**: The backend auth module uses `bcrypt.hashSync()` and `bcrypt.compareSync()` which are synchronous and block the Node.js event loop during password hashing. With default 10 rounds, hashing takes ~100ms, blocking ALL other requests.
- **Current vs Expected Behavior**: During login/signup, all other HTTP requests and WebSocket events are blocked for ~100ms per hash operation.
- **Flow**: User logs in → `bcrypt.hashSync` blocks event loop for 100ms → other socket events delayed → dashboard feels laggy during auth
- **Root Cause / Logic**: [auth.js L9](file:///d:/projects/mcoode/packages/backend/src/auth.js#L9) and [L13](file:///d:/projects/mcoode/packages/backend/src/auth.js#L13) — synchronous bcrypt operations
- **Affected Files**: [`packages/backend/src/auth.js`](file:///d:/projects/mcoode/packages/backend/src/auth.js)
- **Suggested Fix**: Use `bcrypt.hash()` and `bcrypt.compare()` (async versions); or use `argon2` for non-blocking hashing
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Switch to async bcrypt.hash()/compare()
  - [ ] Consider argon2 migration

---

## [RTR-010] Providers Created via `addRemote()` Always Added Regardless of Key Availability

- **Description**: `addRemote` unconditionally pushes ALL providers. Even local providers (Ollama, LM Studio) are always created. The `envVar` property is set but never used to filter.
- **Current vs Expected Behavior**: The provider list always has ~12 entries. Router scoring iterates all of them, wasting cycles on providers that can never work.
- **Flow**: Startup → 12 providers created → 10 have no key → router scores all 12 → picks from 2 → wasted time
- **Root Cause / Logic**: [providers/index.js L98-116](file:///d:/projects/mcoode/packages/cli/src/providers/index.js#L98-L116) — no key check before `providers.push()`
- **Affected Files**: [`packages/cli/src/providers/index.js`](file:///d:/projects/mcoode/packages/cli/src/providers/index.js)
- **Suggested Fix**: Only push providers with non-empty keys; add `isConfigured()` check
- **Priority**: Medium
- **Phase**: Phase 2
- **TODOs**:
  - [ ] Filter providers by key availability
  - [ ] Add isConfigured() method to base provider
