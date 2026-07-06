import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  status: string;
  orgName: string;
  projectName: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  subtotal: number;
  lines: Array<{
    description: string;
    quantity: number;
    unitRate: number;
    amount: number;
  }>;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export async function buildInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  let y = 742;

  page.drawText("INVOICE", { x: margin, y, size: 22, font: bold });
  page.drawText(data.invoiceNumber, {
    x: margin,
    y: y - 22,
    size: 11,
    font: regular,
    color: rgb(0.45, 0.45, 0.45),
  });

  const orgLines = [data.orgName, data.projectName].filter(Boolean);
  let orgY = y;
  for (const line of orgLines) {
    page.drawText(line, {
      x: 400,
      y: orgY,
      size: 11,
      font: orgY === y ? bold : regular,
    });
    orgY -= 14;
  }

  y -= 56;
  page.drawText("BILL TO", {
    x: margin,
    y,
    size: 9,
    font: bold,
    color: rgb(0.45, 0.45, 0.45),
  });
  y -= 16;
  page.drawText(data.clientName, { x: margin, y, size: 12, font: bold });
  y -= 14;
  if (data.clientEmail) {
    page.drawText(data.clientEmail, { x: margin, y, size: 10, font: regular });
    y -= 14;
  }
  if (data.clientPhone) {
    page.drawText(data.clientPhone, { x: margin, y, size: 10, font: regular });
    y -= 14;
  }

  const metaX = 400;
  let metaY = y + (data.clientEmail ? 28 : 14) + (data.clientPhone ? 14 : 0);
  const metaRows = [
    ["Issue Date", formatDate(data.issueDate)],
    ["Due Date", formatDate(data.dueDate)],
    ["Status", data.status],
  ];
  for (const [label, value] of metaRows) {
    page.drawText(`${label}: ${value}`, { x: metaX, y: metaY, size: 10, font: regular });
    metaY -= 14;
  }

  y -= 24;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 562, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 18;

  const columns = [
    { label: "Description", x: margin, width: 260 },
    { label: "Qty", x: 330, width: 50 },
    { label: "Rate", x: 390, width: 70 },
    { label: "Amount", x: 470, width: 92 },
  ];

  for (const column of columns) {
    page.drawText(column.label, { x: column.x, y, size: 9, font: bold });
  }
  y -= 10;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 562, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 16;

  for (const line of data.lines) {
    page.drawText(truncate(line.description, 48), {
      x: columns[0].x,
      y,
      size: 10,
      font: regular,
    });
    page.drawText(line.quantity.toFixed(2), {
      x: columns[1].x,
      y,
      size: 10,
      font: regular,
    });
    page.drawText(`$${formatCurrency(line.unitRate)}`, {
      x: columns[2].x,
      y,
      size: 10,
      font: regular,
    });
    page.drawText(`$${formatCurrency(line.amount)}`, {
      x: columns[3].x,
      y,
      size: 10,
      font: regular,
    });
    y -= 18;
    if (y < 120) break;
  }

  y -= 8;
  page.drawLine({
    start: { x: margin, y },
    end: { x: 562, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });
  y -= 20;
  page.drawText("Total Due", {
    x: 390,
    y,
    size: 11,
    font: bold,
  });
  page.drawText(`$${formatCurrency(data.subtotal)}`, {
    x: 470,
    y,
    size: 13,
    font: bold,
  });

  y -= 36;
  page.drawText("Payment due within 30 days of issue. Thank you for your business.", {
    x: margin,
    y,
    size: 9,
    font: regular,
    color: rgb(0.45, 0.45, 0.45),
  });

  return doc.save();
}
