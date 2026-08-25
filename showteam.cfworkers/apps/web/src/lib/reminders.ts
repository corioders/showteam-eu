export async function reminderTokenHash(token: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function newReminderToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return base64Url(bytes);
}

export async function sendReminderSms(input: { phone: string; activity: string; time: string; token: string }): Promise<{ sent: boolean; error?: string }> {
	const accessToken = process.env.SMSAPI_ACCESS_TOKEN;
	if (!accessToken) {
		return { sent: false, error: "SMSAPI_ACCESS_TOKEN is not configured" };
	}
	const base = process.env.PUBLIC_SITE_URL || "https://www.showteam.eu";
	const confirm = `${base}/r/${input.token}/tak`;
	const cancel = `${base}/r/${input.token}/nie`;
	const message = `SHOWteam: jutro ${plainSms(input.activity)} ${input.time}. Potwierdz ${confirm} Anuluj ${cancel}`;
	const body = new URLSearchParams({ to: input.phone.replace(/^\+/, ""), message, format: "json", encoding: "utf-8" });
	if (process.env.SMSAPI_SENDER) {
		body.set("from", process.env.SMSAPI_SENDER);
	}
	const response = await fetch("https://api.smsapi.pl/sms.do", {
		method: "POST",
		headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});
	if (!response.ok) {
		return { sent: false, error: `SMSAPI HTTP ${response.status}` };
	}
	const result = (await response.json().catch(() => null)) as { error?: number; list?: unknown[] } | null;
	return result?.error || result?.list?.length === 0 ? { sent: false, error: `SMSAPI error ${result?.error || "unknown"}` } : { sent: true };
}

export function polishDateParts(date = new Date()): { date: string; hour: number } {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Warsaw",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		hour12: false,
	}).formatToParts(date);
	const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
	return { date: `${value("year")}-${value("month")}-${value("day")}`, hour: Number(value("hour")) };
}

function base64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function plainSms(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\w .-]/g, "")
		.slice(0, 40);
}
