"use client";

import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type State = { supported: boolean; ready: boolean; subscribed: boolean; receivesNotifications: boolean; publicKey?: string | null; message?: string };

export function PushNotificationControl() {
	const [state, setState] = useState<State>({ supported: true, ready: false, subscribed: false, receivesNotifications: true });
	const [working, setWorking] = useState(false);
	useEffect(() => {
		if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
			queueMicrotask(() => setState((value) => ({ ...value, supported: false, ready: true })));
			return;
		}
		const controller = new AbortController();
		fetch("/api/admin/push-subscriptions", { cache: "no-store", signal: controller.signal })
			.then(async (response) => {
				if (!response.ok) {
					throw new Error();
				}
				const body = (await response.json()) as Pick<State, "subscribed" | "receivesNotifications" | "publicKey">;
				setState({ supported: true, ready: true, ...body });
			})
			.catch(() => {
				if (!controller.signal.aborted) {
					setState((value) => ({ ...value, ready: true, message: "Nie udało się sprawdzić powiadomień." }));
				}
			});
		return () => controller.abort();
	}, []);

	async function enable() {
		if (!state.publicKey) {
			return setState((value) => ({ ...value, message: "Powiadomienia nie są jeszcze skonfigurowane na serwerze." }));
		}
		setWorking(true);
		try {
			const registration = await navigator.serviceWorker.register("/admin-sw.js", { scope: "/" });
			const permission = await Notification.requestPermission();
			if (permission !== "granted") {
				throw new Error("Telefon nie udzielił zgody na powiadomienia.");
			}
			const existing = await registration.pushManager.getSubscription();
			const subscription = existing || (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64Key(state.publicKey) }));
			const response = await fetch("/api/admin/push-subscriptions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(subscription.toJSON()),
			});
			if (!response.ok) {
				throw new Error("Nie udało się zapisać urządzenia.");
			}
			setState((value) => ({ ...value, subscribed: true, message: "Powiadomienia są włączone na tym urządzeniu." }));
		} catch (error) {
			setState((value) => ({ ...value, message: error instanceof Error ? error.message : "Nie udało się włączyć powiadomień." }));
		}
		setWorking(false);
	}

	async function disable() {
		setWorking(true);
		const registration = await navigator.serviceWorker.getRegistration("/");
		const subscription = await registration?.pushManager.getSubscription();
		if (subscription) {
			await fetch("/api/admin/push-subscriptions", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ endpoint: subscription.endpoint }),
			});
			await subscription.unsubscribe();
		}
		setState((value) => ({ ...value, subscribed: false, message: "Powiadomienia wyłączone na tym urządzeniu." }));
		setWorking(false);
	}

	if (!state.ready) {
		return (
			<p className="mt-4 flex items-center gap-2 text-sm text-white/45">
				<LoaderCircle className="size-4 animate-spin" /> Sprawdzam powiadomienia…
			</p>
		);
	}
	if (!state.supported) {
		return <p className="mt-4 text-sm text-white/45">Ta przeglądarka nie obsługuje powiadomień PWA.</p>;
	}
	return (
		<div className="mt-4 border border-white/15 p-4">
			<p className="font-bold">Powiadomienia na tym urządzeniu</p>
			<p className="mt-1 text-white/45 text-xs leading-5">Nowe rezerwacje i zgłoszenia pojawią się jak zwykłe powiadomienie telefonu.</p>
			{!state.receivesNotifications ? (
				<p className="mt-2 text-orange-200 text-xs">To konto ma wyłączone odbieranie powiadomień. Zmień opcję przy koncie obsługi.</p>
			) : null}
			<Button
				type="button"
				variant={state.subscribed ? "outline" : "default"}
				className="mt-3 w-full"
				disabled={working}
				onClick={() => void (state.subscribed ? disable() : enable())}
			>
				{state.subscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
				{working ? "Proszę czekać…" : state.subscribed ? "Wyłącz na tym urządzeniu" : "Włącz powiadomienia"}
			</Button>
			{state.message ? (
				<p className="mt-2 text-orange-100 text-xs" role="status">
					{state.message}
				</p>
			) : null}
		</div>
	);
}

function base64Key(value: string): Uint8Array<ArrayBuffer> {
	const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replaceAll("-", "+").replaceAll("_", "/");
	return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
