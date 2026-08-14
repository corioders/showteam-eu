import { describe, expect, it } from "vitest";
import { isWindForecastDate, recommendSlot, weatherProfileLabel } from "../../lib/wind-recommendations";

describe("weather-aware booking recommendations", () => {
  it("recommends a calm forecast for SUP inside the configured window", () => {
    expect(recommendSlot({ time: "08:00", durationMinutes: 60, profile: "calm", windows: [{ start: "07:00", end: "09:00" }], forecast: { time: "2026-08-15T08:00", speedKmh: 6, gustKmh: 9 } })).toMatchObject({ recommended: true, level: "best", basis: "forecast" });
  });

  it("does not recommend windy weather for calm-water equipment", () => {
    expect(recommendSlot({ time: "08:00", durationMinutes: 60, profile: "calm", windows: [{ start: "07:00", end: "09:00" }], forecast: { time: "2026-08-15T08:00", speedKmh: 22, gustKmh: 30 } })).toMatchObject({ recommended: false, level: "poor", basis: "forecast", label: "Słaby warun" });
  });

  it("recommends wind for a catamaran even outside its typical window", () => {
    expect(recommendSlot({ time: "19:00", durationMinutes: 60, profile: "wind", windows: [{ start: "09:00", end: "19:00" }], forecast: { time: "2026-08-15T19:00", speedKmh: 18, gustKmh: 24 } })).toMatchObject({ recommended: true, level: "medium", basis: "forecast" });
  });

  it("uses the crew's typical window when a long-range forecast does not exist", () => {
    expect(recommendSlot({ time: "19:00", durationMinutes: 60, profile: "calm", windows: [{ start: "19:00", end: "21:00" }] })).toMatchObject({ recommended: true, level: "medium", basis: "typical", label: "Średni warun" });
  });

  it("marks very strong wind as professional for wind equipment", () => {
    expect(recommendSlot({ time: "13:00", durationMinutes: 60, profile: "wind", windows: [{ start: "09:00", end: "19:00" }], forecast: { time: "2026-08-15T13:00", speedKmh: 28, gustKmh: 41 } })).toMatchObject({ recommended: false, level: "professional", label: "Warun profesjonalny" });
  });

  it("labels every slot for equipment that works in any weather", () => {
    expect(recommendSlot({ time: "13:00", durationMinutes: 60, profile: "any", windows: [] })).toMatchObject({ recommended: true, level: "best", label: "Dobry w każdy warun" });
  });

  it("uses weather only up to seven days ahead", () => {
    expect(isWindForecastDate("2026-08-21", "2026-08-14")).toBe(true);
    expect(isWindForecastDate("2026-08-22", "2026-08-14")).toBe(false);
  });

  it("labels the best conditions before a customer chooses equipment", () => {
    expect(weatherProfileLabel("calm")).toBe("Najlepszy warun · spokojna woda");
    expect(weatherProfileLabel("wind")).toBe("Najlepszy warun · wiatr");
    expect(weatherProfileLabel("any")).toBe("Dobry w każdy warun");
  });
});
