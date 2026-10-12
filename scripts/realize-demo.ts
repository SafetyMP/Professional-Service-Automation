/**
 * One job: approved time stays unbilled WIP until the invoice is issued.
 * Voiding a draft releases the hold. An issued invoice cannot be voided.
 *
 * ASC 606 keeps that unbilled balance as a contract asset. Realization is
 * the issue, not the draft.
 */
import {
  countsAsUnbilledWip,
  transitionSource,
  type BillableSource,
} from "../lib/billing/realization";

const time: BillableSource = { kind: "time", billingStatus: "UNBILLED" };
const milestone: BillableSource = { kind: "milestone", status: "READY" };

const drafted = transitionSource("draft", "DRAFT", time);
const issued = transitionSource("issue", "DRAFT", time);
const released = transitionSource("void", "DRAFT", milestone);

let voidRefusesIssued = false;
try {
  transitionSource("void", "SENT", time);
} catch {
  voidRefusesIssued = true;
}

const report = {
  draftCountsAsWip: countsAsUnbilledWip(drafted),
  draft: drafted,
  issued: issued,
  issuedCountsAsWip: countsAsUnbilledWip(issued),
  voidRefusesIssued,
  voidRestores: released,
};

console.log(JSON.stringify(report, null, 2));

if (
  !report.draftCountsAsWip ||
  report.issuedCountsAsWip ||
  !report.voidRefusesIssued ||
  released.kind !== "milestone" ||
  released.status !== "READY"
) {
  process.exit(1);
}
