import { computeProgressBillAmount } from "@/lib/billing/contract-billing";
import { sumCommittedInvoiceSubtotals, sumRealizedInvoiceSubtotals, type InvoiceLifecycleStatus } from "@/lib/billing/realization";

export const choices = {
  spreadsheet: "Retain the spreadsheet",
  register: "Add a draft register",
  pilot: "Run a shadow pilot",
} as const;
export type Disposition = "issue" | "hold" | "void";
export const dispositionLabels: Record<Disposition, string> = {
  issue: "Issue draft",
  hold: "Hold for review",
  void: "Void draft",
};
export type CaseSelection = {
  progress: 40 | 50;
  treatment: Disposition | null;
  previous: Disposition | null;
  reviews: number;
  minutes: number;
  choice: keyof typeof choices | null;
  trial: "issued" | "voided";
};
export type Query = Record<string, string | string[] | undefined>;
export const contract = 60000;
export const draftAmount = 6000;
export const priorBill = { status: "SENT", subtotal: 18000 } as const;
export const defaults: CaseSelection = { progress: 40, treatment: null, previous: null, reviews: 20, minutes: 10, choice: null, trial: "issued" };
export const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const signoffs = [
  { through: "2026-07-24", progress: 40, record: "Design acceptance" },
  { through: "2026-07-31", progress: 50, record: "Handover acceptance" },
] as const;

function boundedInt(value: Query[string], min: number, max: number, fallback: number) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  const n = Number(value);
  return n >= min && n <= max ? n : fallback;
}

export function readSelection(query: Query): CaseSelection {
  const disposition = (value: Query[string]) => value === "issue" || value === "hold" || value === "void" ? value : null;
  const treatment = disposition(query.treatment);
  return {
    progress: query.progress === "50" ? 50 : 40,
    treatment,
    previous: treatment && query.previous !== treatment ? disposition(query.previous) : null,
    reviews: boundedInt(query.reviews, 1, 80, defaults.reviews),
    minutes: boundedInt(query.minutes, 0, 40, defaults.minutes),
    choice: query.choice === "spreadsheet" || query.choice === "register" || query.choice === "pilot" ? query.choice : null,
    trial: query.trial === "voided" ? "voided" : "issued",
  };
}

export function caseHref(path: string, selection: CaseSelection) {
  const query = new URLSearchParams();
  for (const key of Object.keys(defaults) as Array<keyof CaseSelection>) {
    const value = selection[key];
    if (value !== null && value !== defaults[key]) query.set(key, String(value));
  }
  return query.size ? path + "?" + query : path;
}

export function billingSnapshot(progress: CaseSelection["progress"], treatment: CaseSelection["treatment"]) {
  const invoices: { status: InvoiceLifecycleStatus; subtotal: number }[] = [priorBill];
  if (treatment !== "void") invoices.push({ status: treatment === "issue" ? "SENT" : "DRAFT", subtotal: draftAmount });
  const committed = sumCommittedInvoiceSubtotals(invoices);
  const issued = sumRealizedInvoiceSubtotals(invoices);
  const accepted = contract * progress / 100;
  const reserved = committed - issued;
  const available = computeProgressBillAmount(contract, committed, progress);
  return { accepted, issued, reserved, available };
}
