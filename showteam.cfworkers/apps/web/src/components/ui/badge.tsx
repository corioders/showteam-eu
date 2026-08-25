import type * as React from "react";

import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			className={cn("inline-flex items-center border-orange-500 border-l-2 pl-3 font-bold font-mono text-[0.68rem] text-white/75 uppercase tracking-[0.18em]", className)}
			{...props}
		/>
	);
}

export { Badge };
