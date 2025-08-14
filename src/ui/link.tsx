import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * https://h.corioders.com/cstd-next/link
 */
export function Link({ prefetch, ...props }: ComponentProps<typeof NextLink>) {
	return <NextLink prefetch={prefetch ?? true} {...props} />;
}
