import { BillingReview } from "./billing-review";
import { CaseLink } from "./case-state";

const handoff = [
  ["Delivery manager", "Collect the sign-off", "The client’s warehouse lead accepts a stage of the redesign. The manager puts that signed share in the project file."],
  ["Project accountant", "Prepare Friday’s bill", "Finance checks how much has already been invoiced and what is sitting on an open draft."],
  ["Client accounts payable", "Match the invoice", "The client’s payables clerk uses the purchase order number to route the charge to the right budget."],
];

export function BillingCaseContent() {
  return <div className="min-h-screen bg-[#f6f4ee] text-[#302921]">
    <main className="mx-auto max-w-5xl px-4 pb-12 sm:px-8">
      <nav aria-label="Case navigation" className="flex items-center justify-between gap-4 py-5 text-sm">
        <span className="font-semibold tracking-wide">Professional services automation</span>
        <CaseLink className="shrink-0 text-[#674914] underline underline-offset-4" path="/case/technical">Technical guide</CaseLink>
      </nav>
      <header className="grid gap-6 rounded-t-xl border-t-4 border-[#b58d53] bg-[#342c25] p-6 text-[#fffaf0] sm:p-8 md:grid-cols-[1.45fr_1fr] md:items-center md:gap-10">
        <div>
          <p className="text-sm font-semibold text-[#eed299]">Client engagement · Warehouse redesign</p>
          <h1 className="my-3 font-serif text-4xl leading-tight sm:text-5xl">The Friday billing review</h1>
          <p className="leading-relaxed">A warehouse operator hired a consulting team to redesign its layout and hand the plan to its site managers. The fee is fixed at $60,000. The client agreed to pay in stages as it signs off on the work.</p>
        </div>
        <aside aria-label="Friday’s handoff" className="border-l-2 border-[#bd9a64] pl-5">
          <h2 className="font-serif text-2xl text-[#eed299]">What changed this week?</h2>
          <p className="mt-2 leading-relaxed">A new sign-off has reached the delivery manager. Finance already has an earlier invoice on its books and a $6,000 draft waiting for Friday’s run. Each team sees a different part of the job.</p>
        </aside>
      </header>
      <section aria-labelledby="handoff" className="rounded-b-xl border border-[#d9d0bf] bg-[#fffdf7] p-5 sm:p-7">
        <h2 id="handoff" className="font-serif text-2xl">How the work becomes a client bill</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {handoff.map(([role, title, body]) => <li key={role} className="border-l-2 border-[#b28c53] pl-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#72531e]">{role}</p>
            <h3 className="mt-1 font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed">{body}</p>
          </li>)}
        </ol>
        <p className="mt-5 border-t border-[#d9d0bf] pt-4 leading-relaxed">This is the work professional services automation (PSA) connects. If finance overlooks an open draft, it can bill the same work twice. If the client can’t match an invoice to an order, both teams spend time tracing it and payment can be delayed.</p>
      </section>
      <BillingReview />
      <details className="mt-5 border-t border-[#d9d0bf] pt-4 text-sm text-[#554b3d]">
        <summary className="w-fit cursor-pointer font-semibold">Where this handoff comes from</summary>
        <p className="mt-3 max-w-3xl">Microsoft describes the project manager reviewing fixed-price milestones and the project accountant preparing the client’s invoice. The University of Edinburgh asks suppliers to correct invoices that carry an invalid order number. WD-14 and its amounts are illustrative.</p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[#674914] underline">
          <a href="https://learn.microsoft.com/en-us/dynamics365/project-operations/invoicing/post-project-invoices">Microsoft’s project invoicing workflow</a>
          <a href="https://procurement.ed.ac.uk/information-for-suppliers/information-for-existing-suppliers">Edinburgh’s supplier instructions</a>
        </p>
      </details>
    </main>
  </div>;
}
