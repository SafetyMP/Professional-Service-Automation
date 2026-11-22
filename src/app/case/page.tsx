import type { Metadata } from "next";
import Link from "next/link";
import { BillingReview } from "./billing-review";
import styles from "./case.module.css";

export const metadata: Metadata = {
  title: "July billing close | Consulting realization kernel",
  description: "Build a consulting prebill from approved time and expenses, then reconcile the client invoice to the work still open.",
};

export default function BillingReviewPage() {
  return (
    <main className={styles.desk}>
      <div className={styles.shell}>
        <nav aria-label="Case navigation" className={styles.nav}>
          <span>Consulting realization kernel</span>
          <Link href="/case/technical">Technical reference</Link>
        </nav>
        <header className={styles.masthead}>
          <div>
            <p className={styles.kicker}>Project accounting / Month-end close</p>
            <h1>The July prebill</h1>
            <p className={styles.lede}>You run billing for an engineering consultancy. A plant restart ran past the original work order. Inspect the project file, set the service cutoff and assemble the invoice you would send.</p>
          </div>
          <dl className={styles.mastInfo}>
            <div><dt>Engagement</dt><dd>Northline / Plant restart</dd></div>
            <div><dt>Method</dt><dd>Time &amp; materials</dd></div>
            <div><dt>Close date</dt><dd>31 July 2026</dd></div>
          </dl>
        </header>
        <BillingReview />
        <footer className={styles.footer}>Illustrative USD amounts. Actions run in this browser session with synthetic client records. <Link href="/case/technical">Inspect the components</Link></footer>
      </div>
    </main>
  );
}
