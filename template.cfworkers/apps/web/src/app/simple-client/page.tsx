"use client";

import { use } from "react";

// biome-ignore lint/style/noDefaultExport: This is a temporary Next.js page-loader fixture.
export default function SimpleClientPage(props: { searchParams: Promise<{ message?: string }> }) {
	const searchParams = use(props.searchParams);
	return <h1>Simple client page: {searchParams.message ?? "empty"}</h1>;
}
