import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db }: MigrateUpArgs): Promise<void> {
	await db.run(sql`CREATE TABLE payload_locked_documents_rels_next (
		id integer PRIMARY KEY NOT NULL,
		"order" integer,
		parent_id integer NOT NULL,
		path text NOT NULL,
		offers_id integer,
		media_id integer,
		users_id integer,
		gallery_id integer REFERENCES gallery(id),
		analytics_id integer REFERENCES analytics(id),
		equipment_id integer REFERENCES equipment(id),
		bookings_id integer REFERENCES bookings(id),
		applications_id integer REFERENCES applications(id),
		page_content_id integer REFERENCES page_content(id),
		event_inquiries_id integer REFERENCES event_inquiries(id),
		stay_bookings_id integer REFERENCES stay_bookings(id),
		FOREIGN KEY (parent_id) REFERENCES payload_locked_documents(id) ON UPDATE no action ON DELETE cascade,
		FOREIGN KEY (offers_id) REFERENCES offers(id) ON UPDATE no action ON DELETE cascade,
		FOREIGN KEY (media_id) REFERENCES media(id) ON UPDATE no action ON DELETE cascade,
		FOREIGN KEY (users_id) REFERENCES users(id) ON UPDATE no action ON DELETE cascade
	);`);
	await db.run(sql`INSERT INTO payload_locked_documents_rels_next (
		id, "order", parent_id, path, offers_id, media_id, users_id, gallery_id, analytics_id, equipment_id,
		bookings_id, applications_id, page_content_id, event_inquiries_id, stay_bookings_id
	) SELECT
		id, "order", parent_id, path, offers_id, media_id, users_id, gallery_id, analytics_id, equipment_id,
		bookings_id, applications_id, page_content_id, event_inquiries_id, stay_bookings_id
	FROM payload_locked_documents_rels;`);
	await db.run(sql`DROP TABLE payload_locked_documents_rels;`);
	await db.run(sql`ALTER TABLE payload_locked_documents_rels_next RENAME TO payload_locked_documents_rels;`);

	await db.run(sql`CREATE INDEX payload_locked_documents_rels_order_idx ON payload_locked_documents_rels ("order");`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_parent_idx ON payload_locked_documents_rels (parent_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_path_idx ON payload_locked_documents_rels (path);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_offers_id_idx ON payload_locked_documents_rels (offers_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_media_id_idx ON payload_locked_documents_rels (media_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_users_id_idx ON payload_locked_documents_rels (users_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_gallery_id_idx ON payload_locked_documents_rels (gallery_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_analytics_id_idx ON payload_locked_documents_rels (analytics_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_equipment_id_idx ON payload_locked_documents_rels (equipment_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_bookings_id_idx ON payload_locked_documents_rels (bookings_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_applications_id_idx ON payload_locked_documents_rels (applications_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_page_content_id_idx ON payload_locked_documents_rels (page_content_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_event_inquiries_id_idx ON payload_locked_documents_rels (event_inquiries_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_stay_bookings_id_idx ON payload_locked_documents_rels (stay_bookings_id);`);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD events_id integer REFERENCES events(id);`);
	await db.run(sql`ALTER TABLE payload_locked_documents_rels ADD news_id integer REFERENCES news(id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_events_id_idx ON payload_locked_documents_rels (events_id);`);
	await db.run(sql`CREATE INDEX payload_locked_documents_rels_news_id_idx ON payload_locked_documents_rels (news_id);`);
}
