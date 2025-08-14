import { getFileUploadQuestionTitle, isFileUploadQuestion } from "cstd-ts/driveCMS/form-client-side.js";
import type { forms_v1 } from "googleapis";
import type { ReactNode } from "react";

import { CstdError } from "@/error/cstd-error.jsx";

import { serverContext } from "./form-renderer-root.jsx";

export interface ComponentsT {
	radio: (props: forms_v1.Schema$Item) => ReactNode;
	textarea: (props: forms_v1.Schema$Item) => ReactNode;
	checkbox: (props: forms_v1.Schema$Item) => ReactNode;
	dropdown: (props: forms_v1.Schema$Item) => ReactNode;
	text: (props: forms_v1.Schema$Item) => ReactNode;
	scale: (props: forms_v1.Schema$Item) => ReactNode;
	file: (props: forms_v1.Schema$Item) => ReactNode;
}
interface Props {
	components?: Partial<ComponentsT>;
}

export function FormRendererComponents(props: Props) {
	if (serverContext.form?.googleAPIsForm.items === undefined || serverContext.form.googleAPIsForm.items.length === 0) {
		return <CstdError error={new Error("Form has no inputs")} />;
	}

	return serverContext.form?.googleAPIsForm.items?.map((item) => getComponent(item, { ...defaultComponents, ...props.components }));
}

function getComponent(item: forms_v1.Schema$Item, components: ComponentsT) {
	if (!item.itemId) {
		// TODO: handle this
		return;
	}

	if (item.questionItem?.question?.textQuestion) {
		if (item.questionItem?.question?.textQuestion?.paragraph) {
			return components.textarea(item);
		}

		if (item.title) {
			if (isFileUploadQuestion(item.title)) {
				const realItem = { ...item };
				realItem.title = getFileUploadQuestionTitle(item.title);

				return components.file(realItem);
			}
		}

		return components.text(item);
	}

	if (item.questionItem?.question?.choiceQuestion) {
		if (item.questionItem?.question?.choiceQuestion?.type === "RADIO") {
			return components.radio(item);
		}
		if (item.questionItem?.question?.choiceQuestion?.type === "CHECKBOX") {
			return components.checkbox(item);
		}
		if (item.questionItem?.question?.choiceQuestion?.type === "DROP_DOWN") {
			return components.dropdown(item);
		}
	}

	if (item.questionItem?.question?.scaleQuestion) {
		return components.scale(item);
	}

	if (item.questionItem?.question?.fileUploadQuestion) {
		return <CstdError error={new Error("File upload in the traditional sense does NOT work. Please refer to the documentation... TODO: Write docs")} />;
	}
}

const defaultComponents: ComponentsT = {
	checkbox: (props) => (
		<div key={props.itemId}>
			{props.title}
			{props.questionItem?.question?.choiceQuestion?.options?.map(
				(option) =>
					option.value && (
						<label key={option.value}>
							<input key={option.value} name={props.itemId as string} type="checkbox" value={option.value ?? ""} />
							{option.value}
						</label>
					),
			)}
		</div>
	),
	dropdown: (props) => (
		<label key={props.itemId}>
			{props.title}
			<select name={props.itemId as string}>
				{props.questionItem?.question?.choiceQuestion?.options?.map(
					(option) =>
						option.value && (
							<option key={option.value} value={option.value ?? ""}>
								{option.value}
							</option>
						),
				)}
			</select>
		</label>
	),
	file: (props) => (
		// TODO
		<label key={props.itemId}>
			{props.title}
			<input name={props.itemId as string} type="file" />
		</label>
	),
	radio: (props) => (
		<div key={props.itemId}>
			{props.title}
			{props.questionItem?.question?.choiceQuestion?.options?.map(
				(option) =>
					option.value && (
						<label key={option.value}>
							<input key={option.value} name={props.itemId as string} type="radio" value={option.value ?? ""} />
							{option.value}
						</label>
					),
			)}
		</div>
	),
	scale: (props) => (
		<label key={props.itemId}>
			{props.title}
			<input name={props.itemId as string} type="radio" />
		</label>
	),
	text: (props) => (
		<label key={props.itemId}>
			{props.title}
			<input name={props.itemId as string} />
		</label>
	),
	textarea: (props) => (
		<label key={props.itemId}>
			{props.title}
			<textarea name={props.itemId as string} />
		</label>
	),
};
