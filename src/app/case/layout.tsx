import type { ReactNode } from "react";
import { CloseProvider } from "./close-state";

export default function CaseLayout({ children }: { children: ReactNode }) {
  return <CloseProvider>{children}</CloseProvider>;
}
