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
          "fixed inset-y-0 right-0 z-50 w-[86vw] max-w-sm border-l border-white/10 bg-neutral-950 p-6 shadow-2xl focus:outline-none",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">Menu główne</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Nawigacja po stronie SHOWteam</DialogPrimitive.Description>
        {children}
        <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          <X className="size-5" />
          <span className="sr-only">Zamknij menu</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
