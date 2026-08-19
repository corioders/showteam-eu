// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024

import { DateTime } from "luxon";
import { type CellAddress, type WorkSheet, type WorkBook as XlsxWorkBook, utils as xlsxUtils } from "xlsx";

import { getAsArray, type ParsedDSDTF, parseDSDTF } from "@/format/deadSimpleDataTextFormat";

import { ACTIVITY_TYPE, type Activity, type Agenda, type AgendaDay, isActivityType, type Speaker } from "./index.js";

/*
## Specification:
### 1. Sheet name:
A. The program only takes those sheets into account.
B. The sheet names must follow this format: `public_day_<N>_dd.mm.yyyy`. Where N is the an integer (1...), representing the day number.
C. The sheets with next day indices must be placed in that order.
D. Every sheet starting with the `public_day_` prefix will be parsed in the 1. format. Errors will be reported if the sheet anem does not follow the format.

### 2. Sheet:
A. The cell A1 has to contain: "Time"
B. The column A2:AY (where Y > 2) has to contain an hour which increases 5min on every next cell. The hour must be in the format: hh:mm
C. The cell AY can contain a time which differs from the previous more than 5min 

Example: https://docs.google.com/spreadsheets/d/1aEkg5CM9NZWF0cYPkziqlmfIJxruunVEKQy5Lj7S96k
*/

// TODO(0):
// Add speakers images support.

// TODO(1):
// - Generate an error when the prefix is in capital: `PUBLIC_DAY_1_dd.mm.yyyy`.
// - Generate an error when the sheets are not in order.
// - Generate an error if the dates are semantically incorrect (days 1 date is after days 2 date, or they are the same).

// TODO(2):
// Add time zone support.

const UNDERSCORE = "_";
const DAY_SHEET_PREFIX = "public_day_";
const DATE_FORMAT = "dd.MM.yyyy";

const TIME_TITLE_CELL: CellAddress = { c: 0, r: 0 };
const TIME_TITLE_CELL_TEXT = "Time";
const TIME_FORMAT = "HH:mm";
const TIME_TIME_DELTA_MINUTES = 5;

const FIRST_STAGE_TITLE_ROW_CELL: CellAddress = { c: 1, r: 0 };

