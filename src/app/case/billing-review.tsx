"use client";

import { CaseLink, useCaseState } from "./case-state";
import { billingSnapshot, choices, dollars, priorBill, type CaseSelection } from "./selection";

const pilotCost = 2400;
const hourlyRate = 75;
const outcomes = {
  hold: "D-042 stays open while finance confirms the purchase order with the delivery manager. Its $6,000 remains reserved.",
  issue: "D-042 was sent with PO-418. The signed engagement names PO-481. Finance must follow up on the reference before assuming the client will accept the invoice.",
  void: "D-042 was voided before issue. Its $6,000 reservation is released. Finance can prepare a replacement against PO-481.",
} as const;

export function BillingReview() {
  const { selection, update } = useCaseState();
  const { progress, treatment, reviews, minutes, choice } = selection;
  const { accepted, issued, reserved, available } = billingSnapshot(progress, treatment);
  const annualHours = reviews * 12 * minutes / 60;
  const capacityValue = annualHours * hourlyRate;
  const netCapacity = capacityValue - pilotCost;
  const comparisonScale = Math.max(pilotCost, capacityValue);
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
      <section id="docket" aria-labelledby="engagement" className="rounded-b-2xl border border-[#d8d2c7] bg-white p-6 sm:p-10">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5">
            <div>
              <h2 id="engagement" className="text-2xl font-semibold">Warehouse redesign</h2>
              <p className="mt-1 text-[#655b50]">Fixed fee · $60,000 · Contract WD-14</p>
            </div>
            <label className="block font-medium" htmlFor="acceptance">Client acceptance record</label>
            <select id="acceptance" value={progress} onChange={(event) => update({ progress: event.target.value === "50" ? 50 : 40 })}
              className="w-full rounded-md border border-[#958774] bg-white px-3 py-2">
              <option value={40}>40% · Design signed July 24</option>
              <option value={50}>50% · Handover signed July 31</option>
            </select>
          </div>
          <div className="md:col-start-2 md:row-start-1 md:row-span-2 rounded-xl border-t-2 border-[#a67a36] bg-[#f4f1e9] p-5 sm:p-6" aria-live="polite">
            {treatment === null ? (
              <>
                <h3 className="text-xl font-semibold">Invoice register</h3>
                <p className="mt-1 text-sm text-[#655b50]">Friday, before the billing run · Contract WD-14</p>
                <dl className="mt-4 divide-y divide-[#d5c9b6] text-sm">
                  <div className="flex justify-between gap-3 py-3"><dt>I-031 · Issued previously<br /><span className="text-[#655b50]">Client reference PO-481</span></dt><dd className="font-semibold tabular-nums">{dollars.format(priorBill.subtotal)}</dd></div>
                  <div className="flex justify-between gap-3 py-3"><dt>D-042 · Ready for review<br /><span className="text-[#655b50]">Client reference PO-418</span></dt><dd className="font-semibold tabular-nums">{dollars.format(6000)}</dd></div>
                </dl>
                <p className="mt-3 border-t border-[#cec4b3] pt-3 text-sm">The signed order identifies the reference the client expects on every invoice. No payment receipts are attached to this register.</p>
              </>
            ) : (
              <>
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
                <p className="mt-3 text-sm"><strong>Cash received</strong> · Unverified. A bank receipt matched to an invoice would establish collection.</p>
              </>
            )}
          </div>
          <div className="space-y-3 md:col-start-1 md:row-start-2">
            <fieldset id="prebill">
              <legend className="mb-3 font-medium">Project accountant’s decision</legend>
              {treatment === null ? (
                <>
                  <p className="mb-3 text-[#534b41]">Compare the client’s signed purchase order with the draft register. What should finance do with D-042?</p>
                  <div aria-hidden="true" className="mx-auto w-2/3 border-t border-[#958774]" />
                  <div className="grid grid-cols-3 gap-2 [&>button]:border-t-2 [&>button]:border-t-[#ac813e]">
                    <button type="button" onClick={() => update({ treatment: "issue" })}
                      className="rounded-md border border-[#958774] bg-[#fcfaf5] px-2 py-2 text-sm font-semibold">Issue draft</button>
                    <button type="button" onClick={() => update({ treatment: "hold" })}
                      className="rounded-md border border-[#958774] bg-[#fcfaf5] px-2 py-2 text-sm font-semibold">Hold for review</button>
                    <button type="button" onClick={() => update({ treatment: "void" })}
                      className="rounded-md border border-[#958774] bg-[#fcfaf5] px-2 py-2 text-sm font-semibold">Void draft</button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => update({ treatment: null })}
                  className="rounded-md border border-[#958774] px-4 py-2 font-semibold">Restart with the open draft</button>
              )}
            </fieldset>
            {treatment !== null && (
              <figure className="border-l-4 border-[#a67a36] pl-3" aria-live="polite">
                <figcaption className="text-sm font-semibold">D-042 · Open draft → {treatment === "issue" ? "Issued" : treatment === "hold" ? "Held for review" : "Voided"}</figcaption>
                <p className="mt-1 text-[#534b41]">{outcomes[treatment]}</p>
              </figure>
            )}
          </div>
        </div>
      </section>

      <p className="mt-4 text-sm"><CaseLink className="font-semibold text-[#6c4b12] underline" path="/case/technical" anchor="#selected">Trace the selected acceptance and invoice through billing</CaseLink></p>

      <section className="mt-9 space-y-5" aria-labelledby="pilot">
        <h2 id="pilot" className="text-2xl font-semibold">Would a billing pilot pay for the review time?</h2>
        <p className="max-w-3xl">The finance partner can retain the spreadsheet, add a draft register to the accounting system, or trial the kernel alongside billing. For two closes, the delivery manager supplies each signed acceptance. The project accountant reconciles draft and issued amounts, times each review, and records corrections. The partner compares the three approaches on the same engagements.</p>
        <div className="grid gap-6 rounded-xl border bg-white p-6 md:grid-cols-2">
          <div className="space-y-5">
            <label htmlFor="reviews" className="block font-medium">Monthly reviews <span className="float-right tabular-nums">{reviews}</span>
              <input id="reviews" className="mt-2 block w-full accent-[#76551b]" type="range" min="1" max="80" value={reviews} onChange={(e) => update({ reviews: Number(e.target.value) })} />
            </label>
            <label htmlFor="minutes" className="block font-medium">Minutes saved per review <span className="float-right tabular-nums">{minutes}</span>
              <input id="minutes" className="mt-2 block w-full accent-[#76551b]" type="range" min="0" max="40" value={minutes} onChange={(e) => update({ minutes: Number(e.target.value) })} />
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
        <fieldset className="rounded-xl border border-[#d8d2c7] bg-white p-5">
          <legend className="px-2 font-semibold">Which next step would you fund?</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(choices) as Array<keyof typeof choices>).map((key) => (
              <button key={key} type="button" aria-pressed={choice === key} onClick={() => update({ choice: key })}
                className="rounded-md border border-[#958774] px-3 py-2 text-sm font-semibold aria-pressed:bg-[#48392c] aria-pressed:text-white">{choices[key]}</button>
            ))}
          </div>
          {choice && <p role="status" className="mt-3">{investmentAdvice(choice, netCapacity)}</p>}
        </fieldset>
      </section>
    </>
  );
}


function investmentAdvice(choice: NonNullable<CaseSelection["choice"]>, net: number) {
  if (choice === "spreadsheet") return "Measure two closes with the current workbook. Track reviewer minutes, missed references and reopened drafts. Assign a reviewer to every discrepancy.";
  if (choice === "register") return "Price a register in the existing accounting system. Time how long the accountant takes to reconcile the same signed orders and reservations, including corrections.";
  return `At the selected assumptions, first-year capacity after cost is ${dollars.format(net)}. ${net > 0 ? "Shadow two closes and confirm the team can redeploy the hours." : "Recheck review volume, time saved and setup cost before spending."} Keep invoice issue with the accountant and investigate each disagreement.`;
}
