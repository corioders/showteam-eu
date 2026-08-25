import { describe, expect, it } from "vitest";

import { parseFocalPoints } from "../../src/lib/gallery-focal";

describe("gallery focal points", () => {
	it("validates and clamps every uploaded file focal point", () => {
		expect(
			parseFocalPoints(
				JSON.stringify([
					{ x: 12.4, y: 89.6 },
					{ x: -5, y: 120 },
				]),
				2,
			),
		).toEqual([
			{ x: 12, y: 90 },
			{ x: 0, y: 100 },
		]);
	});

	it("uses a centered crop for missing or malformed values", () => {
		expect(parseFocalPoints("nope", 2)).toEqual([
			{ x: 50, y: 50 },
			{ x: 50, y: 50 },
		]);
		expect(parseFocalPoints(JSON.stringify([{ x: 25 }]), 2)).toEqual([
			{ x: 25, y: 50 },
			{ x: 50, y: 50 },
		]);
	});
});
