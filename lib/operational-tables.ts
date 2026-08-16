let initialization: Promise<unknown> | undefined;

export function ensureOperationalTables(database: D1Database): Promise<unknown> {
  initialization ??= database.batch([
    database.prepare("CREATE TABLE IF NOT EXISTS booking_slots (equipment_id integer NOT NULL, booking_date text NOT NULL, start_time text NOT NULL, unit_number integer NOT NULL, reservation_id text NOT NULL UNIQUE, resource_key text NOT NULL, PRIMARY KEY (equipment_id, booking_date, start_time, unit_number))"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS booking_slots_resource_idx ON booking_slots (resource_key, booking_date, start_time, unit_number)"),
    database.prepare("CREATE TABLE IF NOT EXISTS tv_pairings (id text PRIMARY KEY NOT NULL, secret_hash text NOT NULL, user_code text NOT NULL, expires_at integer NOT NULL, approved integer DEFAULT 0 NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS tv_devices (id text PRIMARY KEY NOT NULL, token_hash text NOT NULL, name text NOT NULL, created_at integer NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY NOT NULL, count integer NOT NULL, expires_at integer NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS staff_events (id text PRIMARY KEY NOT NULL, title text NOT NULL, start_date text NOT NULL, end_date text, start_time text, end_time text, all_day integer DEFAULT 0 NOT NULL, blocks_base integer DEFAULT 1 NOT NULL, notes text, recurrence text DEFAULT 'none' NOT NULL, recurrence_until text, created_at integer NOT NULL, updated_at integer NOT NULL)"),
    database.prepare("CREATE INDEX IF NOT EXISTS staff_events_dates_idx ON staff_events (start_date, recurrence_until)"),
    database.prepare("CREATE TABLE IF NOT EXISTS push_subscriptions (id text PRIMARY KEY NOT NULL, user_id integer NOT NULL, endpoint text NOT NULL UNIQUE, p256dh text NOT NULL, auth text NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL)"),
    database.prepare("CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions (user_id)"),
  ]).catch((error) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}
