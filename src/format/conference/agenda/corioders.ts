// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential
// Written by Wiktor Jurkiewicz <watjurk@gmail.com> and Artur Mucowski <artur@mucowski.pl>, October 2024
import { Activity, ACTIVITY_TYPE, Agenda, isACTIVITY_TYPE_T, Speaker } from '.';
import { ParsedDSDTF, parseDSDTF } from '@/format/deadSimpleDataTextFormat';
import { DateTime } from 'luxon';
import { CellAddress, WorkBook as XlsxWorkBook, utils as xlsxUtils } from 'xlsx';

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

const UNDERSCORE = '_';
const DAY_SHEET_PREFIX = 'public_day_';
const DATE_FORMAT = 'dd.MM.yyyy';

const TIME_TITLE_CELL: CellAddress = { c: 0, r: 0 };
const TIME_TITLE_CELL_TEXT = 'Time';
const TIME_FORMAT = 'HH:mm';
const TIME_TIME_DELTA_MINUTES = 5;

const FIRST_STAGE_TITLE_ROW_CELL: CellAddress = { c: 1, r: 0 };

export async function parseAgendaCoriodersFormat(workbook: XlsxWorkBook, isDevelopment: boolean): Promise<Agenda> {
	const agenda: Agenda = {
		days: [],
	};
	const daysSheetNames = [];

	let expectedDayNumber = 1;
	for (const sheetName of workbook.SheetNames) {
		if (sheetName.startsWith(DAY_SHEET_PREFIX) === false) {
			continue;
		}

		const dayName = sheetName;
		const dayNameUnderscoreSplit = dayName.split(UNDERSCORE);

		// TODO: Provide an error if this does not work
		const [_public, _day, N, date] = dayNameUnderscoreSplit;

		// TODO: Provide an error if N cannot be parsed.
		const NParsed = Number(N);
		if (expectedDayNumber !== NParsed) {
			throw 'expectedDayNumber !== Number(N)';
		}
		expectedDayNumber++;

		// TODO: Provide an error if this does not work.
		const dateParsed = DateTime.fromFormat(date, DATE_FORMAT);
		if (dateParsed.isValid === false) {
			throw 'dateParsed.isValid === false';
		}

		daysSheetNames.push(sheetName);
		agenda.days.push({
			date: dateParsed,
			dayNumber: NParsed,

			activities: [],
		});
	}

	for (let i = 0; i < agenda.days.length; i++) {
		const agendaDay = agenda.days[i];
		const daySheetName = daysSheetNames[i];
		const daySheet = workbook.Sheets[daySheetName];

		if (daySheet['!ref'] === undefined) {
			throw `daySheet['!ref'] === undefined`;
		}

		if (daySheet['!merges'] === undefined) {
			throw `daySheet["!merges"] === undefined`;
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
			throw `daySheet[xlsxUtils.encode_cell(TIME_ROW_TITLE_CELL)] !== TIME_ROW_TITLE_CELL_TEXT`;
		}

		const parsedTimeCache: Map<string, DateTime> = new Map();
		function parsedTimeCacheFormatKey(key: CellAddress): string {
			return `${key.c}${key.r}`;
		}

		let timeRowIndex = TIME_TITLE_CELL.r;
		let timeText: string | undefined = undefined;
		let lastTimeParsedTimeKey: string | undefined = undefined;

		while (true) {
			timeRowIndex++;
			const timeTextCellAddress = { r: timeRowIndex, c: TIME_TITLE_CELL.c };
			timeText = getCellFormattedText(timeTextCellAddress);
			if (timeText === undefined) {
				break;
			}

			const nextTimeCellAddress = { r: timeRowIndex + 1, c: TIME_TITLE_CELL.c };
			const nextTimeText = getCellFormattedText(nextTimeCellAddress);
			const nextTimeTextIsUndefined = nextTimeText === undefined;

			// TODO: Provide an error if this does not work.
			const time = DateTime.fromFormat(timeText, TIME_FORMAT);
			if (time.isValid === false) {
				throw 'time.isValid === false';
			}
			parsedTimeCache.set(parsedTimeCacheFormatKey(timeTextCellAddress), time);

			if (lastTimeParsedTimeKey !== undefined) {
				const lastTime = parsedTimeCache.get(lastTimeParsedTimeKey);
				// This should never happen.s
				if (lastTime === undefined) {
					throw 'lastTime === undefined';
				}

				// 2.C
				if (nextTimeTextIsUndefined !== true) {
					// 2.B
					if (time.diff(lastTime).as('minutes') !== TIME_TIME_DELTA_MINUTES) {
						throw 'time.diff(lastTime).minutes !== TIME_ROW_TIME_DELTA_MINUTES';
					}
				}
			}

			lastTimeParsedTimeKey = parsedTimeCacheFormatKey(timeTextCellAddress);
		}

		const lastTimeRowIndex = timeRowIndex - 1;

		// TODO: Add multiple stage support.
		const stageColumnIndex = FIRST_STAGE_TITLE_ROW_CELL.c;

		// Sort merges according to their row starting position, as the !merges property stores them in their creation order.
		daySheet['!merges'].sort((a, b) => a.s.r - b.s.r);
		console.log(daySheet['!merges']);
		for (const merge of daySheet['!merges']) {
			if (merge.s.c !== merge.e.c) {
				throw 'merge.s.c !== merge.e.c';
			}

			if (merge.s.c !== stageColumnIndex) {
				throw 'merge.s.c !== stageColumnIndex. Merge outside of stageN column';
			}

			// This should never happen.
			if (merge.e.r < merge.s.r) {
				throw 'merge.e.r < merge.s.r';
			}

			if (merge.e.r > lastTimeRowIndex) {
				throw 'merge.e.r > lastTimeRowIndex';
			}

			const activityStartTimeCellAddress = { c: TIME_TITLE_CELL.c, r: merge.s.r - 1 };
			let activityStartTime = parsedTimeCache.get(parsedTimeCacheFormatKey(activityStartTimeCellAddress));
			if (activityStartTime === undefined) {
				activityStartTimeCellAddress.r += 1;
				activityStartTime = parsedTimeCache.get(parsedTimeCacheFormatKey(activityStartTimeCellAddress));
			}

			if (activityStartTime === undefined) {
				throw 'activityStartTime === undefined';
			}

			// TODO: Add support for no end time
			const activityEndTimeCellAddress = { c: TIME_TITLE_CELL.c, r: merge.e.r };
			const activityEndTime = parsedTimeCache.get(parsedTimeCacheFormatKey(activityEndTimeCellAddress));
			if (activityEndTime === undefined) {
				throw 'activityEndTime === undefined';
			}

			const activityTextCellAddress = merge.s;
			const activityText = getCellFormattedText(activityTextCellAddress);
			if (activityText === undefined) {
				throw 'activityText === undefined';
			}

			const [activityDSDTF, err] = parseDSDTF(activityText);
			if (err !== null) {
				throw err;
			}

			const activity = parseActivityDSDTF(activityDSDTF, activityStartTime, activityEndTime);

			agendaDay.activities.push(activity);
		}
	}

	return agenda;
}

