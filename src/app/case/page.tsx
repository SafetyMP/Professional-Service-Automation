import type { Metadata } from "next";
import { CaseLink, CaseState } from "./case-state";
import { readSelection, type Query } from "./selection";
import { BillingReview } from "./billing-review";

export const metadata: Metadata = {
  title: "Friday billing review | Consulting realization kernel",
  description: "Review a fixed-fee engagement, reconcile a draft invoice and price a billing pilot.",
};

export default async function BillingReviewPage({ searchParams }: { searchParams: Promise<Query> }) {
  const initial = readSelection(await searchParams);
  return (
    <CaseState initial={initial}><div className="min-h-screen bg-[#f6f5f2] text-[#302921]">
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <nav aria-label="Case navigation" className="flex items-center justify-between gap-4 py-6 text-sm">
          <span className="font-semibold tracking-wide">Consulting realization kernel</span>
          <CaseLink className="text-[#6c4b12] underline underline-offset-4" path="/case/technical">Technical guide</CaseLink>
        </nav>
        <header className="rounded-t-2xl border-t-4 border-[#ae8238] grid items-center gap-7 bg-[#34291f] px-6 py-8 text-white sm:px-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="mb-3 text-sm font-semibold text-[#f1ce88]">Billing review · Illustrative engagement</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">What can finance bill on Friday?</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#f0eae0]">
              A consulting team is handing over a warehouse redesign. Under its sample agreement,
              finance can bill up to the share of work the client has accepted. The project accountant has a $6,000 draft ready for Friday’s run. Check the signed order against the invoice register before authorizing it.
            </p>
          </div>
          <figure className="rounded-md border border-[#796b57] bg-[#40352a] p-4">
            <figcaption className="mb-3 text-sm font-semibold text-[#f1ce88]">Signed client order</figcaption>
            <div className="divide-y divide-[#d9d0c1] rounded-sm border-l-4 border-[#ae8238] bg-[#faf8f2] px-3 text-[#34291f]">
              <div className="flex justify-between gap-2 py-3 text-sm"><span>Contract <strong>WD-14</strong></span><span className="font-semibold tabular-nums">$60,000</span></div>
              <div className="flex justify-between gap-2 py-3 text-sm"><span>Purchase order</span><span className="font-semibold">PO-481</span></div>
              <div className="flex justify-between gap-2 py-3 text-sm"><span>Billing basis</span><span className="font-semibold">Signed progress</span></div>
            </div>
          </figure>
        </header>
        <BillingReview />
        <footer className="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-[#d8d2c7] pt-4 text-sm">
          <span>Inspect the example records, source formulas and CLI checks.</span>
          <CaseLink className="font-semibold text-[#6c4b12] underline" path="/case/technical">Trace the billing decision</CaseLink>
        </footer>
      </main>
    </div></CaseState>
  );
}
