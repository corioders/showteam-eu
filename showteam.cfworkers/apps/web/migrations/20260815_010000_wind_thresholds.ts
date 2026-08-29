import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`ALTER TABLE equipment ADD COLUMN wind_medium_min_kmh numeric NOT NULL DEFAULT 0;`);
	await db.run(sql`ALTER TABLE equipment ADD COLUMN wind_medium_max_kmh numeric NOT NULL DEFAULT 16;`);
	await db.run(sql`ALTER TABLE equipment ADD COLUMN wind_best_min_kmh numeric NOT NULL DEFAULT 0;`);
	await db.run(sql`ALTER TABLE equipment ADD COLUMN wind_best_max_kmh numeric NOT NULL DEFAULT 10;`);
	await db.run(sql`ALTER TABLE equipment ADD COLUMN professional_wind_min_kmh numeric;`);

	await db.run(sql`UPDATE equipment
    SET wind_medium_min_kmh = 8,
        wind_medium_max_kmh = 32,
        wind_best_min_kmh = 12,
        wind_best_max_kmh = 25,
        professional_wind_min_kmh = 26
    WHERE weather_profile = 'wind';`);
	await db.run(sql`UPDATE equipment
    SET wind_medium_min_kmh = 0,
        wind_medium_max_kmh = 100,
        wind_best_min_kmh = 0,
        wind_best_max_kmh = 100,
        professional_wind_min_kmh = NULL
    WHERE weather_profile = 'any';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`ALTER TABLE equipment DROP COLUMN professional_wind_min_kmh;`);
	await db.run(sql`ALTER TABLE equipment DROP COLUMN wind_best_max_kmh;`);
	await db.run(sql`ALTER TABLE equipment DROP COLUMN wind_best_min_kmh;`);
	await db.run(sql`ALTER TABLE equipment DROP COLUMN wind_medium_max_kmh;`);
	await db.run(sql`ALTER TABLE equipment DROP COLUMN wind_medium_min_kmh;`);
}
