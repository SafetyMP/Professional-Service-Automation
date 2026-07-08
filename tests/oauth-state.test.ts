import { describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "@/lib/accounting/oauth-state";

describe("oauth state", () => {
  it("round-trips signed JWT state", async () => {
    process.env.AUTH_SECRET = "test-secret-for-oauth-state";
    const state = await createOAuthState("org-1", "user-1");
    const payload = await verifyOAuthState(state);
    expect(payload.organizationId).toBe("org-1");
    expect(payload.userId).toBe("user-1");
  });

  it("rejects tampered state", async () => {
    process.env.AUTH_SECRET = "test-secret-for-oauth-state";
    const state = await createOAuthState("org-1", "user-1");
    await expect(verifyOAuthState(`${state}x`)).rejects.toThrow();
  });
});
