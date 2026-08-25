// biome-ignore-all lint/a11y/noLabelWithoutControl: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
"use client";

import { LoaderCircle, Pencil, RefreshCw, RotateCcw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useEditor } from "@/components/editor/editor-provider";
import { ImageCropEditor } from "@/components/image-crop-editor";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { appendOptimizedImage } from "@/lib/client-image-upload";
import type { EditableGalleryItem } from "@/lib/editor-gallery";
import type { GalleryPhoto } from "@/lib/gallery";
import { cn } from "@/lib/utils";

export function GalleryItemEditor({ photo, className }: { photo: GalleryPhoto; className?: string }) {
	const { enabled, visible } = useEditor();
	const router = useRouter();
	const initial = toForm(photo);
	const [value, setValue] = useState(initial);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [errors, setErrors] = useState<string[]>([]);
	const draftKey = `showteam:visual-gallery:${photo.id}`;
	if (!enabled || !visible || !photo.editable) {
		return null;
	}

	function openChanged(open: boolean) {
		if (!open) {
			return;
		}
		const saved = localStorage.getItem(draftKey);
		if (!saved) {
			return;
		}
		try {
			setValue(JSON.parse(saved) as EditableGalleryItem);
		} catch {
			localStorage.removeItem(draftKey);
		}
	}

	function update<K extends keyof EditableGalleryItem>(field: K, nextValue: EditableGalleryItem[K]) {
		const next = { ...value, [field]: nextValue };
		setValue(next);
		localStorage.setItem(draftKey, JSON.stringify(next));
		setMessage(null);
		setErrors([]);
	}

	function updateCrop(focalX: number, focalY: number) {
		const next = { ...value, focalX, focalY, mobilePosition: "same" as const };
		setValue(next);
		localStorage.setItem(draftKey, JSON.stringify(next));
		setMessage(null);
		setErrors([]);
	}

	function clear() {
		localStorage.removeItem(draftKey);
		setValue(initial);
		setMessage(null);
		setErrors([]);
	}

	async function save(event: React.FormEvent) {
		event.preventDefault();
		setSaving(true);
		const response = await fetch(`/api/admin/gallery/${photo.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
		const result = (await response.json()) as { message?: string; errors?: string[] };
		setSaving(false);
		setMessage(result.message ?? null);
		setErrors(result.errors ?? []);
		if (response.ok) {
			localStorage.removeItem(draftKey);
			router.refresh();
		}
	}

	async function remove() {
		if (!window.confirm(`Usunąć „${photo.caption}” z galerii? Tej operacji nie można cofnąć.`)) {
			return;
		}
		setSaving(true);
		const response = await fetch(`/api/admin/gallery/${photo.id}`, { method: "DELETE" });
		const result = (await response.json()) as { message?: string };
		setSaving(false);
		setMessage(result.message ?? null);
		if (response.ok) {
			localStorage.removeItem(draftKey);
			router.refresh();
		}
	}

	async function replaceMedia(file: File | undefined) {
		if (!file || saving) {
			return;
		}
		setSaving(true);
		setMessage("Przygotowuję nowy plik…");
		setErrors([]);
		try {
			const body = new FormData();
			if (file.type.startsWith("image/")) {
				await appendOptimizedImage(body, file, "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw");
			} else {
				body.set("file", file);
			}
			const response = await fetch(`/api/admin/gallery/${photo.id}/media`, { method: "POST", body });
			const result = (await response.json()) as { message?: string };
			if (!response.ok) {
				throw new Error(result.message || "Nie udało się wymienić pliku.");
			}
			setMessage(result.message || "Plik został wymieniony.");
			router.refresh();
		} catch (caught) {
			setMessage(null);
			setErrors([caught instanceof Error ? caught.message : "Nie udało się wymienić pliku."]);
		} finally {
			setSaving(false);
		}
	}

	return (
		<Sheet onOpenChange={openChanged}>
			<SheetTrigger asChild={true}>
				<button type="button" className={cn("editor-action min-h-10 px-3", className)}>
					<Pencil className="size-4" />
					<span className="sr-only">Edytuj {photo.caption}</span>
				</button>
			</SheetTrigger>
			<SheetContent
				title={`Edytuj ${photo.caption}`}
				description="Zmień podpis, kategorię i kadr materiału."
				className="overflow-y-auto sm:left-auto sm:w-[min(40rem,100vw)]"
			>
				<form onSubmit={save} className="min-h-full px-5 pt-[calc(4.5rem+env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-8">
					<span className="eyebrow">Galeria</span>
					<h2 className="mt-3 font-black font-display text-4xl uppercase leading-none">Edytuj materiał</h2>
					<div className={`mt-7 overflow-hidden bg-black ${photo.type === "video" ? "aspect-video" : ""}`}>
						{photo.type === "video" ? (
							<video src={photo.src} muted={true} playsInline={true} className={`size-full ${value.fit === "contain" ? "object-contain" : "object-cover"}`} />
						) : value.fit === "cover" ? (
							<ImageCropEditor
								src={photo.src}
								label={`Ustaw kadr: ${photo.caption}`}
								focalX={value.focalX}
								focalY={value.focalY}
								aspect={mobileAspect(value.mobileLayout)}
								onChange={updateCrop}
							/>
						) : (
							<div className="grid min-h-72 place-items-center px-6 text-center text-sm text-white/55">Całe zdjęcie będzie widoczne — kadrowanie nie jest potrzebne.</div>
						)}
					</div>
					<label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 border border-orange-500/60 px-4 font-bold text-sm">
						<RefreshCw className="size-4" />
						<input
							type="file"
							accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime"
							className="sr-only"
							disabled={saving}
							onChange={(event) => void replaceMedia(event.target.files?.[0])}
						/>
						Wymień zdjęcie lub film
					</label>
					<div className="mt-7 grid gap-5">
						<Field label="Podpis">
							<input required={true} minLength={2} maxLength={100} value={value.caption} onChange={(event) => update("caption", event.target.value)} />
						</Field>
						<Field label="Opis zdjęcia" hint="Opcjonalny opis dla osób używających czytnika ekranu.">
							<input maxLength={180} value={value.alt} onChange={(event) => update("alt", event.target.value)} />
						</Field>
						<Field label="Kategoria">
							<select value={value.season} onChange={(event) => update("season", event.target.value as EditableGalleryItem["season"])}>
								{["Lato", "Zima", "Szkolenia"].map((season) => (
									<option key={season}>{season}</option>
								))}
							</select>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Rozmiar na komputerze">
								<select value={value.layout} onChange={(event) => update("layout", event.target.value as EditableGalleryItem["layout"])}>
									<option value="large">Duży</option>
									<option value="wide">Szeroki</option>
									<option value="tall">Wysoki</option>
									<option value="square">Kwadrat</option>
								</select>
							</Field>
							<Field label="Kształt na telefonie">
								<select value={value.mobileLayout} onChange={(event) => update("mobileLayout", event.target.value as EditableGalleryItem["mobileLayout"])}>
									<option value="landscape">Poziomy</option>
									<option value="portrait">Pionowy</option>
									<option value="square">Kwadrat</option>
								</select>
							</Field>
						</div>
						<Field label="Dopasowanie">
							<select value={value.fit} onChange={(event) => update("fit", event.target.value as EditableGalleryItem["fit"])}>
								<option value="cover">Wypełnij kafel</option>
								<option value="contain">Pokaż całe zdjęcie</option>
							</select>
						</Field>
						<Field label="Link do posta" hint="Opcjonalny link do Instagrama, Facebooka lub TikToka.">
							<input type="url" placeholder="https://…" value={value.sourceUrl} onChange={(event) => update("sourceUrl", event.target.value)} />
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Button type="button" variant="outline" onClick={() => update("sortOrder", Date.now())}>
								Przenieś na początek
							</Button>
							<Button type="button" variant="outline" onClick={() => update("sortOrder", 0)}>
								Przenieś na koniec
							</Button>
						</div>
						<label className="flex min-h-12 items-center gap-3 border border-white/15 p-3 font-semibold">
							<input type="checkbox" checked={value.published} onChange={(event) => update("published", event.target.checked)} className="size-5 accent-orange-500" />{" "}
							Pokaż w galerii
						</label>
					</div>
					{(message || errors.length > 0) && (
						<div
							className={`mt-6 border p-4 text-sm ${errors.length > 0 || message?.startsWith("Nie udało") ? "border-red-400/50 bg-red-950/50 text-red-100" : "border-emerald-400/40 bg-emerald-950/40 text-emerald-100"}`}
							role="status"
						>
							<p className="font-bold">{message}</p>
							{errors.length > 0 && (
								<ul className="mt-2 list-disc space-y-1 pl-5">
									{errors.map((error) => (
										<li key={error}>{error}</li>
									))}
								</ul>
							)}
						</div>
					)}
					<Button type="button" variant="outline" className="mt-8 border-red-500/40 text-red-200 hover:bg-red-500 hover:text-white" onClick={remove} disabled={saving}>
						<Trash2 className="size-4" /> Usuń z galerii
					</Button>
					<div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-white/15 border-t bg-neutral-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:left-auto sm:w-[min(40rem,100vw)] sm:px-8">
						<Button type="button" variant="outline" onClick={clear}>
							<RotateCcw className="size-4" /> Wyczyść
						</Button>
						<Button type="submit" className="flex-1" disabled={saving}>
							{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
							{saving ? "Zapisuję…" : "Zapisz zmiany"}
						</Button>
					</div>
				</form>
			</SheetContent>
		</Sheet>
	);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<label className="editor-field">
			<span>{label}</span>
			{children}
			{hint && <small>{hint}</small>}
		</label>
	);
}
function toForm(photo: GalleryPhoto): EditableGalleryItem {
	const match = /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(photo.objectPosition);
	return {
		caption: photo.caption,
		alt: photo.alt,
		season: photo.season,
		published: true,
		layout: photo.layout,
		mobileLayout: photo.mobileLayout,
		fit: photo.fit,
		mobilePosition: (["same", "50% 20%", "50% 50%", "50% 80%", "20% 50%", "80% 50%"].includes(photo.mobilePosition)
			? photo.mobilePosition
			: "same") as EditableGalleryItem["mobilePosition"],
		sourceUrl: photo.sourceUrl ?? "",
		focalX: match ? Number(match[1]) : 50,
		focalY: match ? Number(match[2]) : 50,
		sortOrder: photo.sortOrder,
	};
}
function mobileAspect(layout: EditableGalleryItem["mobileLayout"]) {
	return layout === "landscape" ? 16 / 10 : layout === "portrait" ? 4 / 5 : 1;
}
