import { type ErrorReturnPromise, safePromise } from '@/error/index.js';
import { type forms_v1, google } from 'googleapis';
import type { GoogleAuth } from 'googleapis-common';
import { StatusCodes } from 'http-status-codes';
import { memoizeDriveCMS } from './cache.js';
import type { FileID } from './drive.js';

export type FormID = FileID & { readonly __formTag: unique symbol };
export const getForm = memoizeDriveCMS(async function getForm(googleAuth: GoogleAuth, formID: FormID, isPreview: boolean): ErrorReturnPromise<forms_v1.Schema$Form> {
	const formsAPI = google.forms({ version: 'v1', auth: googleAuth });

	const [gaxiosFormResponse, requestError] = await safePromise(() =>
		formsAPI.forms.get({
			formId: formID,
		}),
	);
	if (requestError) {
		return [null, requestError];
	}

	if (gaxiosFormResponse.status !== StatusCodes.OK) {
		return [null, new Error(`Google Forms API returned ${gaxiosFormResponse.status} status code. ${gaxiosFormResponse.statusText} ${gaxiosFormResponse.data}`)];
	}

	const form = gaxiosFormResponse.data;
	if (isPreview) {
		return [form, null];
	}

	if (form.publishSettings?.publishState?.isPublished !== true && form.publishSettings?.publishState?.isAcceptingResponses !== false) {
		return [null, new Error('While not in preview mode: Form is not published or accepting responses... Is this the expected behavior?')];
	}

	return [form, null];
});
