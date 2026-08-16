import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE staff_events (
    id text PRIMARY KEY NOT NULL,
    title text NOT NULL,
    start_date text NOT NULL,
    end_date text,
    start_time text,
    end_time text,
    all_day integer DEFAULT 0 NOT NULL,
    blocks_base integer DEFAULT 1 NOT NULL,
    notes text,
    recurrence text DEFAULT 'none' NOT NULL,
    recurrence_until text,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  );`);
  await db.run(sql`CREATE INDEX staff_events_dates_idx ON staff_events (start_date, recurrence_until);`);
  await db.run(sql`INSERT INTO staff_events (
    id, title, start_date, end_date, start_time, end_time, all_day, blocks_base,
    notes, recurrence, recurrence_until, created_at, updated_at
  ) SELECT
    id, COALESCE(NULLIF(reason, ''), 'Baza nieczynna'), booking_date, NULL,
    CASE WHEN start_time = '00:00' AND end_time = '23:59' THEN NULL ELSE start_time END,
    CASE WHEN start_time = '00:00' AND end_time = '23:59' THEN NULL ELSE end_time END,
    CASE WHEN start_time = '00:00' AND end_time = '23:59' THEN true ELSE false END,
    true, reason, 'none', NULL, created_at, created_at
  FROM availability_blocks;`);
  await db.run(sql`DROP TABLE availability_blocks;`);
  await db.run(sql`DROP TABLE availability_hours;`);
  await db.run(sql`DROP TABLE IF EXISTS events;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
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
  await db.run(sql`INSERT INTO availability_blocks (id, equipment_id, booking_date, start_time, end_time, reason, created_at)
    SELECT id, NULL, start_date, CASE WHEN all_day THEN '00:00' ELSE start_time END,
      CASE WHEN all_day THEN '23:59' ELSE end_time END, notes, created_at
    FROM staff_events
    WHERE blocks_base = true AND recurrence = 'none' AND (end_date IS NULL OR end_date = start_date);`);
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
  await db.run(sql`CREATE TABLE events (
    id integer PRIMARY KEY NOT NULL,
    title text NOT NULL,
    start_date text NOT NULL,
    end_date text,
    location text NOT NULL,
    summary text NOT NULL,
    image_id integer NOT NULL,
    category text DEFAULT 'Lato' NOT NULL,
    published integer DEFAULT true,
    cta_label text DEFAULT 'Zapytaj o miejsce',
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (image_id) REFERENCES media(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE INDEX events_image_idx ON events (image_id);`);
  await db.run(sql`CREATE INDEX events_updated_at_idx ON events (updated_at);`);
  await db.run(sql`CREATE INDEX events_created_at_idx ON events (created_at);`);
  await db.run(sql`DROP TABLE staff_events;`);
}
