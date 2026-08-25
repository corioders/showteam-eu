import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`CREATE TABLE availability_blocks (
    id text PRIMARY KEY NOT NULL,
    equipment_id integer,
    booking_date text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    reason text,
    created_at integer NOT NULL
  );`);
	await db.run(sql`CREATE INDEX availability_blocks_date_equipment_idx ON availability_blocks (booking_date, equipment_id);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP TABLE availability_blocks;`);
}
