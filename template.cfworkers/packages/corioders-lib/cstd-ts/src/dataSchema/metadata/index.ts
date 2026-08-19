import type { StandardCountryISO2Code } from "@/internationalization/index.js";

export interface OrderMetadata {
	orderNumberDS: number;
}

export interface LanguageMetadata {
	countryCodeDS: StandardCountryISO2Code;
}
