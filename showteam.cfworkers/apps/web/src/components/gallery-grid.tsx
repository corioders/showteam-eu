// biome-ignore-all lint/a11y/useAriaPropsSupportedByRole: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/a11y/useMediaCaption: CMS videos do not currently provide a caption artifact.
// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { OptimizedImage } from "cstd-next/media/image/optimized-image.jsx";
import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import { ArrowUpRight, ChevronLeft, ChevronRight, LoaderCircle, Play, X } from "lucide-react";
import { type CSSProperties, type PointerEvent, useEffect, useState } from "react";

import { GalleryItemEditor } from "@/components/editor/gallery-item-editor";
import type { GalleryPage, GalleryPhoto } from "@/lib/gallery";
import { galleryLayoutClass, galleryMobileClass } from "@/lib/gallery-layout";

const filters = ["Wszystkie", "Lato", "Zima", "Szkolenia"] as const;
type GalleryState = { photos: GalleryPhoto[]; page: number; totalPages: number };

export function GalleryGrid({
	photos,
	filtersEnabled = false,
	initialPage = 1,
	initialTotalPages = 1,
}: {
	photos: GalleryPhoto[];
	filtersEnabled?: boolean;
	initialPage?: number;
	initialTotalPages?: number;
}) {
	const [filter, setFilter] = useState<(typeof filters)[number]>("Wszystkie");
	const [pages, setPages] = useState<Partial<Record<(typeof filters)[number], GalleryState>>>({
		Wszystkie: { photos, page: initialPage, totalPages: initialTotalPages },
	});
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const current = pages[filter];
	const visible = current?.photos ?? photos.filter((photo) => photo.season === filter);
	const selectedIndex = visible.findIndex((photo) => photo.id === selectedId);
	const selected = selectedIndex >= 0 ? visible[selectedIndex] : null;

	useEffect(() => {
		if (!filtersEnabled) {
			return;
		}
		const controller = new AbortController();
		fetch("/api/gallery?page=1", { cache: "no-store", signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error();
				}
				const result = (await response.json()) as GalleryPage;
				setPages((stored) => ({ ...stored, Wszystkie: { photos: result.photos, page: result.page, totalPages: result.totalPages } }));
			})
			.catch((error) => {
				if (error.name !== "AbortError") {
					setLoadError(true);
				}
			});
		return () => controller.abort();
	}, [filtersEnabled]);

	useEffect(() => {
		if (!selected) {
			return;
		}
		const keydown = (event: KeyboardEvent) => {
			if (event.key === "ArrowLeft") {
				setSelectedId(visible[(selectedIndex - 1 + visible.length) % visible.length]?.id ?? null);
			}
			if (event.key === "ArrowRight") {
				setSelectedId(visible[(selectedIndex + 1) % visible.length]?.id ?? null);
			}
		};
		window.addEventListener("keydown", keydown);
		return () => window.removeEventListener("keydown", keydown);
	}, [selected, selectedIndex, visible]);

	async function selectFilter(nextFilter: (typeof filters)[number]) {
		setFilter(nextFilter);
		setSelectedId(null);
		if (pages[nextFilter]) {
			return;
		}
		await loadPage(nextFilter, 1, false);
	}

	async function loadPage(targetFilter: (typeof filters)[number], page: number, append: boolean) {
		setLoading(true);
		setLoadError(false);
		try {
			const params = new URLSearchParams({ page: String(page) });
			if (targetFilter !== "Wszystkie") {
				params.set("season", targetFilter);
			}
			const response = await fetch(`/api/gallery?${params}`, { cache: "no-store" });
			if (!response.ok) {
				throw new Error("gallery request failed");
			}
			const result = (await response.json()) as GalleryPage;
			setPages((stored) => ({
				...stored,
				[targetFilter]: {
					photos: append ? [...(stored[targetFilter]?.photos ?? []), ...result.photos] : result.photos,
					page: result.page,
					totalPages: result.totalPages,
				},
			}));
		} catch {
			setLoadError(true);
		} finally {
			setLoading(false);
		}
	}

	const move = (direction: -1 | 1) => setSelectedId(visible[(selectedIndex + direction + visible.length) % visible.length]?.id ?? null);
	let pointerStart = 0;
	const pointerDown = (event: PointerEvent) => {
		pointerStart = event.clientX;
	};
	const pointerUp = (event: PointerEvent) => {
		const distance = event.clientX - pointerStart;
		if (Math.abs(distance) > 55) {
			move(distance > 0 ? -1 : 1);
		}
	};

	return (
		<>
			{filtersEnabled ? (
				<div className="mb-8 flex flex-wrap border-white/15 border-t border-l" aria-label="Filtry galerii">
					{filters.map((item) => (
						<button
							key={item}
							type="button"
							onClick={() => void selectFilter(item)}
							aria-pressed={filter === item}
							className="min-h-11 border-white/15 border-r border-b px-5 py-3 font-bold font-mono text-xs uppercase tracking-wider transition-colors hover:bg-white hover:text-black aria-pressed:bg-orange-500 aria-pressed:text-black"
						>
							{item}
						</button>
					))}
				</div>
			) : null}
			<div
				className={
					filtersEnabled ? "columns-1 gap-3 sm:columns-2 lg:columns-3 xl:columns-4" : "grid grid-cols-1 gap-3 sm:grid-cols-2 md:auto-rows-[22rem] md:grid-cols-4 md:gap-4"
				}
			>
				{visible.map((photo) => (
					<GalleryTile key={photo.id} photo={photo} masonry={filtersEnabled} open={() => setSelectedId(photo.id)} />
				))}
			</div>
			{filtersEnabled && current && current.page < current.totalPages ? (
				<div className="mt-8 flex justify-center">
					<button
						type="button"
						disabled={loading}
						onClick={() => void loadPage(filter, current.page + 1, true)}
						className="inline-flex min-w-48 items-center justify-center gap-2 border border-white/25 px-6 py-4 font-bold font-mono text-xs uppercase tracking-wider transition hover:border-orange-500 hover:text-orange-400 disabled:opacity-50"
					>
						{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
						{loading ? "Ładuję…" : "Pokaż więcej"}
					</button>
				</div>
			) : null}
			{loadError ? (
				<p role="status" className="mt-5 border-orange-500 border-l-2 py-2 pl-4 text-sm text-white/65">
					Nie udało się pobrać kolejnych zdjęć. Spróbuj ponownie.
				</p>
			) : null}
			{visible.length === 0 ? <p className="border-orange-500 border-l-2 py-2 pl-4 text-white/55">Brak opublikowanych materiałów w tej kategorii.</p> : null}

			<Dialog.Root
				open={Boolean(selected)}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedId(null);
					}
				}}
			>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm" />
					<Dialog.Content
						onPointerDown={pointerDown}
						onPointerUp={pointerUp}
						className="fixed inset-0 z-[101] grid touch-pan-y grid-rows-[1fr_auto] bg-black p-3 pt-[calc(.75rem+env(safe-area-inset-top))] pb-[calc(.75rem+env(safe-area-inset-bottom))] text-white outline-none sm:p-6"
					>
						<Dialog.Title className="sr-only">{selected?.caption || "Zdjęcie SHOWteam"}</Dialog.Title>
						<Dialog.Description className="sr-only">Pełnoekranowy podgląd. Przesuń palcem albo użyj strzałek, aby zmienić zdjęcie.</Dialog.Description>
						{selected ? (
							<div className="relative min-h-0">
								{selected.type === "video" ? (
									<video
										src={selected.src}
										controls={true}
										controlsList="nodownload noremoteplayback"
										disablePictureInPicture={true}
										autoPlay={true}
										playsInline={true}
										className="size-full object-contain"
									/>
								) : (
									<ResponsiveImage photo={selected} sizes="100vw" className="object-contain" />
								)}
							</div>
						) : null}
						<footer className="flex min-h-16 items-center justify-between gap-4 px-2">
							<div className="min-w-0">
								<p className="truncate font-black font-display text-xl uppercase">{selected?.caption}</p>
								<p className="font-mono text-[.65rem] text-white/45">
									{selectedIndex + 1} / {visible.length}
								</p>
							</div>
							{selected?.sourceUrl ? (
								<a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="shrink-0 font-bold font-mono text-orange-400 text-xs uppercase">
									Źródło ↗
								</a>
							) : null}
						</footer>
						{visible.length > 1 ? (
							<>
								<button
									type="button"
									onClick={() => move(-1)}
									aria-label="Poprzednie zdjęcie"
									className="absolute top-1/2 left-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/70 ring-1 ring-white/25 sm:left-6"
								>
									<ChevronLeft />
								</button>
								<button
									type="button"
									onClick={() => move(1)}
									aria-label="Następne zdjęcie"
									className="absolute top-1/2 right-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/70 ring-1 ring-white/25 sm:right-6"
								>
									<ChevronRight />
								</button>
							</>
						) : null}
						<Dialog.Close className="absolute top-[calc(.75rem+env(safe-area-inset-top))] right-3 grid size-12 place-items-center rounded-full bg-black/70 ring-1 ring-white/25 sm:top-6 sm:right-6">
							<X />
							<span className="sr-only">Zamknij podgląd</span>
						</Dialog.Close>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}

