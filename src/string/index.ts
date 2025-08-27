const ASCIIupperBound = 127;

export function isASCII(x: string): boolean {
	if (typeof x !== "string") {
		return false;
	}

	for (let i = 0; i < x.length; i++) {
		if (x.charCodeAt(i) > ASCIIupperBound) {
			return false;
		}
	}

	return true;
}

export function capitalize(text: string) {
	return text.charAt(0).toUpperCase() + text.slice(1);
}
