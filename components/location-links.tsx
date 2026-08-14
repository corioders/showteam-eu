import { ExternalLink, MapPin } from "lucide-react";

type LocationLink = { label: string; href: string };

export function LocationLinks({ locations }: { locations: LocationLink[] }) {
  return (
    <section className="border-b border-white/10 bg-white/[.025]" aria-label="Dojazd">
      <div className="site-container flex flex-col gap-3 py-5 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="eyebrow shrink-0">Dojazd</span>
        {locations.map((location) => (
          <a key={location.href} href={location.href} target="_blank" rel="noreferrer" className="group flex min-h-12 items-center gap-3 border border-white/15 px-4 text-sm font-bold transition hover:border-orange-500 hover:bg-orange-500 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
            <MapPin className="size-5 shrink-0 text-orange-500 group-hover:text-black" />
            <span>{location.label}</span>
            <ExternalLink className="ml-auto size-4 opacity-50" />
          </a>
        ))}
      </div>
    </section>
  );
}
