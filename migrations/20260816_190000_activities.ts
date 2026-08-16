import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE equipment ADD unavailable_weekends integer DEFAULT false NOT NULL;`);
  await db.run(sql`ALTER TABLE equipment ADD shared_resource_key text;`);
  await db.run(sql`ALTER TABLE bookings ADD instructor_required integer DEFAULT false NOT NULL;`);
  await db.run(sql`PRAGMA foreign_keys=OFF;`);
  await db.run(sql`CREATE TABLE __new_booking_slots (
    equipment_id integer NOT NULL,
    booking_date text NOT NULL,
    start_time text NOT NULL,
    unit_number integer NOT NULL,
    reservation_id text NOT NULL,
    resource_key text NOT NULL,
    PRIMARY KEY (equipment_id, booking_date, start_time, unit_number)
  );`);
  await db.run(sql`INSERT INTO __new_booking_slots (equipment_id, booking_date, start_time, unit_number, reservation_id, resource_key)
    SELECT equipment_id, booking_date, start_time, unit_number, reservation_id, 'activity:' || equipment_id FROM booking_slots;`);
  await db.run(sql`DROP TABLE booking_slots;`);
  await db.run(sql`ALTER TABLE __new_booking_slots RENAME TO booking_slots;`);
  await db.run(sql`PRAGMA foreign_keys=ON;`);
  await db.run(sql`CREATE UNIQUE INDEX booking_slots_reservation_id_idx ON booking_slots (reservation_id);`);
  await db.run(sql`UPDATE equipment SET open_time = '10:00', close_time = '20:00', duration_minutes = MAX(duration_minutes, 60);`);
  await db.run(sql`UPDATE equipment SET unavailable_weekends = true WHERE slug = 'skuter-wodny';`);
  await db.run(sql`UPDATE equipment SET shared_resource_key = 'kort' WHERE slug = 'padel';`);
  await db.run(sql`UPDATE booking_slots SET resource_key = 'kort' WHERE equipment_id = (SELECT id FROM equipment WHERE slug = 'padel');`);
  await db.run(sql`CREATE UNIQUE INDEX booking_slots_resource_idx ON booking_slots (resource_key, booking_date, start_time, unit_number);`);

  await insertActivity(db, "Wakeboard", "wakeboard", "Wakeboard na wyciągu w WAKE & SURF Village.", "Woda", 100, "calm");
  await insertActivity(db, "Narty wodne", "narty-wodne", "Narty wodne z pomocą ekipy WAKE & SURF Village.", "Woda", 110, "calm");
  await insertActivity(db, "Łódź wiosłowa", "lodz-wioslowa", "Spokojne pływanie łodzią wiosłową po Jeziorze Łąckim.", "Woda", 120, "calm");
  await insertActivity(db, "SUP z osadnią", "sup-z-osadnia", "Stabilny SUP z osadnią dla wygodnego pływania po jeziorze.", "Woda", 130, "calm");
  await insertActivity(db, "Motocykl", "motocykl", "Jazda motocyklem — wymagania i szczegóły potwierdza obsługa.", "Ląd", 140, "any");
  await insertActivity(db, "Skutery elektryczne szosowe", "skuter-elektryczny-szosowy", "Elektryczne skutery szosowe na wycieczki po okolicy.", "Ląd", 150, "any");
  await insertActivity(db, "Tenis", "tenis", "Rezerwacja wspólnego kortu do tenisa w WAKE & SURF Village.", "Ląd", 160, "any", "kort");
  await insertActivity(db, "Sauna fińska", "sauna-finska", "Prywatna sauna fińska dla maksymalnie czterech osób.", "Inne", 170, "any");

  await db.run(sql`UPDATE page_content SET content = json_set(
    content,
    '$.title', 'Wybierz aktywność.\nZarezerwuj termin.',
    '$.description', 'Wybierz aktywność i wolny termin. Asia potwierdzi rezerwację, a jeśli potrzebujesz — zapewnimy instruktora.'
  ) WHERE page = 'reservations' AND json_extract(content, '$.title') = 'Sprzęt czeka.\nWybierz godzinę.';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX booking_slots_resource_idx;`);
  await db.run(sql`ALTER TABLE booking_slots DROP COLUMN resource_key;`);
  await db.run(sql`ALTER TABLE bookings DROP COLUMN instructor_required;`);
  await db.run(sql`ALTER TABLE equipment DROP COLUMN shared_resource_key;`);
  await db.run(sql`ALTER TABLE equipment DROP COLUMN unavailable_weekends;`);
}

async function insertActivity(
  db: MigrateUpArgs["db"],
  name: string,
  slug: string,
  description: string,
  category: string,
  sortOrder: number,
  weatherProfile: "any" | "calm",
  sharedResourceKey?: string,
) {
  const calm = weatherProfile === "calm";
  await db.run(sql`INSERT OR IGNORE INTO equipment (
    name, slug, description, category, quantity, duration_minutes, open_time, close_time,
    sort_order, active, weather_profile, recommended_start1, recommended_end1,
    recommended_start2, recommended_end2, recommendation_note,
    wind_medium_min_kmh, wind_medium_max_kmh, wind_best_min_kmh, wind_best_max_kmh,
    unavailable_weekends, shared_resource_key
  ) VALUES (
    ${name}, ${slug}, ${description}, ${category}, 1, 60, '10:00', '20:00',
    ${sortOrder}, true, ${weatherProfile}, ${calm ? "10:00" : null}, ${calm ? "12:00" : null},
    ${calm ? "18:00" : null}, ${calm ? "20:00" : null}, ${calm ? "Najlepsze warunki są zwykle rano i wieczorem." : null},
    0, ${calm ? 16 : 100}, 0, ${calm ? 10 : 100}, false, ${sharedResourceKey || null}
  );`);
}
