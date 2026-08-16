import { MigrateDownArgs, MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE offers ADD COLUMN map_url text NOT NULL DEFAULT '';`);
  await db.run(sql`ALTER TABLE offers ADD COLUMN cta_title text NOT NULL DEFAULT 'Jedziesz z nami?';`);
  await db.run(sql`ALTER TABLE offers ADD COLUMN page_content text NOT NULL DEFAULT '{}';`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE offers DROP COLUMN page_content;`);
  await db.run(sql`ALTER TABLE offers DROP COLUMN map_url;`);
  await db.run(sql`ALTER TABLE offers DROP COLUMN cta_title;`);
}
