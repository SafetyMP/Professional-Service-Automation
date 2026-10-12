-- Invoice numbers are a per-firm sequence. Counting live rows reissues a
-- number after a draft is deleted.
ALTER TABLE "Organization" ADD COLUMN "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 0;

UPDATE "Organization" o
SET "nextInvoiceNumber" = COALESCE((
  SELECT MAX(CAST(substring(i."invoiceNumber" FROM 5) AS INTEGER))
  FROM "Invoice" i
  WHERE i."organizationId" = o.id
    AND i."invoiceNumber" ~ '^INV-[0-9]+$'
), 0);
