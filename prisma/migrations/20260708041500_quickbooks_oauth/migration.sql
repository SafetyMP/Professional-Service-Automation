-- AlterEnum
ALTER TYPE "AccountingProvider" ADD VALUE 'QUICKBOOKS';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "quickbooksJournalId" TEXT;
