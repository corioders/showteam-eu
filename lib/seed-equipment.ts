import type { getPayload } from "payload";

const equipment = [
  ["SUP", "sup", "Deska SUP do samodzielnego pływania po Jeziorze Łąckim.", "Woda"],
  ["Kajak", "kajak", "Kajak rekreacyjny na spokojny czas na wodzie.", "Woda"],
  ["Hobie Cat", "hobie-cat", "Sportowy katamaran żaglowy z bazy SHOWteam.", "Woda"],
  ["Łódź żaglowa", "lodz-zaglowa", "Rekreacyjne żeglowanie po Jeziorze Łąckim.", "Woda"],
  ["Windsurfing", "windsurfing", "Zestaw windsurfingowy dopasowany do warunków i poziomu.", "Woda"],
  ["Wing foil", "wing-foil", "Sprzęt wing foil dla osób z odpowiednim doświadczeniem.", "Woda"],
  ["Skuter wodny", "skuter-wodny", "Skuter wodny — szczegóły i wymagane uprawnienia potwierdza obsługa.", "Woda"],
  ["Rower elektryczny", "rower-elektryczny", "E-bike na wycieczki po okolicy Poręby.", "Ląd"],
] as const;

export async function seedEquipment(payload: Awaited<ReturnType<typeof getPayload>>) {
  if ((await payload.count({ collection: "equipment" })).totalDocs) return;
  for (const [index, [name, slug, description, category]] of equipment.entries()) {
    await payload.create({ collection: "equipment", data: {
      name, slug, description, category, quantity: 1, durationMinutes: 60,
      openTime: "09:00", closeTime: "19:00", sortOrder: (index + 1) * 10, active: true,
      notice: slug === "skuter-wodny" ? "Obsługa potwierdzi wymagane uprawnienia przed wydaniem sprzętu." : undefined,
    } });
  }
}
