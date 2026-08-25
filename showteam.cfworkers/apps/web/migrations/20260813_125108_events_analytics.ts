import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
	await db.run(sql`CREATE TABLE \`events\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`start_date\` text NOT NULL,
  	\`end_date\` text,
  	\`location\` text NOT NULL,
  	\`summary\` text NOT NULL,
  	\`image_id\` integer,
  	\`category\` text DEFAULT 'Lato' NOT NULL,
  	\`cta_label\` text DEFAULT 'Zapytaj o miejsce',
  	\`published\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
	await db.run(sql`CREATE INDEX \`events_image_idx\` ON \`events\` (\`image_id\`);`);
	await db.run(sql`CREATE INDEX \`events_updated_at_idx\` ON \`events\` (\`updated_at\`);`);
	await db.run(sql`CREATE INDEX \`events_created_at_idx\` ON \`events\` (\`created_at\`);`);
	await db.run(sql`CREATE TABLE \`analytics\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`day\` text NOT NULL,
  	\`path\` text NOT NULL,
  	\`views\` numeric NOT NULL
  );
  `);
	await db.run(sql`CREATE UNIQUE INDEX \`analytics_day_path_idx\` ON \`analytics\` (\`day\`, \`path\`);`);
	await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`events_id\` integer REFERENCES events(id);`);
	await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`analytics_id\` integer REFERENCES analytics(id);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_events_id_idx\` ON \`payload_locked_documents_rels\` (\`events_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_analytics_id_idx\` ON \`payload_locked_documents_rels\` (\`analytics_id\`);`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP TABLE \`events\`;`);
	await db.run(sql`DROP TABLE \`analytics\`;`);
	await db.run(sql`PRAGMA foreign_keys=OFF;`);
	await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`offers_id\` integer,
  	\`gallery_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`offers_id\`) REFERENCES \`offers\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`gallery_id\`) REFERENCES \`gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
	await db.run(
		sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "offers_id", "gallery_id", "media_id", "users_id") SELECT "id", "order", "parent_id", "path", "offers_id", "gallery_id", "media_id", "users_id" FROM \`payload_locked_documents_rels\`;`,
	);
	await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
	await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`);
	await db.run(sql`PRAGMA foreign_keys=ON;`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_offers_id_idx\` ON \`payload_locked_documents_rels\` (\`offers_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_gallery_id_idx\` ON \`payload_locked_documents_rels\` (\`gallery_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`);
	await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`);
}
