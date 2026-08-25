// biome-ignore-all lint/a11y/useButtonType: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/performance/useTopLevelRegex: Legacy SHOWteam behavior is preserved during the structural template migration.
// biome-ignore-all lint/style/noDefaultExport: Next.js, Payload, and tool configs require default exports.
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReservationResponsePage({
	params,
	searchParams,
}: {
	params: Promise<{ token: string; choice: string }>;
	searchParams: Promise<{ done?: string }>;
}) {
	const { token, choice } = await params;
	const { done } = await searchParams;
	if (!/^[A-Za-z0-9_-]{22}$/.test(token) || (choice !== "tak" && choice !== "nie")) {
		notFound();
	}
	const confirming = choice === "tak";
	return (
		<main className="grid min-h-dvh place-items-center px-5 py-24">
			<section className="w-full max-w-xl border border-white/15 p-7 text-center sm:p-12">
				<span className="eyebrow">SHOWteam</span>
				<h1 className="mt-5 font-black font-display text-5xl uppercase">
					{done ? (confirming ? "Potwierdzone" : "Anulowane") : confirming ? "Potwierdzasz przyjazd?" : "Anulujesz rezerwację?"}
				</h1>
				<p className="mt-5 text-white/60 leading-7">
					{done
						? confirming
							? "Dziękujemy. Czekamy na Ciebie w WAKE & SURF Village."
							: "Rezerwacja została anulowana, a termin zwolniony."
						: confirming
							? "Kliknij poniżej, aby potwierdzić, że przyjedziesz."
							: "Kliknij poniżej, jeśli na pewno chcesz zwolnić termin."}
				</p>
				{!done ? (
					<form action="/api/reservation-response" method="post" className="mt-8">
						<input type="hidden" name="token" value={token} />
						<input type="hidden" name="response" value={confirming ? "confirmed" : "cancelled"} />
						<button className={`min-h-14 w-full px-6 font-black text-black uppercase ${confirming ? "bg-emerald-400" : "bg-red-400"}`}>
							{confirming ? "Tak, potwierdzam" : "Tak, anuluję"}
						</button>
					</form>
				) : (
					<Link href="/" className="mt-8 inline-flex min-h-12 items-center border border-white/20 px-5 font-bold hover:border-orange-500">
						Wróć na stronę SHOWteam
					</Link>
				)}
			</section>
		</main>
	);
}
