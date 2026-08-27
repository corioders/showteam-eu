"use client";

import { invalidate } from "cstd-ts/next/invalidate-cache-server-action.js";
import { type ReactPortal, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function CoriodersDevelopmentOverlay(): ReactPortal | null {
	const [menuContainer, setMenuContainer] = useState<Element | null>(null);

	useEffect(() => {
		const abortController = new AbortController();

		function findNextPortal() {
			const portal = document.querySelector("nextjs-portal");
			if (!portal?.shadowRoot) {
				return null;
			}
			return portal;
		}

		function findMenu() {
			if (!portal?.shadowRoot) {
				return null;
			}

			const menuDiv = portal.shadowRoot.querySelector("#nextjs-dev-tools-menu>.dev-tools-indicator-inner");
			if (!menuDiv) {
				return null;
			}

			return menuDiv;
		}

		function observePortal() {
			if (!portal?.shadowRoot) {
				return;
			}

			const observer = new MutationObserver(() => {
				setMenuContainer(findMenu());
			});
			abortController.signal.addEventListener("abort", () => observer.disconnect());

			observer.observe(portal.shadowRoot, {
				childList: true,
				subtree: true,
			});
		}

		let portal = findNextPortal();
		if (!portal?.shadowRoot) {
			const observer = new MutationObserver(() => {
				portal = findNextPortal();
				if (portal?.shadowRoot) {
					observePortal();
					observer.disconnect();
				}
			});
			abortController.signal.addEventListener("abort", () => observer.disconnect());

			observer.observe(document.body, {
				childList: true,
				subtree: true,
			});
		}
		observePortal();

		return () => {
			abortController.abort();
		};
	}, []);

	if (!menuContainer) {
		return null;
	}

	return createPortal(
		<>
			<style>
				{`
				.dev-tools-indicator-item:hover {
					background: var(--color-gray-200);
				}
			`}
			</style>
			<button
				className="dev-tools-indicator-item"
				data-index={3}
				data-selected={false}
				onClick={async () => {
					await invalidate();
					window.location.reload();
				}}
				role="menuitem"
				style={{
					alignItems: "center",
					cursor: "pointer",
					display: "flex",
					width: "100%",
				}}
				tabIndex={-1}
				type="button"
			>
				<span className="dev-tools-indicator-label">Invalidate Cache</span>
				<span className="dev-tools-indicator-value">
					<TrashIcon />
				</span>
			</button>
		</>,
		menuContainer,
	);
}

function TrashIcon() {
	return (
		<svg
			fill="none"
			height="24"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="2"
			viewBox="0 0 24 24"
			width="24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Trash</title>
			<path d="M10 11v6" />
			<path d="M14 11v6" />
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
			<path d="M3 6h18" />
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
		</svg>
	);
}
