export const CSTD_NEXT_CANONICAL_REPOSITORY: string;

interface CanonicalShadcnNormalizationOptions {
	canonicalRepository?: string;
	cstdNextRoot: string;
	gitRoot: string;
}

interface CanonicalShadcnNormalizationCheck {
	error: Error | null;
	isCurrent: boolean;
}

export function checkCanonicalShadcnNormalization(options: CanonicalShadcnNormalizationOptions): CanonicalShadcnNormalizationCheck;

type CanonicalSynchronizationResult = { error: null; status: "current" | "updated" } | { error: Error; status: "diverged" | "error" };

export function synchronizeCanonicalShadcnNormalization(options: CanonicalShadcnNormalizationOptions): CanonicalSynchronizationResult;
