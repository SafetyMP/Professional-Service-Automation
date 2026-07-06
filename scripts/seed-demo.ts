import bcrypt from "bcryptjs";
import { subDays } from "date-fns";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL },
  },
});

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.auditLog.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.expenseEntry.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.resourceProfile.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: "Demo Consulting Firm", slug: "demo-firm" },
  });

  const users = await Promise.all(
    [
      { email: "admin@demo.com", name: "Alex Admin", role: "ADMIN" as const },
      { email: "manager@demo.com", name: "Morgan Manager", role: "MANAGER" as const },
      { email: "consultant1@demo.com", name: "Casey Consultant", role: "CONSULTANT" as const },
      { email: "consultant2@demo.com", name: "Jordan Analyst", role: "CONSULTANT" as const },
      { email: "consultant3@demo.com", name: "Riley Developer", role: "CONSULTANT" as const },
      { email: "consultant4@demo.com", name: "Taylor Designer", role: "CONSULTANT" as const },
      { email: "consultant5@demo.com", name: "Sam Strategist", role: "CONSULTANT" as const },
      { email: "consultant6@demo.com", name: "Quinn Engineer", role: "CONSULTANT" as const },
    ].map(async (u) => {
      const user = await prisma.user.create({
        data: { email: u.email, name: u.name, passwordHash },
      });
      await prisma.organizationMember.create({
        data: { organizationId: org.id, userId: user.id, role: u.role },
      });
      return user;
    }),
  );

  const consultants = users.slice(2);

  for (const c of consultants) {
    await prisma.resourceProfile.create({
      data: {
        organizationId: org.id,
        userId: c.id,
        weeklyCapacityHrs: 40,
        costRate: 60 + Math.random() * 30,
        billRate: 140 + Math.random() * 40,
        skills: ["Consulting", "Delivery"],
      },
    });
  }

  const clients = await Promise.all(
    ["Acme Corp", "Globex Industries", "Initech LLC"].map((name) =>
      prisma.client.create({ data: { organizationId: org.id, name, email: `${name.split(" ")[0].toLowerCase()}@example.com` } }),
    ),
  );

  const projectData = [
    { name: "Digital Transformation", client: clients[0], budget: 400 },
    { name: "ERP Integration", client: clients[0], budget: 200 },
    { name: "Cloud Migration", client: clients[1], budget: 320 },
    { name: "Security Audit", client: clients[1], budget: 160 },
    { name: "Process Optimization", client: clients[2], budget: 240 },
  ];

  const projects = await Promise.all(
    projectData.map((p) =>
      prisma.project.create({
        data: {
          organizationId: org.id,
          clientId: p.client.id,
          name: p.name,
          status: "ACTIVE",
          billingModel: "TIME_AND_MATERIALS",
          budgetHours: p.budget,
          startDate: subDays(new Date(), 30),
        },
      }),
    ),
  );

  for (const project of projects) {
    for (const c of consultants.slice(0, 3)) {
      await prisma.projectMember.create({
        data: { organizationId: org.id, projectId: project.id, userId: c.id },
      });
    }
    await prisma.task.createMany({
      data: [
        { organizationId: org.id, projectId: project.id, name: "Discovery" },
        { organizationId: org.id, projectId: project.id, name: "Implementation" },
        { organizationId: org.id, projectId: project.id, name: "Testing" },
      ],
    });
  }

  const tasks = await prisma.task.findMany({ where: { organizationId: org.id } });

  for (let d = 0; d < 14; d++) {
    const entryDate = subDays(new Date(), d);
    for (const c of consultants.slice(0, 4)) {
      const project = projects[d % projects.length];
      const task = tasks.find((t) => t.projectId === project.id);
      const status = d > 3 ? "APPROVED" : d > 1 ? "SUBMITTED" : "DRAFT";
      await prisma.timeEntry.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          taskId: task?.id,
          userId: c.id,
          entryDate,
          hours: 4 + (d % 3),
          billable: true,
          status,
          billingStatus: "UNBILLED",
          approvedById: status === "APPROVED" ? users[1].id : undefined,
          approvedAt: status === "APPROVED" ? new Date() : undefined,
        },
      });
    }
  }

  await prisma.allocation.createMany({
    data: consultants.slice(0, 3).flatMap((c, i) =>
      projects.slice(0, 2).map((p) => ({
        organizationId: org.id,
        projectId: p.id,
        userId: c.id,
        plannedHours: 80 + i * 10,
        startDate: subDays(new Date(), 7),
        endDate: subDays(new Date(), -21),
      })),
    ),
  });

  await prisma.expenseEntry.createMany({
    data: [
      {
        organizationId: org.id,
        projectId: projects[0].id,
        userId: consultants[0].id,
        expenseDate: subDays(new Date(), 6),
        amount: 85.42,
        description: "Client workshop rideshare",
        billable: true,
        status: "APPROVED",
      },
      {
        organizationId: org.id,
        projectId: projects[0].id,
        userId: consultants[1].id,
        expenseDate: subDays(new Date(), 4),
        amount: 42.18,
        description: "Team lunch during onsite discovery",
        billable: true,
        status: "SUBMITTED",
      },
      {
        organizationId: org.id,
        projectId: projects[2].id,
        userId: consultants[2].id,
        expenseDate: subDays(new Date(), 3),
        amount: 129.99,
        description: "Cloud migration test account",
        billable: false,
        status: "DRAFT",
      },
    ],
  });

  const approvedEntries = await prisma.timeEntry.findMany({
    where: { organizationId: org.id, status: "APPROVED", billingStatus: "UNBILLED" },
    take: 5,
    include: { user: true, task: true },
  });

  if (approvedEntries.length > 0) {
    let subtotal = 0;
    const lines = approvedEntries.map((e) => {
      const rate = 150;
      const amount = Number(e.hours) * rate;
      subtotal += amount;
      return {
        organizationId: org.id,
        timeEntryId: e.id,
        description: `${e.user.name} — ${e.task?.name ?? "Work"}`,
        quantity: e.hours,
        unitRate: rate,
        amount,
      };
    });

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: org.id,
        projectId: projects[0].id,
        clientId: clients[0].id,
        invoiceNumber: "INV-00001",
        status: "DRAFT",
        issueDate: new Date(),
        dueDate: subDays(new Date(), -30),
        subtotal,
        lines: { create: lines },
      },
    });

    await prisma.timeEntry.updateMany({
      where: { id: { in: approvedEntries.map((e) => e.id) } },
      data: { billingStatus: "INVOICED" },
    });

    console.log(`Created draft invoice ${invoice.invoiceNumber}`);
  }

  console.log("Demo seed complete.");
  console.log("Login: admin@demo.com / password123 (org: demo-firm)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
