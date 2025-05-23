import 'server-only';

import type { FormRendererContextT } from '@/driveCMS/formRenderer/_context/_type.js';
import CstdError from '@/error/CstdError.jsx';
import type { FileUploadOptions, FormID } from 'cstd-ts/driveCMS/form.js';
import { getForm } from 'cstd-ts/driveCMS/index.js';
import type { ReactNode } from 'react';
import { FormRendererClientContextProvider } from './_context/_client.jsx';

export interface Props {
	formID: FormID;
	fileUploadOptions?: FileUploadOptions;
	children: ReactNode;
}

const IS_PREVIEW = process.env.IS_PREVIEW === 'true' || process.env.NEXT_PUBLIC_IS_PREVIEW === 'true';

export const serverContext: FormRendererContextT = {};

export default async function FormRendererRoot(props: Props) {
	const [form, errorDownload] = await getForm(props.formID as FormID, IS_PREVIEW, props.fileUploadOptions);
	if (errorDownload !== null) {
		return <CstdError error={errorDownload} />;
	}
	serverContext.form = form;

	if (!serverContext.form?.googleAPIsForm.items || serverContext.form.googleAPIsForm.items.length === 0) {
		return <CstdError error={new Error('Form has no inputs')} />;
	}
	return <FormRendererClientContextProvider value={serverContext}>{props.children}</FormRendererClientContextProvider>;
}
