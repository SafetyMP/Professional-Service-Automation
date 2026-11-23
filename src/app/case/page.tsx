import type { Metadata } from "next";
import { BillingCaseContent } from "./billing-content";
import { CaseState } from "./case-state";
import { readSelection, type Query } from "./selection";

export const metadata: Metadata = {
  title: "The Friday billing review | Professional services automation",
  description: "Follow a warehouse redesign from client sign-off to the Friday invoice register.",
};

export default async function BillingReviewPage({ searchParams }: { searchParams: Promise<Query> }) {
  return <CaseState initial={readSelection(await searchParams)}><BillingCaseContent /></CaseState>;
}
