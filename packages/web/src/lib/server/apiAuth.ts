/**
 * M11-002 — shared authentication guard for Next App Router API routes.
 *
 * The App Router `app/api/**` surface previously had NO authentication and no
 * `middleware.ts`, so every route under it was reachable by an anonymous client.
 * Each route now calls `requireApiAuth` as its first statement.
 *
 * Token source mirrors what the rest of the app already sends: the backend
 * issues `httpOnly` cookies (`auth.js` cookieFlags: httpOnly, sameSite lax,
 * secure in production), so the access token is read from the cookie and
 * verified here.
 *
 * Verification uses `node:crypto` directly rather than a JWT library: the web
 * package has no `jsonwebtoken`/`jose` dependency, and this route only needs to
 * validate an HS256 token the backend itself minted. Adding a dependency for
 * one verification would be a worse trade than ~20 lines of well-understood
 * HMAC code.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: Response };

/** Cookies the backend sets for the session (see packages/backend/src/auth.js). */
const TOKEN_COOKIES = ["mcode_token", "access_token", "token"] as const;

/**
 * Explicit, opt-in escape hatch for local development only. Requires BOTH
 * NODE_ENV !== 'production' and ALLOW_DEV_API_BYPASS=1, so a misconfigured
 * production environment still fails closed.
 */
function devBypassAllowed(): boolean {
  return process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_DEV_API_BYPASS === "1";
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function extractBearer(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  for (const name of TOKEN_COOKIES) {
    const value = readCookie(req, name);
    if (value) return value;
  }
  return null;
}

function secretKey(): string | null {
  return process.env.JWT_SECRET || null;
}

/** base64url decode that tolerates missing padding. */
function b64urlDecode(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

type JwtPayload = { sub?: unknown; role?: unknown; exp?: unknown };

/**
 * Verify an HS256 JWT. Returns the payload, or null if the token is
 * structurally invalid, signed with the wrong key, not HS256, or expired.
 *
 * The algorithm is PINNED: the header's `alg` must be exactly "HS256". A token
 * whose header claims "none" or an asymmetric algorithm is rejected before any
 * signature work, which closes the algorithm-confusion class (M11-006).
 */
function verifyHs256(token: string, secret: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; typ?: string };
  let payload: JwtPayload;
  try {
    header = JSON.parse(b64urlDecode(headerB64));
    payload = JSON.parse(b64urlDecode(payloadB64));
  } catch {
    return null;
  }

  if (header?.alg !== "HS256") return null;

  const expected = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(
      signatureB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    );
  } catch {
    return null;
  }
  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
    return null;
  }
  return payload;
}

/**
 * Verifies the caller. Returns a discriminated union so a route can
 * `if (!auth.ok) return auth.response;` without try/catch noise.
 */
export async function requireApiAuth(req: Request): Promise<AuthResult> {
  if (devBypassAllowed()) {
    return { ok: true, userId: "dev-bypass", role: "dev" };
  }

  const token = extractBearer(req);
  if (!token) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHENTICATED", "Authentication required"),
    };
  }

  const secret = secretKey();
  if (!secret) {
    // Fail closed: with no secret we cannot verify anything.
    return {
      ok: false,
      response: jsonError(
        503,
        "AUTH_UNAVAILABLE",
        "Authentication is not configured on this server"
      ),
    };
  }

  const payload = verifyHs256(token, secret);
  if (!payload) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHENTICATED", "Invalid or expired token"),
    };
  }

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) {
    return {
      ok: false,
      response: jsonError(401, "UNAUTHENTICATED", "Token has no subject"),
    };
  }
  const role = typeof payload.role === "string" ? payload.role : "user";
  return { ok: true, userId: sub, role };
}

/**
 * Defence in depth for any value that reaches a child_process call. With
 * execFile there is no shell, so this is belt-and-braces rather than the
 * primary control (M11-001).
 */
export function assertNoShellMeta(value: string): void {
  if (/[;&|`$<>\n\r]/.test(value)) {
    throw new Error("Shell metacharacters are not allowed in this value");
  }
}
