import type { Metadata } from "next";
import Link from "next/link";
import { BillingReview } from "./billing-review";

export const metadata: Metadata = {
  title: "Friday billing review | Consulting realization kernel",
  description: "Review a fixed-fee engagement, reconcile a draft invoice and price a billing pilot.",
};

export default function BillingReviewPage() {
  return (
    <div className="min-h-screen bg-[#f6f5f2] text-[#302921]">
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <nav aria-label="Case navigation" className="flex items-center justify-between gap-4 py-6 text-sm">
          <span className="font-semibold tracking-wide">Consulting realization kernel</span>
          <Link className="text-[#6c4b12] underline underline-offset-4" href="/case/technical">Technical guide</Link>
        </nav>
        <header className="rounded-t-2xl border-t-4 border-[#ae8238] grid items-center gap-7 bg-[#34291f] px-6 py-8 text-white sm:px-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="mb-3 text-sm font-semibold text-[#f1ce88]">Billing review · Illustrative engagement</p>
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">What can finance bill on Friday?</h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-[#f0eae0]">
              A consulting team is handing over a warehouse redesign. Under its sample agreement,
              finance can bill up to the share of work the client has accepted. The delivery manager brings the sign-off to Friday’s close. The project accountant brings a draft. How much more can the finance partner authorize?
            </p>
          </div>
          <figure className="rounded-md border border-[#796b57] bg-[#40352a] p-4">
            <figcaption className="mb-3 text-sm font-semibold text-[#f1ce88]">Friday’s opening file</figcaption>
            <div className="divide-y divide-[#d9d0c1] rounded-sm border-l-4 border-[#ae8238] bg-[#faf8f2] px-3 text-[#34291f]">
              <div className="flex justify-between gap-2 py-3 text-sm"><span>Contract <strong>WD-14</strong></span><span className="font-semibold tabular-nums">$60,000</span></div>
              <div className="flex justify-between gap-2 py-3 text-sm"><span>Signed design</span><span className="font-semibold">40%</span></div>
              <div className="flex justify-between gap-2 py-3 text-sm"><span>Draft <strong>D-042</strong></span><span className="font-semibold tabular-nums">$6,000</span></div>
            </div>
          </figure>
        </header>
        <BillingReview />
        <footer className="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-t border-[#d8d2c7] pt-4 text-sm">
          <span>Inspect the example records, source formulas and CLI checks.</span>
          <Link className="font-semibold text-[#6c4b12] underline" href="/case/technical">Trace the billing decision</Link>
        </footer>
      </main>
    </div>
  );
}
