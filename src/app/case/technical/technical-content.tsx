import { CaseLink } from "../case-state";
import { SelectedTrace } from "./selected-trace";

export function TechnicalCaseContent() {
  return (
    <main className="min-h-screen bg-[#f6f4ee] px-4 py-6 text-[#302921] sm:px-8">
      <article className="mx-auto max-w-3xl">
        <nav aria-label="Technical guide navigation" className="mb-5">
          <CaseLink path="/case" className="text-sm font-semibold text-[#6c4b12] underline underline-offset-4">Back to the billing case</CaseLink>
        </nav>
        <header className="rounded-t-xl border-t-4 border-[#b58d53] bg-[#342c25] p-5 text-white sm:p-7">
          <p className="text-sm font-semibold text-[#f1ce88]">Technical guide · Warehouse redesign</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Trace the billing decision</h1>
          <p className="mt-2 max-w-xl leading-relaxed text-[#f0eae0]">Follow one draft from the signed project file to the amount finance could bill next. Each step opens the code behind it.</p>
        </header>
        <SelectedTrace />
      </article>
    </main>
  );
}
