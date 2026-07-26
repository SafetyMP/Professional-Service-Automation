#!/usr/bin/env node
/**
 * Mint NextAuth session cookie for adversarial tier-3 probes.
 * Usage: node scripts/mint-adversarial-session.mjs CONSULTANT|MANAGER|ADMIN
 */
const role = (process.argv[2] ?? "CONSULTANT").toUpperCase();
const base = process.env.ADVERSARIAL_BASE_URL ?? "http://localhost:3000";

const users = {
  CONSULTANT: { email: "consultant1@demo.com", password: "password123", orgSlug: "demo-firm" },
  MANAGER: { email: "manager@demo.com", password: "password123", orgSlug: "demo-firm" },
  ADMIN: { email: "admin@demo.com", password: "password123", orgSlug: "demo-firm" },
};

const user = users[role];
if (!user) {
  console.error(`unknown role: ${role}`);
  process.exit(1);
}

const csrfRes = await fetch(`${base}/api/auth/csrf`);
if (!csrfRes.ok) {
  console.error("csrf fetch failed");
  process.exit(1);
}
const { csrfToken } = await csrfRes.json();

const body = new URLSearchParams({
  csrfToken,
  email: user.email,
  password: user.password,
  orgSlug: user.orgSlug,
  callbackUrl: `${base}/dashboard`,
  json: "true",
});

const res = await fetch(`${base}/api/auth/callback/credentials`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body,
  redirect: "manual",
});

const setCookies =
  typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);

const cookieHeader = setCookies
  .filter(Boolean)
  .map((c) => String(c).split(";")[0])
  .join("; ");

if (!cookieHeader) {
  console.error("no session cookie minted");
  process.exit(1);
}

console.log(cookieHeader);
