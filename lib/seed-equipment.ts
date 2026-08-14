import type { getPayload } from "payload";

const equipment = [
  ["SUP", "sup", "Deska SUP do samodzielnego pływania po Jeziorze Łąckim.", "Woda"],
  ["Kajak", "kajak", "Kajak rekreacyjny na spokojny czas na wodzie.", "Woda"],
  ["Hobie Cat", "hobie-cat", "Sportowy katamaran żaglowy z bazy SHOWteam.", "Woda"],
  ["Łódź żaglowa", "lodz-zaglowa", "Rekreacyjne żeglowanie po Jeziorze Łąckim.", "Woda"],
  ["Windsurfing", "windsurfing", "Zestaw windsurfingowy dopasowany do warunków i poziomu.", "Woda"],
  ["Wing foil", "wing-foil", "Sprzęt wing foil dla osób z odpowiednim doświadczeniem.", "Woda"],
  ["Skuter wodny", "skuter-wodny", "Skuter wodny — szczegóły i wymagane uprawnienia potwierdza obsługa.", "Woda"],
  ["Padel", "padel", "Kort i sprzęt do padla w bazie SHOWteam.", "Ląd"],
  ["Rower elektryczny", "rower-elektryczny", "E-bike na wycieczki po okolicy Poręby.", "Ląd"],
] as const;

function recommendations(slug: string) {
  if (["sup", "kajak"].includes(slug)) return { weatherProfile: "calm" as const, recommendedStart1: "07:00", recommendedEnd1: "09:00", recommendedStart2: "19:00", recommendedEnd2: "21:00", recommendationNote: "Rano i wieczorem jezioro jest zwykle spokojniejsze." };
  if (["hobie-cat", "lodz-zaglowa", "windsurfing", "wing-foil"].includes(slug)) return { weatherProfile: "wind" as const, recommendedStart1: "09:00", recommendedEnd1: "19:00", recommendationNote: "W ciągu dnia zwykle pojawia się najlepszy wiatr." };
  return { weatherProfile: "any" as const };
}

export async function seedEquipment(payload: Awaited<ReturnType<typeof getPayload>>) {
  if ((await payload.count({ collection: "equipment" })).totalDocs) return;
  for (const [index, [name, slug, description, category]] of equipment.entries()) {
    await payload.create({ collection: "equipment", data: {
      name, slug, description, category, quantity: 1, durationMinutes: 60,
      openTime: "09:00", closeTime: "19:00", sortOrder: (index + 1) * 10, active: true,
      ...recommendations(slug),
      notice: slug === "skuter-wodny" ? "Obsługa potwierdzi wymagane uprawnienia przed wydaniem sprzętu." : undefined,
    } });
  }
}
