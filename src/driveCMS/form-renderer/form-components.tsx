import type { FolderID } from "cstd-ts/driveCMS/drive.js";
import {
	type Form,
	type FormQuestion,
	type FormQuestionCheckbox,
	type FormQuestionDropdown,
	type FormQuestionFile,
	type FormQuestionRadio,
	type FormQuestionScale,
	type FormQuestionText,
	type FormQuestionTextarea,
	type FormSmallClientSide,
	type InternalFormQuestionFile,
	isFormQuestionCheckbox,
	isFormQuestionDropdown,
	isFormQuestionFile,
	isFormQuestionRadio,
	isFormQuestionScale,
	isFormQuestionText,
	isFormQuestionTextarea,
} from "cstd-ts/driveCMS/form-client-side.js";
import type { ReactNode } from "react";

import { CstdError } from "@/error/cstd-error.jsx";

export interface FormComponents {
	checkbox: (props: FormQuestionCheckbox) => ReactNode;
	dropdown: (props: FormQuestionDropdown) => ReactNode;
	radio: (props: FormQuestionRadio) => ReactNode;
	scale: (props: FormQuestionScale) => ReactNode;
	textarea: (props: FormQuestionTextarea) => ReactNode;
	text: (props: FormQuestionText) => ReactNode;
	file: (props: FormQuestionFile) => ReactNode;
}

export interface RenderedFormSection {
	title: string;
	description?: string;

	questions: ReactNode[];
}

export interface RenderedFormSections {
	sections: RenderedFormSection[];

	formSmallClientSide: FormSmallClientSide;
}

export function renderFormSections(form: Form, userComponents?: Partial<FormComponents>): RenderedFormSections {
	const components = { ...defaultComponents, ...userComponents };
	const renderedFormSections: RenderedFormSection[] = [];

	const perSectionQuestionIDs: string[][] = [];
	const fileUploadIDToFolderID: Record<string, FolderID> = {};

	for (const formSection of form.sections) {
		const renderedQuestions: ReactNode[] = [];
		const questionIDs: string[] = [];
		for (const question of formSection.questions) {
			renderedQuestions.push(<RenderQuestion components={components} key={question.questionNameAttributeID} question={question} />);
			questionIDs.push(question.questionNameAttributeID);

			if (isFormQuestionFile(question)) {
				const internalFileUploadQuestion = question as InternalFormQuestionFile;
				fileUploadIDToFolderID[question.questionNameAttributeID] = internalFileUploadQuestion.internalUploadFolderID;
			}
		}

		perSectionQuestionIDs.push(questionIDs);

		// biome-ignore assist/source/useSortedKeys: We want the attributes to be in the interface order
		const renderedFormSection: RenderedFormSection = {
			title: formSection.title,
			description: formSection.description,

			questions: renderedQuestions,
		};

		renderedFormSections.push(renderedFormSection);
	}

	const formSmallClientSide: FormSmallClientSide = {
		perSectionQuestionIDs: perSectionQuestionIDs,
		responsePostURL: form.responsePostURL,
	};

	if (form.fileUploadEnabled) {
		formSmallClientSide.fileUpload = {
			fileUploadIDToFolderID: fileUploadIDToFolderID,
		};
	}

	return {
		formSmallClientSide,
		sections: renderedFormSections,
	};
}

interface RenderQuestionProps {
	question: FormQuestion;
	components: FormComponents;
}

function RenderQuestion({ question, components: Components }: RenderQuestionProps) {
	if (isFormQuestionCheckbox(question)) {
		return <Components.checkbox {...question} />;
	}

	if (isFormQuestionDropdown(question)) {
		return <Components.dropdown {...question} />;
	}

	if (isFormQuestionRadio(question)) {
		return <Components.radio {...question} />;
	}

	if (isFormQuestionScale(question)) {
		return <Components.scale {...question} />;
	}

	if (isFormQuestionTextarea(question)) {
		return <Components.textarea {...question} />;
	}

	if (isFormQuestionText(question)) {
		return <Components.text {...question} />;
	}

	if (isFormQuestionFile(question)) {
		return <Components.file {...question} />;
	}

	throw new Error(`Unsupported question type ${question.type}`);
}

const defaultComponents: FormComponents = {
	checkbox: () => <CstdError error={new Error("TODO: provide checkbox component")} />,
	dropdown: () => <CstdError error={new Error("TODO: provide dropdown component")} />,
	file: () => <CstdError error={new Error("TODO: provide file component")} />,
	radio: () => <CstdError error={new Error("TODO: provide radio component")} />,
	scale: () => <CstdError error={new Error("TODO: provide scale component")} />,
	text: () => <CstdError error={new Error("TODO: provide text component")} />,
	textarea: () => <CstdError error={new Error("TODO: provide textarea component")} />,
};
