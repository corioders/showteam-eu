import { cookies } from "next/headers";
import { OperationsCalendar } from "@/components/operations-calendar";
import { TvPairing } from "@/components/tv-pairing";
import { tvCookieName, verifyTvToken } from "@/lib/tv-auth";

export const dynamic = "force-dynamic";
export default async function TvPage() {
  const authorized = await verifyTvToken((await cookies()).get(tvCookieName)?.value);
  if (!authorized) return <TvPairing />;
  return <main className="min-h-screen bg-neutral-950 p-3 text-white sm:p-6"><header className="mb-4 flex items-center justify-between"><div><p className="eyebrow">SHOWteam · baza</p><h1 className="font-display text-3xl font-black uppercase sm:text-5xl">Rezerwacje</h1></div><p className="hidden text-sm text-white/35 sm:block">Odświeżanie co 30 s</p></header><OperationsCalendar tv /></main>;
}
