import { describe, expect, it } from "vitest";
import { applicationAge, applicationDisciplinesForCategory, applicationHasSportDetails, applicationReference, csvCell, normalizeEmail, participantIdentity, safeSpreadsheetCell } from "../../lib/applications";

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

  it("normalizes addresses used for newsletter deduplication", () => {
    expect(normalizeEmail(" Asia@SHOWteam.eu ")).toBe("asia@showteam.eu");
  });

  it("identifies a participant by their own email when available", () => {
    expect(participantIdentity({ email: "rodzic@example.com", participantEmail: " UCZESTNIK@example.com ", participantName: "Jan Kowalski", birthDate: "2010-01-02" })).toBe("email:uczestnik@example.com");
  });

  it("does not merge siblings sharing a contact email", () => {
    const first = participantIdentity({ email: "rodzic@example.com", participantName: "Jan Kowalski", birthDate: "2010-01-02" });
    const second = participantIdentity({ email: "rodzic@example.com", participantName: "Anna Kowalska", birthDate: "2012-03-04" });
    expect(first).not.toBe(second);
  });

  it("only asks for sport details when they apply", () => {
    expect(applicationDisciplinesForCategory("Lato")).toEqual(["Sporty wodne", "Inne"]);
    expect(applicationDisciplinesForCategory("Zima")).toEqual(["Narty", "Snowboard", "Inne"]);
    expect(applicationDisciplinesForCategory("Szkolenia")).toEqual([]);
    expect(applicationHasSportDetails("Szkolenia")).toBe(false);
  });
});
