import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
	await db.run(sql`ALTER TABLE \`gallery\` ADD \`responsive_small_id\` integer REFERENCES media(id);`);
	await db.run(sql`ALTER TABLE \`gallery\` ADD \`responsive_medium_id\` integer REFERENCES media(id);`);
	await db.run(sql`CREATE INDEX \`gallery_responsive_small_idx\` ON \`gallery\` (\`responsive_small_id\`);`);
	await db.run(sql`CREATE INDEX \`gallery_responsive_medium_idx\` ON \`gallery\` (\`responsive_medium_id\`);`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
	await db.run(sql`PRAGMA foreign_keys=OFF;`);
	await db.run(sql`CREATE TABLE \`__new_gallery\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`static_image\` text DEFAULT 'summer-wake-aerial',
  	\`caption\` text NOT NULL,
  	\`season\` text DEFAULT 'Lato' NOT NULL,
  	\`published\` integer DEFAULT true,
  	\`alt\` text,
  	\`layout\` text DEFAULT 'square' NOT NULL,
  	\`mobile_layout\` text DEFAULT 'square' NOT NULL,
  	\`fit\` text DEFAULT 'cover' NOT NULL,
  	\`mobile_position\` text DEFAULT 'same' NOT NULL,
  	\`source_url\` text,
  	\`sort_order\` numeric DEFAULT 100 NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
	await db.run(
		sql`INSERT INTO \`__new_gallery\`("id", "image_id", "static_image", "caption", "season", "published", "alt", "layout", "mobile_layout", "fit", "mobile_position", "source_url", "sort_order", "updated_at", "created_at") SELECT "id", "image_id", "static_image", "caption", "season", "published", "alt", "layout", "mobile_layout", "fit", "mobile_position", "source_url", "sort_order", "updated_at", "created_at" FROM \`gallery\`;`,
	);
	await db.run(sql`DROP TABLE \`gallery\`;`);
	await db.run(sql`ALTER TABLE \`__new_gallery\` RENAME TO \`gallery\`;`);
	await db.run(sql`PRAGMA foreign_keys=ON;`);
	await db.run(sql`CREATE INDEX \`gallery_image_idx\` ON \`gallery\` (\`image_id\`);`);
	await db.run(sql`CREATE INDEX \`gallery_updated_at_idx\` ON \`gallery\` (\`updated_at\`);`);
	await db.run(sql`CREATE INDEX \`gallery_created_at_idx\` ON \`gallery\` (\`created_at\`);`);
}
