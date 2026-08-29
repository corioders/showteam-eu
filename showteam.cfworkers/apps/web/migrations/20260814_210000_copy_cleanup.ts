import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

const eventBefore = "Ostatni opublikowany turnus sezonu 2026 nad Jeziorem Łąckim. Skontaktuj się z SHOWteam, aby potwierdzić aktualną dostępność.";
const eventAfter = "Finałowy turnus SHOWCamp 2026 nad Jeziorem Łąckim: sporty wodne, aktywność i wspólny czas w bazie SHOWteam.";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`DELETE FROM offers_sections
    WHERE id = 'waterfront-stays-photos'
      AND body = 'Zdjęcia kontenerów i domków dodamy po sesji. Aktualne informacje otrzymasz bezpośrednio od SHOWteam.';`);
	await db.run(sql`UPDATE events
    SET image_id = (SELECT id FROM media WHERE filename = '3c23975e-72d9-4cf8-b952-a32b380db7a3-1.jpeg' LIMIT 1)
    WHERE title = 'SHOWCamp — Turnus V' AND image_id IS NULL
      AND EXISTS (SELECT 1 FROM media WHERE filename = '3c23975e-72d9-4cf8-b952-a32b380db7a3-1.jpeg');`);
	await db.run(sql`UPDATE events SET summary = ${eventAfter}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE summary = ${eventBefore};`);
	await db.run(sql`UPDATE gallery
    SET caption = 'Chwila w bazie', alt = 'Chwila odpoczynku w bazie SHOWteam', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE caption = 'image' AND alt = 'image';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`INSERT INTO offers_sections (_order, _parent_id, id, title, body)
    SELECT 1, id, 'waterfront-stays-photos', 'Zdjęcia obiektów', 'Zdjęcia kontenerów i domków dodamy po sesji. Aktualne informacje otrzymasz bezpośrednio od SHOWteam.'
    FROM offers WHERE slug = 'noclegi-nad-woda'
    AND NOT EXISTS (SELECT 1 FROM offers_sections WHERE id = 'waterfront-stays-photos');`);
	await db.run(sql`UPDATE events SET image_id = NULL
    WHERE title = 'SHOWCamp — Turnus V'
      AND image_id = (SELECT id FROM media WHERE filename = '3c23975e-72d9-4cf8-b952-a32b380db7a3-1.jpeg' LIMIT 1);`);
	await db.run(sql`UPDATE events SET summary = ${eventBefore}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE summary = ${eventAfter};`);
	await db.run(sql`UPDATE gallery SET caption = 'image', alt = 'image', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE caption = 'Chwila w bazie' AND alt = 'Chwila odpoczynku w bazie SHOWteam';`);
}
