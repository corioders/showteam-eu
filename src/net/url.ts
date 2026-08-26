// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, April 2025

export type URLSafeString = string & { readonly __urlSafeStringTag: unique symbol };
export class URLSafeJSONParser<ObjectT, URLSafeStringT extends URLSafeString> {
	encode(object: ObjectT): URLSafeStringT {
		const json = JSON.stringify(object);
		return stringToURLSafeString(json) as URLSafeStringT;
	}
	decode(urlSafeString: URLSafeStringT): ObjectT {
		const json = urlSafeStringToString(urlSafeString);
		const parsed = JSON.parse(json);
		return parsed as ObjectT;
	}
}

export function stringToURLSafeString(x: string): URLSafeString {
	const base64 = Buffer.from(x).toString("base64url");
	return base64 as URLSafeString;
}

export function urlSafeStringToString(x: URLSafeString): string {
	const decoded = Buffer.from(x, "base64url").toString("utf-8");
	return decoded;
}
