"use client";

import { useState, type ReactNode } from "react";
import { CaseLink, useCaseState } from "../case-state";
import { billingSnapshot, contract, dispositionLabels, dollars, draftAmount, priorBill, signoffs } from "../selection";
import trials from "./trials.json";

const repository = "https://github.com/SafetyMP/Professional-Service-Automation/blob/afaf97f59dd88c840d5b9c8fff7ffaf2710beca1/";
const link = "font-medium text-[#6c4b12] underline underline-offset-4";
const control = "rounded-md border border-[#958774] bg-white px-3 py-2 text-sm font-semibold text-[#34291f] aria-pressed:border-[#48392c] aria-pressed:bg-[#48392c] aria-pressed:text-white";
const details = "rounded-lg border border-[#d8d2c7] bg-white px-4 py-3 text-sm";
const stages = ["Read the records", "Count commitments", "Apply the decision"] as const;
const dispositions = {
  issue: {
    effect: "The simulated register moves D-042 to SENT. The $6,000 moves from reserved to issued.",
    stored: "The issue transaction sets the stored invoice to SENT and writes an audit entry. The client still needs to match the invoice to its purchase order. Finance needs a receipt to establish payment.",
    source: "lib/billing/service.ts#L614-L639",
    label: "Issue transaction and audit entry",
  },
  void: {
    effect: "The simulated register removes D-042. Its $6,000 is available for a new draft.",
    stored: "The void transaction deletes the open draft. Its invoice number is never reused. Finance has to prepare a replacement and confirm the client reference before issuing it.",
    source: "lib/billing/service.ts#L641-L650",
    label: "Void transaction and invoice numbering",
  },
  hold: {
    effect: "D-042 stays DRAFT. Its $6,000 remains reserved while the team checks the reference.",
    stored: "Holding means leaving the draft open. The next billing calculation still picks it up. The delivery manager and project accountant decide when the client reference has been confirmed.",
    source: "lib/billing/service.ts#L400-L419",
    label: "How the next draft sees the reservation",
  },
} as const;
const ledgerRows = [
  ["Accepted contract value", "accepted"],
  ["Issued", "issued"],
  ["Reserved on D-042", "reserved"],
  ["Available for a new draft", "available"],
] as const;

function Source({ path, children }: { path: string; children: ReactNode }) {
  return <a className={link} href={repository + path}>{children}</a>;
}

