import { IS_PREVIEW } from "@/const.js";
import { defineTypeFunctionPromise } from "@/dataSchema/index.js";
import type { Spreadsheet } from "@/driveCMS/spreadsheet.js";
import { safePromise } from "@/error/index.js";
import { parseAgendaCoriodersFormat } from "@/format/conference/agenda/corioders.js";
import type { Agenda } from "@/format/conference/agenda/index.js";

// biome-ignore lint/suspicious/noConfusingVoidType: No user spec required
type CoriodersAgendaParserUserSpec = void;

export const typeCoriodersAgendaParserFromGoogleSpreadsheet = defineTypeFunctionPromise<CoriodersAgendaParserUserSpec, Spreadsheet, Agenda>(
	function typeCoriodersAgendaParserFromGoogleSpreadsheet(_us) {
		return async (agendaSpreadsheet) => {
			const [parsedAgenda, parserError] = await safePromise(() => parseAgendaCoriodersFormat(agendaSpreadsheet.workbook, IS_PREVIEW));

			if (parserError) {
				return [null, parserError];
			}

			return [parsedAgenda, null];
		};
	},
);
