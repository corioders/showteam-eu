import { describe, expect, it } from "vitest";

import { normalizeShadcnSource } from "../script/shadcn/codemods.js";

describe("Shadcnblocks codemods", () => {
	it("preserves throw behavior with a scoped lint suppression", () => {
		const input = `export function copy(value: string) {\n\tif (!value) {\n\t\tthrow new Error("Missing value");\n\t}\n}\n`;
		const normalized = normalizeShadcnSource(input, "copy-button.tsx");

		expect(normalized).toContain("biome-ignore lint/plugin/no-throw");
		expect(normalized).toContain('throw new Error("Missing value")');
	});

	it("is idempotent", () => {
		const input = `export function fail() {\n\tthrow new Error("Failure");\n}\n`;
		const normalized = normalizeShadcnSource(input, "failure.ts");

		expect(normalizeShadcnSource(normalized, "failure.ts")).toBe(normalized);
	});

	it("does not touch unsupported files", () => {
		const input = ".card { content: 'throw new Error()'; }";

		expect(normalizeShadcnSource(input, "styles.css")).toBe(input);
	});

	it("adapts Base UI and Recharts dashboard source", () => {
		const source = `"use client";\nimport type { TooltipProps } from "recharts";\nfunction Tooltip({ payload }: TooltipProps<number, string>) {\n\tif (!payload?.length) return null;\n}\n`;
		const normalized = normalizeShadcnSource(source, "dashboard9.tsx");

		expect(normalized).toContain("TooltipContentProps");
		expect(normalized).toContain("payload === undefined || payload.length === 0");
		expect(normalized).toContain("biome-ignore-all lint/performance/noImgElement");
	});
});
