"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type EditorUser = { email: string; name?: string };

type EditorContextValue = {
	enabled: boolean;
	loading: boolean;
	user: EditorUser | null;
	visible: boolean;
	setVisible: (visible: boolean) => void;
};

const EditorContext = createContext<EditorContextValue>({
	enabled: false,
	loading: true,
	user: null,
	visible: true,
	setVisible: () => undefined,
});

const visibilityKey = "showteam:editor-visible";

export function EditorProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<EditorUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [visible, setVisibleState] = useState(true);

	useEffect(() => {
		queueMicrotask(() => setVisibleState(sessionStorage.getItem(visibilityKey) !== "false"));
		const controller = new AbortController();
		fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store", signal: controller.signal })
			.then(async (response) => (response.ok ? ((await response.json()) as { user: EditorUser }) : null))
			.then((result) => setUser(result?.user ?? null))
			.catch((error: unknown) => {
				if (!(error instanceof DOMException && error.name === "AbortError")) {
					setUser(null);
				}
			})
			.finally(() => setLoading(false));
		return () => controller.abort();
	}, []);

	const value = useMemo<EditorContextValue>(
		() => ({
			enabled: Boolean(user),
			loading,
			user,
			visible,
			setVisible(nextVisible) {
				setVisibleState(nextVisible);
				sessionStorage.setItem(visibilityKey, String(nextVisible));
			},
		}),
		[loading, user, visible],
	);

	return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor() {
	return useContext(EditorContext);
}
