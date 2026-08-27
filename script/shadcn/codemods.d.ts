export interface ShadcnCodemod {
	name: string;
	transform(source: string, filePath: string): string;
}

export const SHADCN_CODEMODS: ShadcnCodemod[];
export function normalizeShadcnSource(source: string, filePath: string): string;
