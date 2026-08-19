// biome-ignore lint/style/noDefaultExport: This is a nextjs page. Export default is required.
export default function HomePage() {
	return (
		<main className="flex min-h-dvh flex-col items-center justify-center gap-2">
			<h1 className="font-semibold text-2xl">It works.</h1>
			<p className="text-muted-foreground text-sm">Start in src/app/page.tsx</p>
		</main>
	);
}
