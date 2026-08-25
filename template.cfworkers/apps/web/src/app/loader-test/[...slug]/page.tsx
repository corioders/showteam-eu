import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import type { Metadata } from "next";

import { panek } from "../../_assets/index.ts";

export const metadata: Metadata = { title: "Page loader fixture" };
export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
	return [{ slug: ["catch", "all"] }];
}

// biome-ignore lint/style/noDefaultExport: This is a Next.js page fixture.
export default async function PageLoaderFixture(props: { params: Promise<{ slug: string[] }> }) {
	const { slug } = await props.params;
	return (
		<main>
			<h1>Page loader fixture: {slug.join("/")}</h1>
			<StaticImage src={panek} alt="Loader fixture image" data-testid="loader-fixture-image" loading="lazy" sizes="100vw" />
		</main>
	);
}
