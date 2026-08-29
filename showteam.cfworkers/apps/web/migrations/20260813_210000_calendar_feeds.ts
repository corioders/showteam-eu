import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`CREATE TABLE \`calendar_feeds\` (
    \`id\` text PRIMARY KEY NOT NULL,
    \`token_hash\` text NOT NULL,
    \`name\` text NOT NULL,
    \`created_at\` integer NOT NULL
  );`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP TABLE \`calendar_feeds\`;`);
}
