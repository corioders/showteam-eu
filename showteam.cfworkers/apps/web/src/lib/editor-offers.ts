import type { OfferCategory } from "@/lib/offers";

import { isIsoDate, type OfferDate } from "./offer-dates";

export type EditableOffer = {
	title: string;
	category: OfferCategory;
	location: string;
	summary: string;
	season: string;
	dates: OfferDate[];
	highlights: string[];
	sections: { title: string; body: string }[];
	slug: string;
	mapUrl: string;
	ctaTitle: string;
	sortOrder: number;
	pageContent: Record<string, string>;
	published: boolean;
};

const categories: OfferCategory[] = ["Lato", "Zima", "Szkolenia", "Noclegi"];

export function parseEditableOffer(input: unknown): { data?: EditableOffer; errors?: string[] } {
	if (!input || typeof input !== "object") {
		return { errors: ["Nie udało się odczytać formularza. Odśwież stronę i spróbuj ponownie."] };
	}
	const value = input as Record<string, unknown>;
	const title = text(value.title);
	const category = categories.includes(value.category as OfferCategory) ? (value.category as OfferCategory) : null;
	const location = text(value.location);
	const summary = text(value.summary);
	const season = text(value.season);
	const dates = dateList(value.dates);
	const highlights = textList(value.highlights, 12);
	const sections = sectionList(value.sections);
	const slug = text(value.slug);
	const mapUrl = text(value.mapUrl);
	const ctaTitle = text(value.ctaTitle);
	const sortOrder = Number(value.sortOrder);
	const pageContent = stringRecord(value.pageContent);
	const errors: string[] = [];

	if (title.length < 2 || title.length > 120) {
		errors.push("Nazwa oferty musi mieć od 2 do 120 znaków.");
	}
	if (!category) {
		errors.push("Wybierz kategorię oferty.");
	}
	if (location.length < 2 || location.length > 160) {
		errors.push("Wpisz lokalizację oferty.");
	}
	if (summary.length < 10 || summary.length > 360) {
		errors.push("Krótki opis musi mieć od 10 do 360 znaków.");
	}
	if (season.length < 2 || season.length > 80) {
		errors.push("Wpisz nazwę sezonu.");
	}
	errors.push(...dates.errors);
	if (highlights === null) {
		errors.push("Możesz dodać najwyżej 12 punktów po 180 znaków.");
	}
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		errors.push("Adres strony może zawierać tylko małe litery, cyfry i myślniki.");
	}
	if (!safeUrl(mapUrl)) {
		errors.push("Wklej pełny link do mapy zaczynający się od https://.");
	}
	if (ctaTitle.length < 2 || ctaTitle.length > 120) {
		errors.push("Hasło nad zgłoszeniem musi mieć od 2 do 120 znaków.");
	}
	if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
		errors.push("Kolejność musi być liczbą od 0 do 999.");
	}
	if (!sections) {
		errors.push("Możesz dodać najwyżej 20 sekcji. Każda potrzebuje krótkiego nagłówka i treści.");
	}
	if (!pageContent) {
		errors.push("Jedna z dodatkowych treści jest za długa.");
	}
	if (errors.length > 0 || !category || !dates.data || !highlights || !sections || !pageContent) {
		return { errors };
	}

	return {
		data: {
			title,
			category,
			location,
			summary,
			season,
			dates: dates.data,
			highlights,
			sections,
			slug,
			mapUrl,
			ctaTitle,
			sortOrder,
			pageContent,
			published: value.published !== false,
		},
	};
}

function text(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown, limit: number) {
	if (!Array.isArray(value) || value.length > limit) {
		return null;
	}
	const result = value.map(text).filter(Boolean);
	return result.some((entry) => entry.length > 180) ? null : result;
}

function sectionList(value: unknown) {
	if (!Array.isArray(value) || value.length > 20) {
		return null;
	}
	const result = value.flatMap((item) => {
		if (!item || typeof item !== "object") {
			return [];
		}
		const row = item as Record<string, unknown>;
		const title = text(row.title);
		const body = text(row.body);
		return title.length >= 2 && title.length <= 120 && body.length >= 2 && body.length <= 2000 ? [{ title, body }] : [];
	});
	return result.length === value.length ? result : null;
}

function safeUrl(value: string) {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

function stringRecord(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	const entries = Object.entries(value);
	if (entries.length > 100 || entries.some(([key, item]) => !/^[a-z][a-zA-Z0-9]*$/.test(key) || typeof item !== "string" || item.length > 2000)) {
		return null;
	}
	return Object.fromEntries(entries.map(([key, item]) => [key, String(item).trim()]));
}

function dateList(value: unknown): { data?: OfferDate[]; errors: string[] } {
	if (!Array.isArray(value)) {
		return { errors: ["Nie udało się odczytać terminów. Odśwież stronę i spróbuj ponownie."] };
	}
	if (value.length > 30) {
		return { errors: ["Możesz dodać najwyżej 30 terminów."] };
	}
	const dates: OfferDate[] = [];
	const errors: string[] = [];
	value.forEach((item, index) => {
		const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
		const label = text(row.label);
		const startDate = text(row.startDate).slice(0, 10);
		const endDate = text(row.endDate).slice(0, 10);
		const number = index + 1;
		if (label.length < 2 || label.length > 80) {
			errors.push(`Termin ${number}: wpisz krótką nazwę.`);
		}
		if (!isIsoDate(startDate)) {
			errors.push(`Termin ${number}: wybierz datę rozpoczęcia.`);
		}
		if (!isIsoDate(endDate)) {
			errors.push(`Termin ${number}: wybierz datę zakończenia.`);
		}
		if (isIsoDate(startDate) && isIsoDate(endDate) && endDate < startDate) {
			errors.push(`Termin ${number}: zakończenie nie może być przed rozpoczęciem.`);
		}
		dates.push({ label, startDate, endDate });
	});
	return errors.length > 0 ? { errors } : { data: dates, errors };
}
