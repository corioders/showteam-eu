"use client";

import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { useEditor } from "@/components/editor/editor-provider";
import { cn } from "@/lib/utils";

type EditorActionProps = {
  href: string;
  label?: string;
  kind?: "edit" | "add";
  className?: string;
};

export function EditorAction({ href, label = "Edytuj", kind = "edit", className }: EditorActionProps) {
  const { enabled, visible } = useEditor();
  if (!enabled || !visible) return null;
  const Icon = kind === "add" ? Plus : Pencil;
  return <Link href={href} prefetch className={cn("editor-action", className)}><Icon className="size-4" aria-hidden="true" />{label}</Link>;
}
