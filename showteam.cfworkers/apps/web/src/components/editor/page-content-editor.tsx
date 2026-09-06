// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
"use client";

import { OptimizedImage, type OptimizedImageDescriptor } from "cstd-next/media/image/optimized-image.jsx";
import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import { LoaderCircle, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";

import { useEditor } from "@/components/editor/editor-provider";
import { type ContentValues, type MediaReference, PageContentContext } from "@/components/editor/page-content-context";
import { PageContentPanel } from "@/components/editor/page-content-panel";
import { Button } from "@/components/ui/button";
import { appendOptimizedImage } from "@/lib/client-image-upload";
import type { PageContentName } from "@/lib/page-content-schema";
import { resolveStaticImage } from "@/lib/static-images";

export function PageContentEditor({
	page,
	initial,
	initialMedia = {},
	children,
}: {
	page: PageContentName;
	initial: ContentValues;
	initialMedia?: Record<string, MediaReference>;
	children: React.ReactNode;
}) {
	const { enabled, visible } = useEditor();
	const router = useRouter();
	const editing = enabled && visible;
	const storageKey = `showteam:inline-page:${page}`;
	const [values, setValues] = useState(initial);
	const [media, setMedia] = useState(initialMedia);
	const [generation, setGeneration] = useState(0);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [errors, setErrors] = useState<string[]>([]);

	useEffect(() => {
		if (!editing) {
			return;
		}
		const restoreDraft = window.setTimeout(() => {
			setValues(restore(storageKey, initial));
			setGeneration((current) => current + 1);
		}, 0);
		return () => window.clearTimeout(restoreDraft);
	}, [editing, initial, storageKey]);

	useEffect(() => {
		if (!editing) {
			return;
		}
		document.addEventListener("click", blockEditableLink, true);
		return () => document.removeEventListener("click", blockEditableLink, true);
	}, [editing]);

	function update(field: string, value: string) {
		const next = { ...values, [field]: value };
		setValues(next);
		localStorage.setItem(storageKey, JSON.stringify(next));
		setMessage(null);
		setErrors([]);
	}

	function storeDraft(field: string, value: string) {
		localStorage.setItem(storageKey, JSON.stringify({ ...values, [field]: value }));
	}

	function clear() {
		localStorage.removeItem(storageKey);
		setValues(initial);
		setGeneration((current) => current + 1);
		setMessage(null);
		setErrors([]);
	}

	async function save() {
		setSaving(true);
		setMessage(null);
		setErrors([]);
		const response = await fetch(`/api/admin/page-content/${page}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
		const result = (await response.json()) as { message?: string; errors?: string[] };
		setSaving(false);
		setMessage(result.message ?? null);
		setErrors(result.errors ?? []);
		if (response.ok) {
			localStorage.removeItem(storageKey);
			router.refresh();
		}
	}

	const context = {
		editing,
		generation,
		media,
		page,
		storeDraft,
		values,
		update,
		updateMedia: (field: string, value: MediaReference) => setMedia((current) => ({ ...current, [field]: value })),
	};
	return (
		<PageContentContext.Provider value={context}>
			{editing ? (
				<aside
					className="page-content-savebar sticky top-20 z-[60] border-orange-500/40 border-y bg-neutral-950/95 px-3 py-2 shadow-2xl backdrop-blur"
					aria-label="Zapisywanie treści strony"
				>
					<div className="site-container flex flex-wrap items-center gap-2">
						<p className="mr-auto font-bold text-orange-300 text-xs uppercase tracking-[.14em]">Edytujesz tę stronę</p>
						{message || errors.length > 0 ? (
							<p role="status" className={`w-full text-sm sm:w-auto ${errors.length > 0 ? "text-red-300" : "text-emerald-300"}`}>
								{errors[0] ?? message}
							</p>
						) : null}
						<PageContentPanel />
						<Button type="button" variant="ghost" size="sm" onClick={clear}>
							<RotateCcw className="size-4" /> Cofnij zmiany
						</Button>
						<Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
							{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
							{saving ? "Zapisuję…" : "Zapisz zmiany"}
						</Button>
					</div>
				</aside>
			) : null}
			{children}
		</PageContentContext.Provider>
	);
}

export function usePageContentField(field: string, fallback: string) {
	const content = useContext(PageContentContext);
	return { value: content?.values[field] ?? fallback, editing: content?.editing ?? false, update: content?.update };
}

export function EditableImage({ field, alt, sizes, className }: { field: string; alt: string; sizes: string; className?: string }) {
	const content = useContext(PageContentContext);
	const src = content?.values[field] ?? "";
	const optimized = content?.media[field]?.descriptor;
	const fallback = resolveStaticImage(src);
	const imageProps = { alt, className: `absolute inset-0 size-full ${className ?? ""}`, loading: "lazy" as const, sizes };
	return (
		<>
			{optimized ? <OptimizedImage {...imageProps} src={optimized} /> : fallback ? <StaticImage {...imageProps} src={fallback} /> : null}
			<EditableMediaUpload field={field} accept="image" label="Zmień zdjęcie" />
		</>
	);
}

export function EditableMediaUpload({
	field,
	accept,
	label,
	positionClassName = "right-3 top-3",
}: {
	field: string;
	accept: "image" | "video";
	label: string;
	positionClassName?: string;
}) {
	const content = useContext(PageContentContext);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	if (!content?.editing) {
		return null;
	}

	async function upload(file: File | undefined) {
		if (!file || !content || uploading) {
			return;
		}
		setUploading(true);
		setError("");
		try {
			const body = new FormData();
			body.set("field", field);
			if (accept === "image") {
				await appendOptimizedImage(body, file, "100vw");
			} else {
				body.set("file", file);
			}
			const response = await fetch(`/api/admin/page-content/${content.page}/media`, { method: "POST", body });
			const result = (await response.json()) as { url?: string; message?: string; descriptor?: OptimizedImageDescriptor; mediaId?: number };
			if (!response.ok || !result.url) {
				throw new Error(result.message || "Nie udało się wysłać pliku.");
			}
			content.update(field, result.url);
			if (result.descriptor && result.mediaId) {
				content.updateMedia(field, { descriptor: result.descriptor, mediaId: result.mediaId });
			}
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Nie udało się wysłać pliku.");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className={`absolute z-30 max-w-[calc(100%-1.5rem)] ${positionClassName}`}>
			<label className="flex min-h-11 cursor-pointer items-center justify-center bg-orange-500 px-4 font-black text-black text-xs uppercase shadow-xl">
				<input
					type="file"
					accept={accept === "image" ? "image/jpeg,image/png,image/webp,image/avif" : "video/mp4,video/webm,video/quicktime"}
					className="sr-only"
					disabled={uploading}
					onChange={(event) => void upload(event.target.files?.[0])}
				/>
				{uploading ? "Wysyłam…" : label}
			</label>
			{error ? (
				<p role="alert" className="mt-2 bg-red-950 p-2 text-red-100 text-xs">
					{error}
				</p>
			) : null}
		</div>
	);
}

function restore(key: string, initial: ContentValues) {
	if (typeof window === "undefined") {
		return initial;
	}
	try {
		const saved = localStorage.getItem(key);
		return saved ? { ...initial, ...(JSON.parse(saved) as ContentValues) } : initial;
	} catch {
		localStorage.removeItem(key);
		return initial;
	}
}

function blockEditableLink(event: MouseEvent) {
	if (!(event.target instanceof Element)) {
		return;
	}
	const link = event.target.closest("a");
	if (!link || (!link.matches("[data-editable-field]") && !link.querySelector("[data-editable-field]"))) {
		return;
	}
	const clickedEditableField = event.target.closest("[data-editable-field]");
	event.preventDefault();
	if (!clickedEditableField) {
		event.stopPropagation();
	}
}
