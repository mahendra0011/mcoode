/**
 * Official mcode plugin registry — single source of truth for the CLI
 * (`mcode add`) and the backend plugin catalog (seed script + `/api/plugins`).
 * Keep this list honest: the web app advertises "40+ official plugins".
 */
export const PLUGIN_REGISTRY = {
  // lint
  eslint: { category: 'lint', desc: 'ESLint flat-config preset (JS-only ruleset)', config: { lint: { eslintConfig: 'flat' } } },
  'eslint-react': { category: 'lint', desc: 'ESLint preset with React + hooks rules', config: { lint: { eslintConfig: 'flat', react: true } } },
  'eslint-node': { category: 'lint', desc: 'ESLint preset tuned for Node/Express backends', config: { lint: { eslintConfig: 'flat', node: true } } },
  stylelint: { category: 'lint', desc: 'Stylelint preset for CSS/Tailwind', config: { lint: { stylelint: true } } },

  // format
  prettier: { category: 'format', desc: 'Prettier formatting preset', config: { format: { tool: 'prettier' } } },
  editorconfig: { category: 'format', desc: 'Adds a shared .editorconfig', config: { format: { editorconfig: true } } },

  // testing
  'test-watcher': { category: 'testing', desc: 'Vitest watch preset with changed-file mode', config: { test: { watch: true } } },
  'test-coverage': { category: 'testing', desc: 'Vitest coverage thresholds + reporter', config: { test: { coverage: true } } },
  playwright: { category: 'testing', desc: 'Playwright e2e test scaffold', config: { test: { e2e: 'playwright' } } },
  cypress: { category: 'testing', desc: 'Cypress e2e test scaffold', config: { test: { e2e: 'cypress' } } },

  // deploy
  'deploy-netlify': { category: 'deploy', desc: 'Netlify deploy preset', config: { deploy: { target: 'netlify' } } },
  'deploy-vercel': { category: 'deploy', desc: 'Vercel deploy preset', config: { deploy: { target: 'vercel' } } },
  'deploy-docker': { category: 'deploy', desc: 'Dockerfile + compose preset', config: { deploy: { target: 'docker' } } },
  'deploy-railway': { category: 'deploy', desc: 'Railway deploy preset', config: { deploy: { target: 'railway' } } },
  'deploy-render': { category: 'deploy', desc: 'Render deploy preset', config: { deploy: { target: 'render' } } },
  'deploy-flyio': { category: 'deploy', desc: 'Fly.io deploy preset', config: { deploy: { target: 'flyio' } } },
  'deploy-aws-ecs': { category: 'deploy', desc: 'AWS ECS Fargate deploy preset', config: { deploy: { target: 'aws-ecs' } } },
  'deploy-cloudflare-pages': { category: 'deploy', desc: 'Cloudflare Pages deploy preset', config: { deploy: { target: 'cloudflare-pages' } } },
  'deploy-gh-pages': { category: 'deploy', desc: 'GitHub Pages static deploy preset', config: { deploy: { target: 'gh-pages' } } },

  // security
  'secrets-gpg': { category: 'security', desc: 'GPG-encrypted secrets preset', config: { security: { secrets: 'gpg' } } },
  'security-audit': { category: 'security', desc: 'Adds `mcode audit` — npm audit + secret-scan on watch', config: { security: { audit: true } } },
  helmet: { category: 'security', desc: 'Express Helmet + rate-limit middleware scaffold', config: { security: { helmet: true } } },
  'cors-preset': { category: 'security', desc: 'Sane CORS defaults for Express APIs', config: { security: { cors: true } } },

  // ci
  'ci-github-actions': { category: 'ci', desc: 'GitHub Actions workflow (build+test+ship)', config: { ci: { provider: 'github-actions' } } },
  'ci-gitlab': { category: 'ci', desc: 'GitLab CI pipeline scaffold', config: { ci: { provider: 'gitlab' } } },
  'pre-commit-hooks': { category: 'ci', desc: 'Husky + lint-staged pre-commit hooks', config: { ci: { hooks: 'husky' } } },

  // database
  'db-prisma': { category: 'database', desc: 'Prisma ORM scaffold + migration commands', config: { db: { orm: 'prisma' } } },
  'db-mongoose': { category: 'database', desc: 'Mongoose schema/connection scaffold', config: { db: { orm: 'mongoose' } } },
  'db-drizzle': { category: 'database', desc: 'Drizzle ORM scaffold (Postgres/SQLite)', config: { db: { orm: 'drizzle' } } },
  'db-seed': { category: 'database', desc: 'Adds `mcode run seed` with a seed-file convention', config: { db: { seed: true } } },

  // auth
  'auth-jwt': { category: 'auth', desc: 'JWT access/refresh auth scaffold', config: { auth: { strategy: 'jwt' } } },
  'auth-oauth': { category: 'auth', desc: 'OAuth2 (Google/GitHub) login scaffold', config: { auth: { strategy: 'oauth' } } },
  'auth-clerk': { category: 'auth', desc: 'Clerk auth integration preset', config: { auth: { strategy: 'clerk' } } },

  // docs
  'docs-readme': { category: 'docs', desc: 'Auto-generates/updates README from project structure', config: { docs: { readme: true } } },
  'docs-openapi': { category: 'docs', desc: 'OpenAPI/Swagger spec generator for Express routes', config: { docs: { openapi: true } } },
  changesets: { category: 'docs', desc: 'Changesets-based changelog + versioning', config: { docs: { changelog: 'changesets' } } },

  // observability
  'logging-pino': { category: 'observability', desc: 'Structured logging with pino', config: { observability: { logger: 'pino' } } },
  'error-sentry': { category: 'observability', desc: 'Sentry error tracking integration', config: { observability: { errors: 'sentry' } } },
  'metrics-prometheus': { category: 'observability', desc: 'Prometheus metrics endpoint scaffold', config: { observability: { metrics: 'prometheus' } } },

  // frontend
  'ui-shadcn': { category: 'frontend', desc: 'Adds shadcn/ui component scaffolding to a react-vite project', config: { frontend: { ui: 'shadcn' } } },
  'state-redux': { category: 'frontend', desc: 'Redux Toolkit store scaffold', config: { frontend: { state: 'redux' } } },
  'query-tanstack': { category: 'frontend', desc: 'TanStack Query client + hooks scaffold', config: { frontend: { dataFetching: 'react-query' } } },
  'pwa-preset': { category: 'frontend', desc: 'PWA manifest + service worker preset', config: { frontend: { pwa: true } } }
};

export const PLUGIN_CATEGORIES = [...new Set(Object.values(PLUGIN_REGISTRY).map((p) => p.category))];

export function listPlugins({ category } = {}) {
  const all = Object.entries(PLUGIN_REGISTRY).map(([name, p]) => ({ name, ...p }));
  return category ? all.filter((p) => p.category === category) : all;
}