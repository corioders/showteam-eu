CREATE TABLE events (
  id integer PRIMARY KEY NOT NULL,
  title text NOT NULL,
  start_date text NOT NULL,
  end_date text,
  location text NOT NULL,
  summary text NOT NULL,
  image_id integer,
  category text DEFAULT 'Lato' NOT NULL,
  cta_label text DEFAULT 'Zapytaj o miejsce',
  published integer DEFAULT true,
  updated_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  created_at text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  FOREIGN KEY (image_id) REFERENCES media(id) ON UPDATE no action ON DELETE set null
);
CREATE INDEX events_image_idx ON events (image_id);
CREATE INDEX events_updated_at_idx ON events (updated_at);
CREATE INDEX events_created_at_idx ON events (created_at);

CREATE TABLE analytics (
  id integer PRIMARY KEY NOT NULL,
  day text NOT NULL,
  path text NOT NULL,
  views numeric NOT NULL
);
CREATE UNIQUE INDEX analytics_day_path_idx ON analytics (day, path);

ALTER TABLE payload_locked_documents_rels ADD events_id integer REFERENCES events(id);
ALTER TABLE payload_locked_documents_rels ADD analytics_id integer REFERENCES analytics(id);
CREATE INDEX payload_locked_documents_rels_events_id_idx ON payload_locked_documents_rels (events_id);
CREATE INDEX payload_locked_documents_rels_analytics_id_idx ON payload_locked_documents_rels (analytics_id);

INSERT INTO payload_migrations (name, batch)
VALUES ('20260813_125108_events_analytics', 4);
