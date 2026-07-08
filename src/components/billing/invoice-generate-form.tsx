"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export type InvoiceProjectOption = {
  id: string;
  name: string;
  billingModel: string;
  contractAmount: number | null;
  invoicedTotal: number;
  remaining: number | null;
  readyMilestones: Array<{ id: string; name: string; amount: number }>;
};

function defaultDateRange() {
  const end = new Date();
  const start = subDays(end, 30);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

export function InvoiceGenerateForm({
  projects,
  action,
}: {
  projects: InvoiceProjectOption[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const activeProjects = projects.filter((project) => project.name);
  const [projectId, setProjectId] = useState(activeProjects[0]?.id ?? "");
  const dateDefaults = useMemo(() => defaultDateRange(), []);
  const selected = useMemo(
    () => activeProjects.find((project) => project.id === projectId),
    [activeProjects, projectId],
  );

  const isContract =
    selected?.billingModel === "FIXED_FEE" || selected?.billingModel === "RETAINER";
  const isMilestone = selected?.billingModel === "MILESTONE";

  const defaultAmount =
    selected?.remaining ?? selected?.contractAmount ?? undefined;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label htmlFor="projectId">Project</Label>
        <Select
          id="projectId"
          name="projectId"
          required
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
        >
          {activeProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} ({formatBillingModel(project.billingModel)})
            </option>
          ))}
        </Select>
      </div>

      {isMilestone ? (
        <>
          <div>
            <Label htmlFor="milestoneId">Ready Milestone</Label>
            <Select id="milestoneId" name="milestoneId" required>
              {selected?.readyMilestones.length ? (
                selected.readyMilestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name} (${milestone.amount.toFixed(2)})
                  </option>
                ))
              ) : (
                <option value="">No ready milestones</option>
              )}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={!selected || !selected.readyMilestones.length}>
              Generate
            </Button>
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)] sm:col-span-2 lg:col-span-4">
            Mark milestones Ready on the project page before invoicing.
          </p>
        </>
      ) : isContract ? (
        <>
          <div>
            <Label htmlFor="amount">
              {selected?.billingModel === "RETAINER" ? "Retainer Amount" : "Invoice Amount"}
            </Label>
            <Input
              key={`${projectId}-amount`}
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={defaultAmount?.toString() ?? ""}
              placeholder={
                selected?.remaining != null
                  ? `Remaining $${selected.remaining.toFixed(2)}`
                  : undefined
              }
            />
          </div>
          {selected?.billingModel === "FIXED_FEE" && (
            <div>
              <Label htmlFor="percentComplete">Or % Complete</Label>
              <Input
                id="percentComplete"
                name="percentComplete"
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="Optional"
              />
            </div>
          )}
          <div className="flex items-end">
            <Button type="submit">Generate</Button>
          </div>
          {selected?.contractAmount != null && (
            <p className="text-sm text-[var(--color-muted-foreground)] sm:col-span-2 lg:col-span-4">
              Contract ${selected.contractAmount.toFixed(2)} · Invoiced $
              {selected.invoicedTotal.toFixed(2)}
              {selected.remaining != null ? ` · Remaining $${selected.remaining.toFixed(2)}` : ""}
            </p>
          )}
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="startDate">From</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              defaultValue={dateDefaults.startDate}
            />
          </div>
          <div>
            <Label htmlFor="endDate">To</Label>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              required
              defaultValue={dateDefaults.endDate}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit">Generate</Button>
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)] sm:col-span-2 lg:col-span-4">
            Includes approved, unbilled time and expenses in the selected date range.
          </p>
        </>
      )}
    </form>
  );
}

function formatBillingModel(model: string): string {
  switch (model) {
    case "FIXED_FEE":
      return "Fixed Fee";
    case "RETAINER":
      return "Retainer";
    case "MILESTONE":
      return "Milestone";
    default:
      return "T&M";
  }
}
