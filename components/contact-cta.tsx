import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ContactCta({ title = "Masz ochotę na SHOW?" }: { title?: string }) {
  return (
    <section className="bg-orange-500 py-16 text-neutral-950 md:py-24">
      <div className="site-container grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Twój następny ruch</span>
          <h2 className="font-display mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.04em] sm:text-7xl lg:text-8xl">{title}</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button asChild size="lg" className="bg-neutral-950 text-white hover:bg-neutral-800">
            <a href="tel:+48500128090"><Phone className="size-4" /> Zadzwoń do Asi</a>
          </Button>
          <Button asChild size="lg" className="border border-neutral-950/20 bg-transparent text-neutral-950 hover:bg-black/10">
            <a href="mailto:biuro@showteam.eu"><Mail className="size-4" /> Napisz <ArrowUpRight className="size-4" /></a>
          </Button>
        </div>
      </div>
    </section>
  );
}
