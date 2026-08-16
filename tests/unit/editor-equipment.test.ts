import { describe, expect, it } from "vitest";
import { parseEditableEquipment } from "../../lib/editor-equipment";

const valid = {
  name: "SUP", description: "Deska SUP na Jezioro Łąckie.", category: "Woda", quantity: 4,
  durationMinutes: 60, unavailableWeekends: false, notice: "", active: true,
  weatherProfile: "calm", recommendedStart1: "07:00", recommendedEnd1: "09:00", recommendedStart2: "19:00", recommendedEnd2: "21:00",
  windMediumMinKmh: 0, windMediumMaxKmh: 16, windBestMinKmh: 0, windBestMaxKmh: 10, professionalWindMinKmh: "", recommendationNote: "Rano jest spokojniej.",
  sortOrder: 100,
};

describe("visual equipment editor", () => {
  it("accepts complete equipment settings", () => {
    expect(parseEditableEquipment(valid).data).toMatchObject({ name: "SUP", quantity: 4, openTime: "10:00", closeTime: "20:00", unavailableWeekends: false, weatherProfile: "calm", professionalWindMinKmh: null });
  });

  it("rejects short reservations and impossible wind ranges", () => {
    const result = parseEditableEquipment({ ...valid, durationMinutes: 45, windBestMaxKmh: 30 });
    expect(result.errors).toEqual(expect.arrayContaining(["Czas rezerwacji musi wynosić od 60 do 720 minut.", "Najlepszy zakres wiatru musi mieścić się wewnątrz średniego zakresu."]));
  });

  it("allows a professional threshold only above the wind range", () => {
    expect(parseEditableEquipment({ ...valid, weatherProfile: "wind", windMediumMaxKmh: 32, windBestMinKmh: 12, windBestMaxKmh: 25, professionalWindMinKmh: 28 }).data?.professionalWindMinKmh).toBe(28);
    expect(parseEditableEquipment({ ...valid, professionalWindMinKmh: 28 }).errors).toContain("Próg profesjonalny działa tylko dla aktywności wymagającej wiatru i musi być wyższy od najlepszego zakresu.");
  });
});
