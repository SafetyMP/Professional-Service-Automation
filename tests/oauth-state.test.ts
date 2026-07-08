import { describe, expect, it } from "vitest";
import { createOAuthState, verifyOAuthState } from "@/lib/accounting/oauth-state";

describe("oauth state", () => {
  it("round-trips signed state", () => {
    process.env.AUTH_SECRET = "test-secret-for-oauth-state";
    const state = createOAuthState("org-1", "user-1");
    const payload = verifyOAuthState(state);
    expect(payload.organizationId).toBe("org-1");
    expect(payload.userId).toBe("user-1");
  });
});
