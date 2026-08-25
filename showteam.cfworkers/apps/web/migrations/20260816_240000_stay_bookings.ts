import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`CREATE TABLE stay_bookings (
    id integer PRIMARY KEY NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    staff_notes text,
    reference text NOT NULL,
    check_in text NOT NULL,
    check_out text NOT NULL,
    guests numeric NOT NULL,
    customer_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    customer_notes text,
    privacy_consent integer DEFAULT false NOT NULL,
    updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`);
	await db.run(sql`CREATE UNIQUE INDEX stay_bookings_reference_idx ON stay_bookings (reference);`);
	await db.run(sql`CREATE INDEX stay_bookings_updated_at_idx ON stay_bookings (updated_at);`);
	await db.run(sql`CREATE INDEX stay_bookings_created_at_idx ON stay_bookings (created_at);`);
	await db.run(sql`CREATE TABLE stay_bookings_accommodation_types (
    "order" integer NOT NULL,
    parent_id integer NOT NULL,
    value text,
    id integer PRIMARY KEY NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES stay_bookings(id) ON UPDATE no action ON DELETE cascade
  );`);
	await db.run(sql`CREATE INDEX stay_bookings_accommodation_types_order_idx ON stay_bookings_accommodation_types ("order");`);
	await db.run(sql`CREATE INDEX stay_bookings_accommodation_types_parent_idx ON stay_bookings_accommodation_types (parent_id);`);
	await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD stay_bookings_id integer REFERENCES stay_bookings(id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_stay_bookings_id_idx ON payload_locked_documents_rels (stay_bookings_id);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP INDEX payload_locked_documents_rels_stay_bookings_id_idx;`);
	await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN stay_bookings_id;`);
	await db.run(sql`DROP TABLE stay_bookings_accommodation_types;`);
	await db.run(sql`DROP TABLE stay_bookings;`);
}
