"use client";

import { CaseLink, useCaseState } from "./case-state";
import { PilotWorksheet } from "./pilot-worksheet";
import { billingSnapshot, dispositionLabels, dollars, signoffs, type CaseSelection, type Disposition } from "./selection";

const linkStyle = "font-semibold text-[#674914] underline underline-offset-4";
const outcomes = {
  issue: {
    team: "Finance records D-042 as issued. The delivery manager now needs to reconcile PO-418 on that bill with PO-481 on the order. Its $6,000 can’t be used for another draft.",
    client: "If finance sends this version, the payables clerk sees PO-418. They may need the buyer to identify the order before routing the charge.",
  },
  hold: {
    team: "The accountant keeps D-042 open and asks the delivery manager to confirm the purchase order with the buyer. The draft still reserves $6,000 while the team waits.",
    client: "There is no new bill for payables to process. The buyer can confirm the reference before an invoice reaches the payment queue.",
  },
  void: {
    team: "Finance removes D-042 from the active register. Its $6,000 is available again. The accountant must prepare and review a replacement to bill that work.",
    client: "Payables has no new invoice to match. A replacement can carry the confirmed reference, but the client must wait for finance to prepare and send it.",
  },
} as const;

const ledgerKeys = [
  ["issued", "Issued", "#49392b"],
  ["reserved", "Reserved", "#a07937"],
  ["available", "Available", "#316c65"],
] as const;

function LedgerRow({ label, progress, disposition }: { label: string; progress: CaseSelection["progress"]; disposition: Disposition | null }) {
  const ledger = billingSnapshot(progress, disposition);
  return <div className="space-y-2">
    <h4 className="text-sm font-semibold">{label}</h4>
    <div aria-hidden="true" className="flex h-4 overflow-hidden rounded-sm bg-[#ece7dc]">
      {ledgerKeys.map(([key, , color]) => <span key={key} style={{ width: `${100 * ledger[key] / ledger.accepted}%`, backgroundColor: color }} />)}
    </div>
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
      {ledgerKeys.map(([key, caption, color]) => <div key={key} className="flex items-baseline gap-1">
        <dt><span aria-hidden="true" className="mr-1 inline-block size-2 rounded-sm" style={{ backgroundColor: color }} />{caption}</dt>
        <dd className="font-semibold">{dollars.format(ledger[key])}</dd>
      </div>)}
    </dl>
  </div>;
}

