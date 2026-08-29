// biome-ignore-all lint/style/useNamingConvention: Payload, D1, and external API field names are compatibility contracts.
import { addDaysToBookingDate, timeRangesOverlap } from "./reservations";

export type StaffEventRecord = {
	id: string;
	title: string;
	startDate: string;
	endDate: string | null;
	startTime: string | null;
	endTime: string | null;
	allDay: boolean;
	blocksBase: boolean;
	notes: string | null;
	recurrence: "none" | "weekly";
	recurrenceUntil: string | null;
};

export type StaffEventDatabaseRow = {
	id: string;
	title: string;
	start_date: string;
	end_date: string | null;
	start_time: string | null;
	end_time: string | null;
	all_day: number;
	blocks_base: number;
	notes: string | null;
	recurrence: "none" | "weekly";
	recurrence_until: string | null;
};

export type StaffEventInstance = StaffEventRecord & {
	occurrenceStartDate: string;
	occurrenceEndDate: string;
};

export function staffEventInstances(event: StaffEventRecord, rangeStart: string, rangeEnd: string): StaffEventInstance[] {
	const durationDays = daysBetween(event.startDate, event.endDate || event.startDate);
	const lastStart = event.recurrence === "weekly" ? event.recurrenceUntil || event.startDate : event.startDate;
	const instances: StaffEventInstance[] = [];
	for (let occurrenceStart = event.startDate; occurrenceStart <= lastStart; occurrenceStart = addDaysToBookingDate(occurrenceStart, 7)) {
		const occurrenceEnd = addDaysToBookingDate(occurrenceStart, durationDays);
		if (occurrenceStart < rangeEnd && occurrenceEnd >= rangeStart) {
			instances.push({ ...event, occurrenceStartDate: occurrenceStart, occurrenceEndDate: occurrenceEnd });
		}
		if (event.recurrence !== "weekly") {
			break;
		}
	}
	return instances;
}

export function staffEventBlocksRange(event: StaffEventRecord, date: string, startTime: string, endTime: string): boolean {
	if (!event.blocksBase) {
		return false;
	}
	return staffEventInstances(event, date, addDaysToBookingDate(date, 1)).some((instance) => {
		if (date < instance.occurrenceStartDate || date > instance.occurrenceEndDate) {
			return false;
		}
		if (instance.allDay) {
			return true;
		}
		if (instance.occurrenceStartDate !== instance.occurrenceEndDate) {
			if (date > instance.occurrenceStartDate && date < instance.occurrenceEndDate) {
				return true;
			}
			if (date === instance.occurrenceStartDate) {
				return Boolean(instance.startTime && endTime > instance.startTime);
			}
			return Boolean(instance.endTime && startTime < instance.endTime);
		}
		return Boolean(instance.startTime && instance.endTime && timeRangesOverlap(startTime, endTime, instance.startTime, instance.endTime));
	});
}

export function staffEventFromDatabaseRow(row: StaffEventDatabaseRow): StaffEventRecord {
	return {
		id: row.id,
		title: row.title,
		startDate: row.start_date,
		endDate: row.end_date,
		startTime: row.start_time,
		endTime: row.end_time,
		allDay: Boolean(row.all_day),
		blocksBase: Boolean(row.blocks_base),
		notes: row.notes,
		recurrence: row.recurrence,
		recurrenceUntil: row.recurrence_until,
	};
}

function daysBetween(start: string, end: string): number {
	return Math.max(0, Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000));
}
