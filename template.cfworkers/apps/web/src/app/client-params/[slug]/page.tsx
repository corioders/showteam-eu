"use client";

import { use } from "react";

import { ClientImageExample } from "../../_components/client-image-example.tsx";

// biome-ignore lint/style/noDefaultExport: This is a temporary Next.js page-loader fixture.
export default function ClientParamsPage(props: { params: Promise<{ slug: string }> }) {
	const { slug } = use(props.params);
	return (
		<main>
			<h1>Client params fixture: {slug}</h1>
			<ClientImageExample />
		</main>
	);
}
