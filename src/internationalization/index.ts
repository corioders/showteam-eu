// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, Jun 2025

import { IS_PREVIEW } from "@/const.js";

// https://countrycode.org/
export type CountryISO2Code = string & { readonly __tagCountryISO2Code: symbol };
export type StandardCountryISO2Code = CountryISO2Code & { readonly __tagStandardCountryISO2Code: symbol };

export const PSEUDO_LANG_NAME = "pseudo" as StandardCountryISO2Code;

// TODO: Make this more rigorous
export function isCountryISO2Code(x: string): x is CountryISO2Code {
	if (IS_PREVIEW && x === PSEUDO_LANG_NAME) {
		return true;
	}

	return typeof x === "string" && x.length === 2;
}

export function standardizeCountryISO2Code(code: CountryISO2Code): StandardCountryISO2Code {
	return code.toLocaleLowerCase().trim() as StandardCountryISO2Code;
}
