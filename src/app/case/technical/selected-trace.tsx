"use client";

import { CaseLink, useCaseState } from "../case-state";
import { billingSnapshot, dollars, signoffs } from "../selection";
import trials from "./trials.json";

const root = "https://github.com/SafetyMP/Professional-Service-Automation/blob/f4b44a9a2776f627f2dc9afd6c4cc9681695b4b6/";
const panel = "rounded-md border border-[#d8d2c7] bg-white p-4";
const link = "text-[#6c4b12] underline";
const rows = [
  ["Accepted contract value", "accepted"],
  ["Issued to client", "issued"],
  ["Reserved on D-042", "reserved"],
  ["Available for a new draft", "available"],
] as const;

export function SelectedTrace() {
  const { selection, update } = useCaseState();
  const { progress, treatment, trial } = selection;
  const cutoff = progress === 50 ? signoffs[1].through : signoffs[0].through;
  const run = trials.find((item) => item.trial === trial) ?? trials[0];
  const current = billingSnapshot(progress, treatment);
  const status = treatment === "issue" ? "Issued" : treatment === "void" ? "Voided" : treatment === "hold" ? "Held open" : "Open, no decision";
  return (
    <>
      <section id="selected" className="space-y-3">
        <h2 className="text-2xl font-semibold">Trace the selected D-042</h2>
        <p>Compare the signed evidence available at the cutoff with the review decision for this $6,000 draft. Changing the cutoff here also updates the business worksheet.</p>
        <label className="block font-semibold" htmlFor="cutoff">Evidence available through</label>
        <select id="cutoff" value={cutoff} onChange={(event) => update({ progress: event.target.value === signoffs[1].through ? 50 : 40 })}
          className="w-full rounded border border-[#958774] bg-white p-2 sm:w-auto">
          {signoffs.map((row) => <option key={row.through} value={row.through}>{row.through} · {row.record}</option>)}
        </select>
        <ol className="grid gap-3 sm:grid-cols-2">
          <li className={panel}><h3 className="font-semibold">Read the signed progress</h3>
            <p>{signoffs.filter((row) => row.through <= cutoff).map((row) => row.record + " (" + row.progress + "%)").join(" and ")} in the file. The latest accepted share is {progress}%, worth {dollars.format(current.accepted)}.</p></li>
          <li className={panel}><h3 className="font-semibold">Match the register</h3>
            <p>I-031 records $18,000 issued. D-042 requests $6,000. The accountant checks the draft reference against the signed order before issue. <CaseLink path="/case" anchor="#engagement" className={link}>Inspect the original documents</CaseLink>.</p></li>
          <li className={panel}><h3 className="font-semibold">Apply the disposition</h3>
            <p><strong>{status}.</strong> {treatment === "issue" ? "D-042 moves from reserved capacity to the issued register; it cannot now be voided as a draft." : treatment === "void" ? "D-042 leaves the active register. The previously reserved amount is available for a corrected invoice." : "The open draft reserves its amount but adds nothing to the issued total."}</p></li>
          <li className={panel}><h3 className="font-semibold">Reconcile the effect</h3>
            {treatment ? <p>{dollars.format(current.accepted)} accepted − {dollars.format(current.issued)} issued − {dollars.format(current.reserved)} reserved = <strong>{dollars.format(current.available)} available</strong>. A matching bank receipt would be needed to establish collection.</p> : <p>Return to the source documents and choose whether to hold, issue or void D-042 to see the selected reconciliation. The reference trials below show two independent outcomes.</p>}</li>
        </ol>
      </section>
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Compare two recorded kernel runs</h2>
        <p>Both synthetic reference runs start with the July 31 sign-off and the same open draft. Only the disposition changes. Your current selection appears beside the recorded amounts.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Recorded trial">
          {trials.map((record) => <button type="button" key={record.trial} aria-pressed={trial === record.trial}
            onClick={() => update({ trial: record.trial === "voided" ? "voided" : "issued" })}
            className="rounded border border-[#958774] px-3 py-2 text-sm font-semibold aria-pressed:bg-[#48392c] aria-pressed:text-white">
            {record.trial === "issued" ? "Trial A · Issue" : "Trial B · Void"}</button>)}
        </div>
        <table className="w-full border-collapse text-sm tabular-nums">
          <caption className="mb-2 text-left">WD-14 · Selected {progress}% vs recorded {run.percent}%</caption>
          <thead><tr className="bg-[#e7e1d6]"><th className="p-2 text-left" scope="col">Ledger</th><th scope="col">Selected</th><th scope="col">Recorded · {run.trial}</th></tr></thead>
          <tbody>{rows.map(([label, key]) => <tr key={key} className="border-b border-[#d8d2c7]"><th scope="row" className="p-2 text-left font-normal">{label}</th><td className="p-2 text-center">{key === "available" && !treatment ? "Awaiting decision" : dollars.format(current[key])}</td><td className="p-2 text-center">{dollars.format(run[key])}</td></tr>)}</tbody>
        </table>
        <p className="text-sm">Trial A commits the $6,000 as issued. Trial B releases it for possible rebilling. These deterministic kernel runs use illustrative invoices. Neither run sends an invoice or records cash.</p>
        <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm"><a className={link} href={root + "src/app/case/technical/trials.json"}>Recorded inputs and outputs</a>
          <a className={link} href={root + "scripts/record-billing-case.ts"}>Trial generator</a>
          <a className={link} href={root + "tests/contract-billing.test.ts"}>Independent contract tests</a>
          <CaseLink className={link} path="/case/technical" anchor="#selected">Link to this comparison</CaseLink></p>
      </section>
    </>
  );
}
