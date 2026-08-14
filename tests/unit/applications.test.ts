import { describe, expect, it } from "vitest";
import { applicationReference, csvCell, safeSpreadsheetCell } from "../../lib/applications";

describe("application exports", () => {
  it("creates short readable references", () => {
    expect(applicationReference("12345678-aaaa-bbbb-cccc-123456789012")).toBe("ZGL-12345678");
  });

  it("escapes quotes and spreadsheet formulas", () => {
    expect(safeSpreadsheetCell("=1+1")).toBe("'=1+1");
    expect(csvCell('Asia "SHOW"')).toBe('"Asia ""SHOW"""');
  });
});
