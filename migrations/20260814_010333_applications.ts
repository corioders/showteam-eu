import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`applications\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`status\` text DEFAULT 'new' NOT NULL,
    \`staff_notes\` text,
    \`reference\` text NOT NULL,
    \`offer\` text NOT NULL,
    \`participant_name\` text NOT NULL,
    \`birth_date\` text NOT NULL,
    \`address\` text NOT NULL,
    \`email\` text NOT NULL,
    \`participant_email\` text,
    \`phone\` text NOT NULL,
    \`discipline\` text,
    \`level\` text,
    \`transport\` text,
    \`notes\` text,
    \`privacy_consent\` integer DEFAULT false NOT NULL,
    \`accuracy_confirmed\` integer DEFAULT false NOT NULL,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`);
  await db.run(sql`CREATE UNIQUE INDEX \`applications_reference_idx\` ON \`applications\` (\`reference\`);`);
  await db.run(sql`CREATE INDEX \`applications_updated_at_idx\` ON \`applications\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`applications_created_at_idx\` ON \`applications\` (\`created_at\`);`);
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`applications_id\` integer REFERENCES applications(id);`);
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_applications_id_idx\` ON \`payload_locked_documents_rels\` (\`applications_id\`);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`payload_locked_documents_rels_applications_id_idx\`;`);
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`applications_id\`;`);
  await db.run(sql`DROP TABLE \`applications\`;`);
}
