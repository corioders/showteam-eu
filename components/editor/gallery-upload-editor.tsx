"use client";

import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { useEditor } from "@/components/editor/editor-provider";
import { GalleryUploaderForm } from "@/components/quick-uploader";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function GalleryUploadEditor() {
  const { enabled, visible } = useEditor();
  const router = useRouter();
  if (!enabled || !visible) return null;
  return <Sheet>
    <SheetTrigger asChild><button type="button" className="editor-action"><ImagePlus className="size-4" /> Dodaj zdjęcia lub filmy</button></SheetTrigger>
    <SheetContent title="Dodaj zdjęcia lub filmy" description="Opublikuj nowe materiały bez opuszczania galerii." className="overflow-y-auto sm:left-auto sm:w-[min(42rem,100vw)]">
      <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(4.5rem+env(safe-area-inset-top))] sm:px-8"><GalleryUploaderForm embedded onUploaded={() => router.refresh()} /></div>
    </SheetContent>
  </Sheet>;
}
