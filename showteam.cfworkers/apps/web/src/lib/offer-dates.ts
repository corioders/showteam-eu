// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
export type OfferDate = {
	label: string;
	startDate: string;
	endDate: string;
};

const polishMonths = ["", "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];

export function isIsoDate(value: string) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) {
		return false;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function formatOfferDateRange(date: OfferDate) {
	const start = parts(date.startDate);
	const end = parts(date.endDate);
	if (!start || !end) {
		return "Brak poprawnej daty";
	}
	if (date.startDate === date.endDate) {
		return `${start.day} ${polishMonths[start.month]} ${start.year}`;
	}
	if (start.year === end.year && start.month === end.month) {
		return `${start.day}–${end.day} ${polishMonths[end.month]} ${end.year}`;
	}
	if (start.year === end.year) {
		return `${start.day} ${polishMonths[start.month]} – ${end.day} ${polishMonths[end.month]} ${end.year}`;
	}
	return `${start.day} ${polishMonths[start.month]} ${start.year} – ${end.day} ${polishMonths[end.month]} ${end.year}`;
}

function parts(value: string) {
	if (!isIsoDate(value)) {
		return null;
	}
	const [year, month, day] = value.split("-").map(Number);
	return { year, month, day };
}
