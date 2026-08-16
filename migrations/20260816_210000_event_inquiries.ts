import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE event_inquiries (
    id integer PRIMARY KEY NOT NULL,
    status text DEFAULT 'new' NOT NULL,
    staff_notes text,
    next_contact_at text,
    calendar_event_id text,
    reference text NOT NULL,
    start_time text NOT NULL,
    end_time text NOT NULL,
    adults numeric NOT NULL,
    children numeric NOT NULL,
    children_age_range text,
    catering_notes text,
    attraction_notes text,
    wishes text,
    contact_name text NOT NULL,
    company text,
    phone text NOT NULL,
    email text NOT NULL,
    privacy_consent integer DEFAULT false NOT NULL,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`);
  await db.run(sql`CREATE UNIQUE INDEX event_inquiries_reference_idx ON event_inquiries (reference);`);
  await db.run(sql`CREATE INDEX event_inquiries_updated_at_idx ON event_inquiries (updated_at);`);
  await db.run(sql`CREATE INDEX event_inquiries_created_at_idx ON event_inquiries (created_at);`);
  await db.run(sql`CREATE TABLE event_inquiries_event_types (
    "order" integer NOT NULL,
    parent_id integer NOT NULL,
    value text,
    id integer PRIMARY KEY NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES event_inquiries(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX event_inquiries_event_types_order_idx ON event_inquiries_event_types ("order");`);
  await db.run(sql`CREATE INDEX event_inquiries_event_types_parent_idx ON event_inquiries_event_types (parent_id);`);
  await db.run(sql`CREATE TABLE event_inquiries_date_options (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id text PRIMARY KEY NOT NULL,
    start_date text NOT NULL,
    end_date text,
    FOREIGN KEY (_parent_id) REFERENCES event_inquiries(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX event_inquiries_date_options_order_idx ON event_inquiries_date_options (_order);`);
  await db.run(sql`CREATE INDEX event_inquiries_date_options_parent_id_idx ON event_inquiries_date_options (_parent_id);`);
  await db.run(sql`CREATE TABLE event_inquiries_texts (
    id integer PRIMARY KEY NOT NULL,
    "order" integer NOT NULL,
    parent_id integer NOT NULL,
    path text NOT NULL,
    text text,
    FOREIGN KEY (parent_id) REFERENCES event_inquiries(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX event_inquiries_texts_order_parent ON event_inquiries_texts ("order", parent_id);`);
  await db.run(sql`CREATE TABLE event_inquiries_rels (
    id integer PRIMARY KEY NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path text NOT NULL,
    equipment_id integer,
    FOREIGN KEY (parent_id) REFERENCES event_inquiries(id) ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX event_inquiries_rels_order_idx ON event_inquiries_rels ("order");`);
  await db.run(sql`CREATE INDEX event_inquiries_rels_parent_idx ON event_inquiries_rels (parent_id);`);
  await db.run(sql`CREATE INDEX event_inquiries_rels_path_idx ON event_inquiries_rels (path);`);
  await db.run(sql`CREATE INDEX event_inquiries_rels_equipment_id_idx ON event_inquiries_rels (equipment_id);`);
  await db.run(sql`CREATE TABLE event_settings (
    id integer PRIMARY KEY NOT NULL,
    updated_at text,
    created_at text
  );`);
  await db.run(sql`CREATE TABLE event_settings_catering_options (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id text PRIMARY KEY NOT NULL,
    label text NOT NULL,
    FOREIGN KEY (_parent_id) REFERENCES event_settings(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX event_settings_catering_options_order_idx ON event_settings_catering_options (_order);`);
  await db.run(sql`CREATE INDEX event_settings_catering_options_parent_id_idx ON event_settings_catering_options (_parent_id);`);
  await db.run(sql`CREATE TABLE event_settings_attraction_options (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id text PRIMARY KEY NOT NULL,
    label text NOT NULL,
    FOREIGN KEY (_parent_id) REFERENCES event_settings(id) ON UPDATE no action ON DELETE cascade
  );`);
  await db.run(sql`CREATE INDEX event_settings_attraction_options_order_idx ON event_settings_attraction_options (_order);`);
  await db.run(sql`CREATE INDEX event_settings_attraction_options_parent_id_idx ON event_settings_attraction_options (_parent_id);`);
  await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD event_inquiries_id integer REFERENCES event_inquiries(id);`);
  await db.run(sql`CREATE INDEX payload_locked_documents_rels_event_inquiries_id_idx ON payload_locked_documents_rels (event_inquiries_id);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX payload_locked_documents_rels_event_inquiries_id_idx;`);
  await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN event_inquiries_id;`);
  await db.run(sql`DROP TABLE event_settings_attraction_options;`);
  await db.run(sql`DROP TABLE event_settings_catering_options;`);
  await db.run(sql`DROP TABLE event_settings;`);
  await db.run(sql`DROP TABLE event_inquiries_rels;`);
  await db.run(sql`DROP TABLE event_inquiries_texts;`);
  await db.run(sql`DROP TABLE event_inquiries_date_options;`);
  await db.run(sql`DROP TABLE event_inquiries_event_types;`);
  await db.run(sql`DROP TABLE event_inquiries;`);
}
