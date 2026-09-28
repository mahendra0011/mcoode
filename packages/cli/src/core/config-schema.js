import { z } from 'zod';

const DomainSchema = z.enum([
  'planning', 'frontend', 'backend', 'db', 'devops', 'test', 'docs', 'bugfix', 'reviewer', 'migration', 'chat'
]);

const WatchSchema = z.object({
  scanIntervalMs: z.number().positive().default(30_000),
  debounceMs: z.number().positive().default(400),
  maxFixesPerHour: z.number().positive().default(60),
  autoCommit: z.boolean().default(false),
  maxAttemptsPerFix: z.number().positive().default(3),
  confirm: z.boolean().optional(),
});

const CostSchema = z.object({
  budgetPerRunUsd: z.number().nonnegative().default(2.0),
  freeProvidersPreferred: z.boolean().default(true),
});

const CleanSchema = z.object({
  bloatSizeThresholdLines: z.number().positive().default(30),
  maxEquivalencePasses: z.number().positive().default(5),
  autoDetectOnGodModeComplete: z.boolean().default(false),
});

const BackendSchema = z.object({
  url: z.string().url().default('http://localhost:3100'),
  cliSecret: z.string().optional(),
});

const RolesSchema = z.record(
  z.string(),
  z.union([z.string(), z.object({ preferredModels: z.array(z.string()) })])
);

export const ConfigSchema = z.object({
  model: z.string().optional(),
  modelOverride: z.string().optional(),
  mode: z.enum(['low', 'medium', 'high', 'extra', 'max', 'god']).optional(),
  concurrency: z.number().int().positive().default(5),
  maxTurnsPerSubagent: z.number().int().positive().default(25),
  maxTokensPerSubagent: z.number().int().positive().default(60_000),
  chatAgent: z.boolean().optional(),
  chatAgentTurns: z.number().int().positive().optional(),
  historyLimit: z.number().int().min(0).optional(),
  allowShellAll: z.boolean().optional(),
  requireEditApproval: z.boolean().optional(),
  requirePermission: z.boolean().optional(),
  permissionTimeoutMs: z.number().positive().optional(),
  extraRules: z.string().optional(),
  domain: DomainSchema.optional(),
  watch: WatchSchema.partial().optional(),
  cost: CostSchema.partial().optional(),
  clean: CleanSchema.partial().optional(),
  networkWhitelist: z.array(z.string()).nullable().optional(),
  backend: BackendSchema.partial().optional(),
  cliSecret: z.string().optional(),
  roles: RolesSchema.optional(),
  routing: z.record(z.string(), z.array(z.string())).optional(),
  // MF-005: installed plugin presets + their provenance. Must survive
  // validate-before-write (store.saveConfig) or installs would be dropped.
  plugins: z.record(z.string(), z.any()).optional(),
  pluginsRegistryUrl: z.string().url().optional(),
  modelScores: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  modelScoresUrl: z.string().url().optional(),
  enabledProviders: z.array(z.string()).optional(),
  disabledProviders: z.array(z.string()).optional(),
  // Unknown keys are PRESERVED, not stripped: plugin installs merge arbitrary
  // config blocks (`lint`, `deploy`, `frontend`, …) and `saveConfig` validates
  // on every write, so a strict object would silently delete every install
  // (MF-005). Known keys above are still fully type-checked (MF-007).
}).passthrough();

export function validateConfig(config) {
  const result = ConfigSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid config: ${issues}`);
  }
  return result.data;
}
