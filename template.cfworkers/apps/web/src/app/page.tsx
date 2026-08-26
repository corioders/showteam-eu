import { ArrowUpRight, Cloud, Code2, Gauge, ShieldCheck } from "lucide-react";

import { env } from "@/env";

const FEATURES = [
	{
		description: "Next.js App Router with strict TypeScript and a focused, production-ready toolchain.",
		icon: Code2,
		title: "Modern by default",
	},
	{
		description: "Preview every branch and promote production through the dedicated deploy branch.",
		icon: Cloud,
		title: "Cloudflare native",
	},
	{
		description: "Biome, Vitest and Playwright run before a release can reach your users.",
		icon: ShieldCheck,
		title: "Guardrails included",
	},
] as const;

// biome-ignore lint/style/noDefaultExport: This is a Next.js page. Export default is required.
export default function HomePage() {
	return (
		<main className="relative min-h-dvh overflow-hidden bg-[#09090b] text-zinc-50">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(163,230,53,0.12),transparent_36%),radial-gradient(circle_at_90%_30%,rgba(56,189,248,0.09),transparent_30%)]" />
			<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

			<div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-6 py-6 sm:px-10 lg:px-12">
				<header className="flex items-center justify-between border-white/10 border-b pb-5">
					<div className="flex items-center gap-3 font-medium text-sm tracking-tight">
						<span className="grid size-8 place-items-center rounded-lg bg-lime-300 font-bold text-zinc-950">C</span>
						<span>cstd / starter</span>
					</div>
					<div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
						<span className="size-1.5 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.9)]" />
						{env.APP_ENV}
					</div>
				</header>

				<section className="grid flex-1 items-center gap-12 py-20 lg:grid-cols-[1.35fr_0.65fr] lg:py-28">
					<div>
						<div className="mb-7 inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1.5 text-lime-200 text-xs">
							<Gauge aria-hidden={true} className="size-3.5" />
							Next.js 16 · Cloudflare Workers · cstd
						</div>
						<h1 className="max-w-4xl text-balance font-semibold text-5xl leading-[0.96] tracking-[-0.055em] sm:text-7xl lg:text-8xl">
							Build what matters.
							<span className="block text-zinc-500">The platform is ready.</span>
						</h1>
						<p className="mt-7 max-w-2xl text-pretty text-lg text-zinc-400 leading-8">
							A lean starting point for products that need excellent defaults, fast previews and a boring path to production.
						</p>
						<div className="mt-9 flex flex-wrap items-center gap-3">
							<a
								className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-2.5 font-medium text-sm text-zinc-950 transition-colors hover:bg-lime-200 focus-visible:outline-2 focus-visible:outline-lime-300 focus-visible:outline-offset-2"
								href="https://nextjs.org/docs/app"
								target="_blank"
								rel="noreferrer"
							>
								Start building
								<ArrowUpRight aria-hidden={true} className="size-4" />
							</a>
							<span className="rounded-full border border-white/10 bg-white/5 px-5 py-2.5 font-mono text-sm text-zinc-300">pnpm dev</span>
						</div>
					</div>

					<div className="grid gap-3">
						{FEATURES.map(({ description, icon: Icon, title }) => (
							<article className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm transition-colors hover:bg-white/[0.07]" key={title}>
								<div className="mb-8 grid size-9 place-items-center rounded-xl border border-white/10 bg-zinc-900 text-lime-300">
									<Icon aria-hidden={true} className="size-4" />
								</div>
								<h2 className="font-medium text-base">{title}</h2>
								<p className="mt-2 text-sm text-zinc-500 leading-6">{description}</p>
							</article>
						))}
					</div>
				</section>

				<footer className="flex flex-col gap-2 border-white/10 border-t pt-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
					<span>Start in apps/web/src/app/page.tsx</span>
					<span>Preview → validate → deploy</span>
				</footer>
			</div>
		</main>
	);
}
