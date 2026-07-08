-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PLANNED', 'READY', 'INVOICED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "arAccountName" TEXT NOT NULL DEFAULT 'Accounts Receivable';
ALTER TABLE "Organization" ADD COLUMN "serviceRevenueAccount" TEXT NOT NULL DEFAULT 'Service Revenue';
ALTER TABLE "Organization" ADD COLUMN "expenseRevenueAccount" TEXT NOT NULL DEFAULT 'Expense Revenue';

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PLANNED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "dueDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN "milestoneId" TEXT;

-- CreateIndex
CREATE INDEX "Milestone_organizationId_projectId_idx" ON "Milestone"("organizationId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_milestoneId_key" ON "InvoiceLine"("milestoneId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;
