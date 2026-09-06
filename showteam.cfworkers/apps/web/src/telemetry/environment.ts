export type TelemetryEnvironment = "dev" | "preview" | "production";

export function telemetryEnvironmentFromAppEnvironment(value: string | undefined): TelemetryEnvironment {
	if (value === "production" || value === "preview") {
		return value;
	}
	return "dev";
}

export function stampTelemetryEnvironment(payload: unknown, environment: TelemetryEnvironment): unknown {
	if (!isRecord(payload) || !Array.isArray(payload["resourceSpans"])) {
		return payload;
	}
	for (const resourceSpan of payload["resourceSpans"]) {
		if (!isRecord(resourceSpan)) {
			continue;
		}
		const resource = isRecord(resourceSpan["resource"]) ? resourceSpan["resource"] : {};
		const attributes = Array.isArray(resource["attributes"])
			? resource["attributes"].filter((attribute) => !isRecord(attribute) || attribute["key"] !== "deployment.environment.name")
			: [];
		attributes.push({ key: "deployment.environment.name", value: { stringValue: environment } });
		resource["attributes"] = attributes;
		resourceSpan["resource"] = resource;
	}
	return payload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
