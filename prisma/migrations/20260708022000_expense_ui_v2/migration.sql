-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ExpenseEntry" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "ExpenseEntry" ADD COLUMN "receiptFileName" TEXT;
ALTER TABLE "ExpenseEntry" ADD COLUMN "receiptMimeType" TEXT;
ALTER TABLE "ExpenseEntry" ADD COLUMN "receiptSize" INTEGER;

-- CreateIndex
CREATE INDEX "ExpenseCategory_organizationId_idx" ON "ExpenseCategory"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_organizationId_name_key" ON "ExpenseCategory"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ExpenseEntry_organizationId_categoryId_idx" ON "ExpenseEntry"("organizationId", "categoryId");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseEntry" ADD CONSTRAINT "ExpenseEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
