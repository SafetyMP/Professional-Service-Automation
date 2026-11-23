import type { Metadata } from "next";
import { CaseState } from "../case-state";
import { readSelection, type Query } from "../selection";
import { TechnicalCaseContent } from "./technical-content";

export const metadata: Metadata = {
  title: "Technical guide | Friday billing review",
  description: "Trace the warehouse redesign, its open draft and the accountant’s decision through the billing code.",
};

export default async function TechnicalGuide({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <CaseState initial={readSelection(await searchParams)}>
      <TechnicalCaseContent />
    </CaseState>
  );
}
