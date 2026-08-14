import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`equipment\` ADD \`weather_profile\` text DEFAULT 'any' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`equipment\` ADD \`recommended_start1\` text;`)
  await db.run(sql`ALTER TABLE \`equipment\` ADD \`recommended_end1\` text;`)
  await db.run(sql`ALTER TABLE \`equipment\` ADD \`recommended_start2\` text;`)
  await db.run(sql`ALTER TABLE \`equipment\` ADD \`recommended_end2\` text;`)
  await db.run(sql`ALTER TABLE \`equipment\` ADD \`recommendation_note\` text;`)
  await db.run(sql`UPDATE \`equipment\` SET \`weather_profile\` = 'calm', \`recommended_start1\` = '07:00', \`recommended_end1\` = '09:00', \`recommended_start2\` = '19:00', \`recommended_end2\` = '21:00', \`recommendation_note\` = 'Rano i wieczorem jezioro jest zwykle spokojniejsze.' WHERE \`slug\` IN ('sup', 'kajak') OR lower(\`name\`) LIKE '%wake%';`)
  await db.run(sql`UPDATE \`equipment\` SET \`weather_profile\` = 'wind', \`recommended_start1\` = '09:00', \`recommended_end1\` = '19:00', \`recommendation_note\` = 'W ciągu dnia zwykle pojawia się najlepszy wiatr.' WHERE \`slug\` IN ('hobie-cat', 'lodz-zaglowa', 'windsurfing', 'wing-foil');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`equipment\` DROP COLUMN \`weather_profile\`;`)
  await db.run(sql`ALTER TABLE \`equipment\` DROP COLUMN \`recommended_start1\`;`)
  await db.run(sql`ALTER TABLE \`equipment\` DROP COLUMN \`recommended_end1\`;`)
  await db.run(sql`ALTER TABLE \`equipment\` DROP COLUMN \`recommended_start2\`;`)
  await db.run(sql`ALTER TABLE \`equipment\` DROP COLUMN \`recommended_end2\`;`)
  await db.run(sql`ALTER TABLE \`equipment\` DROP COLUMN \`recommendation_note\`;`)
}
