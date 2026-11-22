// Regenerate or verify the illustrative Friday-close reference runs using the application kernel.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { computeProgressBillAmount } from "../lib/billing/contract-billing";
import { sumCommittedInvoiceSubtotals, sumRealizedInvoiceSubtotals, type InvoiceLifecycleStatus } from "../lib/billing/realization";

const destination = fileURLToPath(new URL("../src/app/case/technical/trials.json", import.meta.url));
const trials = (["issued", "voided"] as const).map((trial) => {
  const invoices: { status: InvoiceLifecycleStatus; subtotal: number }[] = [{ status: "SENT", subtotal: 18000 }];
  if (trial === "issued") invoices.push({ status: "SENT", subtotal: 6000 });
  const committed = sumCommittedInvoiceSubtotals(invoices);
  const issued = sumRealizedInvoiceSubtotals(invoices);
  return {
    trial, contract: "WD-14", cutoff: "2026-07-31", percent: 50,
    draft: "D-042", amount: 6000, contractSubtotal: 60000, priorIssued: 18000,
    accepted: 30000, issued, reserved: committed - issued,
    available: computeProgressBillAmount(60000, committed, 50),
  };
});
const serialized = JSON.stringify(trials, null, 2) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(destination, "utf8") !== serialized) throw new Error("Recorded billing trials differ from the kernel output");
  console.log("WD-14 recorded issue and void trials match the billing kernel");
} else {
  writeFileSync(destination, serialized);
}
