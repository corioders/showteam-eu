import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-d1-sqlite";

export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
	await ignoreExisting(() => db.run(sql`ALTER TABLE media ADD optimized_image text;`));
	await ignoreExisting(() => db.run(sql`ALTER TABLE media ADD optimized_files text;`));
	await ignoreExisting(() => db.run(sql`ALTER TABLE media ADD content_hash text;`));
	await ignoreExisting(() => db.run(sql`CREATE INDEX media_content_hash_idx ON media (content_hash);`));
	await ignoreExisting(() => db.run(sql`ALTER TABLE page_content ADD optimized_media text DEFAULT '{}';`));
	await ignoreExisting(() => db.run(sql`ALTER TABLE offers ADD optimized_media text DEFAULT '{}';`));

	const media = await payload.find({ collection: "media", limit: 1000, depth: 0, overrideAccess: true });
	const oldImages = media.docs.filter((document) => document.mimeType?.startsWith("image/"));
	payload.logger.warn({
		msg: "SHOWteam CMS image deletion inventory",
		records: oldImages.map((document) => ({ id: document.id, filename: document.filename, mimeType: document.mimeType })),
	});

	const gallery = await payload.find({ collection: "gallery", limit: 1000, depth: 1, overrideAccess: true });
	for (const item of gallery.docs) {
		if (typeof item.image === "object" && item.image?.mimeType?.startsWith("image/")) {
			await payload.delete({ collection: "gallery", id: item.id, overrideAccess: true });
		}
	}

	const offers = await payload.find({ collection: "offers", limit: 1000, depth: 0, overrideAccess: true });
	for (const offer of offers.docs) {
		const pageContent = offer.pageContent && typeof offer.pageContent === "object" && !Array.isArray(offer.pageContent) ? { ...offer.pageContent } : {};
		for (const key of Object.keys(pageContent)) {
			if (key.endsWith("ImageUrl") || key.endsWith("PosterUrl")) delete pageContent[key];
		}
		await db.run(sql`UPDATE offers SET cover_id = NULL, optimized_media = '{}', page_content = ${JSON.stringify(pageContent)} WHERE id = ${offer.id};`);
	}

	const equipment = await payload.find({ collection: "equipment", limit: 1000, depth: 0, overrideAccess: true });
	for (const item of equipment.docs) await db.run(sql`UPDATE equipment SET image_id = NULL WHERE id = ${item.id};`);

	const pages = await payload.find({ collection: "page-content", limit: 100, depth: 0, overrideAccess: true });
	for (const page of pages.docs) {
		const content = page.content && typeof page.content === "object" && !Array.isArray(page.content) ? { ...page.content } : {};
		for (const key of Object.keys(content)) {
			if (key.endsWith("ImageUrl") || key.endsWith("PosterUrl")) delete content[key];
		}
		await db.run(sql`UPDATE page_content SET content = ${JSON.stringify(content)}, optimized_media = '{}' WHERE id = ${page.id};`);
	}

	for (const image of oldImages) await payload.delete({ collection: "media", id: image.id, overrideAccess: true });

	await db.run(sql`DROP INDEX IF EXISTS gallery_responsive_small_idx;`);
	await db.run(sql`DROP INDEX IF EXISTS gallery_responsive_medium_idx;`);
	await db.run(sql`ALTER TABLE gallery DROP COLUMN responsive_small_id;`);
	await db.run(sql`ALTER TABLE gallery DROP COLUMN responsive_medium_id;`);
}

async function ignoreExisting(operation: () => Promise<unknown>): Promise<void> {
	try {
		await operation();
	} catch (error) {
		let current: unknown = error;
		const messages: string[] = [];
		while (current instanceof Error) {
			messages.push(current.message);
			current = current.cause;
		}
		const message = messages.join(" ");
		if (!(message.includes("duplicate column name") || message.includes("already exists"))) throw error;
	}
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
	await db.run(sql`ALTER TABLE gallery ADD responsive_small_id integer REFERENCES media(id);`);
	await db.run(sql`ALTER TABLE gallery ADD responsive_medium_id integer REFERENCES media(id);`);
	await db.run(sql`CREATE INDEX gallery_responsive_small_idx ON gallery (responsive_small_id);`);
	await db.run(sql`CREATE INDEX gallery_responsive_medium_idx ON gallery (responsive_medium_id);`);
	await db.run(sql`DROP INDEX IF EXISTS media_content_hash_idx;`);
	await db.run(sql`ALTER TABLE media DROP COLUMN optimized_image;`);
	await db.run(sql`ALTER TABLE media DROP COLUMN optimized_files;`);
	await db.run(sql`ALTER TABLE media DROP COLUMN content_hash;`);
	await db.run(sql`ALTER TABLE page_content DROP COLUMN optimized_media;`);
	await db.run(sql`ALTER TABLE offers DROP COLUMN optimized_media;`);
}
