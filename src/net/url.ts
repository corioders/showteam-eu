// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, April 2025

export type URLSafeString = string & { readonly __urlSafeStringTag: unique symbol };
export class URLSafeJSONParser<ObjectT, URLSafeStringT extends URLSafeString> {
	encode(object: ObjectT): URLSafeStringT {
		const json = JSON.stringify(object);
		const base64 = Buffer.from(json).toString('base64url');
		return base64 as URLSafeStringT;
	}
	decode(urlSafeString: URLSafeStringT): ObjectT {
		const json = Buffer.from(urlSafeString, 'base64url').toString('utf-8');
		const parsed = JSON.parse(json);
		return parsed as ObjectT;
	}
}
