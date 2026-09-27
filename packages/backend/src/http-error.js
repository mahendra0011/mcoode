/** HTTP error with a numeric status (read by the Express error handler).
 *  Plain `new Error()` + `.status =` assignment is untyped and trips
 *  checkJs — always build status errors through here.
 *  @param {number} status
 *  @param {string} message
 *  @returns {Error & { status: number }}
 */
export function httpError(status, message) {
  const err = /** @type {Error & { status?: number }} */ (new Error(message));
  err.status = status;
  return /** @type {Error & { status: number }} */ (err);
}
