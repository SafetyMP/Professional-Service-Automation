export type DomainEvent =
  | { type: "ClientCreated"; organizationId: string; clientId: string }
  | { type: "ProjectWon"; organizationId: string; projectId: string }
  | { type: "TimeEntryApproved"; organizationId: string; timeEntryId: string }
  | { type: "InvoiceCreated"; organizationId: string; invoiceId: string }
  | { type: "InvoiceApproved"; organizationId: string; invoiceId: string };

type Handler = (event: DomainEvent) => void | Promise<void>;

const handlers: Handler[] = [];

export function onDomainEvent(handler: Handler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  };
}

export async function emitDomainEvent(event: DomainEvent): Promise<void> {
  await Promise.all(handlers.map((h) => h(event)));
}
