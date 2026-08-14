import type { Metadata } from "next";
import Image from "next/image";
import { getNews } from "@/lib/news";

export const revalidate = false;
export const metadata: Metadata = { title: "Aktualności", description: "Najnowsze wiadomości, relacje i ogłoszenia SHOWteam.", alternates: { canonical: "/aktualnosci" } };

const formatDate = (value: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" }).format(new Date(value));

export default async function NewsPage() {
  const news = await getNews();

  return <section className="pb-24 pt-32 md:pb-32 md:pt-40"><div className="site-container">
    <div className="mb-12 border-b border-white/15 pb-10"><span className="eyebrow">Co u nas</span><h1 className="font-display mt-4 text-7xl font-black uppercase leading-[0.82] tracking-[-0.055em] sm:text-9xl">Aktualności<span className="text-orange-500">.</span></h1><p className="mt-7 max-w-2xl leading-7 text-white/55">Najnowsze wiadomości, relacje z bazy i informacje o wyjazdach.</p></div>
    {news.length ? <div className="grid gap-6 lg:grid-cols-2">{news.map((item) => <article key={item.id} className="overflow-hidden border border-white/15 bg-white/[.025]">
      <div className="relative aspect-[16/10]"><Image src={item.image} alt={item.imageAlt} fill className="object-cover" sizes="(min-width:1024px) 45vw, 100vw" /></div>
      <div className="p-6 sm:p-8"><p className="font-mono text-[.68rem] font-bold uppercase tracking-[.18em] text-orange-400">{item.category} · {formatDate(item.publicationDate)}</p><h2 className="font-display mt-4 text-4xl font-black uppercase leading-none">{item.title}</h2><p className="mt-5 text-lg font-semibold leading-7 text-white/80">{item.summary}</p><p className="mt-5 whitespace-pre-line leading-7 text-white/55">{item.content}</p></div>
    </article>)}</div> : <p className="border-l-4 border-orange-500 bg-white/[.035] p-6 text-white/65">Gdy opublikujemy pierwszą aktualność, pojawi się tutaj.</p>}
  </div></section>;
}
