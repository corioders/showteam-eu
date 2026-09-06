// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
// biome-ignore-all lint/plugin/no-throw: These framework callback contracts report failures through exceptions.
"use client";

import { Monitor, Unplug } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

type TvDevice = { id: string; name: string; created_at: number };

export function TvDevicesAdminView() {
	const [devices, setDevices] = useState<TvDevice[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const controller = new AbortController();
		fetch("/api/tv/devices", { cache: "no-store", signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error();
				}
				setDevices((await response.json()) as TvDevice[]);
				setLoading(false);
			})
			.catch((requestError) => {
				if (requestError.name !== "AbortError") {
					setError("Nie udało się pobrać listy telewizorów.");
					setLoading(false);
				}
			});
		return () => controller.abort();
	}, []);

	async function revoke(device: TvDevice) {
		if (!window.confirm(`Odłączyć ${device.name}? Na telewizorze ponownie pojawi się kod QR.`)) {
			return;
		}
		const response = await fetch("/api/tv/devices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: device.id }) });
		if (!response.ok) {
			return setError("Nie udało się odłączyć telewizora. Spróbuj ponownie.");
		}
		setDevices((current) => current.filter((item) => item.id !== device.id));
	}

	return (
		<main className="tv-devices-admin">
			<header>
				<div>
					<span>EKRANY BAZY</span>
					<h1>Połączone telewizory</h1>
					<p>Telewizor pozostaje zalogowany bez terminu ważności. Dostęp możesz cofnąć tutaj w każdej chwili.</p>
				</div>
				<Link href="/a/tv" target="_blank" className={buttonVariants({ variant: "outline" })}>
					Otwórz ekran TV
				</Link>
			</header>
			{loading ? (
				<p className="tv-devices-status">
					<Spinner /> Ładuję urządzenia…
				</p>
			) : error ? (
				<Alert variant="destructive" className="tv-devices-error">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : devices.length > 0 ? (
				<div className="tv-devices-list">
					{devices.map((device) => (
						<article key={device.id}>
							<Monitor aria-hidden="true" />
							<div>
								<strong>{device.name}</strong>
								<p>Połączono {new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short" }).format(device.created_at)}</p>
							</div>
							<Button type="button" variant="destructive" onClick={() => revoke(device)}>
								<Unplug data-icon="inline-start" aria-hidden="true" /> Cofnij dostęp
							</Button>
						</article>
					))}
				</div>
			) : (
				<Empty className="tv-devices-empty">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<Monitor />
						</EmptyMedia>
						<EmptyTitle>Brak połączonych telewizorów</EmptyTitle>
						<EmptyDescription>
							Otwórz <strong>/a/tv</strong> na ekranie bazy i zeskanuj kod QR.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
		</main>
	);
}
