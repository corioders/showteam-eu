"use client";

import Link from "next/link";

import { ClientImageExample } from "../_components/client-image-example.tsx";

// biome-ignore lint/style/noDefaultExport: This is a nextjs page. Export default is required.
export default function ClientNavigationPage() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-2">
			<h1 className="font-semibold text-2xl">Client navigation works.</h1>
			<ClientImageExample />
			<Link href="/client-params/fixture">Test client page params</Link>
		</main>
	);
}