function parseActivityDSDTF(DSDTF: ParsedDSDTF, startTime: DateTime, endTime: DateTime): Activity {
	const Type = DSDTF.mapping.get('Type');
	if (Type === undefined) {
		throw 'Activity type must be defined';
	}

	if (isACTIVITY_TYPE_T(Type) === false) {
		throw `Activity type must be one of ${Object.values(ACTIVITY_TYPE)}`;
	}

	if (Type === 'Break') {
		return {
			other: DSDTF,
			start: startTime,
			end: endTime,

			Type: Type,
		};
	}

	const Name = DSDTF.mapping.get('Name');
	if (Name === undefined) {
		throw `Activity of type: ${Type} requires the field 'Name'`;
	}

	if (Type === 'Other') {
		return {
			other: DSDTF,
			start: startTime,
			end: endTime,

			Type: Type,
			Name: Name,
		};
	}

	if (Type === 'Keynote') {
		const SpeakerName = DSDTF.mapping.get('Speaker');
		if (SpeakerName === undefined) {
			throw `Activity of type: ${Type} requires the field 'Speaker'`;
		}

		const Speaker = parseSpeaker(SpeakerName);

		return {
			other: DSDTF,
			start: startTime,
			end: endTime,

			Type: Type,
			Name: Name,
			Speaker: Speaker,
		};
	}

	if (Type === 'Panel') {
		const SpeakerNames = DSDTF.getAsArray('Speakers');
		if (SpeakerNames === undefined) {
			throw `Activity of type: ${Type} requires the field 'Speakers'`;
		}
		if (SpeakerNames.length === 0) {
			throw `The field 'Speakers' must be an array with at least one element`;
		}

		const Speakers = [];
		for (const SpeakerName of SpeakerNames) {
			Speakers.push(parseSpeaker(SpeakerName));
		}

		const ModeratorName = DSDTF.mapping.get('Moderator');
		if (ModeratorName === undefined) {
			throw `Activity of type: ${Type} requires the field 'Moderator'`;
		}

		const Moderator = parseSpeaker(ModeratorName);

		return {
			other: DSDTF,
			start: startTime,
			end: endTime,

			Type: Type,
			Name: Name,
			Speakers: Speakers,
			Moderator: Moderator,
		};
	}

	throw 'Invalid activity type';
}

function parseSpeaker(speakerName: string): Speaker {
	// TODO
	return {
		name: speakerName,
		photoURL: '/images/summit/agenda.svg',
		role: 'TODO',
	};
}
