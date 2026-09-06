// biome-ignore-all lint/style/useNamingConvention: Payload REST and D1 fields are external contracts.
import config, { database, disposeCloudflareContext, mediaBucket } from "@payload-config";
import { getPayload, type Payload } from "payload";

import { galleryAssets } from "@/lib/gallery-assets";

const sourceUrl = new URL(process.env.PAYLOAD_SYNC_SOURCE_URL ?? "https://showteam-eu-preview.corioders.workers.dev");
const syncedCollections = ["media", "offers", "gallery", "page-content", "equipment"] as const;
type SyncedCollection = (typeof syncedCollections)[number];
type RemoteDocument = Record<string, unknown> & { id: number | string; updatedAt?: string };
type SyncRecord = { collection: string; remote_id: string; local_id: string; remote_version: string };
type SyncCounts = { updated: number; unchanged: number };

const payload = await getPayload({ config });
const [syncError, counts] = await syncPublicContent(payload);
await payload.destroy();
await disposeCloudflareContext?.();

if (syncError) {
	process.stderr.write(`Payload preview sync skipped: ${formatError(syncError)}\n`);
} else {
	process.stdout.write(`Payload preview sync: ${counts.updated} updated, ${counts.unchanged} unchanged.\n`);
}
// Miniflare retains background handles after its explicit disposal in this CLI process.
process.exit(0);

async function syncPublicContent(localPayload: Payload): Promise<[Error | null, SyncCounts]> {
	const setupError = await setupSyncTable();
	if (setupError) {
		return [setupError, { updated: 0, unchanged: 0 }];
	}

	const [records, recordsError] = await readSyncRecords();
	if (recordsError) {
		return [recordsError, { updated: 0, unchanged: 0 }];
	}
	const recordMap = new Map(records.map((record) => [`${record.collection}:${record.remote_id}`, record]));
	const [collectionError, counts] = await syncCollections(localPayload, recordMap);
	if (collectionError) {
		return [collectionError, counts];
	}
	const [globalError, globalChanged] = await syncEventSettings(localPayload, recordMap);
	if (globalError) {
		return [globalError, counts];
	}
	counts[globalChanged ? "updated" : "unchanged"]++;
	return [null, counts];
}

async function syncCollections(localPayload: Payload, recordMap: Map<string, SyncRecord>): Promise<[Error | null, SyncCounts]> {
	const mediaIds = new Map<string, number | string>();
	const remoteMediaIdsByHash = new Map<string, string>();
	let updated = 0;
	let unchanged = 0;

	for (const collection of syncedCollections) {
		const [error, counts] = await syncCollection(localPayload, collection, recordMap, mediaIds, remoteMediaIdsByHash);
		updated += counts.updated;
		unchanged += counts.unchanged;
		if (error) {
			return [error, { updated, unchanged }];
		}
	}
	return [null, { updated, unchanged }];
}

async function syncCollection(
	localPayload: Payload,
	collection: SyncedCollection,
	recordMap: Map<string, SyncRecord>,
	mediaIds: Map<string, number | string>,
	remoteMediaIdsByHash: Map<string, string>,
): Promise<[Error | null, SyncCounts]> {
	const [documents, fetchError] = await fetchCollection(collection, remoteMediaIdsByHash);
	if (fetchError) {
		return [fetchError, { updated: 0, unchanged: 0 }];
	}
	let updated = 0;
	let unchanged = 0;
	for (const document of documents) {
		const record = recordMap.get(`${collection}:${document.id}`);
		rememberRemoteMedia(collection, document, remoteMediaIdsByHash);
		const version = documentVersion(document);
		if (record?.remote_version === version) {
			rememberLocalMedia(collection, document.id, numericId(record.local_id), mediaIds);
			unchanged++;
			continue;
		}
		const [localId, syncError] =
			collection === "media" ? await syncMedia(localPayload, document, record) : await syncDocument(localPayload, collection, document, record, mediaIds);
		if (syncError) {
			if (collection === "media") {
				process.stderr.write(`Payload preview media skipped: ${formatError(syncError)}\n`);
				const writeError = await writeSyncRecord(collection, document.id, "", version);
				if (writeError) {
					return [writeError, { updated, unchanged }];
				}
				unchanged++;
				continue;
			}
			return [syncError, { updated, unchanged }];
		}
		rememberLocalMedia(collection, document.id, localId, mediaIds);
		const writeError = await writeSyncRecord(collection, document.id, localId, version);
		if (writeError) {
			return [writeError, { updated, unchanged }];
		}
		updated++;
	}
	return [null, { updated, unchanged }];
}

