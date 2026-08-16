import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS google_calendar_oauth_states;`);
  await db.run(sql`DROP TABLE IF EXISTS google_calendar_bookings;`);
  await db.run(sql`DROP TABLE IF EXISTS google_calendar_events;`);
  await db.run(sql`DROP TABLE IF EXISTS google_calendar_connections;`);
  await db.run(sql`DROP TABLE IF EXISTS news;`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`CREATE TABLE news (
    id integer PRIMARY KEY NOT NULL,
    title text NOT NULL,
    publication_date text NOT NULL,
    summary text NOT NULL,
    content text NOT NULL,
    image_id integer NOT NULL,
    category text DEFAULT 'Baza' NOT NULL,
    published integer DEFAULT true,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    FOREIGN KEY (image_id) REFERENCES media(id) ON UPDATE no action ON DELETE set null
  );`);
  await db.run(sql`CREATE INDEX news_image_idx ON news (image_id);`);
  await db.run(sql`CREATE INDEX news_updated_at_idx ON news (updated_at);`);
  await db.run(sql`CREATE INDEX news_created_at_idx ON news (created_at);`);
  await db.run(sql`CREATE TABLE google_calendar_connections (
    id text PRIMARY KEY NOT NULL,
    calendar_id text NOT NULL,
    calendar_name text NOT NULL,
    account_email text NOT NULL,
    encrypted_refresh_token text NOT NULL,
    sync_token text,
    last_synced_at integer,
    sync_started_at integer,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  );`);
  await db.run(sql`CREATE TABLE google_calendar_events (
    id text PRIMARY KEY NOT NULL,
    summary text NOT NULL,
    description text,
    location text,
    start_value text NOT NULL,
    end_value text NOT NULL,
    all_day integer DEFAULT 0 NOT NULL,
    html_link text,
    updated_at text NOT NULL
  );`);
  await db.run(sql`CREATE TABLE google_calendar_bookings (
    reservation_id text PRIMARY KEY NOT NULL,
    google_event_id text NOT NULL UNIQUE,
    booking_updated_at text NOT NULL
  );`);
  await db.run(sql`CREATE TABLE google_calendar_oauth_states (
    state_hash text PRIMARY KEY NOT NULL,
    expires_at integer NOT NULL
  );`);
}
