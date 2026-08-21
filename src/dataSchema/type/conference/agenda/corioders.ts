import { IS_PREVIEW } from "@/const.js";
import { defineTypeFunctionPromise } from "@/dataSchema/index.js";
import type { Spreadsheet } from "@/driveCMS/spreadsheet.js";
import { parseAgendaCoriodersFormat } from "@/format/conference/agenda/corioders.js";
import type { Agenda } from "@/format/conference/agenda/index.js";

import type { InternationalizationRuntimeArguments } from "../../index.js";

// biome-ignore lint/suspicious/noConfusingVoidType: No user spec required
type CoriodersAgendaParserUserSpec = void;

// biome-ignore lint/style/useNamingConvention: We want to mark it as unstable
export const UNSTABLE_typeCoriodersAgendaParserFromGoogleSpreadsheet = defineTypeFunctionPromise<
	CoriodersAgendaParserUserSpec,
	Spreadsheet,
	Agenda,
	InternationalizationRuntimeArguments
>(function typeCoriodersAgendaParserFromGoogleSpreadsheet(_us) {
	return async (agendaSpreadsheet, { lang }) => {
		let languageIndex = 0;
		if (lang === "en") {
			languageIndex = 1;
		}

		const [parsedAgenda, parserError] = await parseAgendaCoriodersFormat(agendaSpreadsheet.workbook, IS_PREVIEW, languageIndex);

		if (parserError) {
			return [null, parserError];
		}

		return [parsedAgenda, null];
	};
});
