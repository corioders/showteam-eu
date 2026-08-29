import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
	await db.run(sql`ALTER TABLE \`applications\` ADD \`participant_key\` text DEFAULT '' NOT NULL;`);
	await db.run(sql`ALTER TABLE \`applications\` ADD \`normalized_email\` text DEFAULT '' NOT NULL;`);
	await db.run(sql`ALTER TABLE \`applications\` ADD \`newsletter_consent\` integer DEFAULT false;`);
	await db.run(sql`ALTER TABLE \`applications\` ADD \`newsletter_consented_at\` text;`);
	await db.run(sql`UPDATE \`applications\` SET
    \`normalized_email\` = lower(trim(\`email\`)),
    \`participant_key\` = CASE
      WHEN trim(COALESCE(\`participant_email\`, '')) != '' THEN 'email:' || lower(trim(\`participant_email\`))
      ELSE 'contact:' || lower(trim(\`email\`)) || '|' || lower(trim(\`participant_name\`)) || '|' || substr(\`birth_date\`, 1, 10)
    END;`);
	await db.run(sql`CREATE INDEX \`applications_participant_key_idx\` ON \`applications\` (\`participant_key\`);`);
	await db.run(sql`CREATE INDEX \`applications_normalized_email_idx\` ON \`applications\` (\`normalized_email\`);`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP INDEX \`applications_participant_key_idx\`;`);
	await db.run(sql`DROP INDEX \`applications_normalized_email_idx\`;`);
	await db.run(sql`ALTER TABLE \`applications\` DROP COLUMN \`participant_key\`;`);
	await db.run(sql`ALTER TABLE \`applications\` DROP COLUMN \`normalized_email\`;`);
	await db.run(sql`ALTER TABLE \`applications\` DROP COLUMN \`newsletter_consent\`;`);
	await db.run(sql`ALTER TABLE \`applications\` DROP COLUMN \`newsletter_consented_at\`;`);
}
