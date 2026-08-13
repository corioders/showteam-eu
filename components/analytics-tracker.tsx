"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function AnalyticsTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/a/") || navigator.doNotTrack === "1") return;
    const key = `showteam:view:${path}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ path }), keepalive: true });
  }, [path]);
  return null;
}
