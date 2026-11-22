import type { Metadata } from "next";
import Link from "next/link";
import styles from "../case.module.css";

export const metadata: Metadata = { title: "Component reference | Consulting realization kernel" };
const repository = "https://github.com/SafetyMP/Professional-Service-Automation/blob/main/";

export default function TechnicalGuide() {
  return (
    <main className={styles.desk}>
      <article className={styles.reference}>
        <nav className={styles.nav}><Link href="/case">July prebill</Link><Link href="/login">Workspace sign-in</Link></nav>
        <header><p className={styles.kicker}>Engineering reference</p><h1>Realization kernel</h1><p>The public desk uses in-memory fixtures and the shared invoice lifecycle. The signed-in application persists project records in PostgreSQL through Prisma.</p></header>
        <dl>
          <div><dt>Invoice assembly</dt><dd><a href={repository + "lib/billing/service.ts"}>Billing service</a> selects approved, billable, unlinked records by project and service dates. Project rate overrides take precedence over resource rates.</dd></div>
          <div><dt>Source transitions</dt><dd><a href={repository + "lib/billing/realization.ts"}>Realization functions</a> keep draft sources in WIP, mark issued sources invoiced and release voided drafts.</dd></div>
          <div><dt>Storage &amp; isolation</dt><dd><a href={repository + "prisma/schema.prisma"}>Prisma schema</a> links invoice lines to source records. Organization-scoped transactions and PostgreSQL row-level security bound workspace access.</dd></div>
          <div><dt>Reproduce</dt><dd><code>npm run realize</code> runs the <a href={repository + "scripts/realize-demo.ts"}>database-free lifecycle proof</a>. The <a href={repository + "specs/domain/billing-rules.md"}>billing rules</a> cover all four contract methods.</dd></div>
        </dl>
        <footer><p>Workflow sources · <a href="https://learn.microsoft.com/en-us/dynamics365/project-operations/invoicing/post-project-invoices">Microsoft project invoicing</a> and <a href="https://help.deltek.com/product/Vantagepoint/7.2/bill_labor_tab_of_interactive_billing.html">Deltek interactive billing</a>. The client reply is a case assumption.</p></footer>
      </article>
    </main>
  );
}
