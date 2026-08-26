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
- Run trusted push and internal pull-request jobs on `[self-hosted, win24-wsl]`; external fork pull requests must stay on Blacksmith and must never run on a self-hosted runner.
- Keep commits small and focused: one working, reversible change per commit. Do not combine unrelated features or fixes.
- Do not implement fallbacks for problems that should surface as errors.

# Cloudflare infrastructure

- Manage durable D1/R2 resources with OpenTofu using the standard setup in `infra/README.md`: dedicated R2 state bucket, native lockfile, separate least-privilege state/provider tokens, trusted plans, and reviewed production applies.
- Never connect fork pull requests or preview deployments to production credentials or data. Forks get backend-free validation on Blacksmith; trusted jobs run on `[self-hosted, win24-wsl]`.
- Before adopting existing resources, require an import-only plan with no creates, changes, or destroys, then require a second `No changes` plan after import.
