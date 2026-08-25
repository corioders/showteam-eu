"use client";

import { useEffect, useRef } from "react";

import { EditableMediaUpload, usePageContentField } from "@/components/editor/page-content-editor";

export function HeroVideo({ src, poster }: { src: string; poster: string }) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const video = usePageContentField("heroVideoUrl", src);
	const videoPoster = usePageContentField("heroPosterUrl", poster);

	useEffect(() => {
		const element = videoRef.current;
		if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}

		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) {
				void element.play().catch(() => undefined);
				return;
			}

			element.pause();
			element.currentTime = 0;
		});

		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return (
		<>
			<video
				key={video.value}
				ref={videoRef}
				autoPlay={true}
				muted={true}
				playsInline={true}
				preload="auto"
				poster={videoPoster.value}
				className="autoplay-video absolute inset-0 size-full object-cover object-right md:object-center"
				aria-label="Motorówka SHOWteam wpływa w kadr na Jeziorze Łąckim"
			>
				<source src={video.value} type="video/mp4" />
			</video>
			<EditableMediaUpload field="heroVideoUrl" accept="video" label="Zmień film w tle" />
			<EditableMediaUpload field="heroPosterUrl" accept="image" label="Zmień klatkę startową" positionClassName="right-3 top-36" />
		</>
	);
}
