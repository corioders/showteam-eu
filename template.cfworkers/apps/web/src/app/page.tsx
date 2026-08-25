import { StaticImage } from "cstd-next/media/image/static-image.jsx";
import Link from "next/link";

import { panek } from "./_assets/index.ts";

// biome-ignore lint/style/noDefaultExport: This is a nextjs page. Export default is required.
export default function HomePage() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-2">
			<h1 className="font-semibold text-2xl">It works.</h1>
			<p className="text-muted-foreground text-sm">Start in src/app/page.tsx</p>
			<StaticImage src={panek} alt="Server prerendered image" data-testid="server-image" loading="lazy" sizes="(max-width: 1200px) 100vw, 1200px" />
			<Link href="/client-navigation" prefetch={false}>
				Test client navigation
			</Link>
		</main>
	);
}
