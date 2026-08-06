/** Sample workflow hooks for mcode.
 *
 * Place this file at `.mcode/hooks.js` in your project root to enable
 * custom scripts that run at key points during a build.
 *
 * Each hook is async and receives a context object. Returning normally
 * means the hook succeeded. Throwing or rejecting logs an error and continues.
 */

/** Fires before planning begins in god mode.
 *  ctx: { projectPath, prompt } */
export async function preBuild(ctx) {
  // e.g. run linting, check branch, notify a webhook
}

/** Fires before each wave of parallel subagents.
 *  ctx: { wave, totalWaves, todos, projectPath } */
export async function preWave(ctx) {
  // e.g. log "starting wave N of M"
}

/** Fires after each wave completes.
 *  ctx: { wave, totalWaves, results, projectPath } */
export async function postWave(ctx) {
  // e.g. send a Slack message with progress
}

/** Fires before a single subagent is dispatched for a todo.
 *  ctx: { todoId, domain, title } */
export async function preAgent(ctx) {
  // e.g. record timing baseline
}

/** Fires after a single subagent finishes (any status).
 *  ctx: { todoId, domain, title } */
export async function postAgent(ctx) {
  // e.g. clean up temp files
}

/** Fires after integration tests run.
 *  ctx: { integration, projectPath } */
export async function postTest(ctx) {
  // e.g. upload test coverage
}

/** Fires after the full build + bugfix loop finishes.
 *  ctx: { results, integration, projectPath, cost, elapsedSecs } */
export async function postBuild(ctx) {
  // e.g. deploy if all todos passed
}
