import { cookies } from "next/headers";

const COOKIE_NAME = "vravura_session";
const SESSION_SECONDS = 60 * 60 * 12;

export type AppUser = {
  displayName: string;
  email: string;
};

type SessionPayload = {
  email: string;
  exp: number;
};

type AuthConfig = {
  email: string;
  password: string;
  secret: string;
};

export class AuthConfigurationError extends Error {}

export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<AppUser | null> {
  const config = getAuthConfig();
  const validEmail = normalizeEmail(email) === config.email;
  const validPassword = await constantTimeEqual(password, config.password);
  return validEmail && validPassword ? userFromEmail(config.email) : null;
}

export async function createSessionToken(email: string): Promise<string> {
  const config = getAuthConfig();
  const payload: SessionPayload = {
    email: normalizeEmail(email),
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload, config.secret);
  return `${encodedPayload}.${signature}`;
}

export async function getSessionUser(): Promise<AppUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function rejectUnauthenticatedApiRequest(): Promise<Response | null> {
  const user = await getSessionUser();
  return user
    ? null
    : Response.json({ error: "Sesión requerida" }, { status: 401 });
}

export function sessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_SECONDS,
  };
}

export function expiredSessionCookie() {
  return { ...sessionCookie(""), maxAge: 0 };
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, "https://app.local");
    return url.origin === "https://app.local" && url.pathname !== "/login"
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}

async function verifySessionToken(token: string): Promise<AppUser | null> {
  try {
    const config = getAuthConfig();
    const [encodedPayload, signature, extra] = token.split(".");
    if (!encodedPayload || !signature || extra) return null;
    const expectedSignature = await sign(encodedPayload, config.secret);
    if (!(await constantTimeEqual(signature, expectedSignature))) return null;

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
    if (
      normalizeEmail(payload.email) !== config.email ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return userFromEmail(config.email);
  } catch {
    return null;
  }
}

function getAuthConfig(): AuthConfig {
  const email = normalizeEmail(process.env.APP_LOGIN_EMAIL ?? "");
  const password = process.env.APP_LOGIN_PASSWORD ?? "";
  const secret = process.env.AUTH_COOKIE_SECRET ?? "";
  if (!email || password.length < 12 || secret.length < 32) {
    throw new AuthConfigurationError(
      "Configura APP_LOGIN_EMAIL, APP_LOGIN_PASSWORD (mínimo 12 caracteres) y AUTH_COOKIE_SECRET (mínimo 32 caracteres).",
    );
  }
  return { email, password, secret };
}

function userFromEmail(email: string): AppUser {
  const localPart = email.split("@")[0] ?? "VRAVURA";
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return { email, displayName: displayName || "VRAVURA" };
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function sign(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

function encodeBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
