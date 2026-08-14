"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BackToPanel() {
  const pathname = usePathname();

  if (pathname === "/admin" || pathname === "/admin/") return null;

  return (
    <div className="showteam-back-wrap">
      <Link href="/admin" className="showteam-back">
        <ArrowLeft aria-hidden="true" />
        Wróć do panelu
      </Link>
    </div>
  );
}
