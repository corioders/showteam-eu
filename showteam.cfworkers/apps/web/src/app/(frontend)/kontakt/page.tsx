// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import { ArrowLeft, ArrowUpRight, Facebook, Instagram, Mail, MapPin, Music2, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { EditableText, EditableUrl, PageContentEditor } from "@/components/editor/page-content-editor";
import { Button } from "@/components/ui/button";
import { getPageContent } from "@/lib/page-content";

export const metadata: Metadata = {
	title: "Kontakt i o nas",
	description: "Poznaj SHOWteam i skontaktuj się z Asią lub Adamem — Poręba, Jezioro Łąckie.",
	alternates: { canonical: "/kontakt" },
};

export default function ContactPage() {
	return (
		<Suspense fallback={null}>
			<ContactContent />
		</Suspense>
	);
}

async function ContactContent() {
	const pageContent = await getPageContent("contact");
	const content = pageContent.values;
	const phoneLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
	return (
		<PageContentEditor page="contact" initial={content} initialMedia={pageContent.media}>
			<section className="min-h-screen bg-orange-500 pt-32 pb-16 text-neutral-950 md:pt-40 md:pb-24">
				<div className="site-container">
					<Button asChild={true} variant="outline" size="sm" className="border-black/20 bg-black/5 text-black hover:bg-black/10">
						<Link href="/">
							<ArrowLeft className="size-4" /> Wróć
						</Link>
					</Button>
					<div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
						<div>
							<span className="font-bold text-xs uppercase tracking-[0.2em]">
								<EditableText field="eyebrow" />
							</span>
							<h1 className="mt-5 whitespace-pre-line font-black font-display text-[clamp(5rem,14vw,11rem)] uppercase leading-[0.76] tracking-[-0.06em]">
								<EditableText field="title" multiline={true} />
							</h1>
							<p className="mt-10 max-w-xl border-black border-l-2 pl-5 text-lg text-neutral-800 leading-8">
								<EditableText field="intro" multiline={true} />
							</p>
						</div>
						<div className="poster-cut overflow-hidden bg-neutral-950 text-white">
							<a
								href={phoneLink(content.joannaPhone)}
								className="group flex items-center justify-between border-white/10 border-b p-6 transition hover:bg-white/5 sm:p-8"
							>
								<div>
									<span className="text-white/40 text-xs uppercase tracking-[0.16em]">
										<EditableText field="joannaName" />
									</span>
									<p className="mt-2 font-black font-display text-3xl">
										<EditableText field="joannaPhone" />
									</p>
								</div>
								<Phone className="size-6 text-orange-400" />
							</a>
							<a href={phoneLink(content.adamPhone)} className="group flex items-center justify-between border-white/10 border-b p-6 transition hover:bg-white/5 sm:p-8">
								<div>
									<span className="text-white/40 text-xs uppercase tracking-[0.16em]">
										<EditableText field="adamName" />
									</span>
									<p className="mt-2 font-black font-display text-3xl">
										<EditableText field="adamPhone" />
									</p>
								</div>
								<Phone className="size-6 text-orange-400" />
							</a>
							<a href={`mailto:${content.email}`} className="flex items-center justify-between border-white/10 border-b p-6 transition hover:bg-white/5 sm:p-8">
								<div>
									<span className="text-white/40 text-xs uppercase tracking-[0.16em]">E-mail</span>
									<p className="mt-2 font-semibold text-lg">
										<EditableText field="email" />
									</p>
								</div>
								<Mail className="size-6 text-orange-400" />
							</a>
							<a href={content.mapUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between p-6 transition hover:bg-white/5 sm:p-8">
								<div>
									<span className="text-white/40 text-xs uppercase tracking-[0.16em]">
										<EditableText field="locationName" />
									</span>
									<p className="mt-2 font-semibold text-lg">
										<EditableText field="address" />
									</p>
								</div>
								<MapPin className="size-6 text-orange-400" />
							</a>
							<div className="p-3">
								<EditableUrl field="mapUrl" label="Link do mapy" />
							</div>
						</div>
					</div>
					<div className="mt-12 flex flex-wrap gap-3">
						<Button asChild={true} size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800">
							<a href={content.instagramUrl} target="_blank" rel="noreferrer">
								<Instagram className="size-5" /> Instagram <ArrowUpRight className="size-4" />
							</a>
						</Button>
						<Button asChild={true} size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800">
							<a href={content.tiktokUrl} target="_blank" rel="noreferrer">
								<Music2 className="size-5" /> TikTok <ArrowUpRight className="size-4" />
							</a>
						</Button>
						<Button asChild={true} size="lg" className="border border-black/20 bg-transparent text-black hover:bg-black/10">
							<a href={content.facebookUrl} target="_blank" rel="noreferrer">
								<Facebook className="size-5" /> Facebook <ArrowUpRight className="size-4" />
							</a>
						</Button>
						<div className="grid w-full gap-2 sm:grid-cols-3">
							<EditableUrl field="instagramUrl" label="Link do Instagrama" />
							<EditableUrl field="tiktokUrl" label="Link do TikToka" />
							<EditableUrl field="facebookUrl" label="Link do Facebooka" />
						</div>
					</div>
					<section className="mt-16 border-black/20 border-y py-12 md:mt-24 md:py-16" aria-labelledby="o-nas">
						<div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-16">
							<div>
								<span className="font-bold text-xs uppercase tracking-[0.2em]">
									<EditableText field="aboutEyebrow" />
								</span>
								<h2 id="o-nas" className="mt-4 font-black font-display text-5xl uppercase leading-[.9] sm:text-7xl">
									<EditableText field="aboutTitle" multiline={true} />
								</h2>
							</div>
							<div className="max-w-3xl space-y-5 text-lg text-neutral-800 leading-8">
								<p>
									<EditableText field="aboutBody1" multiline={true} />
								</p>
								<p>
									<EditableText field="aboutBody2" multiline={true} />
								</p>
							</div>
						</div>
					</section>
				</div>
			</section>
		</PageContentEditor>
	);
}
