import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`ALTER TABLE users ADD receives_notifications integer DEFAULT true;`);
	await db.run(sql`UPDATE users SET receives_notifications = true WHERE receives_notifications IS NULL;`);
	await db.run(sql`CREATE TABLE push_subscriptions (
    id text PRIMARY KEY NOT NULL,
    user_id integer NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at integer NOT NULL,
    updated_at integer NOT NULL
  );`);
	await db.run(sql`CREATE UNIQUE INDEX push_subscriptions_endpoint_idx ON push_subscriptions (endpoint);`);
	await db.run(sql`CREATE INDEX push_subscriptions_user_idx ON push_subscriptions (user_id);`);
	await db.run(sql`ALTER TABLE bookings ADD reminder_sent_at text;`);
	await db.run(sql`ALTER TABLE bookings ADD reminder_response text;`);
	await db.run(sql`ALTER TABLE bookings ADD reminder_responded_at text;`);
	await db.run(sql`ALTER TABLE bookings ADD reminder_escalated_at text;`);
	await db.run(sql`ALTER TABLE bookings ADD reminder_token_hash text;`);
	await db.run(sql`CREATE UNIQUE INDEX bookings_reminder_token_hash_idx ON bookings (reminder_token_hash);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`DROP INDEX bookings_reminder_token_hash_idx;`);
	await db.run(sql`ALTER TABLE bookings DROP COLUMN reminder_sent_at;`);
	await db.run(sql`ALTER TABLE bookings DROP COLUMN reminder_response;`);
	await db.run(sql`ALTER TABLE bookings DROP COLUMN reminder_responded_at;`);
	await db.run(sql`ALTER TABLE bookings DROP COLUMN reminder_escalated_at;`);
	await db.run(sql`ALTER TABLE bookings DROP COLUMN reminder_token_hash;`);
	await db.run(sql`DROP TABLE push_subscriptions;`);
	await db.run(sql`ALTER TABLE users DROP COLUMN receives_notifications;`);
}
