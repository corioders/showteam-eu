"use client";

import { RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Pairing = { id: string; secret: string; userCode: string; approvalUrl: string; expiresIn: number };

export function TvPairing() {
	const [pairing, setPairing] = useState<Pairing | null>(null);
	const [error, setError] = useState("");

	async function start() {
		const response = await fetch("/api/tv/pairing", { method: "POST" });
		if (!response.ok) {
			return setError("Nie udało się utworzyć kodu. Odśwież ekran.");
		}
		setError("");
		setPairing((await response.json()) as Pairing);
	}

	useEffect(() => {
		const controller = new AbortController();
		fetch("/api/tv/pairing", { method: "POST", signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error();
				}
				setPairing((await response.json()) as Pairing);
			})
			.catch((requestError) => {
				if (requestError.name !== "AbortError") {
					setError("Nie udało się utworzyć kodu. Odśwież ekran.");
				}
			});
		return () => controller.abort();
	}, []);
	useEffect(() => {
		if (!pairing) {
			return;
		}
		const timer = window.setInterval(async () => {
			const response = await fetch(`/api/tv/pairing?id=${encodeURIComponent(pairing.id)}&secret=${encodeURIComponent(pairing.secret)}`, { cache: "no-store" });
			if (response.ok && ((await response.json()) as { status: string }).status === "approved") {
				window.location.reload();
			} else if (response.status === 410) {
				window.clearInterval(timer);
				setError("Kod wygasł. Wygeneruj nowy.");
			}
		}, 2500);
		return () => window.clearInterval(timer);
	}, [pairing]);

	return (
		<main className="flex min-h-screen items-center justify-center bg-neutral-950 p-5 text-white">
			<section className="grid w-full max-w-5xl overflow-hidden border border-white/10 bg-[#101214] md:grid-cols-[1fr_1.1fr]">
				<div className="bg-orange-500 p-8 text-black sm:p-12">
					<Smartphone className="size-10" />
					<p className="mt-12 font-black text-xs uppercase tracking-[.2em]">Ekran bazy</p>
					<h1 className="mt-3 font-black font-display text-6xl uppercase leading-[.88] sm:text-8xl">
						Połącz
						<br />
						telefon.
					</h1>
					<p className="mt-7 max-w-sm text-black/65 leading-7">
						Zeskanuj QR telefonem, na którym jesteś zalogowany do panelu SHOWteam. TV dostanie dostęp tylko do kalendarza.
					</p>
				</div>
				<div className="flex min-h-[32rem] flex-col items-center justify-center p-8 text-center sm:p-12">
					{pairing ? (
						<>
							<div className="bg-white p-4">
								<QRCodeSVG value={pairing.approvalUrl} size={240} level="M" />
							</div>
							<p className="mt-6 font-bold text-white/45 text-xs uppercase tracking-[.2em]">Kod pomocniczy</p>
							<p className="mt-1 font-black font-display text-5xl tracking-[.12em]">
								{pairing.userCode.slice(0, 3)} {pairing.userCode.slice(3)}
							</p>
							<p className="mt-5 flex items-center gap-2 text-sm text-white/45">
								<ShieldCheck className="size-4 text-orange-500" /> Kod jest jednorazowy i ważny 5 minut
							</p>
						</>
					) : (
						!error && <RefreshCw className="size-8 animate-spin text-orange-500" />
					)}
					{error && (
						<>
							<p role="alert" className="text-red-300">
								{error}
							</p>
							<Button onClick={start} className="mt-5">
								<RefreshCw className="size-4" /> Nowy kod
							</Button>
						</>
					)}
				</div>
			</section>
		</main>
	);
}
