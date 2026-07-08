import { describe, expect, it } from "vitest";
import { computeProjectProfitability, computeProjectProfitabilityDetail } from "@/lib/reporting/service";

describe("computeProjectProfitability", () => {
  const projects = [
    {
      id: "p1",
      name: "Alpha",
      clientName: "Acme",
      status: "ACTIVE" as const,
      billingModel: "TIME_AND_MATERIALS" as const,
      contractAmount: null,
      invoicedTotal: 0,
      milestones: [],
    },
    {
      id: "p2",
      name: "Beta",
      clientName: "Globex",
      status: "ACTIVE" as const,
      billingModel: "TIME_AND_MATERIALS" as const,
      contractAmount: null,
      invoicedTotal: 0,
      milestones: [],
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

  it("uses invoice totals for fixed-fee revenue instead of billable time", () => {
    const report = computeProjectProfitability(
      [
        {
          id: "p1",
          name: "Website Redesign",
          clientName: "Acme",
          status: "ACTIVE",
          billingModel: "FIXED_FEE",
          contractAmount: 48_000,
          invoicedTotal: 24_000,
          milestones: [],
        },
      ],
      [
        {
          projectId: "p1",
          userId: "u1",
          hours: 120,
          billable: true,
          billingStatus: "UNBILLED",
          billRateOverride: null,
        },
      ],
      [],
      profiles,
    );

    const row = report.projects[0];
    expect(row.billedRevenue).toBe(24_000);
    expect(row.unbilledRevenue).toBe(24_000);
    expect(row.revenue).toBe(48_000);
    expect(row.cost).toBe(9_600);
    expect(row.margin).toBe(38_400);
    expect(row.marginPct).toBe(80);
  });

  it("adds billable expenses to contract project revenue", () => {
    const report = computeProjectProfitability(
      [
        {
          id: "p1",
          name: "Retainer",
          clientName: "Acme",
          status: "ACTIVE",
          billingModel: "RETAINER",
          contractAmount: 10_000,
          invoicedTotal: 10_000,
          milestones: [],
        },
      ],
      [],
      [{ projectId: "p1", amount: 250, billable: true, billingStatus: "UNBILLED" }],
      profiles,
    );

    const row = report.projects[0];
    expect(row.billedRevenue).toBe(10_000);
    expect(row.unbilledRevenue).toBe(250);
    expect(row.revenue).toBe(10_250);
  });

  it("uses milestone totals for milestone project unbilled revenue", () => {
    const report = computeProjectProfitability(
      [
        {
          id: "p1",
          name: "Product Launch",
          clientName: "Acme",
          status: "ACTIVE",
          billingModel: "MILESTONE",
          contractAmount: 30_000,
          invoicedTotal: 10_000,
          milestones: [
            { amount: 10_000, status: "INVOICED" },
            { amount: 12_000, status: "READY" },
            { amount: 8_000, status: "PLANNED" },
          ],
        },
      ],
      [
        {
          projectId: "p1",
          userId: "u1",
          hours: 40,
          billable: true,
          billingStatus: "UNBILLED",
          billRateOverride: null,
        },
      ],
      [],
      profiles,
    );

    const row = report.projects[0];
    expect(row.billedRevenue).toBe(10_000);
    expect(row.unbilledRevenue).toBe(20_000);
    expect(row.revenue).toBe(30_000);
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
      "TIME_AND_MATERIALS",
      null,
      0,
      [],
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

  it("uses contract invoices for service revenue on fixed-fee projects", () => {
    const detail = computeProjectProfitabilityDetail(
      "p1",
      "FIXED_FEE",
      50_000,
      20_000,
      [],
      null,
      [
        {
          projectId: "p1",
          userId: "u1",
          userName: "Alex",
          hours: 80,
          billable: true,
          billingStatus: "UNBILLED",
          billRateOverride: null,
        },
      ],
      [{ projectId: "p1", userId: "u1", amount: 100, billable: true, billingStatus: "UNBILLED" }],
      profiles,
      userNames,
    );

    expect(detail.summary.billedRevenue).toBe(20_000);
    expect(detail.summary.unbilledRevenue).toBe(30_100);
    expect(detail.summary.revenue).toBe(50_100);
    expect(detail.timeRevenue.billed).toBe(20_000);
    expect(detail.timeRevenue.unbilled).toBe(30_000);
    expect(detail.expenseRevenue.unbilled).toBe(100);
    expect(detail.byPerson[0].billedRevenue).toBe(0);
    expect(detail.byPerson[0].unbilledRevenue).toBe(100);
    expect(detail.byPerson[0].cost).toBe(6_500);
  });
});
