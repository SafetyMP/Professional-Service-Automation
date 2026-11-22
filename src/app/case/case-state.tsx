"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { caseHref, type CaseSelection } from "./selection";

type State = { selection: CaseSelection; update: (changes: Partial<CaseSelection>) => void };
const CaseContext = createContext<State | null>(null);

export function CaseState({ initial, children }: { initial: CaseSelection; children: ReactNode }) {
  const [selection, setSelection] = useState(initial);
  function update(changes: Partial<CaseSelection>) {
    const next = { ...selection, ...changes };
    setSelection(next);
    window.history.replaceState(null, "", caseHref(window.location.pathname, next) + window.location.hash);
  }
  return <CaseContext.Provider value={{ selection, update }}>{children}</CaseContext.Provider>;
}

export function useCaseState() {
  const context = useContext(CaseContext);
  if (!context) throw new Error("A billing case is required");
  return context;
}

export function CaseLink({ path, children, className, anchor = "" }: { path: string; children: ReactNode; className?: string; anchor?: string }) {
  const { selection } = useCaseState();
  return <Link className={className} href={caseHref(path, selection) + anchor}>{children}</Link>;
}
