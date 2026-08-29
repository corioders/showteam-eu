#!/usr/bin/env node

import { finalizePrerenderedImageBuild } from "../build/media/image/prerendered-image-build-finalizer.js";

await finalizePrerenderedImageBuild(process.cwd());
