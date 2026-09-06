"use client";

import { cloneElement, type FormEvent, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactElement, useContext } from "react";

import { PageContentContext } from "./page-content-context";

type EditableElementProps = HTMLAttributes<HTMLElement> & {
	"data-editable-field"?: string;
};

export function Editable({
	field,
	render = <span />,
	multiline = false,
	...renderProps
}: HTMLAttributes<HTMLElement> & { field: string; render?: ReactElement; multiline?: boolean }) {
	const content = useContext(PageContentContext);
	const value = content?.values[field] ?? "";
	const element = render as ReactElement<EditableElementProps>;

	if (!content?.editing) {
		return cloneElement(element, renderProps, value);
	}

	return cloneElement(
		element,
		{
			...renderProps,
			key: `${field}:${content.generation}`,
			contentEditable: "plaintext-only",
			suppressContentEditableWarning: true,
			"aria-label": `Edytuj: ${field}`,
			"aria-multiline": multiline || undefined,
			"data-editable-field": field,
			onClick: blockNavigation,
			onInput: (event: FormEvent<HTMLElement>) => content.storeDraft(field, event.currentTarget.textContent ?? ""),
			onKeyDown: multiline ? undefined : blockEnter,
			onBlur: (event) => content.update(field, event.currentTarget.textContent ?? ""),
		},
		value,
	);
}

function blockNavigation(event: MouseEvent<HTMLElement>) {
	event.preventDefault();
}

function blockEnter(event: KeyboardEvent<HTMLElement>) {
	if (event.key === "Enter") {
		event.preventDefault();
	}
}