export function SelectedTrace() {
  const { selection, update } = useCaseState();
  const { progress, treatment, trial } = selection;
  const [stage, setStage] = useState<typeof stages[number]>(stages[0]);
  const signoff = progress === 50 ? signoffs[1] : signoffs[0];
  const current = billingSnapshot(progress, treatment);
  const selected = treatment && dispositions[treatment];
  const run = trials.find((item) => item.trial === trial) ?? trials[0];
  const links = "flex flex-wrap gap-x-4 gap-y-2 text-sm";

  return (
    <div className="space-y-4 pb-10">
      <section id="selected" aria-label="Selected billing trace" className="rounded-b-xl border border-[#d8d2c7] bg-white p-5 sm:p-7">
        <p className="font-semibold">WD-14 · Draft D-042</p>
        <p className="mt-1 text-sm text-[#655b50]">{signoff.record} · {signoff.through} · {progress}% accepted · {treatment ? dispositionLabels[treatment] : "Awaiting your decision"}</p>
        <div role="group" aria-label="Trace steps" className="my-5 flex flex-wrap gap-2">
          {stages.map((name) => (
            <button type="button" key={name} className={control} aria-pressed={name === stage} aria-controls="trace-panel" onClick={() => setStage(name)}>{name}</button>
          ))}
        </div>
        <div id="trace-panel" aria-live="polite" className="space-y-3 border-l-4 border-[#ae8238] bg-[#f7f4ed] p-4">
          {stage === "Read the records" && (
            <>
              <h2 className="text-xl font-semibold">Project and invoice records</h2>
              <p>The delivery manager supplies the signed {progress}% acceptance for the {dollars.format(contract)} contract. Finance has {dollars.format(priorBill.subtotal)} issued on I-031 and the {dollars.format(draftAmount)} draft D-042.</p>
              <p>In the connected workspace an administrator enters the progress percentage. The billing service loads that organization’s project, client and invoice subtotals. The accountant checks the signed document and purchase order outside the calculation.</p>
              <div className={links}>
                <Source path="src/app/actions.ts#L186-L202">Progress entry</Source>
                <Source path="lib/billing/service.ts#L389-L419">Project and invoice lookup</Source>
              </div>
            </>
          )}
          {stage === "Count commitments" && (
            <>
              <h2 className="text-xl font-semibold">How much has the project committed?</h2>
              <p>{progress}% of {dollars.format(contract)} gives {dollars.format(current.accepted)} of accepted work. The kernel counts SENT and PAID subtotals as issued. Each open DRAFT reserves part of the accepted value. The kernel deducts that reservation when it prices another draft.</p>
              <p className="rounded bg-white px-3 py-2 text-sm"><strong>{selected ? "With your decision" : "Before a decision"}</strong> · {dollars.format(current.issued)} issued + {dollars.format(current.reserved)} reserved = {dollars.format(current.issued + current.reserved)} committed.</p>
              <div className={links}>
                <Source path="lib/billing/realization.ts#L30-L49">Invoice status totals</Source>
                <Source path="lib/billing/contract-billing.ts#L5-L19">Progress billing formula</Source>
              </div>
            </>
          )}
          {stage === "Apply the decision" && (
            <>
              <h2 className="text-xl font-semibold">What the decision writes</h2>
              {selected ? (
                <>
                  <p><strong>In this demo.</strong> {selected.effect}</p>
                  <p className="rounded bg-white px-3 py-2 text-sm">{dollars.format(current.accepted)} accepted − {dollars.format(current.issued)} issued − {dollars.format(current.reserved)} reserved = <output aria-label="Available for a new draft" className="font-semibold">{dollars.format(current.available)}</output> available for a new draft.</p>
                  <p><strong>In the connected workspace.</strong> {selected.stored}</p>
                  <div className={links}>
                    <Source path={selected.source}>{selected.label}</Source>
                    <Source path="src/app/actions.ts#L235-L247">Administrator permissions</Source>
                  </div>
                </>
              ) : (
                <>
                  <p>D-042 is open. The accountant decides what to do with it after reviewing the client’s sign-off and invoice reference.</p>
                  <p><CaseLink className={link} path="/case" anchor="#prebill">Choose a disposition in the case</CaseLink></p>
                  <p className="text-sm"><Source path="src/app/actions.ts#L235-L247">Connected invoice actions</Source></p>
                </>
              )}
            </>
          )}
        </div>
        <p className="mt-4 text-sm text-[#655b50]">This browser runs the billing calculations on example records. Database changes require the signed-in workspace. Client receipt, approval and payment are outside this simulation.</p>
      </section>

      <details className={details}>
        <summary className="cursor-pointer font-semibold">Change evidence date</summary>
        <div className="mt-3 space-y-2">
          <label className="block font-medium" htmlFor="cutoff">Evidence available through</label>
          <select id="cutoff" value={signoff.through} onChange={(event) => update({ progress: event.target.value === signoffs[1].through ? 50 : 40, treatment: null, previous: null })}
            className="max-w-full rounded border border-[#958774] bg-white p-2">
            {signoffs.map((row) => <option key={row.through} value={row.through}>{row.through} · {row.record}</option>)}
          </select>
          <p>Changing the date reopens the case with that day’s signed evidence and an undecided draft.</p>
        </div>
      </details>

      {selected && (
        <details className={details}>
          <summary className="cursor-pointer font-semibold">Compare recorded runs</summary>
          <div className="mt-3 space-y-3">
            <p>The recorded runs use the July 31 handover, 50% accepted. Switch the recorded action to compare it with your selection.</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Recorded trial">
              {trials.map((record) => <button type="button" key={record.trial} aria-pressed={trial === record.trial}
                onClick={() => update({ trial: record.trial === "voided" ? "voided" : "issued" })}
                className={control}>{record.trial === "issued" ? "Trial A · Issue" : "Trial B · Void"}</button>)}
            </div>
            <table className="w-full border-collapse text-sm tabular-nums">
              <caption className="mb-2 text-left">WD-14 · Selected {progress}% vs recorded {run.percent}%</caption>
              <thead><tr className="bg-[#eee8dd]"><th className="p-2 text-left" scope="col">Ledger</th><th scope="col">Selected</th><th scope="col">Recorded · {run.trial}</th></tr></thead>
              <tbody>{ledgerRows.map(([label, key]) => <tr key={key} className="border-b border-[#d8d2c7]"><th scope="row" className="p-2 text-left font-normal">{label}</th><td className="p-1 text-center">{dollars.format(current[key])}</td><td className="p-1 text-center">{dollars.format(run[key])}</td></tr>)}</tbody>
            </table>
            <p>From the checkout, reproduce both rows of trial data with <code className="break-words">node --import tsx scripts/record-billing-case.ts --check</code>.</p>
            <div className={links}>
              <Source path="scripts/record-billing-case.ts#L7-L23">Trial generator</Source>
              <Source path="src/app/case/technical/trials.json#L1-L30">Recorded outputs</Source>
              <Source path="tests/contract-billing.test.ts#L17-L23">Contract tests</Source>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
