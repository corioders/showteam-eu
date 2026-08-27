#!/usr/bin/env node

import { loadLocalEnvironment, run } from "./session.js";

const cwd = process.cwd();
loadLocalEnvironment(cwd);
run("pnpm", ["dlx", "shadcn@latest", "search", "@shadcnblocks", ...process.argv.slice(2)], { cwd });
