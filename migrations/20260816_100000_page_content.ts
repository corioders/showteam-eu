import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE page_content (
    id integer PRIMARY KEY NOT NULL,
    page text NOT NULL,
    content text NOT NULL
  );`);
  await db.run(sql`CREATE UNIQUE INDEX page_content_page_idx ON page_content (page);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE page_content;`);
}