export function BillingReview() {
  const { selection, update } = useCaseState();
  const { progress, treatment, previous } = selection;
  const signoff = signoffs.find((item) => item.progress === progress) ?? signoffs[0];
  const date = progress === 40 ? "July 24" : "July 31";
  const ledger = billingSnapshot(progress, treatment);
  function decide(next: Disposition) {
    if (next !== treatment) update({ treatment: next, previous: treatment });
  }

  return <>
    <section id="docket" aria-labelledby="engagement" className="mt-9">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#72531e]">Warehouse redesign · WD-14</p>
          <h2 id="engagement" className="mt-1 font-serif text-3xl">The project file</h2>
        </div>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          <span>Client acceptance record</span>
          <select className="rounded-md border border-[#978b77] bg-white p-2" value={progress}
            onChange={(event) => update({ progress: event.target.value === "50" ? 50 : 40, treatment: null, previous: null })}>
            <option value={40}>Friday, July 24</option><option value={50}>Friday, July 31</option>
          </select>
        </label>
      </div>
      <p className="mt-2">These are the records on the accountant’s desk on {date}. Open a record for its source.</p>
      <details className="my-3 text-sm">
        <summary className="w-fit cursor-pointer font-semibold text-[#674914] underline underline-offset-4">How to read these records</summary>
        <p className="mt-2 max-w-3xl leading-relaxed">Start with the order. Which number does the client use to identify this purchase? Next, find the latest share the client signed. Finally, compare the reference on each invoice and check which dollars the team has already billed or set aside.</p>
      </details>
      <div className="grid items-start gap-3 md:grid-cols-3">
        <details className="rounded-md border border-[#d0c6b5] border-t-2 border-t-[#9b773c] bg-[#fffdf7] p-4">
          <summary className="cursor-pointer font-semibold">Signed client order</summary>
          <p className="mt-3 text-sm">The client’s buyer authorizes $60,000 under contract WD-14. The order says to quote <strong>PO-481</strong> on each invoice so payables can match the charge.</p>
        </details>
        <details className="rounded-md border border-[#d0c6b5] border-t-2 border-t-[#9b773c] bg-[#fffdf7] p-4">
          <summary className="cursor-pointer font-semibold">{signoff.record}</summary>
          <p className="mt-3 text-sm">On {date}, the client’s warehouse lead signed for <strong>{progress}% of the whole engagement</strong>{progress === 50 ? ", including the design already accepted on July 24" : ", covering the design stage"}. The delivery manager filed the sign-off.</p>
        </details>
        <details className="rounded-md border border-[#d0c6b5] border-t-2 border-t-[#9b773c] bg-[#fffdf7] p-4">
          <summary className="cursor-pointer font-semibold">Invoice register</summary>
          <dl className="mt-2 divide-y divide-[#ded5c4] text-sm">
            <div className="py-2"><dt className="font-semibold">I-031 · $18,000 issued</dt><dd>Client reference PO-481</dd></div>
            <div className="pt-2"><dt className="font-semibold">D-042 · $6,000 draft</dt><dd>Client reference PO-418</dd></div>
          </dl>
        </details>
      </div>
      <div className="my-5 border-l-2 border-[#87734e] pl-4 text-sm leading-relaxed">
        <h3 className="font-semibold">How PSA reconciles this file</h3>
        <p className="mt-1 max-w-3xl">The billing code takes the fixed fee times the signed share, then subtracts issued invoices and money reserved by open drafts. That tells finance how much room is left for another bill. The team still has to verify the sign-off, check the client reference and authorize the invoice.</p>
      </div>
    </section>
    <fieldset id="prebill" className="rounded-xl border border-[#c9bdab] bg-[#fffdf7] p-5 sm:p-6">
      <legend className="px-2 font-serif text-2xl">What should finance do with D-042?</legend>
      <p className="text-sm">For this simulated Friday run, you can finalize the $6,000 draft (issue), leave it open (hold), or cancel it (void).</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(dispositionLabels) as Disposition[]).map((value) => <button key={value} type="button" aria-pressed={treatment === value} onClick={() => decide(value)}
          className="min-h-11 rounded-md border border-[#8b7b64] bg-white px-4 py-2 text-sm font-semibold aria-pressed:border-[#433528] aria-pressed:bg-[#433528] aria-pressed:text-white">{dispositionLabels[value]}</button>)}
      </div>
      {treatment && <div className="mt-6 border-t border-[#d9d0bf] pt-5" aria-live="polite">
        <div className="grid items-start gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div><h3 className="font-semibold">Delivery team</h3><p className="mt-1 text-sm leading-relaxed">{outcomes[treatment].team}</p></div>
            <div><h3 className="font-semibold">Client accounts payable</h3><p className="mt-1 text-sm leading-relaxed">{outcomes[treatment].client}</p></div>
            <p className="text-sm"><strong>Cash received</strong> · Unknown. The file contains no payment receipt.</p>
          </div>
          <figure className="space-y-4 rounded-md bg-[#f2eee5] p-4">
            <figcaption className="font-semibold">Where the accepted fee sits</figcaption>
            <p className="text-sm">{date} · {progress}% signed · {dollars.format(ledger.accepted)} total in each bar</p>
            <LedgerRow label={previous ? "Previous choice · " + dispositionLabels[previous] : "Before the decision"} progress={progress} disposition={previous} />
            <LedgerRow label={"Your choice · " + dispositionLabels[treatment]} progress={progress} disposition={treatment} />
            <p className="border-t border-[#d2c8b7] pt-3 text-sm">Available for a new draft <output aria-label="Available for a new draft" className="ml-1 font-semibold">{dollars.format(ledger.available)}</output></p>
          </figure>
        </div>
        <p className="mt-5 text-sm font-semibold">Try another choice above. Each starts with the same open draft, date and signed progress.</p>
        <button type="button" onClick={() => update({ treatment: null, previous: null })} className="mt-2 cursor-pointer text-sm text-[#674914] underline underline-offset-4">Back to the open draft</button>
      </div>}
    </fieldset>
    <p className="mt-4"><CaseLink className={linkStyle} path="/case/technical" anchor="#selected">Trace this file through the billing code</CaseLink></p>
    <PilotWorksheet />
  </>;
}
