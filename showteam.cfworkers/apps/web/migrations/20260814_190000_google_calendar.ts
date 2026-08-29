import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`DROP TABLE IF EXISTS calendar_feeds;`);
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

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP TABLE google_calendar_oauth_states;`);
	await db.run(sql`DROP TABLE google_calendar_bookings;`);
	await db.run(sql`DROP TABLE google_calendar_events;`);
	await db.run(sql`DROP TABLE google_calendar_connections;`);
	await db.run(sql`CREATE TABLE calendar_feeds (
    id text PRIMARY KEY NOT NULL,
    token_hash text NOT NULL,
    name text NOT NULL,
    created_at integer NOT NULL
  );`);
}
