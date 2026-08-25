import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`INSERT INTO offers (title, slug, category, season, sort_order, location, summary, static_image, published)
    SELECT
      'Noclegi nad wodą',
      'noclegi-nad-woda',
      'Noclegi',
      'Pobyt nad wodą',
      40,
      'Wake & Surf Village · Poręba',
      'Wynajem kontenerów mieszkalnych i domków holenderskich przy bazie SHOWteam nad Jeziorem Łąckim. O dostępność i warunki pobytu zapytaj bezpośrednio.',
      'stay',
      true
    WHERE NOT EXISTS (SELECT 1 FROM offers WHERE slug = 'noclegi-nad-woda');`);

	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 1, id, 'waterfront-stays-containers', 'Kontenery mieszkalne' FROM offers WHERE slug = 'noclegi-nad-woda'
    AND NOT EXISTS (SELECT 1 FROM offers_highlights WHERE id = 'waterfront-stays-containers');`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 2, id, 'waterfront-stays-mobile-homes', 'Domki holenderskie' FROM offers WHERE slug = 'noclegi-nad-woda'
    AND NOT EXISTS (SELECT 1 FROM offers_highlights WHERE id = 'waterfront-stays-mobile-homes');`);
	await db.run(sql`INSERT INTO offers_highlights (_order, _parent_id, id, text)
    SELECT 3, id, 'waterfront-stays-location', 'Lokalizacja nad wodą' FROM offers WHERE slug = 'noclegi-nad-woda'
    AND NOT EXISTS (SELECT 1 FROM offers_highlights WHERE id = 'waterfront-stays-location');`);
	await db.run(sql`INSERT INTO offers_sections (_order, _parent_id, id, title, body)
    SELECT 1, id, 'waterfront-stays-photos', 'Zdjęcia obiektów', 'Zdjęcia kontenerów i domków dodamy po sesji. Aktualne informacje otrzymasz bezpośrednio od SHOWteam.' FROM offers WHERE slug = 'noclegi-nad-woda'
    AND NOT EXISTS (SELECT 1 FROM offers_sections WHERE id = 'waterfront-stays-photos');`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DELETE FROM offers_highlights WHERE id LIKE 'waterfront-stays-%';`);
	await db.run(sql`DELETE FROM offers_sections WHERE id = 'waterfront-stays-photos';`);
	await db.run(sql`DELETE FROM offers WHERE slug = 'noclegi-nad-woda';`);
}
