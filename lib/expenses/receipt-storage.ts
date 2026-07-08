import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export type ReceiptMimeType = (typeof ALLOWED_RECEIPT_MIME_TYPES)[number];

export function validateReceiptUpload(file: { size: number; type: string }): void {
  if (file.size <= 0) {
    throw new Error("Receipt file is empty");
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Receipt must be 5 MB or smaller");
  }
  if (!ALLOWED_RECEIPT_MIME_TYPES.includes(file.type as ReceiptMimeType)) {
    throw new Error("Receipt must be JPG, PNG, WebP, or PDF");
  }
}

export function receiptExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export function getReceiptsRoot(): string {
  return process.env.EXPENSE_RECEIPTS_DIR ?? path.join(process.cwd(), "var", "expense-receipts");
}

export function getReceiptRelativePath(
  organizationId: string,
  expenseId: string,
  fileName: string,
): string {
  return path.join(organizationId, expenseId, fileName);
}

export function getReceiptAbsolutePath(relativePath: string): string {
  return path.join(getReceiptsRoot(), relativePath);
}

export async function saveExpenseReceipt(params: {
  organizationId: string;
  expenseId: string;
  file: File;
}): Promise<{ fileName: string; mimeType: string; size: number; relativePath: string }> {
  validateReceiptUpload({ size: params.file.size, type: params.file.type });

  const fileName = `receipt.${receiptExtension(params.file.type)}`;
  const relativePath = getReceiptRelativePath(params.organizationId, params.expenseId, fileName);
  const absolutePath = getReceiptAbsolutePath(relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  const buffer = Buffer.from(await params.file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return {
    fileName,
    mimeType: params.file.type,
    size: params.file.size,
    relativePath,
  };
}
