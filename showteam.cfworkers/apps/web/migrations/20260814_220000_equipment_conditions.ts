import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`UPDATE equipment
    SET weather_profile = 'calm',
        recommended_start1 = '07:00', recommended_end1 = '09:00',
        recommended_start2 = '19:00', recommended_end2 = '21:00',
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE slug IN ('sup', 'kajak');`);
	await db.run(sql`UPDATE equipment
    SET weather_profile = 'wind',
        recommended_start1 = '09:00', recommended_end1 = '19:00',
        recommended_start2 = NULL, recommended_end2 = NULL,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE slug IN ('hobie-cat', 'lodz-zaglowa', 'windsurfing', 'wing-foil');`);
	await db.run(sql`UPDATE equipment
    SET weather_profile = 'any',
        recommended_start1 = NULL, recommended_end1 = NULL,
        recommended_start2 = NULL, recommended_end2 = NULL,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE slug = 'skuter-wodny';`);
	await db.run(sql`INSERT INTO equipment
    (name, slug, description, category, quantity, duration_minutes, open_time, close_time, sort_order, active, weather_profile)
    SELECT 'Padel', 'padel', 'Kort i sprzęt do padla w bazie SHOWteam.', 'Ląd', 1, 60, '09:00', '19:00', 75, 1, 'any'
    WHERE NOT EXISTS (SELECT 1 FROM equipment WHERE slug = 'padel');`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DELETE FROM equipment WHERE slug = 'padel' AND name = 'Padel' AND description = 'Kort i sprzęt do padla w bazie SHOWteam.';`);
}
