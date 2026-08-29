import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`CREATE TABLE page_content (
    id integer PRIMARY KEY NOT NULL,
    page text NOT NULL,
    content text NOT NULL
  );`);
	await db.run(sql`CREATE UNIQUE INDEX page_content_page_idx ON page_content (page);`);
	await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD page_content_id integer REFERENCES page_content(id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_page_content_id_idx ON payload_locked_documents_rels (page_content_id);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP INDEX payload_locked_documents_rels_page_content_id_idx;`);
	await db.run(sql`ALTER TABLE payload_locked_documents_rels DROP COLUMN page_content_id;`);
	await db.run(sql`DROP TABLE page_content;`);
}