function rememberRemoteMedia(collection: SyncedCollection, document: RemoteDocument, mediaIdsByHash: Map<string, string>): void {
	if (collection === "media" && typeof document.contentHash === "string") {
		mediaIdsByHash.set(document.contentHash, String(document.id));
	}
}

function rememberLocalMedia(collection: SyncedCollection, remoteId: number | string, localId: number | string, mediaIds: Map<string, number | string>): void {
	if (collection === "media" && localId !== "") {
		mediaIds.set(String(remoteId), localId);
	}
}

async function syncEventSettings(localPayload: Payload, recordMap: Map<string, SyncRecord>): Promise<[Error | null, boolean]> {
	const [eventSettings, eventError] = await fetchJson<RemoteDocument>("api/globals/event-settings?depth=0");
	if (eventError) {
		return [eventError, false];
	}
	const normalizedSettings = withoutNestedIds(eventSettings) as RemoteDocument;
	const globalVersion = documentVersion(normalizedSettings);
	const globalRecord = recordMap.get("global:event-settings");
	if (globalRecord?.remote_version === globalVersion) {
		return [null, false];
	}
	const data = withoutSystemFields(normalizedSettings);
	const [, updateError] = await safePromise(() => localPayload.updateGlobal({ slug: "event-settings", data: data as never, context: { disableRevalidate: true } }));
	if (updateError) {
		return [new Error("Failed to update event settings", { cause: updateError }), false];
	}
	const writeError = await writeSyncRecord("global", "event-settings", "event-settings", globalVersion);
	return writeError ? [writeError, false] : [null, true];
}

async function fetchCollection(collection: SyncedCollection, remoteMediaIdsByHash: Map<string, string>): Promise<[RemoteDocument[], Error | null]> {
	if (collection === "gallery") {
		return fetchGallery(remoteMediaIdsByHash);
	}
	const documents: RemoteDocument[] = [];
	let page = 1;
	while (true) {
		const [result, error] = await fetchJson<{ docs: RemoteDocument[]; hasNextPage: boolean }>(`api/${collection}?depth=0&limit=100&page=${page}`);
		if (error) {
			return [[], error];
		}
		documents.push(...result.docs);
		if (!result.hasNextPage) {
			return [documents, null];
		}
		page++;
	}
}

async function fetchGallery(remoteMediaIdsByHash: Map<string, string>): Promise<[RemoteDocument[], Error | null]> {
	const documents: RemoteDocument[] = [];
	let page = 1;
	while (true) {
		const [result, error] = await fetchJson<{ photos: Record<string, unknown>[]; totalPages: number }>(`api/gallery?page=${page}`);
		if (error) {
			return [[], error];
		}
		documents.push(...result.photos.map((photo) => galleryPhotoToDocument(photo, remoteMediaIdsByHash)));
		if (page >= result.totalPages) {
			return [documents, null];
		}
		page++;
	}
}

function galleryPhotoToDocument(photo: Record<string, unknown>, remoteMediaIdsByHash: Map<string, string>): RemoteDocument {
	const image = photo.image && typeof photo.image === "object" ? (photo.image as Record<string, unknown>) : null;
	const contentHash = image && typeof image.contentHash === "string" ? image.contentHash : null;
	const staticAsset = galleryAssets.find((asset) => asset.label === photo.caption);
	const mobilePosition = ["same", "50% 20%", "50% 50%", "50% 80%", "20% 50%", "80% 50%"].includes(String(photo.mobilePosition)) ? photo.mobilePosition : "same";
	return {
		id: String(photo.id),
		alt: photo.alt,
		caption: photo.caption,
		fit: photo.fit,
		image: contentHash ? remoteMediaIdsByHash.get(contentHash) : undefined,
		layout: photo.layout,
		mobileLayout: photo.mobileLayout,
		mobilePosition,
		published: true,
		season: photo.season,
		sortOrder: photo.sortOrder,
		sourceUrl: photo.sourceUrl,
		staticImage: staticAsset?.value,
	};
}

