// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, Jun 2025

// https://countrycode.org/
export type CountryISO2Code = string & { readonly __tagCountryISO2Code: symbol };

// TODO: Make this more rigorous
export function isCountryISO2Code(x: string): x is CountryISO2Code {
    return typeof x === 'string' && x.length === 2;
}