import { describe, expect, it } from "vitest";
import { applicationAge, applicationReference, csvCell, safeSpreadsheetCell } from "../../lib/applications";

describe("application exports", () => {
  it("creates short readable references", () => {
    expect(applicationReference("12345678-aaaa-bbbb-cccc-123456789012")).toBe("ZGL-12345678");
  });

  it("escapes quotes and spreadsheet formulas", () => {
    expect(safeSpreadsheetCell("=1+1")).toBe("'=1+1");
    expect(csvCell('Asia "SHOW"')).toBe('"Asia ""SHOW"""');
  });

  it("calculates age from the exact birth date", () => {
    expect(applicationAge("2000-08-14T12:00:00.000Z", "2026-08-14")).toBe(26);
    expect(applicationAge("2000-08-15T12:00:00.000Z", "2026-08-14")).toBe(25);
  });
});