async function fetchJson<T>(path: string): Promise<[T, null] | [null, Error]> {
	const [response, fetchError] = await safePromise(() => fetch(new URL(path, sourceUrl), { signal: AbortSignal.timeout(15_000) }));
	if (fetchError || !response) {
		return [null, new Error(`Cannot fetch ${path}`, { cause: fetchError })];
	}
	if (!response.ok) {
		return [null, new Error(`Cannot fetch ${path}: HTTP ${response.status}`)];
	}
	const [body, parseError] = await safePromise(() => response.json() as Promise<T>);
	return parseError || !body ? [null, new Error(`Invalid JSON from ${path}`, { cause: parseError })] : [body, null];
}

async function syncMedia(localPayload: Payload, document: RemoteDocument, record?: SyncRecord): Promise<[number | string, Error | null]> {
	const filename = typeof document.filename === "string" ? document.filename : null;
	const mimeType = typeof document.mimeType === "string" ? document.mimeType : null;
	if (!filename || !mimeType) {
		return [0, new Error(`Remote media ${document.id} has no file metadata`)];
	}
	const [response, fetchError] = await safePromise(() =>
		fetch(new URL(`api/media/file/${encodeURIComponent(filename)}`, sourceUrl), { signal: AbortSignal.timeout(30_000) }),
	);
	if (fetchError || !response?.ok) {
		return [0, new Error(`Cannot download remote media ${document.id}${response ? `: HTTP ${response.status}` : ""}`, { cause: fetchError })];
	}
	const [arrayBuffer, bufferError] = await safePromise(() => response.arrayBuffer());
	if (bufferError || !arrayBuffer) {
		return [0, new Error(`Cannot read remote media ${document.id}`, { cause: bufferError })];
	}
	const fileData = Buffer.from(arrayBuffer);
	const data = pick(document, ["alt", "optimizedImage", "optimizedFiles", "contentHash", "focalX", "focalY"]);
	const options = {
		collection: "media" as const,
		context: { disableRevalidate: true },
		data: data as never,
		file: { data: fileData, mimetype: mimeType, name: filename, size: fileData.byteLength },
		overrideAccess: true,
		overwriteExistingFiles: true,
	};
	const [existingId, lookupError] = record ? [numericId(record.local_id), null] : await findExistingId(localPayload, "media", data);
	if (lookupError) {
		return [0, lookupError];
	}
	const [saved, saveError] = existingId
		? await safePromise(() => localPayload.update({ ...options, id: existingId }))
		: await safePromise(() => localPayload.create(options));
	if (saveError || !saved) {
		return [0, new Error(`Cannot save remote media ${document.id}`, { cause: saveError })];
	}
	const optimizedFiles = Array.isArray(document.optimizedFiles)
		? document.optimizedFiles.filter((value): value is string => typeof value === "string" && value !== filename)
		: [];
	for (const optimizedFilename of optimizedFiles) {
		const copyError = await copyRemoteMediaFile(optimizedFilename);
		if (copyError) {
			return [0, copyError];
		}
	}
	return [saved.id, null];
}

async function copyRemoteMediaFile(filename: string): Promise<Error | null> {
	const [response, fetchError] = await safePromise(() =>
		fetch(new URL(`api/media/file/${encodeURIComponent(filename)}`, sourceUrl), { signal: AbortSignal.timeout(30_000) }),
	);
	if (fetchError || !response?.ok) {
		return new Error(`Cannot download optimized media ${filename}`, { cause: fetchError });
	}
	const [body, bodyError] = await safePromise(() => response.arrayBuffer());
	if (bodyError || !body) {
		return new Error(`Cannot read optimized media ${filename}`, { cause: bodyError });
	}
	const [, putError] = await safePromise(() => mediaBucket.put(filename, body, { httpMetadata: { contentType: response.headers.get("content-type") ?? undefined } }));
	return putError ? new Error(`Cannot store optimized media ${filename}`, { cause: putError }) : null;
}

async function syncDocument(
	localPayload: Payload,
	collection: Exclude<SyncedCollection, "media">,
	document: RemoteDocument,
	record: SyncRecord | undefined,
	mediaIds: Map<string, number | string>,
): Promise<[number | string, Error | null]> {
	const data = withoutSystemFields(document);
	for (const relation of collection === "offers" ? ["cover"] : collection === "gallery" || collection === "equipment" ? ["image"] : []) {
		const remoteId = relationId(data[relation]);
		data[relation] = remoteId == null ? null : (mediaIds.get(remoteId) ?? null);
	}
	const options = { collection, context: { disableRevalidate: true }, data: data as never, overrideAccess: true };
	const [existingId, lookupError] = record ? [numericId(record.local_id), null] : await findExistingId(localPayload, collection, data);
	if (lookupError) {
		return [0, lookupError];
	}
	const [saved, saveError] = existingId
		? await safePromise(() => localPayload.update({ ...options, id: existingId } as never))
		: await safePromise(() => localPayload.create(options as never));
	return saveError || !saved || !("id" in saved) ? [0, new Error(`Cannot sync ${collection} ${document.id}`, { cause: saveError })] : [saved.id, null];
}

