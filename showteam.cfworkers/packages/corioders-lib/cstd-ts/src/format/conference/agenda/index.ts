// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import type { DateTime } from "luxon";

import type { ParsedDSDTF } from "@/format/deadSimpleDataTextFormat";
import type { ValueOf } from "@/type";

// TODO: Support multi-staged scenes.
export interface Agenda {
	days: AgendaDay[];
}

export interface AgendaDay {
	date: DateTime;
	dayNumber: number;
	activities: Activity[];
}

export interface Speaker {
	name: string;

	photoURL: string;
	role: "Speaker" | "Moderator" | (string & {});
}

export type Activity = BreakActivity | OtherActivity | KeynoteActivity | PanelActivity;

export function isActivityType(x: string): x is ActivityType {
	return Object.values(ACTIVITY_TYPE).includes(x as ActivityType);
}

export type ActivityType = ValueOf<typeof ACTIVITY_TYPE>;
export const ACTIVITY_TYPE = {
	break: "Break",
	keynote: "Keynote",
	other: "Other",
	panel: "Panel",
} as const;

export interface BreakActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	type: typeof ACTIVITY_TYPE.break;
}
export interface OtherActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	type: typeof ACTIVITY_TYPE.other;
	name: string;
}

export interface KeynoteActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	type: typeof ACTIVITY_TYPE.keynote;
	name: string;
	speaker: Speaker;
}

export interface PanelActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	type: typeof ACTIVITY_TYPE.panel;
	name: string;
	speakers: Speaker[];
	moderator: Speaker;
}
