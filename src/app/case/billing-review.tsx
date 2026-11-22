"use client";

import { useState } from "react";
import { countsAsUnbilledWip, transitionSource, type TimeExpenseSource } from "@/lib/billing/realization";
import styles from "./case.module.css";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const rate = 165;
const authorizedThrough = "2026-07-24";
const cutoffs = ["2026-06-30", authorizedThrough, "2026-07-31"];
const closeDate = Date.parse("2026-07-31");
const ageDays = (date: string) => (closeDate - Date.parse(date)) / 86_400_000;
const day = (date: string) => new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
type Entry = { id: string; title: string; date: string; hours?: number; expense?: number; approved: boolean; detail: string };
const entries: Entry[] = [
  { id: "T-181", title: "Process walkdown", date: "2026-06-19", hours: 12, approved: true, detail: "Field engineer · 12 hours on the production floor. Delivery lead approved 22 June under WO-17." },
  { id: "T-239", title: "Restart sequence", date: "2026-07-17", hours: 16, approved: true, detail: "Controls engineer · 16 hours updating the restart sequence. Delivery lead approved 20 July under WO-17." },
  { id: "E-044", title: "Site rail fare", date: authorizedThrough, expense: 380, approved: true, detail: "Receipt R-044 · Return rail fare to the site. Ticket and itemized receipt attached, approved 24 July under WO-17." },
  { id: "T-286", title: "Commissioning support", date: "2026-07-30", hours: 8, approved: true, detail: "Controls engineer · 8 hours on the commissioning shift. Delivery lead approved 30 July and referenced change request CR-02." },
  { id: "T-294", title: "Shift handover", date: "2026-07-31", hours: 5, approved: false, detail: "Field engineer · 5 hours. Submitted 31 July, awaiting delivery lead approval. References CR-02." },
];
const amount = (entry: Entry) => entry.hours === undefined ? entry.expense ?? 0 : entry.hours * rate;
const total = (items: Entry[]) => items.reduce((sum, entry) => sum + amount(entry), 0);
type Invoice = { number: number; ids: string[]; state: "DRAFT" | "SENT" | "VOID" };
const label = (invoice: Invoice) => `PB-${String(invoice.number).padStart(3, "0")}`;
const onInvoice = (invoice: Invoice) => entries.filter((entry) => invoice.ids.includes(entry.id));

function source(entry: Entry, invoice?: Invoice) {
  const original: TimeExpenseSource = { kind: entry.hours === undefined ? "expense" : "time", billingStatus: "UNBILLED" };
  if (!invoice) return original;
  return transitionSource(invoice.state === "SENT" ? "issue" : invoice.state === "DRAFT" ? "draft" : "void", "DRAFT", original);
}

