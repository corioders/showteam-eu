let initialization: Promise<unknown> | undefined;

export function ensureOperationalTables(database: D1Database): Promise<unknown> {
  initialization ??= database.batch([
    database.prepare("CREATE TABLE IF NOT EXISTS booking_slots (equipment_id integer NOT NULL, booking_date text NOT NULL, start_time text NOT NULL, unit_number integer NOT NULL, reservation_id text NOT NULL UNIQUE, resource_key text NOT NULL, PRIMARY KEY (equipment_id, booking_date, start_time, unit_number))"),
    database.prepare("CREATE UNIQUE INDEX IF NOT EXISTS booking_slots_resource_idx ON booking_slots (resource_key, booking_date, start_time, unit_number)"),
    database.prepare("CREATE TABLE IF NOT EXISTS tv_pairings (id text PRIMARY KEY NOT NULL, secret_hash text NOT NULL, user_code text NOT NULL, expires_at integer NOT NULL, approved integer DEFAULT 0 NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS tv_devices (id text PRIMARY KEY NOT NULL, token_hash text NOT NULL, name text NOT NULL, created_at integer NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY NOT NULL, count integer NOT NULL, expires_at integer NOT NULL)"),
    database.prepare("CREATE TABLE IF NOT EXISTS availability_blocks (id text PRIMARY KEY NOT NULL, equipment_id integer, booking_date text NOT NULL, start_time text NOT NULL, end_time text NOT NULL, reason text, created_at integer NOT NULL)"),
    database.prepare("CREATE INDEX IF NOT EXISTS availability_blocks_date_equipment_idx ON availability_blocks (booking_date, equipment_id)"),
    database.prepare("CREATE TABLE IF NOT EXISTS availability_hours (id text PRIMARY KEY NOT NULL, equipment_id integer, rule_type text NOT NULL, booking_date text, weekdays text, start_time text NOT NULL, end_time text NOT NULL, name text, created_at integer NOT NULL)"),
    database.prepare("CREATE INDEX IF NOT EXISTS availability_hours_equipment_type_idx ON availability_hours (equipment_id, rule_type)"),
  ]).catch((error) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}
