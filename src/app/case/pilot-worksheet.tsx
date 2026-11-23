"use client";

import { useCaseState } from "./case-state";
import { choices, dollars, type CaseSelection } from "./selection";

const pilotCost = 2400;
const hourlyRate = 75;

export function PilotWorksheet() {
  const { selection, update } = useCaseState();
  const { reviews, minutes, choice } = selection;
  const annualHours = reviews * 12 * minutes / 60;
  const capacityValue = annualHours * hourlyRate;
  const netCapacity = capacityValue - pilotCost;
  const comparisonScale = Math.max(pilotCost, capacityValue);
  const pilotValues = [
    { label: "Redeployable time", value: capacityValue, color: "#3b6c66" },
    { label: "First-year cost", value: pilotCost, color: "#ac813e" },
  ];

  return (
    <details className="mt-6 rounded-xl border border-[#d8d2c7] bg-[#fffdf7] p-5 sm:p-6">
      <summary id="pilot" className="cursor-pointer font-serif text-xl">Would a billing pilot pay for the review time?</summary>
      <div className="mt-5 space-y-5">
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
      </div>
    </details>
  );
}

function investmentAdvice(choice: NonNullable<CaseSelection["choice"]>, net: number) {
  if (choice === "spreadsheet") return "Measure two closes with the current workbook. Track reviewer minutes, missed references and reopened drafts. Assign a reviewer to every discrepancy.";
  if (choice === "register") return "Price a register in the existing accounting system. Time how long the accountant takes to reconcile the same signed orders and reservations, including corrections.";
  return `At the selected assumptions, first-year capacity after cost is ${dollars.format(net)}. ${net > 0 ? "Shadow two closes and confirm the team can redeploy the hours." : "Recheck review volume, time saved and setup cost before spending."} Keep invoice issue with the accountant and investigate each disagreement.`;
}
