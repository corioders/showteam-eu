# Toolchain

- Use `pnpm`. Never `npm` or `yarn`.
- Run checks with `pnpm check` (biome + tsc) before committing. `pnpm check-biome-fix` applies safe fixes.
- `packages/corioders-lib/cstd-ts` and `cstd-next` are git subtrees of the shared libraries. Change them here only when the fix belongs upstream. Before declaring such work complete, commit it and push the matching subtree to the canonical `cstd` remote — see the root README.

# Error handling

Do not `throw` in helper functions only to catch it at the call site. Use Go-style tuples. The `no-throw` biome plugin enforces this.

BAD:

```ts
return safePromise(async () => {
	await unwrap(transport.newSession(profileId));
	return new Session(transport, profileId);
});
```

GOOD:

```ts
const [session, error] = await transport.newSession(profileId);
if (error) {
	return [null, new Error("Failed to open a session", { cause: error })];
}

return [session, null];
```

# Workflow

- Read `TODO.md` before starting work, keep its statuses current, remove old already finished tasks, and use it to resume after context loss.
- After template changes, migrate every repository listed in the template's `CONSUMERS.md` that consumes the affected files or subtrees.
- Validate migrations in a disposable clone directly on Windows WSL over SSH; do not run resource-intensive migration test suites on the local Mac. CI may also run on `[self-hosted, win24-wsl]`, but it is not the fast-feedback substitute for the direct clone.
- Push changes belonging to `cstd-ts` or `cstd-next` to the matching canonical cstd repository before pulling them into consumers.
- Run trusted push and internal pull-request jobs on `[self-hosted, win24-wsl]`; external fork pull requests must stay on Blacksmith and must never run on a self-hosted runner.
- Keep commits small and focused: one working, reversible change per commit. Do not combine unrelated features or fixes.
- Do not implement fallbacks for problems that should surface as errors.

# Cloudflare infrastructure

- `bootstrap_project.sh` creates durable D1/R2 resources once and reuses exact-name matches on later runs. Never delete or replace them automatically.
- Never connect fork pull requests or preview deployments to production credentials or data. Trusted jobs run on `[self-hosted, win24-wsl]`.
