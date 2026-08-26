// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

export class ParsingDSDTFError extends Error {
	constructor(message: string, help: string) {
		super();
		this.message = `${message}\nHelp:${colorHTMLString(help, "green")}`;
	}
}

export function imitateNeighborhoodBeforeString(dsdtfNewLineSplit: string[], tokenLineIndex: number): string {
	let neighborhood = "";

	const oneBefore = tokenLineIndex - 1;
	if (oneBefore >= 0) {
		neighborhood += dsdtfNewLineSplit[oneBefore];
	}

	return neighborhood;
}

export function imitateNeighborhoodAfterString(dsdtfNewLineSplit: string[], tokenLineIndex: number): string {
	let neighborhood = "";

	const oneAfter = tokenLineIndex + 1;
	if (oneAfter < dsdtfNewLineSplit.length) {
		neighborhood += dsdtfNewLineSplit[oneAfter];
	}

	return neighborhood;
}

export function colorHTMLString(x: string, color: string): string {
	return `<span style="color:${color}">${x}<span/>`;
}
