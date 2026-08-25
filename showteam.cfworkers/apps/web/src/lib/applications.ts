export const applicationDisciplines = ["Narty", "Snowboard", "Sporty wodne", "Inne"] as const;
export const applicationLevels = ["Od podstaw", "Doskonalenie", "Jazda sportowa"] as const;
export const applicationTransport = ["Tak", "Nie", "Nie dotyczy"] as const;
export const applicationStatuses = ["new", "contacted", "confirmed", "rejected", "cancelled"] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];
export const applicationStatusLabels: Record<ApplicationStatus, string> = {
	new: "Nowe",
	contacted: "Skontaktowano się",
	confirmed: "Potwierdzone",
	rejected: "Odrzucone",
	cancelled: "Anulowane",
};

export function applicationDisciplinesForCategory(category: string): readonly (typeof applicationDisciplines)[number][] {
	if (category === "Lato") {
		return ["Sporty wodne", "Inne"];
	}
	if (category === "Zima") {
		return ["Narty", "Snowboard", "Inne"];
	}
	return [];
}

export function applicationHasSportDetails(category: string): boolean {
	return category === "Lato" || category === "Zima";
}

export function applicationReference(id: string) {
	return `ZGL-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function applicationAge(birthDate: string, onDate: string) {
	const birth = birthDate.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
	const current = onDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!birth || !current) {
		return undefined;
	}
	const [, birthYear, birthMonth, birthDay] = birth.map(Number);
	const [, currentYear, currentMonth, currentDay] = current.map(Number);
	return currentYear - birthYear - (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay) ? 1 : 0);
}

export function normalizeEmail(value: string) {
	return value.trim().toLowerCase();
}

export function participantIdentity(input: { email: string; participantEmail?: string; participantName: string; birthDate: string }) {
	const participantEmail = normalizeEmail(input.participantEmail || "");
	if (participantEmail) {
		return `email:${participantEmail}`;
	}
	const name = input.participantName.trim().toLowerCase().replace(/\s+/g, " ");
	return `contact:${normalizeEmail(input.email)}|${name}|${input.birthDate.slice(0, 10)}`;
}

export function safeSpreadsheetCell(value: unknown) {
	const text = String(value ?? "")
		.replaceAll("\r\n", "\n")
		.replaceAll("\r", "\n");
	return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown) {
	return `"${safeSpreadsheetCell(value).replaceAll('"', '""')}"`;
}