function GalleryTile({ photo, masonry, open }: { photo: GalleryPhoto; masonry: boolean; open: () => void }) {
	const desktopShape = photo.layout === "wide" ? "md:aspect-[16/10]" : photo.layout === "tall" ? "md:aspect-[4/5]" : "md:aspect-square";
	return (
		<figure
			className={`gallery-tile group relative m-0 overflow-hidden ${masonry ? `mb-3 break-inside-avoid ${galleryMobileClass(photo.mobileLayout)} ${desktopShape}` : `${galleryMobileClass(photo.mobileLayout)} md:aspect-auto ${galleryLayoutClass(photo.layout)}`} ${photo.fit === "contain" ? "bg-[#ecebe4]" : "bg-neutral-900"}`}
		>
			<GalleryItemEditor photo={photo} className="absolute top-3 right-3" />
			{photo.type === "video" ? (
				<button type="button" onClick={open} aria-label={`Odtwórz: ${photo.caption}`} className="absolute inset-0 size-full cursor-pointer text-left">
					<video
						src={photo.src}
						muted={true}
						playsInline={true}
						preload="metadata"
						className={`gallery-image pointer-events-none size-full ${photo.fit === "contain" ? "object-contain" : "object-cover"} transition duration-700 group-hover:scale-[1.025]`}
						style={{ "--mobile-position": photo.mobilePosition, "--desktop-position": photo.objectPosition } as CSSProperties}
					/>
					<span className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-orange-500 text-black shadow-2xl transition group-hover:scale-105 group-focus-visible:scale-105">
						<Play className="ml-1 size-6 fill-current" aria-hidden="true" />
					</span>
				</button>
			) : (
				<button type="button" onClick={open} aria-label={`Powiększ: ${photo.caption}`} className="absolute inset-0 size-full cursor-zoom-in text-left">
					<ResponsiveImage
						photo={photo}
						sizes={
							masonry
								? "(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
								: photo.layout === "large" || photo.layout === "wide"
									? "(min-width:768px) 50vw, 100vw"
									: "(min-width:768px) 25vw, 100vw"
						}
						className={`${photo.fit === "contain" ? "object-contain" : "object-cover"} transition duration-700 group-hover:scale-[1.025]`}
					/>
				</button>
			)}
			<figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-5 pt-14 md:translate-y-3 md:opacity-0 md:transition md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
				<p className="font-black font-display text-xl uppercase">{photo.caption}</p>
				{photo.sourceUrl ? (
					<a
						href={photo.sourceUrl}
						target="_blank"
						rel="noreferrer"
						className="pointer-events-auto relative z-10 mt-2 inline-flex items-center gap-1 font-bold font-mono text-[0.65rem] text-orange-400 uppercase tracking-wider"
					>
						Źródło <ArrowUpRight className="size-3" />
					</a>
				) : null}
			</figcaption>
		</figure>
	);
}

function ResponsiveImage({ photo, sizes, className }: { photo: GalleryPhoto; sizes: string; className: string }) {
	if (!photo.image) {
		return null;
	}
	const props = {
		alt: photo.alt,
		className: `gallery-image absolute inset-0 size-full ${className}`,
		loading: "lazy" as const,
		sizes,
		style: { "--mobile-position": photo.mobilePosition, "--desktop-position": photo.objectPosition } as CSSProperties,
	};
	return "contentHash" in photo.image ? <OptimizedImage {...props} src={photo.image} /> : <StaticImage {...props} src={photo.image} />;
}
