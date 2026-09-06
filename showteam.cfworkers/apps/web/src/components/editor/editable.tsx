"use client";

import {
	type AnchorHTMLAttributes,
	cloneElement,
	type FormEvent,
	type HTMLAttributes,
	type KeyboardEvent,
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	useContext,
} from "react";

import { PageContentContext } from "./page-content-context";

const PHONE_SEPARATOR_PATTERN = /[^\d+]/g;

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

export function PageContentLink({
	field,
	protocol,
	render,
	children,
}: {
	field: string;
	protocol: "mailto" | "tel";
	render: ReactElement<AnchorHTMLAttributes<HTMLAnchorElement>>;
	children: ReactNode;
}) {
	const content = useContext(PageContentContext);
	const value = content?.values[field];
	const href = value ? (protocol === "tel" ? `tel:${value.replace(PHONE_SEPARATOR_PATTERN, "")}` : `mailto:${value}`) : render.props.href;
	return cloneElement(render, href ? { href } : {}, children);
}

function blockNavigation(event: MouseEvent<HTMLElement>) {
	event.preventDefault();
	event.stopPropagation();
}

function blockEnter(event: KeyboardEvent<HTMLElement>) {
	if (event.key === "Enter") {
		event.preventDefault();
	}
}
