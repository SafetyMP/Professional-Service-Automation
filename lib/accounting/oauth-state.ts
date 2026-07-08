import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  organizationId: string;
  userId: string;
  nonce: string;
  exp: number;
};

function getStateSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for OAuth state");
  return secret;
}

function signPayload(encoded: string): string {
  return createHmac("sha256", getStateSecret()).update(encoded).digest("base64url");
}

export function createOAuthState(organizationId: string, userId: string): string {
  const payload: OAuthStatePayload = {
    organizationId,
    userId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signPayload(encoded)}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) throw new Error("Invalid OAuth state");

  const expected = signPayload(encoded);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
  if (!payload.organizationId || !payload.userId || !payload.exp) {
    throw new Error("Invalid OAuth state payload");
  }
  if (Date.now() > payload.exp) {
    throw new Error("OAuth state expired");
  }

  return payload;
}
