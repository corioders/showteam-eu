#!/usr/bin/env node

import { loadLocalEnvironment, run } from "./session.js";

const cwd = process.cwd();
loadLocalEnvironment(cwd);
const searchArguments = process.argv.slice(2);
if (searchArguments[0] === "--") {
	searchArguments.shift();
}
run("pnpm", ["dlx", "shadcn@latest", "search", "@shadcnblocks", ...searchArguments], { cwd });
