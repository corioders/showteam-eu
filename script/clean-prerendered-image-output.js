#!/usr/bin/env node

// Copyright (C) Corioders <corioders@gmail.com> - All Rights Reserved
// Unauthorized copying of this file, via any medium is strictly prohibited
// Proprietary and confidential

import { cleanPrerenderedImageProductionOutput } from "../build/media/image/clean-prerendered-image-output.js";

const [_, cleanupError] = await cleanPrerenderedImageProductionOutput();
if (cleanupError !== null) {
	console.error(cleanupError);
	process.exitCode = 1;
}
