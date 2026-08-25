import type { ReactNode } from "react";

export const dynamicParams = false;

export function generateStaticParams() {
	return [{ slug: "fixture" }];
}

// biome-ignore lint/style/noDefaultExport: This is a temporary Next.js page-loader fixture.
export default function ClientParamsLayout(props: { children: ReactNode }) {
	return props.children;
}
