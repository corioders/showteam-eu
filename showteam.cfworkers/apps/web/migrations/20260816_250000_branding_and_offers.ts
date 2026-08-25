import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`UPDATE offers SET
    title = 'Lato 2026/2027', season = 'Sezon 2026/2027', location = 'WAKE & SURF Village · Poręba'
    WHERE slug = 'lato';`);
	await db.run(sql`UPDATE offers SET
    title = 'Zima 2026/2027', season = 'Sezon 2026/2027',
    summary = 'Rodzinne tygodnie na stoku: szkolenie, sport, włoskie przysmaki i après-ski w wydaniu SHOWteam.'
    WHERE slug = 'zima';`);
	await db.run(sql`UPDATE offers SET
    summary = 'Kurs sternika motorowodnego, żeglarza jachtowego i operatora radiowego oraz praktyczne szkolenia z aktywności dostępnych w bazie.'
    WHERE slug = 'szkolenia';`);
	await db.run(sql`UPDATE offers SET location = 'WAKE & SURF Village · Poręba' WHERE slug = 'noclegi-nad-woda';`);

	await db.run(sql`DELETE FROM offers_dates WHERE _parent_id IN (SELECT id FROM offers WHERE slug IN ('lato', 'zima'));`);
	await db.run(sql`INSERT INTO offers_dates (_order, _parent_id, id, label, start_date, end_date)
    SELECT 1, id, 'pireneje-2027', 'Pireneje', '2027-03-14', '2027-03-25' FROM offers WHERE slug = 'zima';`);

	await db.run(sql`DELETE FROM offers_highlights WHERE _parent_id IN (SELECT id FROM offers WHERE slug IN ('zima', 'szkolenia'));`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 1, id, 'zima-trentino', 'Trentino' FROM offers WHERE slug = 'zima';`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 2, id, 'zima-andorra', 'Andorra i Pireneje' FROM offers WHERE slug = 'zima';`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 3, id, 'zima-lodowiec', 'Lodowiec w listopadzie' FROM offers WHERE slug = 'zima';`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 1, id, 'szkolenie-motorowodne', 'Sternik motorowodny' FROM offers WHERE slug = 'szkolenia';`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 2, id, 'szkolenie-zeglarz', 'Żeglarz jachtowy' FROM offers WHERE slug = 'szkolenia';`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 3, id, 'szkolenie-radio', 'Operator radiowy' FROM offers WHERE slug = 'szkolenia';`);

	await db.run(sql`UPDATE offers SET page_content = json_set(
    page_content,
    '$.summerDatesEyebrow', 'Lato 2026/2027',
    '$.summerDatesTitle', 'Nowe',
    '$.summerDatesAccent', 'turnusy.',
    '$.summerDatesBody', 'Terminy Gardy, Poręby i letnich wyjazdów opublikujemy wkrótce.',
    '$.summerFaqBaseTitle', 'WAKE & SURF Village'
  ) WHERE slug = 'lato';`);
	await db.run(sql`UPDATE offers SET page_content = json_set(
    page_content,
    '$.winterDatesBadge', 'Zima 2026/2027',
    '$.winterDatesTitle', 'Śnieg',
    '$.winterDatesAccent', 'bez granic.',
    '$.winterDatesBody', 'Trentino, Andorra i lodowiec w listopadzie. Kolejne terminy pojawią się wkrótce.',
    '$.winterPackageTitle', 'Jazda. Przysmaki.',
    '$.winterAndorraBadge', 'Pireneje 2027',
    '$.winterAndorraDate', '14–25 marca 2027'
  ) WHERE slug = 'zima';`);

	await db.run(sql`UPDATE page_content SET content = json_set(
    content,
    '$.heroBadge', 'Sezon 2026/2027',
    '$.partnersEyebrow', 'Partnerstwa',
    '$.partnersTitle', 'Razem robimy więcej.',
    '$.partnersBody', 'Współpracujemy ze specjalistami, którzy uzupełniają aktywne projekty SHOWteam.',
    '$.droneTitle', 'Filmowanie dronem · Tomek',
    '$.droneBody', 'Ujęcia z powietrza dla sportu, wyjazdów, wydarzeń i marek. Szczegóły współpracy ustalamy indywidualnie.',
    '$.droneCta', 'Zapytaj o filmowanie'
  ) WHERE page = 'home';`);
	await db.run(sql`UPDATE page_content SET content = json_set(
    content,
    '$.locationName', 'WAKE & SURF Village',
    '$.aboutBody2', replace(json_extract(content, '$.aboutBody2'), 'Wake & Surf Village', 'WAKE & SURF Village')
  ) WHERE page = 'contact';`);
	await db.run(sql`UPDATE page_content SET content = json_set(content, '$.eyebrow', 'WAKE & SURF Village · Poręba') WHERE page = 'reservations';`);
	await db.run(sql`UPDATE equipment SET name = 'Skutery elektryczne szosowe' WHERE slug = 'skuter-elektryczny-szosowy';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DELETE FROM offers_dates WHERE id = 'pireneje-2027';`);
	await db.run(sql`UPDATE offers SET title = 'SHOWlato 2026', season = 'Sezon 2026', location = 'Wake & Surf Village · Poręba' WHERE slug = 'lato';`);
	await db.run(sql`UPDATE offers SET title = 'SHOWzima 2026', season = 'Sezon 2026' WHERE slug = 'zima';`);
	await db.run(sql`UPDATE offers SET location = 'Wake & Surf Village · Poręba' WHERE slug = 'noclegi-nad-woda';`);
	await db.run(sql`UPDATE equipment SET name = 'Skuter elektryczny szosowy' WHERE slug = 'skuter-elektryczny-szosowy';`);
}
