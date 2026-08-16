export const eventInquiryStatuses = ["new", "callback", "contacted", "offer_sent", "confirmed", "cancelled"] as const;
export type EventInquiryStatus = typeof eventInquiryStatuses[number];

export function eventInquiryReference(id: string): string {
  return `IMP-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export const eventInquiryStatusLabels: Record<EventInquiryStatus, string> = {
  new: "Nowe", callback: "Do oddzwonienia", contacted: "Skontaktowano się",
  offer_sent: "Oferta wysłana", confirmed: "Potwierdzone", cancelled: "Anulowane",
};
