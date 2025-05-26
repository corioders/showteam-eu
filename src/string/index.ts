export function isASCII(x: string): boolean {
	if (typeof x !== 'string') {
		return false;
	}

	for (let i = 0; i < x.length; i++) {
		if (x.charCodeAt(i) > 127) {
			return false;
		}
	}

	return true;
}
