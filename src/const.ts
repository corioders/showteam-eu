// This is the most elegant way that I (Wiktor) found. If this would be normal constant (like in the case for constants in the cstd-ts package) we have to consider two cases.
// During prerendering Next.js can reload callers while retaining this module, so a constant could retain the old environment value.
//
// Now making this a function makes the caller, re-query process.env solving the issue.
export const CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER = () => process.env["CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER"] === "true";
