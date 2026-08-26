// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, May 2025

/** biome-ignore-all assist/source/useSortedKeys: We want to keep keys in sync with definitions in form-client-side */

import { type forms_v1, google } from "googleapis";
import type { GoogleAuth } from "googleapis-common";
import { StatusCodes } from "http-status-codes";

import { IS_PREVIEW } from "@/const.js";
import { CSE, type ErrorReturn, type ErrorReturnPromise, errorArrayToAggregateError, safe, safePromise, unreachableErrorMessage } from "@/error/index.js";
import type { ImageURL } from "@/media/image/index.js";
import type { EmailAddress } from "@/media/personal/index.js";

import { memoizeDriveCMS } from "./cache.js";
import type { FileID, FolderID } from "./drive.js";
import {
	type FileUploadQuestionIDToFolderID,
	FORM_QUESTION_TYPE,
	type Form,
	type FormImage,
	type FormQuestion,
	type FormQuestionCheckbox,
	type FormQuestionDropdown,
	type FormQuestionOptionImage,
	type FormQuestionRadio,
	type FormQuestionScale,
	type FormQuestionText,
	type FormQuestionTextarea,
	type FormSection,
	getFileUploadQuestionTitle,
	type InternalFormQuestionFile,
	isFileUploadQuestion,
	OTHER_QUESTION_ID_SUFFIX,
	type OtherOption,
	type PerSectionQuestionIDs,
	type QuestionNameAttributeID,
} from "./form-client-side.js";
import { addPermission, getFolderIDorCreateIfNotExistent } from "./index.js";
import type { Resource } from "./resource.js";

export type FormID = FileID & { readonly __formTag: unique symbol };
export interface FormResource extends Resource {
	id: FormID;
	mimeType: "application/vnd.google-apps.form";
}

export function isForm(resource: Resource): resource is FormResource {
	return resource.mimeType === "application/vnd.google-apps.form";
}

export const FORMS_UPLOAD_FOLDER_NAME = "-- form file upload folder";

// WARNING: The upload worker MUST use a different google account with write ONLY permissions, ONLY to the correct folders.
// WARNING: THE USER HAS CONTROL OVER THE FOLDER ID, SO MAKE SURE TO SET UP THE PERMISSIONS ACCORDINGLY
export interface FileUploadOptions {
	// parentFolderToTheRootUploadFolder is the folder where you want the FORMS_UPLOAD_FOLDER_NAME to be.
	parentFolderToTheRootUploadFolder: FolderID;
	permissions?: {
		additionalAllowedEmailAddresses?: EmailAddress[];
	};
}

// // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
export const getForm = memoizeDriveCMS(async function getForm(googleAuth: GoogleAuth, formID: FormID, fileUploadOptions?: FileUploadOptions): ErrorReturnPromise<Form> {
	console.log(`Getting form ${formID}`);
	const formsAPI = google.forms({ auth: googleAuth, version: "v1" });

	const [gaxiosFormResponse, requestError] = await safePromise(() => formsAPI.forms.get({ formId: formID }));
	if (requestError) {
		return [null, requestError];
	}

	if (gaxiosFormResponse.status !== StatusCodes.OK) {
		return [null, new Error(`Google Forms API returned ${gaxiosFormResponse.status} status code. ${gaxiosFormResponse.statusText} ${gaxiosFormResponse.data}`)];
	}

	const googleAPIsForm = gaxiosFormResponse.data;

	const formName = googleAPIsForm.info?.documentTitle;

	if (!formName) {
		return [null, new Error(unreachableErrorMessage("googleAPIsForm.info?.documentTitle is not defined"))];
	}

	// ==================================================
	// Here we adjust some IDs to make the form work.
	// To be specific we have to extract the "entry.<number>" id. This is is only present when one is viewing the form
	// in the browser. Because of that we have to do some we-scraping...

	const responseURI = googleAPIsForm.responderUri;
	if (!responseURI) {
		return [null, new Error(unreachableErrorMessage("responseURI is empty. Google changed something"))];
	}
	const [questionSubmitIDs, errorGetQuestionSubmitIDs] = await getRealQuestionSubmitIDFromUndocumentedAPI(responseURI);
	if (errorGetQuestionSubmitIDs !== null) {
		return [
			null,
			new Error(`Error getting real question submit IDs: ${errorGetQuestionSubmitIDs.message} responseURI: ${responseURI}`, { cause: errorGetQuestionSubmitIDs }),
		];
	}

	if (!googleAPIsForm.items) {
		return [null, new Error(unreachableErrorMessage("googleAPIsForm.items is empty. Google changed something"))];
	}

	if (questionSubmitIDs.length !== googleAPIsForm.items.length) {
		return [null, new Error(unreachableErrorMessage("Something failed with real question ids extraction: questionSubmitIDs.length !== googleAPIsForm.items.length"))];
	}

	for (let i = 0; i < googleAPIsForm.items.length; i++) {
		(googleAPIsForm.items[i] as { itemId: string }).itemId = `entry.${String(questionSubmitIDs[i])}`;
	}
	// ==================================================

	const responderViewURL = new URL(responseURI);
	const pathSegments = responderViewURL.pathname.split("/");
	const formResponderID = pathSegments.at(-2);
	const formResponsePostURL = `https://docs.google.com/forms/u/0/d/e/${formResponderID}/formResponse`;

	const [fileUploadFunctionOptions, errorFileUploadFunctionOptions] = await fileUploadOptionsToFileUploadFunctionOptions(formName, fileUploadOptions);
	if (errorFileUploadFunctionOptions) {
		return [null, errorFileUploadFunctionOptions];
	}

	const [googleAPIsFormToSectionsReturn, googleAPIsFormToSectionsError] = await googleAPIsFormToSections(googleAPIsForm, fileUploadFunctionOptions);
	if (googleAPIsFormToSectionsError) {
		return [null, googleAPIsFormToSectionsError];
	}

	const form: Form = {
		sections: googleAPIsFormToSectionsReturn.sections,
		formClientData: {
			perSectionQuestionIDs: googleAPIsFormToSectionsReturn.perSectionQuestionIDs,
			responsePostURL: formResponsePostURL,

			// biome-ignore lint/style/useNamingConvention: TODO
			__internal_temp_waitingForDSDv2_perQuestionIDInternationalizedValueToRealValueMapping: {},
		},
	};

	// ==================================================
	// Read the comment in the formClientData type
	const numberOfSections = googleAPIsFormToSectionsReturn.sections.length;
	if (numberOfSections > 1) {
		let pageHistory = "0";
		for (let i = 1; i < numberOfSections; i++) {
			pageHistory = `${pageHistory},${i}`;
		}
		form.formClientData.pageHistory = pageHistory;
	}
	// ==================================================

	if (fileUploadFunctionOptions) {
		// We want to set form.formClientData.fileUpload ONLY when file upload is enabled with fileUploadFunctionOptions. This is because,
		// setting form.formClientData.fileUpload gives the form-client.tsx a sign
		form.formClientData.fileUpload = googleAPIsFormToSectionsReturn.fileUploadQuestionIDToFolderID;
	}

	if (IS_PREVIEW) {
		return [form, null];
	}

	if (googleAPIsForm.publishSettings?.publishState?.isPublished !== true || googleAPIsForm.publishSettings?.publishState?.isAcceptingResponses !== true) {
		return [null, new Error("Form is not published or is not accepting responses. We are NOT in preview mode.")];
	}

	return [form, null];
});

interface FileUploadFunctionOptions {
	rootUploadFolderID: FolderID;
	fileUploadQuestionDeduplicateSet: Set<string>;
}

async function fileUploadOptionsToFileUploadFunctionOptions(
	formName: string,
	fileUploadOptions: FileUploadOptions | undefined,
): ErrorReturnPromise<FileUploadFunctionOptions | undefined> {
	if (!fileUploadOptions) {
		return [undefined, null];
	}

	const [getFolderIDorCreateIfNotExistentReturn, errorRootUploadFolderID] = await getFolderIDorCreateIfNotExistent(
		fileUploadOptions.parentFolderToTheRootUploadFolder,
		`${formName} ${FORMS_UPLOAD_FOLDER_NAME}`,
	);
	if (errorRootUploadFolderID) {
		return [null, errorRootUploadFolderID];
	}

	const rootUploadFolderID = getFolderIDorCreateIfNotExistentReturn.folderID;

	if (fileUploadOptions.permissions?.additionalAllowedEmailAddresses) {
		for (const emailAddress of fileUploadOptions.permissions.additionalAllowedEmailAddresses) {
			const addPermissionsError = await addPermission(rootUploadFolderID, emailAddress, "writer");
			if (addPermissionsError) {
				return [null, addPermissionsError];
			}
		}
	}

	const fileUploadFunctionOptions: FileUploadFunctionOptions = {
		rootUploadFolderID: rootUploadFolderID,
		fileUploadQuestionDeduplicateSet: new Set(),
	};

	return [fileUploadFunctionOptions, null];
}

