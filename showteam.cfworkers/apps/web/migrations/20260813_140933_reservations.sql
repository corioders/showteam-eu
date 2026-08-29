CREATE TABLE equipment (
  id integer PRIMARY KEY NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL,
  image_id integer,
  category text DEFAULT 'Woda' NOT NULL,
  quantity numeric DEFAULT 1 NOT NULL,
  duration_minutes numeric DEFAULT 60 NOT NULL,
  open_time text DEFAULT '09:00' NOT NULL,
  close_time text DEFAULT '19:00' NOT NULL,
  sort_order numeric DEFAULT 100 NOT NULL,
  active integer DEFAULT true,
  notice text,
  updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  FOREIGN KEY (image_id) REFERENCES media(id) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX equipment_slug_idx ON equipment (slug);
CREATE INDEX equipment_image_idx ON equipment (image_id);
CREATE INDEX equipment_updated_at_idx ON equipment (updated_at);
CREATE INDEX equipment_created_at_idx ON equipment (created_at);

CREATE TABLE bookings (
  id integer PRIMARY KEY NOT NULL,
  reference text NOT NULL,
  reservation_id text NOT NULL,
  equipment_id integer NOT NULL,
  booking_date text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  status text DEFAULT 'confirmed' NOT NULL,
  customer_notes text,
  staff_notes text,
  source text DEFAULT 'website' NOT NULL,
  updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX bookings_reference_idx ON bookings (reference);
CREATE UNIQUE INDEX bookings_reservation_id_idx ON bookings (reservation_id);
CREATE INDEX bookings_equipment_idx ON bookings (equipment_id);
CREATE INDEX bookings_updated_at_idx ON bookings (updated_at);
CREATE INDEX bookings_created_at_idx ON bookings (created_at);

ALTER TABLE payload_locked_documents_rels ADD equipment_id integer REFERENCES equipment(id);
ALTER TABLE payload_locked_documents_rels ADD bookings_id integer REFERENCES bookings(id);
CREATE INDEX payload_locked_documents_rels_equipment_id_idx ON payload_locked_documents_rels (equipment_id);
CREATE INDEX payload_locked_documents_rels_bookings_id_idx ON payload_locked_documents_rels (bookings_id);

CREATE TABLE booking_slots (
  equipment_id integer NOT NULL,
  booking_date text NOT NULL,
  start_time text NOT NULL,
  unit_number integer NOT NULL,
  reservation_id text NOT NULL UNIQUE,
  PRIMARY KEY (equipment_id, booking_date, start_time, unit_number)
);
CREATE TABLE tv_pairings (
  id text PRIMARY KEY NOT NULL,
  secret_hash text NOT NULL,
  user_code text NOT NULL,
  expires_at integer NOT NULL,
  approved integer DEFAULT 0 NOT NULL
);

INSERT INTO payload_migrations (name, batch)
VALUES ('20260813_140933_reservations', 5);
