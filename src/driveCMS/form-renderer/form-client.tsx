"use client";

// TODO: make form client validate the data we are getting. I need to know if a q is required or not + what is the type, then we can provide more accurate errors
// during development + in production. Otherwise the question if we are sending a valid body to google is left on the user of this component.

import {
	type FileUploadQuestionIDToFolderID,
	type FormClientData,
	OTHER_QUESTION_ID_SUFFIX,
	type PerSectionQuestionIDs,
	type QuestionNameAttributeID,
} from "cstd-ts/driveCMS/form-client-side.js";
import { type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";
import { type ComponentProps, type RefObject, useImperativeHandle, useRef } from "react";

import type { UploadFile } from "@/driveCMS/file-upload/file-upload-client.js";
import { CstdError } from "@/error/cstd-error.jsx";

export interface Props extends ComponentProps<"form"> {
	onSubmitSuccess?: (formRef: RefObject<HTMLFormElement | null>) => void;
	onSubmitError?: (formRef: RefObject<HTMLFormElement | null>, error?: Error) => void;
	setIsLoading?: (isLoading: boolean) => void;
	onBeforeSubmit?: (formRef: RefObject<HTMLFormElement | null>) => void;

	formClientData: FormClientData;
	fileUploadFunction?: UploadFile;
}

export function FormClient({
	ref,
	onSubmitSuccess,
	onSubmitError,
	setIsLoading,
	formClientData,
	fileUploadFunction,
	onSubmit,
	onBeforeSubmit,
	noValidate,
	...props
}: Props) {
	const innerRef = useRef<HTMLFormElement | null>(null);

	useImperativeHandle(ref, () => innerRef.current as HTMLFormElement);

	let fileUploadConvertOptions: FileUploadConvertOptions | undefined;
	if (formClientData.fileUpload) {
		if (!fileUploadFunction) {
			const error = new Error("props.fileUploadFunction is not provided while this form requires file upload. Call up your Digital team.");
			return <CstdError error={error} />;
		}

		fileUploadConvertOptions = {
			fileUploadFunction: fileUploadFunction,
			fileUploadIDToFolderID: formClientData.fileUpload,
		};
	}

	return (
		<form
			{...props}
			// validation is handled by the onSubmit handler
			noValidate={noValidate ?? true}
			onSubmit={async (event) => {
				event.preventDefault();
				onBeforeSubmit?.(innerRef);
				if (innerRef.current === null) {
					return;
				}

				// TODO: ?Re-enable this after recruitment?
				// there is a problem with the validation of the form.
				// if we have a multi section form and the user skips a section which has required questions, the form SHOULD BE VALID.
				// the commented out code is breaking that
				// BUT if we have a single section form we should keep normal validation
				// idk how to handle this yet

				// if (innerRef.current.checkValidity() === false) {
				// 	const element = innerRef.current.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(":invalid");
				// 	if (element === null) {
				// 		return;
				// 	}
				// 	element.focus();
				// 	element.scrollIntoView({ behavior: "smooth", block: "center" });
				// 	return;
				// }

				const collectedInputs = collectInputs(innerRef.current, formClientData.perSectionQuestionIDs);
				const inputBody = convertNotFileUploadInputsToGoogleFormsAPIBody(
					collectedInputs,
					fileUploadConvertOptions?.fileUploadIDToFolderID,
					formClientData.__internal_temp_waitingForDSDv2_perQuestionIDInternationalizedValueToRealValueMapping,
				);

				setIsLoading?.(true);
				if (fileUploadConvertOptions) {
					const [fileUploadInputBody, fileUploadError] = await convertFileUploadInputsToGoogleFormsAPIBody(collectedInputs, fileUploadConvertOptions);
					if (fileUploadError) {
						onSubmitError?.(innerRef, fileUploadError);
						return;
					}

					for (const [key, value] of fileUploadInputBody.entries()) {
						inputBody.append(key, value);
					}
				}

				// ==================================================
				// Read the comment in the formClientData type
				if (formClientData.pageHistory) {
					inputBody.append("pageHistory", formClientData.pageHistory);
				}
				// ==================================================

				const [_response, error] = await safePromise(() =>
					fetch(formClientData.responsePostURL, {
						body: inputBody,
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
						method: "POST",
						mode: "no-cors",
					}),
				);
				if (error !== null) {
					onSubmitError?.(innerRef, error);
					return;
				}

				// This case will always hit. We have no way of knowing if the request failed or not.
				// if (!response.ok) {
				// 	// We cannot read anything from the response because of mode: "no-cors"
				// 	// TODO: Consider submitting the form to our nextjs backend. Then forms with and without file transfer will be treated the same way.
				// 	onSubmitError?.(innerRef, new Error("Unknown error occurred while submitting form."));
				// 	return;
				// }

				onSubmitSuccess?.(innerRef);
				onSubmit?.(event);
			}}
			ref={innerRef}
		/>
	);
}

const COLLECT_INPUTS_QUERY_SELECTOR = (questionID: string) => `input[name="${questionID}"],textarea[name="${questionID}"],select[name="${questionID}"]`;
type CollectInputsQuerySelectorElementTypes = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function collectInputs(form: HTMLFormElement, perSectionQuestionIDs: PerSectionQuestionIDs): CollectInputsQuerySelectorElementTypes[] {
	const collectInputs: CollectInputsQuerySelectorElementTypes[] = [];
	for (const questionIDs of perSectionQuestionIDs) {
		for (const questionID of questionIDs) {
			const inputs = form.querySelectorAll<CollectInputsQuerySelectorElementTypes>(COLLECT_INPUTS_QUERY_SELECTOR(questionID));
			if (!inputs) {
				continue;
			}

			for (const input of inputs) {
				if (input instanceof HTMLInputElement && (input.type === "radio" || input.type === "checkbox") && !input.checked) {
					continue;
				}

				collectInputs.push(input);
			}
		}
	}

	return collectInputs;
}

// TODO: Figure out what we do if not all of the answers are provided.
// TODO: validation??
function convertNotFileUploadInputsToGoogleFormsAPIBody(
	inputs: CollectInputsQuerySelectorElementTypes[],
	fileUploadIDToFolderID: FileUploadQuestionIDToFolderID | undefined,
	// biome-ignore lint/style/useNamingConvention: TODO
	tem__internal_temp_waitingForDSDv2_perQuestionIDInternationalizedValueToRealValueMappingMapping: Record<string, Record<string, string>>,
): URLSearchParams {
	const body = new URLSearchParams();

	const selectedOtherOptionsIDs: Set<QuestionNameAttributeID> = new Set();

	for (const input of inputs) {
		// biome-ignore lint/complexity/useOptionalChain: Well. This cannot be changed into an optional chain.
		if (fileUploadIDToFolderID && fileUploadIDToFolderID[input.name as QuestionNameAttributeID]) {
			continue;
		}

		if (tem__internal_temp_waitingForDSDv2_perQuestionIDInternationalizedValueToRealValueMappingMapping[input.name]) {
			if (tem__internal_temp_waitingForDSDv2_perQuestionIDInternationalizedValueToRealValueMappingMapping[input.name][input.value]) {
				body.append(input.name, tem__internal_temp_waitingForDSDv2_perQuestionIDInternationalizedValueToRealValueMappingMapping[input.name][input.value]);
				continue;
			}
		}

		if (input.value) {
			if (input.name.endsWith(OTHER_QUESTION_ID_SUFFIX)) {
				selectedOtherOptionsIDs.add(input.name as QuestionNameAttributeID);
			}

			body.append(input.name, input.value);
		}
	}

	// ==================================================
	// This behaviour was observed while reading google forms network tab.

	// biome-ignore lint/style/useNamingConvention: This is a const like every other
	const OTHER_OPTION_BASE_OPTION_MARKER = "__other_option__";
	for (const selectedOtherOptionID of selectedOtherOptionsIDs) {
		const selectedOtherOptionBaseID = selectedOtherOptionID.replace(OTHER_QUESTION_ID_SUFFIX, "").trim() as QuestionNameAttributeID;

		body.append(selectedOtherOptionBaseID, OTHER_OPTION_BASE_OPTION_MARKER);
	}

	// ==================================================

	return body;
}

interface FileUploadConvertOptions {
	fileUploadIDToFolderID: FileUploadQuestionIDToFolderID;
	fileUploadFunction: UploadFile;
}

// TODO: Retry logic??
async function convertFileUploadInputsToGoogleFormsAPIBody(
	inputs: CollectInputsQuerySelectorElementTypes[],
	fileUpload: FileUploadConvertOptions,
): ErrorReturnPromise<URLSearchParams> {
	const body = new URLSearchParams();

	for (const input of inputs) {
		const uploadFolderID = fileUpload.fileUploadIDToFolderID[input.name as QuestionNameAttributeID];
		if (!uploadFolderID) {
			continue;
		}

		const fileInput = input as HTMLInputElement;
		const files = fileInput.files;
		if (!files) {
			return [null, new Error("File input.files is null")];
		}

		// No files to upload. To be consistent in how inputs without a value are skipped, we skip it here too.
		if (files.length === 0) {
			continue;
		}

		if (files.length !== 1) {
			return [null, new Error(`File input.files.length does not equal 1 ${files.length}`)];
		}

		const fileToUpload = files[0];
		const [googleDriveFileURL, uploadError] = await fileUpload.fileUploadFunction(fileToUpload, uploadFolderID);
		if (uploadError) {
			return [null, uploadError];
		}

		body.append(input.name, googleDriveFileURL);
	}

	return [body, null];
}
