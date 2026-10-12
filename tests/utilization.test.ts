import { describe, expect, it } from "vitest";
import { approvedHours } from "@/lib/resources/service";

describe("approvedHours", () => {
  it("counts approved time and leaves submitted time out of utilization", () => {
    const hours = approvedHours(
      [
        { userId: "u1", hours: 6, status: "APPROVED" },
        { userId: "u1", hours: 4, status: "SUBMITTED" },
        { userId: "u2", hours: 8, status: "APPROVED" },
      ],
      "u1",
    );
    expect(hours).toBe(6);
  });
});