interface GoogleAPIsFormToSectionsReturn {
	sections: FormSection[];
	perSectionQuestionIDs: PerSectionQuestionIDs;
	fileUploadQuestionIDToFolderID: FileUploadQuestionIDToFolderID;
}

async function googleAPIsFormToSections(
	googleAPIsForm: forms_v1.Schema$Form,
	fileUploadFunctionOptions: FileUploadFunctionOptions | undefined,
): ErrorReturnPromise<GoogleAPIsFormToSectionsReturn> {
	const formTitle = googleAPIsForm.info?.title;

	const newEmptySection = (title: string | undefined | null, description: string | undefined | null) => {
		const section: FormSection = {
			questions: [],
		};
		if (title) {
			section.title = title;
		}
		if (description) {
			section.description = description;
		}

		return section;
	};

	const globalFileUploadQuestionIDToFolderID: FileUploadQuestionIDToFolderID = {};

	const sections: FormSection[] = [];
	let currentSection: FormSection = newEmptySection(formTitle, googleAPIsForm.info?.description);

	const perSectionQuestionIDs: QuestionNameAttributeID[][] = [];
	let currentSectionQuestionNameAttributeID: QuestionNameAttributeID[] = [];

	const items = googleAPIsForm.items;
	if (!items) {
		return [null, new Error(unreachableErrorMessage("googleAPIsForm.items is undefined. Google changed something or there is a logic error."))];
	}

	const formQuestionErrors: Error[] = [];
	for (const item of items) {
		if (item.pageBreakItem) {
			const sectionTitle = item.title;

			sections.push(currentSection);
			perSectionQuestionIDs.push(currentSectionQuestionNameAttributeID);

			currentSection = newEmptySection(sectionTitle, item.description);
			currentSectionQuestionNameAttributeID = [];
			continue;
		}

		const [googleAPIsItemToFormQuestionReturn, googleAPIsItemToFormQuestionReturnError] = await googleAPIsItemToFormQuestion(item, fileUploadFunctionOptions);
		if (googleAPIsItemToFormQuestionReturnError) {
			formQuestionErrors.push(googleAPIsItemToFormQuestionReturnError);
			continue;
		}

		const { parsedQuestion, questionIDs, fileUploadQuestionIDToFolderID } = googleAPIsItemToFormQuestionReturn;
		if (fileUploadQuestionIDToFolderID) {
			for (const [key, value] of Object.entries(fileUploadQuestionIDToFolderID)) {
				// We need to do this as because Object.entries cannot comprehend that the keys of fileUploadQuestionIDToFolderID are already of type QuestionNameAttributeID
				globalFileUploadQuestionIDToFolderID[key as QuestionNameAttributeID] = value;
			}
		}

		for (const questionID of questionIDs) {
			currentSectionQuestionNameAttributeID.push(questionID);
		}
		currentSection.questions.push(parsedQuestion);
	}

	sections.push(currentSection);
	perSectionQuestionIDs.push(currentSectionQuestionNameAttributeID);

	if (formQuestionErrors.length > 0) {
		return [null, errorArrayToAggregateError(formQuestionErrors, "Unable to parse items:")];
	}

	return [{ sections, perSectionQuestionIDs, fileUploadQuestionIDToFolderID: globalFileUploadQuestionIDToFolderID }, null];
}

interface GoogleAPIsItemToFormQuestionReturn {
	parsedQuestion: FormQuestion;
	questionIDs: QuestionNameAttributeID[];

	fileUploadQuestionIDToFolderID?: FileUploadQuestionIDToFolderID;
}

