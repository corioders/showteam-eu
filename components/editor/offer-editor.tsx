"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useEditor } from "@/components/editor/editor-provider";
import type { Offer } from "@/lib/offers";
import { cn } from "@/lib/utils";

export function OfferEditor({ offer, compact = false, className }: { offer: Offer; compact?: boolean; className?: string }) {
  const { enabled, visible } = useEditor();
  if (!enabled || !visible || !offer.cmsId) return null;
  return <Link href={offer.href} prefetch className={cn("editor-action", compact && "min-h-10 px-3", className)}><Pencil className="size-4" />{compact ? <span className="sr-only">Edytuj {offer.title} na stronie</span> : "Edytuj na stronie"}</Link>;
}
