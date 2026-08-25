import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold text-sm tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			variant: {
				default: "bg-orange-500 px-6 py-3 text-neutral-950 hover:bg-orange-400",
				outline: "border border-white/20 bg-white/5 px-6 py-3 text-white backdrop-blur hover:bg-white/10",
				ghost: "px-4 py-2 text-white hover:bg-white/10",
			},
			size: {
				default: "h-12",
				sm: "h-11 px-4",
				lg: "h-14 px-8 text-base",
				icon: "size-11 p-0",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	},
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : "button";
	return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