const DEFAULT_QUESTION_TITLE = "Question";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO? I think I do not want to break it down to smaller functions.
async function googleAPIsItemToFormQuestion(
	item: forms_v1.Schema$Item,
	fileUploadFunctionOptions: FileUploadFunctionOptions | undefined,
): ErrorReturnPromise<GoogleAPIsItemToFormQuestionReturn> {
	const itemID = item.itemId as QuestionNameAttributeID | undefined;
	if (!itemID) {
		return [null, new Error(unreachableErrorMessage("item.itemId is not defined"))];
	}

	const questionIDs: QuestionNameAttributeID[] = [itemID];

	const title = item.title ?? DEFAULT_QUESTION_TITLE;
	const questionItem = item.questionItem?.question;
	if (!questionItem) {
		return [null, new Error(`Unsupported question type ${JSON.stringify(item, null, 2)}`)];
	}

	const questionItemImage = parseItemImage(item.questionItem?.image);

	const parsedCommonQuestion: Omit<FormQuestion, "type"> = {
		title: title,
		required: questionItem.required ?? false,
		questionNameAttributeID: itemID,
	};

	if (item.description) {
		parsedCommonQuestion.description = item.description;
	}

	if (questionItemImage) {
		parsedCommonQuestion.image = questionItemImage;
	}

	if (questionItem.choiceQuestion) {
		const choiceQuestionType = questionItem.choiceQuestion.type;
		if (!choiceQuestionType) {
			return [null, new Error(unreachableErrorMessage("questionItem.choiceQuestion.type is not defined"))];
		}

		const choiceQuestionOptions = questionItem.choiceQuestion.options;
		if (!choiceQuestionOptions) {
			return [null, new Error(unreachableErrorMessage("questionItem.choiceQuestion.options is not defined"))];
		}

		if (questionItem.choiceQuestion.type === "CHECKBOX") {
			const [parsedOptionsImageReturn, optionsParseError] = parseOptionsImage(choiceQuestionOptions);
			if (optionsParseError) {
				return [null, optionsParseError];
			}

			const parsedQuestion: FormQuestionCheckbox = {
				type: FORM_QUESTION_TYPE.checkbox,
				...parsedCommonQuestion,
				hasImageInOptions: parsedOptionsImageReturn.hasImageInOptions,
				options: parsedOptionsImageReturn.options,
			};

			if (parsedOptionsImageReturn.hasOtherOption) {
				parsedQuestion.otherOption = parseOtherOption(itemID);
				questionIDs.push(parsedQuestion.otherOption.otherOptionQuestionNameAttributeID);
			}

			return [{ parsedQuestion, questionIDs }, null];
		}

		if (questionItem.choiceQuestion.type === "DROP_DOWN") {
			const [parsedOptionsReturn, optionsParseError] = parseOptions(choiceQuestionOptions);
			if (optionsParseError) {
				return [null, optionsParseError];
			}

			const parsedQuestion: FormQuestionDropdown = {
				type: FORM_QUESTION_TYPE.dropdown,
				options: parsedOptionsReturn,
				...parsedCommonQuestion,
			};

			return [{ parsedQuestion, questionIDs }, null];
		}

		if (questionItem.choiceQuestion.type === "RADIO") {
			const [parsedOptionsImageReturn, optionsParseError] = parseOptionsImage(choiceQuestionOptions);
			if (optionsParseError) {
				return [null, optionsParseError];
			}

			const parsedQuestion: FormQuestionRadio = {
				type: FORM_QUESTION_TYPE.radio,
				...parsedCommonQuestion,
				hasImageInOptions: parsedOptionsImageReturn.hasImageInOptions,
				options: parsedOptionsImageReturn.options,
			};

			if (parsedOptionsImageReturn.hasOtherOption) {
				parsedQuestion.otherOption = parseOtherOption(itemID);
				questionIDs.push(parsedQuestion.otherOption.otherOptionQuestionNameAttributeID);
			}

			return [{ parsedQuestion, questionIDs }, null];
		}
	}

	if (questionItem.scaleQuestion) {
		const questionItemHigh = questionItem.scaleQuestion.high;
		if (questionItemHigh === undefined || questionItemHigh === null) {
			return [null, new Error(unreachableErrorMessage("questionItem.scaleQuestion.high is undefined or null"))];
		}
		const questionItemLow = questionItem.scaleQuestion.low;
		if (questionItemLow === undefined || questionItemLow === null) {
			return [null, new Error(unreachableErrorMessage("questionItem.scaleQuestion.low is undefined or null"))];
		}

		const parsedQuestion: FormQuestionScale = {
			type: FORM_QUESTION_TYPE.scale,
			max: questionItemHigh,
			min: questionItemLow,
			...parsedCommonQuestion,
		};

		if (questionItem.scaleQuestion.highLabel) {
			parsedQuestion.maxLabel = questionItem.scaleQuestion.highLabel;
		}
		if (questionItem.scaleQuestion.lowLabel) {
			parsedQuestion.minLabel = questionItem.scaleQuestion.lowLabel;
		}

		return [{ parsedQuestion, questionIDs }, null];
	}

	if (questionItem.textQuestion) {
		if (questionItem.textQuestion.paragraph) {
			const parsedQuestion: FormQuestionTextarea = {
				type: FORM_QUESTION_TYPE.textarea,
				...parsedCommonQuestion,
			};

			return [{ parsedQuestion, questionIDs }, null];
		}

		if (isFileUploadQuestion(title)) {
			parsedCommonQuestion.title = getFileUploadQuestionTitle(title);
			if (!fileUploadFunctionOptions) {
				return [null, new Error("fileUploadFunctionOptions were not provided while this form requires file upload. Call up your Digital team.")];
			}

			const [uploadFolderID, folderIDError] = await getOrCreateFileUploadFolderID(parsedCommonQuestion.title, fileUploadFunctionOptions);
			if (folderIDError) {
				return [null, folderIDError];
			}

			const parsedQuestion: InternalFormQuestionFile = {
				type: FORM_QUESTION_TYPE.file,
				...parsedCommonQuestion,
				internalUploadFolderID: uploadFolderID,
			};

			const fileUploadQuestionIDToFolderID: FileUploadQuestionIDToFolderID = {};
			fileUploadQuestionIDToFolderID[itemID] = uploadFolderID;

			return [{ parsedQuestion, questionIDs, fileUploadQuestionIDToFolderID }, null];
		}

		const parsedQuestion: FormQuestionText = {
			type: FORM_QUESTION_TYPE.text,
			...parsedCommonQuestion,
		};

		return [{ parsedQuestion, questionIDs }, null];
	}

	return [null, new Error(`Unsupported question type ${JSON.stringify(questionItem, null, 2)}`)];
}