// TODO: refactor....
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO
export async function parseAgendaCoriodersFormat(workbook: XlsxWorkBook, _isPreview: boolean, languageIndex: number = 0): Promise<Agenda> {
	const agenda: Agenda = {
		days: [],
	};
	const daysSheetNames: string[] = [];

	let expectedDayNumber = 1;
	for (const sheetName of workbook.SheetNames) {
		if (sheetName.startsWith(DAY_SHEET_PREFIX) === false) {
			continue;
		}

		const dayName = sheetName;
		const dayNameUnderscoreSplit = dayName.split(UNDERSCORE);

		// TODO: Provide an error if this does not work
		const [_public, _day, N, date] = dayNameUnderscoreSplit;
		if (!date) {
			throw new Error("date is not defined");
		}

		// TODO: Provide an error if N cannot be parsed.
		const NParsed = Number(N);
		if (expectedDayNumber !== NParsed) {
			throw new Error("expectedDayNumber !== Number(N)");
		}
		expectedDayNumber++;

		// TODO: Provide an error if this does not work.
		const dateParsed = DateTime.fromFormat(date, DATE_FORMAT);
		if (dateParsed.isValid === false) {
			throw new Error("dateParsed.isValid === false");
		}

		daysSheetNames.push(sheetName);
		agenda.days.push({
			activities: [],
			date: dateParsed,
			dayNumber: NParsed,
		});
	}

	for (let i = 0; i < agenda.days.length; i++) {
		const agendaDay = agenda.days[i];
		const daySheetName = daysSheetNames[i] as string;
		const daySheet = workbook.Sheets[daySheetName] as WorkSheet;

		if (daySheet["!ref"] === undefined) {
			throw new Error(`daySheet['!ref'] === undefined`);
		}

		if (daySheet["!merges"] === undefined) {
			throw new Error(`daySheet["!merges"] === undefined`);
		}
		// const { r: daySheetMaxRow, c: daySheetMaxColumn } = xlsxUtils.decode_cell(daySheet["!ref"]);

		function getCellFormattedText(cellAddress: CellAddress): string | undefined {
			const cell = daySheet[xlsxUtils.encode_cell(cellAddress)];
			if (cell === undefined) {
				return undefined;
			}

			return cell.w;
		}

		// Validate the day sheet. According to the specification.
		// 2.A.
		if (getCellFormattedText(TIME_TITLE_CELL) !== TIME_TITLE_CELL_TEXT) {
			throw new Error("daySheet[xlsxUtils.encode_cell(TIME_ROW_TITLE_CELL)] !== TIME_ROW_TITLE_CELL_TEXT");
		}

		const parsedTimeCache: Map<string, DateTime> = new Map();
		function parsedTimeCacheFormatKey(key: CellAddress): string {
			return `${key.c}${key.r}`;
		}

		let timeRowIndex = TIME_TITLE_CELL.r;
		let timeText: string | undefined;
		let lastTimeParsedTimeKey: string | undefined;

		while (true) {
			timeRowIndex++;
			const timeTextCellAddress = { c: TIME_TITLE_CELL.c, r: timeRowIndex };
			timeText = getCellFormattedText(timeTextCellAddress);
			if (timeText === undefined) {
				break;
			}

			const nextTimeCellAddress = { c: TIME_TITLE_CELL.c, r: timeRowIndex + 1 };
			const nextTimeText = getCellFormattedText(nextTimeCellAddress);
			const nextTimeTextIsUndefined = nextTimeText === undefined;

			// TODO: Provide an error if this does not work.
			const time = DateTime.fromFormat(timeText, TIME_FORMAT);
			if (time.isValid === false) {
				throw new Error("time.isValid === false");
			}
			parsedTimeCache.set(parsedTimeCacheFormatKey(timeTextCellAddress), time);

			if (lastTimeParsedTimeKey !== undefined) {
				const lastTime = parsedTimeCache.get(lastTimeParsedTimeKey);
				// This should never happen.s
				if (lastTime === undefined) {
					throw new Error("lastTime === undefined");
				}

				// 2.C
				if (nextTimeTextIsUndefined !== true) {
					// 2.B
					if (time.diff(lastTime).as("minutes") !== TIME_TIME_DELTA_MINUTES) {
						throw new Error("time.diff(lastTime).minutes !== TIME_ROW_TIME_DELTA_MINUTES");
					}
				}
			}

			lastTimeParsedTimeKey = parsedTimeCacheFormatKey(timeTextCellAddress);
		}

		const lastTimeRowIndex = timeRowIndex - 1;

		// TODO: Add multiple stage support.
		const stageColumnIndex = FIRST_STAGE_TITLE_ROW_CELL.c;

		// Sort merges according to their row starting position, as the !merges property stores them in their creation order.
		daySheet["!merges"].sort((a, b) => a.s.r - b.s.r);
		for (const merge of daySheet["!merges"]) {
			if (merge.s.c !== merge.e.c) {
				throw new Error("merge.s.c !== merge.e.c");
			}

			if (merge.s.c !== stageColumnIndex) {
				throw new Error("merge.s.c !== stageColumnIndex. Merge outside of stageN column");
			}

			// This should never happen.
			if (merge.e.r < merge.s.r) {
				throw new Error("merge.e.r < merge.s.r");
			}

			if (merge.e.r > lastTimeRowIndex) {
				throw new Error("merge.e.r > lastTimeRowIndex");
			}

			const activityStartTimeCellAddress = { c: TIME_TITLE_CELL.c, r: merge.s.r - 1 };
			let activityStartTime = parsedTimeCache.get(parsedTimeCacheFormatKey(activityStartTimeCellAddress));
			if (activityStartTime === undefined) {
				activityStartTimeCellAddress.r += 1;
				activityStartTime = parsedTimeCache.get(parsedTimeCacheFormatKey(activityStartTimeCellAddress));
			}

			if (activityStartTime === undefined) {
				throw new Error("activityStartTime === undefined");
			}

			// TODO: Add support for no end time
			const activityEndTimeCellAddress = { c: TIME_TITLE_CELL.c, r: merge.e.r };
			const activityEndTime = parsedTimeCache.get(parsedTimeCacheFormatKey(activityEndTimeCellAddress));
			if (activityEndTime === undefined) {
				throw new Error("activityEndTime === undefined");
			}

			const activityTextCellAddress = merge.s;
			const activityText = getCellFormattedText(activityTextCellAddress);
			if (activityText === undefined) {
				throw new Error("activityText === undefined");
			}

			const [activityDSDTF, err] = parseDSDTF(activityText);
			if (err !== null) {
				throw err;
			}

			const activity = parseActivityDSDTF(activityDSDTF, activityStartTime, activityEndTime, languageIndex);

			(agendaDay as AgendaDay).activities.push(activity);
		}
	}

	return agenda;
}

