// This is the most elegant way that I (Wiktor) found. If this would be normal constant (like in the case for constants in the cstd-ts package) we have to consider two cases.
// When we are talking about the remote-static-image, all is good. Nextjs reloads this file and the CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER const has the correct value.
// BUT when are we talking about the local-static-image, the webpack loader is dependent on the .env and the process.env is RELOADED but this file is not re-run, thus we view the old value.
//
// Now making this a function makes the caller, re-query process.env solving the issue.
export const CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER = () => process.env["CORIODERS_DISABLE_PERFORMANCE_PLACEHOLDER"] === "true";

export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";
