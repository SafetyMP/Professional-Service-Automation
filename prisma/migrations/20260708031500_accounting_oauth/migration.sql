-- CreateEnum
CREATE TYPE "AccountingProvider" AS ENUM ('XERO');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "arAccountCode" TEXT,
ADD COLUMN "serviceRevenueAccountCode" TEXT,
ADD COLUMN "expenseRevenueAccountCode" TEXT;

-- CreateTable
CREATE TABLE "AccountingConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "AccountingProvider" NOT NULL DEFAULT 'XERO',
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingConnection_organizationId_idx" ON "AccountingConnection"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingConnection_organizationId_provider_key" ON "AccountingConnection"("organizationId", "provider");

-- AddForeignKey
ALTER TABLE "AccountingConnection" ADD CONSTRAINT "AccountingConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "xeroJournalId" TEXT;