function parseOtherOption(itemID: string): OtherOption {
	return {
		otherOptionQuestionNameAttributeID: `${itemID}${OTHER_QUESTION_ID_SUFFIX}` as QuestionNameAttributeID,
	};
}

async function getOrCreateFileUploadFolderID(fileUploadQuestionTitle: string, fileUploadFunctionOptions: FileUploadFunctionOptions): ErrorReturnPromise<FolderID> {
	if (fileUploadFunctionOptions.fileUploadQuestionDeduplicateSet.has(fileUploadQuestionTitle)) {
		const duplicateErrorMessage = `File upload question name is a duplicate ${fileUploadQuestionTitle}. Our upload logic requires file upload questions to have unique names.`;
		return [null, new Error(duplicateErrorMessage)];
	}

	const [getFolderIDorCreateIfNotExistentReturn, errorGetOrCreate] = await getFolderIDorCreateIfNotExistent(
		fileUploadFunctionOptions.rootUploadFolderID,
		fileUploadQuestionTitle,
	);
	if (errorGetOrCreate) {
		return [null, errorGetOrCreate];
	}

	const fileUploadFolderID = getFolderIDorCreateIfNotExistentReturn.folderID;

	return [fileUploadFolderID, null];
}

function parseItemImage(image: forms_v1.Schema$Image | undefined): FormImage | null {
	const url = image?.contentUri;
	const width = image?.properties?.width;
	if (!url || !width) {
		return null;
	}

	return {
		url: url as ImageURL,
		width,
	};
}

function parseOptions(options: forms_v1.Schema$Option[]): ErrorReturn<string[]> {
	const parsedOptions: string[] = [];
	for (const option of options) {
		const value = option.value;
		if (value === undefined || value === null) {
			return [null, new Error(unreachableErrorMessage("option.value is undefined or null"))];
		}

		parsedOptions.push(value);
	}

	return [parsedOptions, null];
}

interface ParseOptionsImageReturn {
	hasImageInOptions: boolean;
	hasOtherOption: boolean;
	options: FormQuestionOptionImage[];
}

