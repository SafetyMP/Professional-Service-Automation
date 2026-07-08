export function milestoneLineDescription(milestoneName: string, projectName: string): string {
  return `Milestone — ${milestoneName} (${projectName})`;
}

export function assertMilestoneInvoiceable(status: "PLANNED" | "READY" | "INVOICED"): void {
  if (status !== "READY") {
    throw new Error("Only milestones marked Ready can be invoiced");
  }
}
