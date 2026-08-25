export const stayBookingStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;
export type StayBookingStatus = (typeof stayBookingStatuses)[number];
export const stayBookingStatusLabels: Record<StayBookingStatus, string> = {
	pending: "Oczekuje",
	confirmed: "Potwierdzona",
	completed: "Zrealizowana",
	cancelled: "Anulowana",
};
export function stayBookingReference(id: string): string {
	return `NOC-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
