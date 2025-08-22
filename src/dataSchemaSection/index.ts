import type { DataSchema, DataSchemaDefinition, DataSchemaNode, FetchParserFunction } from "cstd-ts/dataSchema/index.js";
import type { ErrorReturn } from "cstd-ts/error/index.js";
import type { EmptyObject, PrettifyHardcore, UnionToIntersection } from "cstd-ts/type/index.js";
import type { FunctionComponent } from "react";

type SectionsDSToSectionsComponentsObject<SectionsDSD extends DataSchemaDefinition<SectionsDSD, any>, SectionDS extends DataSchema<SectionsDSD>, ProvidedProps> = {
	[K in keyof SectionDS]: FunctionComponent<ProvidedProps & { data: SectionDS[K] }>;
};

type TypedDataUsed<DataUsedType> = DataSchemaNode<{ as: FetchParserFunction<DataUsedType, never, EmptyObject, false> }>;
interface SectionsCombined<DataUsedType, ProvidedProps> {
	dsn: TypedDataUsed<DataUsedType>;
	component: FunctionComponent<ProvidedProps>;
}

export type SectionsCombinedArray<DataUsedType, ProvidedProps> = SectionsCombined<DataUsedType, ProvidedProps>[];
type SectionProvider<DataUsedType, ProvidedProps, Props> = (
	sectionsCA: SectionsCombinedArray<DataUsedType, ProvidedProps>,
) => ErrorReturn<SectionsCombinedArray<DataUsedType, Props>>;

export function defineSectionProvider<DataUsedType, ProvidedProps, Props>(
	sp: SectionProvider<DataUsedType, ProvidedProps, Props>,
): SectionProvider<DataUsedType, ProvidedProps, Props> {
	return sp;
}

type ExtractAllProvidedProps<SectionPs extends SectionProvider<any, any, any>[]> = PrettifyHardcore<
	UnionToIntersection<SectionPs extends (infer P)[] ? (P extends SectionProvider<any, infer Props, any> ? Props : never) : never>
>;

type ExtractAllRequiredProps<SectionPs extends SectionProvider<any, any, any>[]> = PrettifyHardcore<
	UnionToIntersection<SectionPs extends (infer P)[] ? (P extends SectionProvider<any, any, infer ProvidedProps> ? ProvidedProps : never) : never>
>;

export function renderSections<
	SectionsDSD extends DataSchemaDefinition<SectionsDSD, any>,
	SectionsDS extends DataSchema<SectionsDSD>,
	SectionP extends SectionProvider<any, any, any>,
	SectionPs extends SectionP[],
	SectionsCO extends SectionsDSToSectionsComponentsObject<SectionsDSD, SectionsDS, ExtractAllProvidedProps<SectionPs>>,
>(sectionsDS: SectionsDS, sectionsCO: SectionsCO, providers: SectionPs): ErrorReturn<FunctionComponent<ExtractAllRequiredProps<SectionPs>>[]> {
	const sectionsCombinedArray = Object.entries(sectionsDS).map(([sectionName, sectionDSN]) => ({
		component: sectionsCO[sectionName as keyof SectionsCO],
		dsn: sectionDSN,
	})) as any;

	let runningSectionsCombinedArray = sectionsCombinedArray;
	for (const provider of providers) {
		const [sectionsCA, providerError] = provider(runningSectionsCombinedArray);
		if (providerError) {
			return [null, providerError];
		}

		runningSectionsCombinedArray = sectionsCA;
	}

	const sectionComponents: any[] = [];
	for (const section of runningSectionsCombinedArray) {
		const newComponent = (props: any) => section.component({ ...props, data: section.dsn });
		sectionComponents.push(newComponent);
	}

	return [sectionComponents, null];
}
