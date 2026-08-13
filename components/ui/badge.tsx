import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center border-l-2 border-orange-500 pl-3 font-mono text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/75",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
