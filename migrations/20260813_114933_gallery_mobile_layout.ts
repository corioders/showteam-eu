import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`gallery\` ADD \`mobile_layout\` text DEFAULT 'square' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`gallery\` ADD \`mobile_position\` text DEFAULT 'same' NOT NULL;`)
  await db.run(sql`UPDATE \`gallery\` SET \`mobile_layout\` = CASE WHEN \`layout\` = 'tall' THEN 'portrait' WHEN \`layout\` IN ('wide', 'large') THEN 'landscape' ELSE 'square' END;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`gallery\` DROP COLUMN \`mobile_layout\`;`)
  await db.run(sql`ALTER TABLE \`gallery\` DROP COLUMN \`mobile_position\`;`)
}
