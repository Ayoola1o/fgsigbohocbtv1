import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthRole = "admin" | "student";

export interface AuthClaims {
  userId: string;
  role: AuthRole;
  expiresAt: number;
}

const COOKIE_NAME = "fia_auth";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function signingKey(): string {
  // SESSION_SECRET is preferred. DATABASE_URL is a stable, server-only fallback
  // so Vercel instances can verify the same cookie without a shared session store.
  const key = process.env.SESSION_SECRET || process.env.DATABASE_URL;
  if (key) return key;
  if (process.env.NODE_ENV !== "production") return "faith-immaculate-local-session-key";
  throw new Error("SESSION_SECRET or DATABASE_URL is required to sign sessions");
}

function signature(payload: string): Buffer {
  return createHmac("sha256", signingKey()).update(`fia-auth-v1.${payload}`).digest();
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

function getCookie(req: { headers?: { cookie?: string } }, name: string): string | null {
  const header = req.headers?.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

export function issueAuthCookie(
  res: { cookie: (name: string, value: string, options: ReturnType<typeof cookieOptions>) => unknown },
  claims: Pick<AuthClaims, "userId" | "role">,
): AuthClaims {
  const fullClaims: AuthClaims = {
    ...claims,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(fullClaims)).toString("base64url");
  const token = `${payload}.${signature(payload).toString("base64url")}`;
  res.cookie(COOKIE_NAME, token, cookieOptions());
  return fullClaims;
}

export function clearAuthCookie(res: {
  clearCookie: (name: string, options: Omit<ReturnType<typeof cookieOptions>, "maxAge">) => unknown;
}): void {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

export function readAuthCookie(req: { headers?: { cookie?: string } }): AuthClaims | null {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(token.slice(separator + 1), "base64url");
  } catch {
    return null;
  }

  const expectedSignature = signature(payload);
  if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthClaims;
    if (
      !claims.userId ||
      (claims.role !== "admin" && claims.role !== "student") ||
      !Number.isFinite(claims.expiresAt) ||
      claims.expiresAt <= Date.now()
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}
