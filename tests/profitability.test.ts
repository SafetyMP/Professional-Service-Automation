import { describe, expect, it } from "vitest";
import { computeProjectProfitability, computeProjectProfitabilityDetail } from "@/lib/reporting/service";

describe("computeProjectProfitability", () => {
  const projects = [
    {
      id: "p1",
      name: "Alpha",
      clientName: "Acme",
      status: "ACTIVE" as const,
    },
    {
      id: "p2",
      name: "Beta",
      clientName: "Globex",
      status: "ACTIVE" as const,
    },
  ];

  const profiles = new Map([
    ["u1", { billRate: 200, costRate: 80 }],
    ["u2", { billRate: 150, costRate: 60 }],
  ]);

  it("calculates revenue from billable time and expenses", () => {
    const report = computeProjectProfitability(
      projects,
      [
        {
          projectId: "p1",
          userId: "u1",
          hours: 10,
          billable: true,
          billingStatus: "UNBILLED",
          billRateOverride: null,
        },
        {
          projectId: "p1",
          userId: "u2",
          hours: 5,
          billable: false,
          billingStatus: "UNBILLED",
          billRateOverride: null,
        },
      ],
      [{ projectId: "p1", amount: 100, billable: true, billingStatus: "UNBILLED" }],
      profiles,
    );

    const alpha = report.projects.find((row) => row.projectId === "p1");
    expect(alpha?.revenue).toBe(2100);
    expect(alpha?.billedRevenue).toBe(0);
    expect(alpha?.unbilledRevenue).toBe(2100);
    expect(alpha?.cost).toBe(1200);
    expect(alpha?.margin).toBe(900);
    expect(alpha?.marginPct).toBe(43);
  });

  it("uses project bill rate override for revenue", () => {
    const report = computeProjectProfitability(
      projects,
      [
        {
          projectId: "p2",
          userId: "u1",
          hours: 2,
          billable: true,
          billingStatus: "INVOICED",
          billRateOverride: 250,
        },
      ],
      [],
      profiles,
    );

    const beta = report.projects.find((row) => row.projectId === "p2");
    expect(beta?.revenue).toBe(500);
    expect(beta?.billedRevenue).toBe(500);
    expect(beta?.unbilledRevenue).toBe(0);
    expect(beta?.cost).toBe(160);
    expect(beta?.marginPct).toBe(68);
  });

  it("includes non-billable expenses in cost but not revenue", () => {
    const report = computeProjectProfitability(
      projects,
      [],
      [{ projectId: "p2", amount: 50, billable: false, billingStatus: "UNBILLED" }],
      profiles,
    );

    const beta = report.projects.find((row) => row.projectId === "p2");
    expect(beta?.revenue).toBe(0);
    expect(beta?.cost).toBe(50);
    expect(beta?.marginPct).toBeNull();
  });

  it("summarizes totals across projects", () => {
    const report = computeProjectProfitability(
      projects,
      [
        {
          projectId: "p1",
          userId: "u1",
          hours: 1,
          billable: true,
          billingStatus: "INVOICED",
          billRateOverride: null,
        },
      ],
      [{ projectId: "p2", amount: 100, billable: true, billingStatus: "UNBILLED" }],
      profiles,
    );

    expect(report.summary.revenue).toBe(300);
    expect(report.summary.billedRevenue).toBe(200);
    expect(report.summary.unbilledRevenue).toBe(100);
    expect(report.summary.cost).toBe(180);
    expect(report.summary.margin).toBe(120);
    expect(report.summary.marginPct).toBe(40);
  });

  it("splits billable revenue by billing status", () => {
    const report = computeProjectProfitability(
      projects,
      [
        {
          projectId: "p1",
          userId: "u1",
          hours: 4,
          billable: true,
          billingStatus: "INVOICED",
          billRateOverride: null,
        },
        {
          projectId: "p1",
          userId: "u1",
          hours: 6,
          billable: true,
          billingStatus: "UNBILLED",
          billRateOverride: null,
        },
      ],
      [
        { projectId: "p1", amount: 50, billable: true, billingStatus: "INVOICED" },
        { projectId: "p1", amount: 25, billable: true, billingStatus: "UNBILLED" },
      ],
      profiles,
    );

    const alpha = report.projects.find((row) => row.projectId === "p1");
    expect(alpha?.billedRevenue).toBe(850);
    expect(alpha?.unbilledRevenue).toBe(1225);
    expect(alpha?.revenue).toBe(2075);
  });
});

describe("computeProjectProfitabilityDetail", () => {
  const profiles = new Map([
    ["u1", { billRate: 200, costRate: 80 }],
    ["u2", { billRate: 150, costRate: 60 }],
  ]);
  const userNames = new Map([
    ["u1", "Alex"],
    ["u2", "Jordan"],
  ]);

  it("breaks down revenue by person and source", () => {
    const detail = computeProjectProfitabilityDetail(
      "p1",
      null,
      [
        {
          projectId: "p1",
          userId: "u1",
          userName: "Alex",
          hours: 5,
          billable: true,
          billingStatus: "INVOICED",
          billRateOverride: null,
        },
        {
          projectId: "p1",
          userId: "u2",
          userName: "Jordan",
          hours: 4,
          billable: true,
          billingStatus: "UNBILLED",
          billRateOverride: null,
        },
      ],
      [{ projectId: "p1", userId: "u1", amount: 85.42, billable: true, billingStatus: "INVOICED" }],
      profiles,
      userNames,
    );

    expect(detail.summary.billedRevenue).toBe(1085.42);
    expect(detail.summary.unbilledRevenue).toBe(600);
    expect(detail.timeRevenue.billed).toBe(1000);
    expect(detail.expenseRevenue.billed).toBe(85.42);
    expect(detail.byPerson).toHaveLength(2);
    expect(detail.byPerson[0].userName).toBe("Alex");
    expect(detail.byPerson[0].margin).toBe(600);
  });
});
