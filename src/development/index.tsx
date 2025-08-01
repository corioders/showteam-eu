'use client';

import { invalidateDriveCMS } from 'cstd-ts/next/invalidate-drive-cms.js';
import { Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function CoriodersDevelopmentOverlay() {
	const [menuContainer, setMenuContainer] = useState<Element | null>(null);

	useEffect(() => {
		const abortController = new AbortController();

		function findNextPortal() {
			const portal = document.querySelector('nextjs-portal');
			if (!portal?.shadowRoot) {
				return null;
			}
			return portal;
		}

		function findMenu() {
			if (!portal?.shadowRoot) {
				return null;
			}

			const menuDiv = portal.shadowRoot.querySelector('#nextjs-dev-tools-menu>.dev-tools-indicator-inner');
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
			abortController.signal.addEventListener('abort', () => observer.disconnect());

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
			abortController.signal.addEventListener('abort', () => observer.disconnect());

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
				data-index={3}
				data-selected={false}
				role="menuitem"
				tabIndex={-1}
				type="button"
				onClick={() => {
					invalidateDriveCMS();
				}}
				className="dev-tools-indicator-item"
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					cursor: 'pointer',
				}}
			>
				<span className="dev-tools-indicator-label">Invalidate Cache</span>
				<span className="dev-tools-indicator-value">
					<Trash2Icon />
				</span>
			</button>
		</>,
		menuContainer,
	);
}
