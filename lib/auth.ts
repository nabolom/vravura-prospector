import { cookies } from "next/headers";

const COOKIE_NAME = "vravura_session";
const SESSION_SECONDS = 60 * 60 * 12;
const ALLOWED_EMAILS = new Set([
  "leon.ruiz17@gmail.com",
  "milo@vravura.com",
]);
const PASSWORD_HASH = "1bf5dbfb72a2d9e27440d06d0b76d0c0c7ccbf4ef13145167b1d0a7c16bbd126";
const COOKIE_SECRET = "KeVgRJHp3NX5JfTYLxXPbsK0JCVPYzgEDb0PEXWcJwyXfiZ8LdftE294xAdU3MvC";

export type AppUser = {
  displayName: string;
  email: string;
};

type SessionPayload = {
  email: string;
  exp: number;
};

export async function authenticateCredentials(
  email: string,
  password: string,
): Promise<AppUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const validEmail = ALLOWED_EMAILS.has(normalizedEmail);
  const validPassword = await constantTimeEqual(await sha256Hex(password), PASSWORD_HASH);
  return validEmail && validPassword ? userFromEmail(normalizedEmail) : null;
}

export async function createSessionToken(email: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  if (!ALLOWED_EMAILS.has(normalizedEmail)) throw new Error("Usuario no autorizado");
  const payload: SessionPayload = {
    email: normalizedEmail,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = await sign(encodedPayload, COOKIE_SECRET);
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
    const [encodedPayload, signature, extra] = token.split(".");
    if (!encodedPayload || !signature || extra) return null;
    const expectedSignature = await sign(encodedPayload, COOKIE_SECRET);
    if (!(await constantTimeEqual(signature, expectedSignature))) return null;

    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as SessionPayload;
    if (
      !ALLOWED_EMAILS.has(normalizeEmail(payload.email)) ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return userFromEmail(normalizeEmail(payload.email));
  } catch {
    return null;
  }
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
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
