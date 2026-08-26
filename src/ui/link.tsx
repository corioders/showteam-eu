import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * https://h.corioders.com/cstd-next/link
 */
export function Link({ prefetch, href, rel, target, ...props }: ComponentProps<typeof NextLink>) {
	const isInternal = href.toString().startsWith("/");
	if (isInternal) {
		return <NextLink href={href} prefetch={prefetch ?? true} rel={rel} target={target} {...props} />;
	}

	return <a href={href.toString()} rel={rel ?? "noopener noreferrer"} target={target ?? "_blank"} {...props} />;
}