function parseActivityDSDTF(dsdtf: ParsedDSDTF, startTime: DateTime, endTime: DateTime, languageIndex: number): Activity {
	const Type = dsdtf.mapping.get("Type");
	if (Type === undefined) {
		throw new Error("Activity type must be defined");
	}

	if (isActivityType(Type) === false) {
		throw new Error(`Activity type must be one of ${Object.values(ACTIVITY_TYPE)}`);
	}

	if (Type === "Break") {
		return {
			end: endTime,
			other: dsdtf,
			start: startTime,

			type: Type,
		};
	}

	const nameFromMapping = dsdtf.mapping.get("Name");
	if (nameFromMapping === undefined) {
		throw new Error(`Activity of type: ${Type} requires the field 'Name'`);
	}

	const Name = (nameFromMapping.split("//").at(languageIndex) ?? nameFromMapping).trim();

	if (Type === "Other") {
		return {
			end: endTime,
			name: Name,
			other: dsdtf,
			start: startTime,

			type: Type,
		};
	}

	if (Type === "Keynote") {
		const SpeakerName = dsdtf.mapping.get("Speaker");
		if (SpeakerName === undefined) {
			throw new Error(`Activity of type: ${Type} requires the field 'Speaker'`);
		}

		const Speaker = parseSpeaker(SpeakerName, "Speaker");

		return {
			end: endTime,
			name: Name,
			other: dsdtf,
			speaker: Speaker,
			start: startTime,

			type: Type,
		};
	}

	if (Type === "Panel") {
		const SpeakerNames = getAsArray(dsdtf, "Speakers");
		if (SpeakerNames === undefined) {
			throw new Error(`Activity of type: ${Type} requires the field 'Speakers'`);
		}
		if (SpeakerNames.length === 0) {
			throw new Error(`The field 'Speakers' must be an array with at least one element`);
		}

		const Speakers: Speaker[] = [];
		for (const SpeakerName of SpeakerNames) {
			Speakers.push(parseSpeaker(SpeakerName, "Speaker"));
		}

		const ModeratorName = dsdtf.mapping.get("Moderator");
		if (ModeratorName === undefined) {
			throw new Error(`Activity of type: ${Type} requires the field 'Moderator'`);
		}

		const Moderator = parseSpeaker(ModeratorName, "Moderator");

		return {
			end: endTime,
			moderator: Moderator,
			name: Name,
			other: dsdtf,
			speakers: Speakers,
			start: startTime,

			type: Type,
		};
	}

	throw new Error("Invalid activity type");
}

export function parseSpeaker(speakerName: string, speakerRole: Speaker["role"]): Speaker {
	// TODO
	return {
		name: speakerName,
		photoURL: "/images/summit/agenda.svg",
		role: speakerRole,
	};
}
