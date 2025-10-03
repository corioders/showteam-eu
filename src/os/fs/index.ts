export function isFileNotExistsError(error: Error): boolean {
	if (!("code" in error)) {
		return false;
	}

	if (typeof error.code !== "string") {
		return false;
	}

	return error.code.includes("ENOENT");
}