function parseOptionsImage(options: forms_v1.Schema$Option[]): ErrorReturn<ParseOptionsImageReturn> {
	let hasImageInOptions = false;
	let hasOtherOption = false;
	const parsedOptions: FormQuestionOptionImage[] = [];
	for (const option of options) {
		if (option.isOther) {
			hasOtherOption = true;
			continue;
		}

		const value = option.value;
		if (value === undefined || value === null) {
			return [null, new Error(unreachableErrorMessage("option.value is undefined or null"))];
		}

		const parsedOption: FormQuestionOptionImage = { value };

		const image = parseItemImage(option.image);
		if (image) {
			parsedOption.image = image;
			hasImageInOptions = true;
		}

		parsedOptions.push(parsedOption);
	}

	return [
		{
			hasImageInOptions,
			options: parsedOptions,
			hasOtherOption,
		},
		null,
	];
}

const REQUIRED_SIGN_IN_MARKER = `data-sign-in-to-continue="true"`;
const FORM_RESPONSE_TEXT_START = "FB_PUBLIC_LOAD_DATA_ = ";
const FORM_RESPONSE_TEXT_END = ";</script>";

async function getRealQuestionSubmitIDFromUndocumentedAPI(responseURI: string): ErrorReturnPromise<(number | undefined)[]> {
	const [formResponse, formResponseError] = await safePromise(() => fetch(responseURI));
	if (formResponseError) {
		return [null, formResponseError];
	}

	const [formResponseText, formResponseTextError] = await safePromise(() => formResponse.text());
	if (formResponseTextError) {
		return [null, formResponseTextError];
	}

	if (formResponseText.includes(REQUIRED_SIGN_IN_MARKER)) {
		const hint = `Hint: Corioders Forms work only if the underlying google form does NOT require users to be signed in. Check if this form enables some options that make signing-in mandatory"\n - Make sure the 'Limit to 1 response' option is NOT checked.\n - Check if the 'Collect email addresses' option is on 'Do no collect' or 'Responders input'.\n - Also check for any native file upload questions, if they are present replace them with custom corioders file upload question.`;
		return [null, new Error(`Error: The form you provided requires users to be signed in with their emails. This is not supported on non-google websites.\n${hint}`)];
	}

	if (!formResponse.ok) {
		const hint =
			"Hint: Corioders Forms work only if the underlying google form is published AND responders are set to `anyone with the link`. Make sure the form you are trying to use is published AND the responders are set to `anyone with the link`.\n(Use the Publish button in the top right corner)";
		return [null, new Error(`Fetching form from ${responseURI} failed: ${formResponse.statusText}\n${hint}`)];
	}

	let data = formResponseText.split(FORM_RESPONSE_TEXT_START)[1];
	if (!data) {
		return [null, new Error(unreachableErrorMessage("FB_PUBLIC_LOAD_DATA_ split failed. Google changed something."))];
	}

	data = data.slice(0, data.indexOf(FORM_RESPONSE_TEXT_END));
	const [parsedData, jsonParseError] = safe(() => JSON.parse(data) as unknown[]);
	if (jsonParseError) {
		return [null, new CSE(jsonParseError)];
	}

	const [questionIDs, extractError] = extractQuestionIdsFromUndocumentedAPIParsedData(parsedData);
	if (extractError) {
		return [null, extractError];
	}

	return [questionIDs, null];
}

function extractQuestionIdsFromUndocumentedAPIParsedData(formData: any[]): ErrorReturn<(number | undefined)[]> {
	if (!Array.isArray(formData) || formData.length < 2 || !Array.isArray(formData[1])) {
		return [null, new Error(unreachableErrorMessage("The data format is not valid"))];
	}

	const questions: any[] = formData[1][1];
	const questionIds: (number | undefined)[] = [];

	// We push all of these undefined because we need to maintain the same length as the `questions` array.
	for (const question of questions) {
		const questionDataIndex = 4;
		const questionData = question.at(questionDataIndex);
		if (!questionData) {
			questionIds.push(undefined);
			continue;
		}

		const questionDataArray = questionData.at(0);
		if (!questionDataArray) {
			questionIds.push(undefined);
			continue;
		}

		const questionID = questionDataArray.at(0);
		if (typeof questionID !== "number") {
			questionIds.push(undefined);
			continue;
		}

		questionIds.push(questionID);
	}

	return [questionIds, null];
}
