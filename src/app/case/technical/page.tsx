import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Technical guide | Friday billing review",
  description: "Trace the sample invoice to the billing kernel and reproduce the realization checks.",
};

const repository = "https://github.com/SafetyMP/Professional-Service-Automation/blob/main";

export default function TechnicalGuide() {
  return (
    <main className="min-h-screen bg-[#f6f5f2] px-4 py-7 text-[#302921]">
      <article className="mx-auto max-w-3xl space-y-7">
        <nav aria-label="Technical guide navigation" className="flex flex-wrap justify-between gap-4 text-sm">
          <Link href="/case" className="text-[#6c4b12] underline">Back to the billing case</Link>
          <Link href="/login" className="text-[#6c4b12] underline">Sign in to the workspace</Link>
        </nav>
        <header className="border-t-4 border-[#ae8238] py-4">
          <p className="mb-2 text-sm font-semibold text-[#655b50]">Technical guide · Contract WD-14</p>
          <h1 className="text-4xl font-semibold tracking-tight">Trace the billing decision</h1>
          <p className="mt-3">The public case runs in the browser with illustrative records. The signed-in application uses PostgreSQL, organization-scoped permissions and stored invoices.</p>
        </header>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Reconcile the opening ledger</h2>
          <p>The signed design represents 40% of a $60,000 contract, or $24,000. The issued register records $18,000. Open draft D-042 reserves the remaining $6,000, leaving $0 for a new draft.</p>
          <p>The case calls <code>sumCommittedInvoiceSubtotals</code> for all issued and open draft amounts, and <code>sumRealizedInvoiceSubtotals</code> for issued amounts alone. <code>computeProgressBillAmount</code> subtracts commitments from the accepted contract amount and floors the result at zero.</p>
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6c4b12] underline">
            <a href={repository + "/lib/billing/realization.ts"}>Invoice status functions</a>
            <a href={repository + "/lib/billing/contract-billing.ts"}>Fixed-fee calculation</a>
            <a href={repository + "/specs/domain/billing-rules.md"}>Billing rules</a>
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Run the realization check</h2>
          <p>From the checkout with Node 22, run the CLI to see how issue or void changes the underlying time and milestone records. The CLI and focused tests run without a database.</p>
          <pre className="overflow-x-auto rounded-md bg-[#34291f] p-4 text-sm leading-6 text-white"><code>{`npm ci
npm run realize
npx vitest run tests/contract-billing.test.ts`}</code></pre>
          <p>For stored projects, invoices, utilization and margin, use the seeded workspace. <a className="text-[#6c4b12] underline" href={repository + "/README.md#quick-start"}>Workspace setup and demo accounts</a>.</p>
        </section>
        <section className="space-y-3 border-t border-[#d8d2c7] pt-5">
          <h2 className="text-2xl font-semibold">Evidence and limits</h2>
          <p>Microsoft’s guidance identifies the project manager, accountant and finance leadership as distinct participants. Oracle describes delivery approval before milestone billing. Both inform the roles used in this case. <a className="text-[#6c4b12] underline" href="https://learn.microsoft.com/en-us/dynamics365/guidance/business-processes/project-to-profit-manage-project-financials-overview">Stakeholder roles</a> · <a className="text-[#6c4b12] underline" href="https://docs.oracle.com/en/cloud/saas/readiness/erp/24b/ppm24b/24B-ppm-wn-f32064.htm">Delivery approval</a>.</p>
          <p>Billing status establishes what finance issued. Cash collection needs a receipt. Revenue recognition requires assessment of contract performance. <a className="text-[#6c4b12] underline" href="https://learn.microsoft.com/en-us/dynamics365/project-operations/invoicing/post-project-invoices">Invoicing workflow</a> · <a className="text-[#6c4b12] underline" href="https://www.ifrs.org/issued-standards/list-of-standards/ifrs-15-revenue-from-contracts-with-customers/">IFRS 15 overview</a>.</p>
        </section>
      </article>
    </main>
  );
}