async function findExistingId(localPayload: Payload, collection: SyncedCollection, data: Record<string, unknown>): Promise<[number | string | null, Error | null]> {
	const field =
		collection === "offers" || collection === "equipment"
			? "slug"
			: collection === "page-content"
				? "page"
				: collection === "media"
					? data.contentHash
						? "contentHash"
						: "filename"
					: data.image
						? "image"
						: "staticImage";
	const value = data[field];
	if (value == null) {
		return [null, null];
	}
	const [result, error] = await safePromise(() =>
		localPayload.find({ collection, depth: 0, limit: 1, overrideAccess: true, where: { [field]: { equals: value } } } as never),
	);
	if (error || !result) {
		return [null, new Error(`Cannot find local ${collection}`, { cause: error })];
	}
	return [result.docs[0]?.id ?? null, null];
}

function withoutSystemFields(document: RemoteDocument): Record<string, unknown> {
	const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...data } = document;
	return data;
}

function withoutNestedIds(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(withoutNestedIds);
	}
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.filter(([key]) => key !== "id")
				.map(([key, child]) => [key, withoutNestedIds(child)]),
		);
	}
	return value;
}

function pick(document: RemoteDocument, fields: string[]): Record<string, unknown> {
	return Object.fromEntries(fields.filter((field) => document[field] !== undefined).map((field) => [field, document[field]]));
}

function relationId(value: unknown): string | null {
	if (typeof value === "number" || typeof value === "string") {
		return String(value);
	}
	if (value && typeof value === "object" && "id" in value) {
		return String(value.id);
	}
	return null;
}

function numericId(value: string): number | string {
	if (value === "") {
		return value;
	}
	const number = Number(value);
	return Number.isSafeInteger(number) ? number : value;
}

function documentVersion(document: RemoteDocument): string {
	return document.updatedAt ?? JSON.stringify(document);
}

async function setupSyncTable(): Promise<Error | null> {
	const [, error] = await safePromise(() =>
		database
			.prepare(
				"CREATE TABLE IF NOT EXISTS payload_preview_sync (collection TEXT NOT NULL, remote_id TEXT NOT NULL, local_id TEXT NOT NULL, remote_version TEXT NOT NULL, PRIMARY KEY (collection, remote_id))",
			)
			.run(),
	);
	return error ? new Error("Cannot initialize Payload preview sync state", { cause: error }) : null;
}

async function readSyncRecords(): Promise<[SyncRecord[], Error | null]> {
	const [result, error] = await safePromise(() => database.prepare("SELECT collection, remote_id, local_id, remote_version FROM payload_preview_sync").all<SyncRecord>());
	return error || !result ? [[], new Error("Cannot read Payload preview sync state", { cause: error })] : [result.results, null];
}

async function writeSyncRecord(collection: string, remoteId: number | string, localId: number | string, version: string): Promise<Error | null> {
	const [, error] = await safePromise(() =>
		database
			.prepare(
				"INSERT INTO payload_preview_sync (collection, remote_id, local_id, remote_version) VALUES (?, ?, ?, ?) ON CONFLICT (collection, remote_id) DO UPDATE SET local_id = excluded.local_id, remote_version = excluded.remote_version",
			)
			.bind(collection, String(remoteId), String(localId), version)
			.run(),
	);
	return error ? new Error(`Cannot save Payload preview sync state for ${collection}:${remoteId}`, { cause: error }) : null;
}

async function safePromise<T>(operation: () => Promise<T>): Promise<[T, null] | [null, Error]> {
	try {
		return [await operation(), null];
	} catch (error) {
		return [null, error instanceof Error ? error : new Error(String(error))];
	}
}

function formatError(error: Error): string {
	return error.cause instanceof Error ? `${error.message}: ${formatError(error.cause)}` : error.message;
}
