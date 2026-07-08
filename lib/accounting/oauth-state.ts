import { hkdfSync, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

const STATE_TTL = "10m";
const HKDF_INFO = "psa-oauth-state-v1";

export type OAuthStatePayload = {
  organizationId: string;
  userId: string;
};

function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for OAuth state");
  return new Uint8Array(hkdfSync("sha256", secret, "", HKDF_INFO, 32));
}

export async function createOAuthState(organizationId: string, userId: string): Promise<string> {
  const key = getSigningKey();
  return new SignJWT({ organizationId, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setJti(randomBytes(16).toString("hex"))
    .setIssuedAt()
    .setExpirationTime(STATE_TTL)
    .sign(key);
}

export async function verifyOAuthState(state: string): Promise<OAuthStatePayload> {
  const key = getSigningKey();
  const { payload } = await jwtVerify(state, key, {
    algorithms: ["HS256"],
  });

  const organizationId = payload.organizationId;
  const userId = payload.userId;
  if (typeof organizationId !== "string" || typeof userId !== "string") {
    throw new Error("Invalid OAuth state payload");
  }

  return { organizationId, userId };
}
