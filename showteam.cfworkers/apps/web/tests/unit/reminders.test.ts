// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
import { describe, expect, it } from "vitest";

import { newReminderToken, polishDateParts, reminderTokenHash } from "../../src/lib/reminders";

describe("reservation reminders", () => {
	it("creates an unguessable URL-safe token and stable hash", async () => {
		const token = newReminderToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
		expect(await reminderTokenHash(token)).toHaveLength(64);
		expect(await reminderTokenHash(token)).toBe(await reminderTokenHash(token));
	});

	it("uses Warsaw time across daylight-saving changes", () => {
		expect(polishDateParts(new Date("2026-03-29T07:30:00Z"))).toEqual({ date: "2026-03-29", hour: 9 });
		expect(polishDateParts(new Date("2026-12-01T08:00:00Z"))).toEqual({ date: "2026-12-01", hour: 9 });
	});
});
