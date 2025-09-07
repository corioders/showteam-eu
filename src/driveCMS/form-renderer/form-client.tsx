"use client";

import type { FileUploadIDToFolderID, FormSmallClientSide, PerSectionQuestionIDs } from "cstd-ts/driveCMS/form-client-side.js";
import { type ErrorReturnPromise, safePromise } from "cstd-ts/error/index.js";
import { type ComponentPropsWithoutRef, type RefObject, useRef } from "react";

import type { UploadFile } from "@/driveCMS/file-upload/file-upload-client.js";
import { CstdError } from "@/error/cstd-error.jsx";

export interface Props extends ComponentPropsWithoutRef<"form"> {
	onSubmitSuccess?: (formRef: RefObject<HTMLFormElement | null>) => void;
	onSubmitError?: (formRef: RefObject<HTMLFormElement | null>, error?: Error) => void;
	setIsLoading?: (isLoading: boolean) => void;
	onBeforeSubmit?: (formRef: RefObject<HTMLFormElement | null>) => void;

	formSmallClientSide: FormSmallClientSide;
	fileUploadFunction?: UploadFile;
}

export function FormClient({
	onSubmitSuccess,
	onSubmitError,
	setIsLoading,
	formSmallClientSide,
	fileUploadFunction,
	onSubmit,
	onBeforeSubmit,
	noValidate,
	...props
}: Props) {
	const formRef = useRef<HTMLFormElement>(null);

	let fileUploadConvertOptions: FileUploadConvertOptions | undefined;
	if (formSmallClientSide.fileUpload) {
		if (!fileUploadFunction) {
			const error = new Error("props.fileUploadFunction is not provided while this form requires file upload. Call up your Digital team.");
			return <CstdError error={error} />;
		}

		fileUploadConvertOptions = {
			fileUploadFunction: fileUploadFunction,
			fileUploadIDToFolderID: formSmallClientSide.fileUpload.fileUploadIDToFolderID,
		};
	}

	return (
		<form
			{...props}
			// validation is handled by the onSubmit handler
			noValidate={noValidate ?? true}
			onSubmit={async (event) => {
				event.preventDefault();
				onBeforeSubmit?.(formRef);
				if (formRef.current === null) {
					return;
				}

				if (formRef.current.checkValidity() === false) {
					const element = formRef.current.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(":invalid");
					if (element === null) {
						return;
					}
					element.focus();
					element.scrollIntoView({ behavior: "smooth", block: "center" });
					return;
				}

				const collectedInputs = collectInputs(formRef.current, formSmallClientSide.perSectionQuestionIDs);
				const inputBody = convertNotFileUploadInputsToGoogleFormsAPIBody(collectedInputs, formSmallClientSide.fileUpload?.fileUploadIDToFolderID);

				setIsLoading?.(true);
				if (fileUploadConvertOptions) {
					const [fileUploadInputBody, fileUploadError] = await convertFileUploadInputsToGoogleFormsAPIBody(collectedInputs, fileUploadConvertOptions);
					if (fileUploadError) {
						onSubmitError?.(formRef, fileUploadError);
						return;
					}

					for (const [key, value] of fileUploadInputBody.entries()) {
						inputBody.append(key, value);
					}
				}

				const [_response, error] = await safePromise(() =>
					fetch(formSmallClientSide.responsePostURL, {
						body: inputBody,
						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},
						method: "POST",
						mode: "no-cors",
					}),
				);
				if (error !== null) {
					onSubmitError?.(formRef, error);
					return;
				}

				onSubmitSuccess?.(formRef);
				onSubmit?.(event);
			}}
			ref={formRef}
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
	fileUploadIDToFolderID: FileUploadIDToFolderID | undefined,
): URLSearchParams {
	const body = new URLSearchParams();
	for (const input of inputs) {
		// biome-ignore lint/complexity/useOptionalChain: Well. This cannot be changed into an optional chain.
		if (fileUploadIDToFolderID && fileUploadIDToFolderID[input.name]) {
			continue;
		}

		body.append(input.name, input.value);
	}

	return body;
}

interface FileUploadConvertOptions {
	fileUploadIDToFolderID: FileUploadIDToFolderID;
	fileUploadFunction: UploadFile;
}

// TODO: Retry logic??
async function convertFileUploadInputsToGoogleFormsAPIBody(
	inputs: CollectInputsQuerySelectorElementTypes[],
	fileUpload: FileUploadConvertOptions,
): ErrorReturnPromise<URLSearchParams> {
	const body = new URLSearchParams();

	for (const input of inputs) {
		const uploadFolderID = fileUpload.fileUploadIDToFolderID[input.name];
		if (!uploadFolderID) {
			continue;
		}

		const fileInput = input as HTMLInputElement;
		const files = fileInput.files;
		if (!files) {
			return [null, new Error("File input.files is null")];
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

// ==================================================
// ==================================================
// File upload old logic
// if (input instanceof HTMLInputElement && input.type === "file") {
// 	const files = input.files;
// 	if (!files) {
// 		console.log("input.files is null");
// 		// :ARCZII CO TUTAJ ROBIMTY?
// 		continue;
// 	}

// 	if (files.length !== 1) {
// 		console.log("uploading more than one file, or less than one file");
// 		// :ARCZII CO TUTAJ ROBIMTY?
// 		continue;
// 	}

// 	if (!(item.questionItem?.question?.textQuestion && item.title)) {
// 		console.log("the upload item IS not a textQuestion or does not have a title");
// 		// :ARCZII CO TUTAJ ROBIMTY?

// 		continue;
// 	}

// 	if (!isFileUploadQuestion(item.title)) {
// 		console.log("the provided short text questions is not a file upload one");
// 		continue;
// 	}

// 	const questionTitle = getFileUploadQuestionTitle(item.title);
// 	const fileToUpload = files[0];

// 	const uploadFilePromise = (async () => {
// 		const [fileGoogleDriveID, uploadError] = await uploadFileUsingForm(form, fileToUpload, questionTitle);
// 		if (uploadError) {
// 			return uploadError;
// 		}

// 		const fileGoogleDriveLink = fileIDToGoogleDriveLink(fileGoogleDriveID);
// 		body.append(input.name, fileGoogleDriveLink);

// 		return null;
// 	})();

// 	fileUploadLoadingPromises.push(uploadFilePromise);

// 	continue;
// }
