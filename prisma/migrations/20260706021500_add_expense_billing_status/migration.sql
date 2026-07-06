-- AlterTable
ALTER TABLE "ExpenseEntry" ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'UNBILLED';

-- AlterTable
ALTER TABLE "InvoiceLine" ADD COLUMN "expenseEntryId" TEXT;

-- CreateIndex
CREATE INDEX "ExpenseEntry_organizationId_status_billingStatus_idx" ON "ExpenseEntry"("organizationId", "status", "billingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceLine_expenseEntryId_key" ON "InvoiceLine"("expenseEntryId");

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_expenseEntryId_fkey" FOREIGN KEY ("expenseEntryId") REFERENCES "ExpenseEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
