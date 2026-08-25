"use client";

import { useAllFormFields, useDocumentInfo, useForm, useFormModified, useFormProcessing, useFormSubmitted } from "@payloadcms/ui";
import { reduceFieldsToValues } from "payload/shared";
import { useEffect, useMemo, useRef, useState } from "react";

import { type CmsDraft, cmsDraftData, cmsDraftKey, parseCmsDraft } from "@/lib/cms-draft";

type DraftStatus = "restored" | "saved" | "error" | null;

export function FormDraftPersistence() {
	const [fields] = useAllFormFields();
	const { reset, setModified } = useForm();
	const { collectionSlug, data: savedData, id, isInitializing } = useDocumentInfo();
	const modified = useFormModified();
	const processing = useFormProcessing();
	const submitted = useFormSubmitted();
	const key = useMemo(() => cmsDraftKey(collectionSlug ?? "unknown", id), [collectionSlug, id]);
	const readyKey = useRef<string | null>(null);
	const [status, setStatus] = useState<DraftStatus>(null);

	useEffect(() => {
		if (isInitializing || readyKey.current === key) {
			return;
		}

		const draft = parseCmsDraft(window.localStorage.getItem(key));
		if (!draft) {
			window.localStorage.removeItem(key);
			readyKey.current = key;
			window.queueMicrotask(() => setStatus(null));
			return;
		}

		void reset({ ...(savedData ?? {}), ...draft.data }).then(() => {
			setModified(true);
			readyKey.current = key;
			setStatus("restored");
		});
	}, [isInitializing, key, reset, savedData, setModified]);

	useEffect(() => {
		if (readyKey.current !== key || !modified || processing) {
			return;
		}

		const timeout = window.setTimeout(() => {
			try {
				const draft: CmsDraft = {
					data: cmsDraftData(collectionSlug ?? "unknown", reduceFieldsToValues(fields, true)),
					savedAt: Date.now(),
					version: 1,
				};
				window.localStorage.setItem(key, JSON.stringify(draft));
				setStatus("saved");
			} catch {
				setStatus("error");
			}
		}, 500);

		return () => window.clearTimeout(timeout);
	}, [collectionSlug, fields, key, modified, processing]);

	useEffect(() => {
		if (submitted && !modified) {
			window.localStorage.removeItem(key);
			window.queueMicrotask(() => setStatus(null));
		}
	}, [key, modified, submitted]);

	const discardDraft = async () => {
		const question = id ? "Odrzucić niezapisane zmiany i przywrócić ostatnio zapisaną wersję?" : "Wyczyścić cały formularz?";
		if (!window.confirm(question)) {
			return;
		}
		window.localStorage.removeItem(key);
		await reset(savedData ?? {});
		setModified(false);
		setStatus(null);
	};

	return (
		<div className={`cms-draft${status ? `cms-draft--${status}` : "cms-draft--idle"}`} role="status">
			{status && (
				<span>
					{status === "restored" && "Przywrócono szkic z tego telefonu."}
					{status === "saved" && "Szkic zapisany na tym telefonie."}
					{status === "error" && "Nie udało się zapisać szkicu. Sprawdź wolne miejsce w telefonie."}
				</span>
			)}
			<button type="button" onClick={discardDraft}>
				Wyczyść formularz
			</button>
		</div>
	);
}
