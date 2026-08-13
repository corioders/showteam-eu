import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE availability_hours (
    id text PRIMARY KEY NOT NULL,
    equipment_id integer,
    rule_type text NOT NULL,
    booking_date text,
    weekdays text,
    start_time text NOT NULL,
    end_time text NOT NULL,
    name text,
    created_at integer NOT NULL
  );`);
  await db.run(sql`CREATE INDEX availability_hours_equipment_type_idx ON availability_hours (equipment_id, rule_type);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE availability_hours;`);
}
