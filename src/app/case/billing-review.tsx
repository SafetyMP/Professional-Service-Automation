"use client";

import { useState } from "react";
import { computeProgressBillAmount } from "@/lib/billing/contract-billing";
import {
  sumCommittedInvoiceSubtotals,
  sumRealizedInvoiceSubtotals,
  type InvoiceLifecycleStatus,
} from "@/lib/billing/realization";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
});
const contract = 60000;
const pilotCost = 2400;
const hourlyRate = 75;
const priorBill = { status: "SENT", subtotal: 18000 } as const;
const outcomes = {
  keep: "Open draft D-042 reserves $6,000 for this engagement. The project accountant can send it for the accepted work or void it for correction.",
  issue: "D-042 has been sent. Its $6,000 moves from reserved to issued. The client’s payment is still unverified.",
  void: "D-042 has been voided. Its $6,000 reservation is released. Finance can prepare a replacement up to the available amount.",
} as const;

export function BillingReview() {
  const [progress, setProgress] = useState(40);
  const [treatment, setTreatment] = useState<keyof typeof outcomes>("keep");
  const [reviews, setReviews] = useState(20);
  const [minutes, setMinutes] = useState(10);

  const invoices: { status: InvoiceLifecycleStatus; subtotal: number }[] = [priorBill];
  if (treatment !== "void") {
    invoices.push({ status: treatment === "issue" ? "SENT" : "DRAFT", subtotal: 6000 });
  }
  const committed = sumCommittedInvoiceSubtotals(invoices);
  const issued = sumRealizedInvoiceSubtotals(invoices);
  const available = computeProgressBillAmount(contract, committed, progress);
  const annualHours = reviews * 12 * minutes / 60;
  const capacityValue = annualHours * hourlyRate;
  const netCapacity = capacityValue - pilotCost;
  const comparisonScale = Math.max(pilotCost, capacityValue);
  const accepted = contract * progress / 100;
  const reserved = committed - issued;
  const ledger = [
    { label: "Issued", amount: issued, color: "#48392c" },
    { label: "Reserved", amount: reserved, color: "#ac813e" },
    { label: "Available", amount: available, color: "#3b6c66" },
  ];
  const pilotValues = [
    { label: "Redeployable time", value: capacityValue, color: "#3b6c66" },
    { label: "First-year cost", value: pilotCost, color: "#ac813e" },
  ];

  return (
    <>
      <section aria-labelledby="engagement" className="rounded-b-2xl border border-[#d8d2c7] bg-white p-6 sm:p-10">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <div>
              <h2 id="engagement" className="text-2xl font-semibold">Warehouse redesign</h2>
              <p className="mt-1 text-[#655b50]">Fixed fee · $60,000 · Contract WD-14</p>
            </div>
            <label className="block font-medium" htmlFor="acceptance">Client acceptance record</label>
            <select id="acceptance" value={progress} onChange={(event) => setProgress(Number(event.target.value))}
              className="w-full rounded-md border border-[#958774] bg-white px-3 py-2">
              <option value={40}>40% · Design signed</option>
              <option value={50}>50% · Handover signed</option>
            </select>
            <fieldset>
              <legend className="mb-3 font-medium">Project accountant’s decision</legend>
              <figure className="mb-4 rounded-md border border-[#d8d2c7] px-3 py-3 text-center text-sm">
                <figcaption className="font-semibold">D-042 · {dollars.format(6000)} draft</figcaption>
                <div aria-hidden="true" className="mx-auto h-3 w-px bg-[#958774]" />
                <div aria-hidden="true" className="mx-auto h-2 w-1/2 border-x border-t border-[#958774]" />
                <div className="grid grid-cols-2 gap-2">
                  <span className={treatment === "issue" ? "rounded bg-[#48392c] px-1 py-1 text-white" : "rounded bg-[#f4f1e9] px-1 py-1"}>Issue · bill client</span>
                  <span className={treatment === "void" ? "rounded bg-[#48392c] px-1 py-1 text-white" : "rounded bg-[#f4f1e9] px-1 py-1"}>Void · release hold</span>
                </div>
              </figure>
              {treatment === "keep" ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTreatment("issue")}
                    className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a480d] bg-[#70501e] px-4 py-2 font-semibold text-white">Issue draft</button>
                  <button type="button" onClick={() => setTreatment("void")}
                    className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a480d] border border-[#958774] px-4 py-2 font-semibold">Void draft</button>
                </div>
              ) : (
                <button type="button" onClick={() => setTreatment("keep")}
                  className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6a480d] border border-[#958774] px-4 py-2 font-semibold">Restart with the open draft</button>
              )}
            </fieldset>
            <p className="text-[#534b41]" aria-live="polite">{outcomes[treatment]}</p>
          </div>
          <div className="rounded-xl border-t-2 border-[#a67a36] bg-[#f4f1e9] p-5 sm:p-6" aria-live="polite">
            <p className="text-sm font-semibold text-[#655b50]">Available for a new draft</p>
            <output aria-label="Available for a new draft" className="mt-1 block text-5xl font-semibold tracking-tight text-[#5e4116] tabular-nums">{dollars.format(available)}</output>
            <figure className="mt-6">
              <figcaption className="mb-2 flex flex-wrap justify-between gap-2 text-sm font-semibold">
                <span>Accepted value ({progress}%)</span><span>{dollars.format(accepted)}</span>
              </figcaption>
              <div aria-hidden="true" className="flex h-6 overflow-hidden rounded-sm">
                {ledger.map(({ label, amount, color }) => (
                  <div key={label} style={{ width: `${amount / accepted * 100}%`, backgroundColor: color }} />
                ))}
              </div>
              <dl className="mt-2 divide-y divide-[#ddd5c8] text-sm tabular-nums">
                {ledger.map(({ label, amount, color }) => (
                  <div key={label} className="flex justify-between gap-4 py-2">
                    <dt className="flex items-center gap-2"><span aria-hidden="true" className="size-3 rounded-sm" style={{ backgroundColor: color }} />{label}</dt>
                    <dd>{dollars.format(amount)}</dd>
                  </div>
                ))}
              </dl>
            </figure>
            <p className="mt-4 border-t border-[#cec4b3] pt-3 text-sm text-[#534b41]">Subtract issued and reserved amounts from the accepted contract value. A new draft requires a positive balance.</p>
          </div>
        </div>
      </section>

      <section className="mt-9 space-y-5" aria-labelledby="pilot">
        <h2 id="pilot" className="text-2xl font-semibold">Would a billing pilot pay for the review time?</h2>
        <p className="max-w-3xl">The finance partner can retain the spreadsheet, add a draft register to the accounting system, or trial the kernel alongside billing. For two closes, the delivery manager supplies each signed acceptance. The project accountant reconciles draft and issued amounts, times each review, and records corrections. The partner compares the three approaches on the same engagements.</p>
        <div className="grid gap-6 rounded-xl border bg-white p-6 md:grid-cols-2">
          <div className="space-y-5">
            <label htmlFor="reviews" className="block font-medium">Monthly reviews <span className="float-right tabular-nums">{reviews}</span>
              <input id="reviews" className="mt-2 block w-full accent-[#76551b]" type="range" min="1" max="80" value={reviews} onChange={(e) => setReviews(Number(e.target.value))} />
            </label>
            <label htmlFor="minutes" className="block font-medium">Minutes saved per review <span className="float-right tabular-nums">{minutes}</span>
              <input id="minutes" className="mt-2 block w-full accent-[#76551b]" type="range" min="0" max="40" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
            </label>
          </div>
          <div className="border-t pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6" aria-live="polite">
            <p className="text-sm font-semibold">First-year value of staff time after cost</p>
            <output aria-label="First-year net capacity value" className="mt-1 block text-3xl font-semibold tabular-nums">{dollars.format(netCapacity)}</output>
            <figure className="mt-4 space-y-3">
              <figcaption className="sr-only">Annual capacity compared with pilot cost at the same scale</figcaption>
              {pilotValues.map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between gap-3 text-sm"><span>{label}</span><span>{dollars.format(value)}</span></div>
                  <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-[#ebe6da]">
                    <div className="h-full" style={{ width: `${value / comparisonScale * 100}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </figure>
            <p className="mt-3 text-sm">{annualHours.toLocaleString("en-US", { maximumFractionDigits: 1 })} staff hours over 12 closes at $75/hour, less $2,400 for setup, training and support. Break-even requires {(pilotCost * 60 / (hourlyRate * 12 * reviews)).toLocaleString("en-US", { maximumFractionDigits: 1 })} minutes saved per review.</p>
          </div>
        </div>
        <p className="max-w-3xl text-[#534b41]">These are planning assumptions. The finance partner should count time the firm can redeploy, including time spent on corrections. Fund the pilot only if every billing difference is explained, duplicate bills stay at zero, and measured time savings cover the cost.</p>
      </section>
    </>
  );
}
