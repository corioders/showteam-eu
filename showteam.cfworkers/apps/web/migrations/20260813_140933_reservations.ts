import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
	await db.run(sql`CREATE TABLE \`equipment\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`description\` text NOT NULL,
  	\`image_id\` integer,
  	\`category\` text DEFAULT 'Woda' NOT NULL,
  	\`quantity\` numeric DEFAULT 1 NOT NULL,
  	\`duration_minutes\` numeric DEFAULT 60 NOT NULL,
  	\`open_time\` text DEFAULT '09:00' NOT NULL,
  	\`close_time\` text DEFAULT '19:00' NOT NULL,
  	\`sort_order\` numeric DEFAULT 100 NOT NULL,
  	\`active\` integer DEFAULT true,
  	\`notice\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
	await db.run(sql`CREATE UNIQUE INDEX \`equipment_slug_idx\` ON \`equipment\` (\`slug\`);`);
	await db.run(sql`CREATE INDEX \`equipment_image_idx\` ON \`equipment\` (\`image_id\`);`);
	await db.run(sql`CREATE INDEX \`equipment_updated_at_idx\` ON \`equipment\` (\`updated_at\`);`);
	await db.run(sql`CREATE INDEX \`equipment_created_at_idx\` ON \`equipment\` (\`created_at\`);`);
	await db.run(sql`CREATE TABLE \`bookings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`reference\` text NOT NULL,
  	\`reservation_id\` text NOT NULL,
  	\`equipment_id\` integer NOT NULL,
  	\`booking_date\` text NOT NULL,
  	\`start_time\` text NOT NULL,
  	\`end_time\` text NOT NULL,
  	\`customer_name\` text NOT NULL,
  	\`phone\` text NOT NULL,
  	\`email\` text,
  	\`status\` text DEFAULT 'confirmed' NOT NULL,
  	\`customer_notes\` text,
  	\`staff_notes\` text,
  	\`source\` text DEFAULT 'website' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`equipment_id\`) REFERENCES \`equipment\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
	await db.run(sql`CREATE UNIQUE INDEX \`bookings_reference_idx\` ON \`bookings\` (\`reference\`);`);
	await db.run(sql`CREATE UNIQUE INDEX \`bookings_reservation_id_idx\` ON \`bookings\` (\`reservation_id\`);`);
	await db.run(sql`CREATE INDEX \`bookings_equipment_idx\` ON \`bookings\` (\`equipment_id\`);`);
	await db.run(sql`CREATE INDEX \`bookings_updated_at_idx\` ON \`bookings\` (\`updated_at\`);`);
	await db.run(sql`CREATE INDEX \`bookings_created_at_idx\` ON \`bookings\` (\`created_at\`);`);
	await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`equipment_id\` integer REFERENCES equipment(id);`);
	await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`bookings_id\` integer REFERENCES bookings(id);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_equipment_id_idx\` ON \`payload_locked_documents_rels\` (\`equipment_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_bookings_id_idx\` ON \`payload_locked_documents_rels\` (\`bookings_id\`);`);
	await db.run(sql`CREATE TABLE \`booking_slots\` (
    \`equipment_id\` integer NOT NULL,
    \`booking_date\` text NOT NULL,
    \`start_time\` text NOT NULL,
    \`unit_number\` integer NOT NULL,
    \`reservation_id\` text NOT NULL UNIQUE,
    PRIMARY KEY (\`equipment_id\`, \`booking_date\`, \`start_time\`, \`unit_number\`)
  );`);
	await db.run(sql`CREATE TABLE \`tv_pairings\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`secret_hash\` text NOT NULL,
    \`user_code\` text NOT NULL,
    \`expires_at\` integer NOT NULL,
    \`approved\` integer DEFAULT 0 NOT NULL
  );`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP TABLE \`booking_slots\`;`);
	await db.run(sql`DROP TABLE \`tv_pairings\`;`);
	await db.run(sql`DROP TABLE \`equipment\`;`);
	await db.run(sql`DROP TABLE \`bookings\`;`);
	await db.run(sql`PRAGMA foreign_keys=OFF;`);
	await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`events_id\` integer,
  	\`offers_id\` integer,
  	\`gallery_id\` integer,
  	\`analytics_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`events_id\`) REFERENCES \`events\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`offers_id\`) REFERENCES \`offers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`gallery_id\`) REFERENCES \`gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`analytics_id\`) REFERENCES \`analytics\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
	await db.run(
		sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "events_id", "offers_id", "gallery_id", "analytics_id", "media_id", "users_id") SELECT "id", "order", "parent_id", "path", "events_id", "offers_id", "gallery_id", "analytics_id", "media_id", "users_id" FROM \`payload_locked_documents_rels\`;`,
	);
	await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
	await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`);
	await db.run(sql`PRAGMA foreign_keys=ON;`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_offers_id_idx\` ON \`payload_locked_documents_rels\` (\`offers_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_gallery_id_idx\` ON \`payload_locked_documents_rels\` (\`gallery_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_analytics_id_idx\` ON \`payload_locked_documents_rels\` (\`analytics_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`);
}
