/** biome-ignore-all plugin: Invalid image component props must fail rendering; this public synchronous API cannot return an ErrorReturn. */

// This function works this way because of the calculateImageSizeFromUserSpecified. Look at the rules above.
export function validateSizesProperty(userProvidedSizes: string | undefined, inferredSizes: string | undefined, imageNameToReport: string): string {
	if (userProvidedSizes && inferredSizes) {
		console.log(`!!WARNING!! You specified sizes, while it was possible to infer them. Are you sure you want to do that: ${imageNameToReport}`);
	}

	if (!(userProvidedSizes || inferredSizes)) {
		throw new Error(`Sizes can be omitted ONLY when specifying only ONE width OR height: ${imageNameToReport}`);
	}

	if (inferredSizes) {
		return inferredSizes;
	}

	if (userProvidedSizes) {
		if (userProvidedSizes === "auto") {
			throw new Error(`The sizes='auto' attribute does not work in Safari and Firefox, sorry... ${imageNameToReport}`);
		}
		return userProvidedSizes;
	}

	throw new Error(`THIS SHOULD NOT HAPPEN: userProvidedSizes and inferredSizes were not cough in a condition: ${imageNameToReport}`);
}
