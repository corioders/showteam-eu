'use client';

import { type ComponentPropsWithoutRef, type ReactNode, type RefObject, useRef } from 'react';

import CstdError from '@/error/CstdError.jsx';
import { fileIDToGoogleDriveLink } from 'cstd-ts/driveCMS/driveClientSide.js';
import { getFileUploadQuestionTitle, isFileUploadQuestion, uploadFileUsingForm } from 'cstd-ts/driveCMS/formClientSide.js';
import { safePromise } from 'cstd-ts/error/index.js';
import { useFormRendererClientContext } from './_context/_client.jsx';

export interface Props extends Omit<ComponentPropsWithoutRef<'form'>, 'children'> {
	onSubmitSuccess?: (formRef: RefObject<HTMLFormElement | null>) => void;
	onSubmitError?: (formRef: RefObject<HTMLFormElement | null>, error?: Error) => void;
	setIsLoading?: (isLoading: boolean) => void;
	children: ReactNode;
}

export default function FormRendererForm({ onSubmitSuccess, onSubmitError, setIsLoading, children, noValidate, onSubmit, ...props }: Props) {
	const formRef = useRef<HTMLFormElement>(null);
	const { form } = useFormRendererClientContext();
	if (form?.googleAPIsForm.items === undefined || form.googleAPIsForm.items.length === 0) {
		return <CstdError error={new Error('Form has no inputs')} />;
	}

	return (
		<form
			ref={formRef}
			// validation is handled by the onSubmit handler
			noValidate={noValidate ?? true}
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
			onSubmit={(e) => {
				e.preventDefault();
				if (formRef.current === null) {
					return;
				}
				if (formRef.current.checkValidity() === false) {
					const element = formRef.current.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(':invalid');
					if (element === null) {
						return;
					}
					element.focus();
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
					return;
				}

				if (form.googleAPIsForm.items === undefined || form.googleAPIsForm.items.length === 0) {
					return;
				}

				const body = new URLSearchParams();

				const fileUploadLoadingPromises: Promise<Error | null>[] = [];

				for (const item of form.googleAPIsForm.items) {
					if (!item.itemId) {
						continue;
					}

					const inputs = formRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
						`input[name="${item.itemId}"],textarea[name="${item.itemId}"],select[name="${item.itemId}"]`,
					);
					if (!inputs) {
						continue;
					}
					for (const input of inputs) {
						if (input instanceof HTMLInputElement && (input.type === 'radio' || input.type === 'checkbox') && !input.checked) {
							continue;
						}

						if (input instanceof HTMLInputElement && input.type === 'file') {
							const files = input.files;
							if (!files) {
								console.log('input.files is null');
								// TODO:ARCZII CO TUTAJ ROBIMTY?
								continue;
							}

							if (files.length !== 1) {
								console.log('uploading more than one file, or less than one file');
								// TODO:ARCZII CO TUTAJ ROBIMTY?
								continue;
							}

							if (!(item.questionItem?.question?.textQuestion && item.title)) {
								console.log('the upload item IS not a textQuestion or does not have a title');
								// TODO:ARCZII CO TUTAJ ROBIMTY?

								continue;
							}

							if (!isFileUploadQuestion(item.title)) {
								console.log('the provided short text questions is not a file upload one');
								continue;
							}

							const questionTitle = getFileUploadQuestionTitle(item.title);
							const fileToUpload = files[0];

							const uploadFilePromise = (async () => {
								const [fileGoogleDriveID, uploadError] = await uploadFileUsingForm(form, fileToUpload, questionTitle);
								if (uploadError) {
									return uploadError;
								}

								const fileGoogleDriveLink = fileIDToGoogleDriveLink(fileGoogleDriveID);
								body.append(input.name, fileGoogleDriveLink);

								return null;
							})();

							fileUploadLoadingPromises.push(uploadFilePromise);

							continue;
						}
						body.append(input.name, input.value);
					}
				}

				(async () => {
					setIsLoading?.(true);

					const fileUploadResults = await Promise.all(fileUploadLoadingPromises);
					for (const fileUploadError of fileUploadResults) {
						if (!fileUploadError) {
							continue;
						}

						console.log('FILE UPLOAD ERROR', fileUploadError);
						onSubmitError?.(formRef, fileUploadError);
						return;
					}

					const [_response, error] = await safePromise(() =>
						fetch(form.formResponsePostURL, {
							method: 'POST',
							mode: 'no-cors',
							headers: {
								'Content-Type': 'application/x-www-form-urlencoded',
							},
							body,
						}),
					);

					if (error !== null) {
						onSubmitError?.(formRef, error);
						return;
					}

					onSubmitSuccess?.(formRef);
				})();

				onSubmit?.(e);
			}}
			{...props}
		>
			{children}
		</form>
	);
}
