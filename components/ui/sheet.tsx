"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-0 z-50 w-full bg-neutral-950 shadow-2xl focus:outline-none",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">Menu główne</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Nawigacja po stronie SHOWteam</DialogPrimitive.Description>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          <X className="size-6" />
          <span className="sr-only">Zamknij menu</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
