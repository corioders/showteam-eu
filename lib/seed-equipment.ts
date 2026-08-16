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
  ["Wakeboard", "wakeboard", "Wakeboard na wyciągu w WAKE & SURF Village.", "Woda"],
  ["Narty wodne", "narty-wodne", "Narty wodne z pomocą ekipy WAKE & SURF Village.", "Woda"],
  ["Łódź wiosłowa", "lodz-wioslowa", "Spokojne pływanie łodzią wiosłową po Jeziorze Łąckim.", "Woda"],
  ["SUP z osadnią", "sup-z-osadnia", "Stabilny SUP z osadnią dla wygodnego pływania po jeziorze.", "Woda"],
  ["Motocykl", "motocykl", "Jazda motocyklem — wymagania i szczegóły potwierdza obsługa.", "Ląd"],
  ["Skuter elektryczny szosowy", "skuter-elektryczny-szosowy", "Elektryczny skuter szosowy na wycieczki po okolicy.", "Ląd"],
  ["Tenis", "tenis", "Rezerwacja wspólnego kortu do tenisa w WAKE & SURF Village.", "Ląd"],
  ["Sauna fińska", "sauna-finska", "Prywatna sauna fińska dla maksymalnie czterech osób.", "Inne"],
] as const;

function recommendations(slug: string) {
  if (["sup", "kajak", "wakeboard", "narty-wodne", "lodz-wioslowa", "sup-z-osadnia"].includes(slug)) return { weatherProfile: "calm" as const, windMediumMinKmh: 0, windMediumMaxKmh: 16, windBestMinKmh: 0, windBestMaxKmh: 10, recommendedStart1: "10:00", recommendedEnd1: "12:00", recommendedStart2: "18:00", recommendedEnd2: "20:00", recommendationNote: "Rano i wieczorem jezioro jest zwykle spokojniejsze." };
  if (["hobie-cat", "lodz-zaglowa", "windsurfing", "wing-foil"].includes(slug)) return { weatherProfile: "wind" as const, windMediumMinKmh: 8, windMediumMaxKmh: 32, windBestMinKmh: 12, windBestMaxKmh: 25, professionalWindMinKmh: 26, recommendedStart1: "10:00", recommendedEnd1: "20:00", recommendationNote: "W ciągu dnia zwykle pojawia się najlepszy wiatr." };
  return { weatherProfile: "any" as const, windMediumMinKmh: 0, windMediumMaxKmh: 100, windBestMinKmh: 0, windBestMaxKmh: 100 };
}

export async function seedEquipment(payload: Awaited<ReturnType<typeof getPayload>>) {
  for (const [index, [name, slug, description, category]] of equipment.entries()) {
    if ((await payload.count({ collection: "equipment", where: { slug: { equals: slug } } })).totalDocs) continue;
    await payload.create({ collection: "equipment", data: {
      name, slug, description, category, quantity: 1, durationMinutes: 60,
      openTime: "10:00", closeTime: "20:00", unavailableWeekends: slug === "skuter-wodny", sharedResourceKey: ["padel", "tenis"].includes(slug) ? "kort" : undefined, sortOrder: (index + 1) * 10, active: true,
      ...recommendations(slug),
      notice: slug === "skuter-wodny" ? "Obsługa potwierdzi wymagane uprawnienia przed wydaniem sprzętu." : undefined,
    } });
  }
}
