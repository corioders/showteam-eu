import { describe, expect, it } from "vitest";
import { parseEditableEquipment } from "../../lib/editor-equipment";

const valid = {
  name: "SUP", description: "Deska SUP na Jezioro Łąckie.", category: "Woda", quantity: 4,
  durationMinutes: 60, openTime: "08:00", closeTime: "20:00", notice: "", active: true,
  weatherProfile: "calm", recommendedStart1: "07:00", recommendedEnd1: "09:00", recommendedStart2: "19:00", recommendedEnd2: "21:00",
  windMediumMinKmh: 0, windMediumMaxKmh: 16, windBestMinKmh: 0, windBestMaxKmh: 10, professionalWindMinKmh: "", recommendationNote: "Rano jest spokojniej.",
};

describe("visual equipment editor", () => {
  it("accepts complete equipment settings", () => {
    expect(parseEditableEquipment(valid).data).toMatchObject({ name: "SUP", quantity: 4, weatherProfile: "calm", professionalWindMinKmh: null });
  });

  it("rejects impossible hours and wind ranges", () => {
    const result = parseEditableEquipment({ ...valid, openTime: "20:00", closeTime: "08:00", windBestMaxKmh: 30 });
    expect(result.errors).toEqual(expect.arrayContaining(["Godzina końca musi być późniejsza niż godzina początku.", "Najlepszy zakres wiatru musi mieścić się wewnątrz średniego zakresu."]));
  });

  it("allows a professional threshold only above the wind range", () => {
    expect(parseEditableEquipment({ ...valid, weatherProfile: "wind", windMediumMaxKmh: 32, windBestMinKmh: 12, windBestMaxKmh: 25, professionalWindMinKmh: 28 }).data?.professionalWindMinKmh).toBe(28);
    expect(parseEditableEquipment({ ...valid, professionalWindMinKmh: 28 }).errors).toContain("Próg profesjonalny działa tylko dla sprzętu wymagającego wiatru i musi być wyższy od najlepszego zakresu.");
  });
});
