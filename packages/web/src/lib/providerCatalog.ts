/**
 * The one provider catalog the web can fall back on (audit WEB-029).
 *
 * ## Why this file exists
 *
 * `SettingsPage` (API keys tab) and `ModelSelector` (in-chat picker) each used to
 * carry their **own** hard-coded provider list, and each silently fell back to it
 * whenever the live `GET /api/v1/settings/providers` call failed or timed out
 * after 3 s. Two consequences the audit called out:
 *
 *  1. **No staleness marker.** With the backend down the UI showed a
 *     perfectly normal catalog full of models the CLI cannot route, with nothing
 *     telling the user the list was invented. The user picks a model, the run
 *     fails or the router silently substitutes something else.
 *  2. **Two lists, two truths.** `DEFAULT_SETTINGS_PROVIDERS` and
 *     `FALLBACK_PROVIDERS` were independent constants that could drift from each
 *     other *and* from the CLI, so a model could be selectable in chat but not
 *     configurable in settings (or the reverse).
 *
 * ## What is the source of truth
 *
 * The CLI (`packages/cli/src/providers/index.js`) is authoritative — it is what
 * actually routes a request. The backend proxies that catalog through
 * `GET /api/v1/settings/providers` (`packages/backend/src/routes/settings.js`
 * calls the CLI's own `getAllAdapters()`), so **the live fetch already is the
 * CLI's catalog**. This file is only the offline placeholder.
 *
 * ## Rules
 *
 * - One list, one home. Import `FALLBACK_PROVIDERS`; do not re-declare a list.
 * - A screen rendering the fallback **must** surface its `catalogSource`, so the
 *   user is told the list is not live.
 * - `packages/web/tests/provider-catalog.test.js` asserts every id here exists in
 *   the CLI's catalog, so this file cannot drift into offering a model the CLI
 *   has never heard of.
 */

export interface FallbackModel {
  id: string;
  name: string;
  free: boolean;
  scores?: Record<string, number>;
}

export interface FallbackProvider {
  id: string;
  displayName: string;
  envVar: string;
  /** Static model catalog, matching the shape `/settings/providers` returns. */
  models: FallbackModel[];
}

/**
 * Subset of the CLI catalog (`packages/cli/src/providers/index.js`) covering the
 * providers that are actually configurable from the web UI. Deliberately a
 * *subset*: the CLI registers 150+ adapters, most reachable only with a local
 * key file, so mirroring all of them here would be noise.
 *
 * Keep this list ⊆ CLI provider ids — the test enforces it.
 */
export const FALLBACK_PROVIDERS: FallbackProvider[] = [
  {
    id: 'openrouter',
    displayName: 'OpenRouter',
    envVar: 'OPENROUTER_API_KEY',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', free: false, scores: { coding: 95 } },
      { id: 'openai/gpt-4o', name: 'GPT-4o', free: false, scores: { coding: 93 } },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', free: false, scores: { coding: 91 } },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', free: true },
    ],
  },
  {
    id: 'openai',
    displayName: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', free: false, scores: { coding: 93 } },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', free: false, scores: { coding: 86 } },
      { id: 'o1-preview', name: 'o1 Preview', free: false, scores: { coding: 96 } },
      { id: 'o1-mini', name: 'o1 Mini', free: false, scores: { coding: 90 } },
    ],
  },
  {
    id: 'anthropic',
    displayName: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', free: false, scores: { coding: 95 } },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', free: false, scores: { coding: 88 } },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', free: false, scores: { coding: 89 } },
    ],
  },
  {
    id: 'google',
    displayName: 'Google',
    envVar: 'GOOGLE_API_KEY',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', free: true, scores: { coding: 89 } },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', free: false, scores: { coding: 92 } },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', free: true, scores: { coding: 84 } },
    ],
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    envVar: 'DEEPSEEK_API_KEY',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', free: false, scores: { coding: 91 } },
      { id: 'deepseek-coder', name: 'DeepSeek Coder V2.5', free: false, scores: { coding: 93 } },
    ],
  },
  {
    id: 'mistral',
    displayName: 'Mistral',
    envVar: 'MISTRAL_API_KEY',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', free: false, scores: { coding: 90 } },
      { id: 'codestral-latest', name: 'Codestral', free: false, scores: { coding: 92 } },
    ],
  },
  {
    id: 'groq',
    displayName: 'Groq',
    envVar: 'GROQ_API_KEY',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', free: true, scores: { coding: 84 } },
    ],
  },
  {
    id: 'xai',
    displayName: 'xAI',
    envVar: 'XAI_API_KEY',
    models: [
      { id: 'grok-4', name: 'Grok 4', free: false, scores: { coding: 88 } },
    ],
  },
  {
    id: 'perplexity',
    displayName: 'Perplexity',
    envVar: 'PERPLEXITY_API_KEY',
    models: [
      { id: 'sonar', name: 'Sonar', free: false, scores: { coding: 76 } },
    ],
  },
];

/** Where the list currently on screen came from. */
export type CatalogSource = 'live' | 'fallback';

/** The provider the UI opens on when the live catalog has not arrived yet. */
export const DEFAULT_PROVIDER_ID = 'openrouter';

/**
 * Shown whenever a screen renders `FALLBACK_PROVIDERS` instead of the live CLI
 * catalog. The wording is deliberately blunt: the whole point of WEB-029 was that
 * a stale catalog looked identical to a real one.
 */
export const CATALOG_STALE_NOTICE =
  'Backend unavailable — showing the bundled provider catalog. Models may be out of date; ' +
  'add your API key and reload to get the live list from the mcode CLI.';
