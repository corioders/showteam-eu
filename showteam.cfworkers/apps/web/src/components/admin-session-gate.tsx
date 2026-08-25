"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

async function loadSession(): Promise<{ name?: string; email?: string } | null> {
	const response = await fetch("/api/users/me", { cache: "no-store", credentials: "same-origin" });
	const result = (await response.json()) as { user?: { name?: string; email?: string } | null };
	return result.user || null;
}

export function AdminSessionGate({ children, redirectPath }: { children: (userName: string) => ReactNode; redirectPath: string }) {
	const [session, setSession] = useState<{ status: "checking" | "ready" | "error"; userName?: string }>({ status: "checking" });

	useEffect(() => {
		let active = true;
		loadSession()
			.then((user) => {
				if (!active) {
					return;
				}
				if (!user) {
					window.location.replace(`/admin/login?redirect=${encodeURIComponent(redirectPath)}`);
					return;
				}
				setSession({ status: "ready", userName: user.name || user.email || "SHOWteam" });
			})
			.catch(() => {
				if (active) {
					setSession({ status: "error" });
				}
			});
		return () => {
			active = false;
		};
	}, [redirectPath]);

	async function retry() {
		setSession({ status: "checking" });
		try {
			const user = await loadSession();
			if (!user) {
				window.location.replace(`/admin/login?redirect=${encodeURIComponent(redirectPath)}`);
				return;
			}
			setSession({ status: "ready", userName: user.name || user.email || "SHOWteam" });
		} catch {
			setSession({ status: "error" });
		}
	}

	if (session.status === "ready") {
		return children(session.userName || "SHOWteam");
	}

	return (
		<main className="grid min-h-dvh place-items-center bg-[#f7f7f4] px-6 text-center text-[#252525]">
			<div>
				<p className="font-black font-display text-3xl uppercase">
					SHOWteam<span className="text-orange-600">.</span>
				</p>
				{session.status === "checking" ? (
					<p className="mt-4 flex items-center justify-center gap-2 text-black/55 text-sm">
						<LoaderCircle className="size-4 animate-spin" /> Sprawdzam logowanie…
					</p>
				) : (
					<>
						<p className="mt-4 text-red-700 text-sm">Nie udało się połączyć. Sprawdź internet i spróbuj ponownie.</p>
						<button type="button" onClick={() => void retry()} className="mt-5 bg-orange-600 px-5 py-3 font-bold text-white">
							Spróbuj ponownie
						</button>
					</>
				)}
			</div>
		</main>
	);
}
