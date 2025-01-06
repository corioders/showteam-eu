// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import type { ParsedDSDTF } from '@/format/deadSimpleDataTextFormat';
import type { ValueOf } from '@/type';
import type { DateTime } from 'luxon';

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
	role?: string;
}

export type Activity = BreakActivity | OtherActivity | KeynoteActivity | PanelActivity;

export function isACTIVITY_TYPE_T(x: string): x is ACTIVITY_TYPE_T {
	return Object.values(ACTIVITY_TYPE).includes(x as ACTIVITY_TYPE_T);
}

export type ACTIVITY_TYPE_T = ValueOf<typeof ACTIVITY_TYPE>;
export const ACTIVITY_TYPE = {
	BREAK: 'Break',
	OTHER: 'Other',
	KEYNOTE: 'Keynote',
	PANEL: 'Panel',
} as const;

export interface BreakActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	Type: typeof ACTIVITY_TYPE.BREAK;
}
export interface OtherActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	Type: typeof ACTIVITY_TYPE.OTHER;
	Name: string;
}

export interface KeynoteActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	Type: typeof ACTIVITY_TYPE.KEYNOTE;
	Name: string;
	Speaker: Speaker;
}

export interface PanelActivity {
	other: ParsedDSDTF;
	start: DateTime;
	end: DateTime;

	Type: typeof ACTIVITY_TYPE.PANEL;
	Name: string;
	Speakers: Speaker[];
	Moderator: Speaker;
}