export function BillingReview() {
  const [cutoff, setCutoff] = useState(cutoffs[2]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const activeInvoice = (entry: Entry) => invoices.find((invoice) => invoice.state !== "VOID" && invoice.ids.includes(entry.id));
  const draft = invoices.find((invoice) => invoice.state === "DRAFT");
  const issued = entries.filter((entry) => activeInvoice(entry)?.state === "SENT");
  const wip = entries.filter((entry) => entry.approved && countsAsUnbilledWip(source(entry, activeInvoice(entry))));
  const eligible = wip.filter((entry) => entry.date <= cutoff && !activeInvoice(entry));
  const draftRows = draft ? onInvoice(draft) : [];
  const exceptions = issued.filter((entry) => entry.date > authorizedThrough);
  const buckets = [
    { caption: "0–14 days", items: wip.filter((entry) => ageDays(entry.date) <= 14) },
    { caption: "15–30 days", items: wip.filter((entry) => ageDays(entry.date) > 14 && ageDays(entry.date) <= 30) },
    { caption: "31+ days", items: wip.filter((entry) => ageDays(entry.date) > 30) },
  ];
  const opening = total(entries.filter((entry) => entry.approved));
  function createDraft() {
    if (!draft && eligible.length) setInvoices([...invoices, { number: invoices.length + 1, ids: eligible.map((entry) => entry.id), state: "DRAFT" }]);
  }
  function settle(state: "VOID" | "SENT") {
    if (draft) setInvoices(invoices.map((invoice) => invoice.number === draft.number ? { ...invoice, state } : invoice));
  }

  return (
    <>
      <nav className={styles.mobileJump} aria-label="Close desk sections"><a href="#docket">Project file</a><a href="#prebill">Prebill worksheet</a></nav>
      <div className={styles.workarea}>
        <section aria-labelledby="docket">
          <div className={styles.sectionhead}><h2 id="docket">Project file</h2><span>NL–204</span></div>
          <details className={styles.document}><summary>WO-17 · Signed work order</summary><p>Northline authorizes restart engineering through 24 July at $165 per hour, plus receipted rail travel at cost. Work after this date requires a countersigned change.</p></details>
          <details className={styles.document}><summary>CR-02 · Extension correspondence</summary><p>29 July · Site supervisor requested commissioning cover through 31 July. The extension carries an internal delivery signature. The client purchasing signature is blank.</p></details>
          <div className={styles.sectionhead}><h2>Time &amp; expense docket</h2><span>5 source records</span></div>
          <p className={styles.hint}>Open a line for its approval and source reference.</p>
          <div className={styles.docket}>
            {entries.map((entry) => {
              const invoice = activeInvoice(entry);
              const status = invoice ? (invoice.state === "SENT" ? `Issued · ${label(invoice)}` : `Reserved · ${label(invoice)}`) : entry.approved ? "Approved" : "Submitted";
              return <details key={entry.id} className={styles.line}>
                <summary><span className={styles.date}>{day(entry.date)}</span><span><strong>{entry.title}</strong><small>{entry.id} · {status}</small></span><span className={styles.amount}>{money.format(amount(entry))}</span></summary>
                <p>{entry.detail}</p>
              </details>;
            })}
          </div>
          <figure className={styles.age}>
            <figcaption><strong>Unbilled work by age</strong><span>At the July close</span></figcaption>
            {buckets.map(({ caption, items }) => <div className={styles.ageRow} key={caption}><span>{caption}</span><span className={styles.track} aria-hidden="true"><i style={{ width: `${100 * total(items) / opening}%` }} /></span><b>{money.format(total(items))}</b></div>)}
          </figure>
        </section>

        <section aria-labelledby="prebill" className={styles.tray}>
          <div className={styles.sectionhead}><h2 id="prebill">Prebill worksheet</h2><span>USD</span></div>
          <div className={styles.sheet}>
            {draft ? <>
              <p className={styles.kicker}>Open pro forma / {label(draft)}</p>
              <h3>Review the invoice lines</h3>
              <ul className={styles.invoiceLines}>{draftRows.map((entry) => <li key={entry.id}><span>{entry.id} · {entry.title}</span><b>{money.format(amount(entry))}</b></li>)}</ul>
              <div className={styles.subtotal}><span>Pro forma subtotal</span><strong>{money.format(total(draftRows))}</strong></div>
              <p>These lines stay in unbilled work while reserved. Issue the invoice to move them to billed, or void it to release them for another cutoff.</p>
              <div className={styles.actions}><button onClick={() => settle("SENT")}>Issue invoice</button><button className={styles.alt} onClick={() => settle("VOID")}>Void pro forma</button></div>
            </> : <>
              <p className={styles.kicker}>Draft preparation</p>
              <h3>Set the service cutoff</h3>
              <p>Start with all open dates. Choose the last service date to include, then pull eligible records into a pro forma.</p>
              <label className={styles.selectLabel}>Include work through
                <select value={cutoff} onChange={(event) => setCutoff(event.target.value)}>{cutoffs.map((date) => <option key={date} value={date}>{day(date)} 2026</option>)}</select>
              </label>
              <div className={styles.actions}><button disabled={!eligible.length} onClick={createDraft}>Prepare pro forma</button></div>
              {!eligible.length && <p className={styles.notice}>No approved, unreserved records remain within this cutoff.</p>}
            </>}
          </div>

          <div className={styles.tape} aria-live="polite">
            <h3>Close reconciliation</h3>
            <div className={styles.movement} aria-hidden="true">
              <i style={{ width: `${100 * total(issued) / opening}%` }} />
              <i style={{ width: `${100 * total(draftRows) / opening}%` }} />
            </div>
            <dl><div><dt>Opening approved work</dt><dd>{money.format(opening)}</dd></div><div><dt>Issued this close</dt><dd>{money.format(total(issued))}</dd></div><div className={styles.balance}><dt>Unbilled work remaining</dt><dd>{money.format(total(wip))}</dd></div><div><dt>Of which on an open draft</dt><dd>{money.format(total(draftRows))}</dd></div></dl>
          </div>
        </section>
      </div>

      {invoices.length > 0 && <section className={styles.history} aria-live="polite">
        <div className={styles.sectionhead}><h2>Billing register</h2><button className={styles.reset} onClick={() => { setInvoices([]); setCutoff(cutoffs[2]); }}>Restart July close</button></div>
        <ul>{invoices.map((invoice) => <li key={invoice.number}><strong>{label(invoice)}</strong><span>{invoice.state === "SENT" ? "Issued" : invoice.state === "VOID" ? "Voided" : "Open draft"}</span><span>{invoice.ids.length} source lines</span><b>{money.format(total(onInvoice(invoice)))}</b></li>)}</ul>
        {issued.length > 0 && <div className={styles.reply}><h3>Client accounts payable · simulated reply</h3>
          {exceptions.length ? <p>Purchasing asks for the signed extension before clearing {money.format(total(exceptions))} of commissioning charges. The amount stays issued in your ledger while the client reviews it.</p> : <p>Purchasing matched the issued lines to WO-17 and placed {money.format(total(issued))} in its payment queue. A receipt is still outstanding.</p>}
          <p>Cash received in this case · $0</p>
        </div>}
      </section>}
    </>
  );
}
