"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Invoice = { number: number; ids: string[]; state: "DRAFT" | "SENT" | "VOID" };
export const authorizedThrough = "2026-07-24";
export const cutoffs = ["2026-06-30", authorizedThrough, "2026-07-31"];

type CloseState = {
  cutoff: string;
  setCutoff: (value: string) => void;
  invoices: Invoice[];
  setInvoices: (value: Invoice[]) => void;
};

const CloseContext = createContext<CloseState | null>(null);

export function CloseProvider({ children }: { children: ReactNode }) {
  const [cutoff, setCutoff] = useState(cutoffs[2]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  return <CloseContext.Provider value={{ cutoff, setCutoff, invoices, setInvoices }}>{children}</CloseContext.Provider>;
}

export function useJulyClose() {
  const close = useContext(CloseContext);
  if (!close) throw new Error("The July close requires its case layout.");
  return close;
}
