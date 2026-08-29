import type * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("border border-white/10 bg-white/[0.045]", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return <div className={cn("p-6", className)} {...props} />;
}

export { Card, CardContent };
