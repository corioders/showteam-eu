"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area, type MediaSize, type Size } from "react-easy-crop";

type Props = {
	src: string;
	label: string;
	focalX: number;
	focalY: number;
	aspect?: number;
	onChange: (focalX: number, focalY: number) => void;
};

export function ImageCropEditor({ src, label, focalX, focalY, aspect = 1, onChange }: Props) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
	const [cropSize, setCropSize] = useState<Size | null>(null);
	const interactionStarted = useRef(false);
	const initializedFor = useRef("");

	useEffect(() => {
		if (!mediaSize || !cropSize) {
			return;
		}
		const key = `${src}:${aspect}`;
		if (initializedFor.current === key) {
			return;
		}
		initializedFor.current = key;
		setCrop({
			x: ((50 - focalX) / 100) * mediaSize.width,
			y: ((50 - focalY) / 100) * mediaSize.height,
		});
	}, [aspect, cropSize, focalX, focalY, mediaSize, src]);

	function complete(area: Area) {
		if (!interactionStarted.current) {
			return;
		}
		onChange(round(area.x + area.width / 2), round(area.y + area.height / 2));
	}

	function center() {
		initializedFor.current = `${src}:${aspect}`;
		setCrop({ x: 0, y: 0 });
		onChange(50, 50);
	}

	return (
		<div className="image-crop-editor">
			<div className="relative h-72 overflow-hidden bg-black sm:h-80">
				<Cropper
					image={src}
					crop={crop}
					zoom={1}
					minZoom={1}
					maxZoom={1}
					aspect={aspect}
					objectFit="cover"
					showGrid={true}
					zoomWithScroll={false}
					onCropChange={setCrop}
					onCropComplete={complete}
					onMediaLoaded={setMediaSize}
					onCropSizeChange={setCropSize}
					onInteractionStart={() => {
						interactionStarted.current = true;
					}}
					cropperProps={{ "aria-label": label, tabIndex: 0 }}
					mediaProps={{ alt: "" }}
				/>
			</div>
			<div className="mt-3 flex items-start justify-between gap-4">
				<p className="text-white/55 text-xs leading-5">Przeciągnij zdjęcie palcem. Jasna ramka pokazuje dokładnie widoczny kadr.</p>
				<button type="button" onClick={center} className="shrink-0 border border-white/20 px-3 py-2 font-bold text-xs uppercase hover:border-orange-500">
					Wyśrodkuj
				</button>
			</div>
			<output className="sr-only" aria-live="polite">
				Punkt kadru: {Math.round(focalX)}%, {Math.round(focalY)}%
			</output>
		</div>
	);
}

function round(value: number) {
	return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}
