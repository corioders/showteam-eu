"use client";

import { useEffect, useRef } from "react";

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        void video.play().catch(() => undefined);
        return;
      }

      video.pause();
      video.currentTime = 0;
    });

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      preload="auto"
      poster="/media/hero-boat-poster.jpg"
      className="absolute inset-0 size-full object-cover object-right md:object-center"
      aria-label="Motorówka SHOWteam wpływa w kadr na Jeziorze Łąckim"
    >
      <source src="/media/hero-boat.mp4" type="video/mp4" />
    </video>
  );
}
