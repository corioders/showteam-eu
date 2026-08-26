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
- Keep commits small and focused: one working, reversible change per commit. Do not combine unrelated features or fixes.
- Do not implement fallbacks for problems that should surface as errors.

# Cloudflare infrastructure

- The CMS, media, and cache D1/R2 resources bound in `apps/web/wrangler.jsonc` are durable. Never delete or replace them automatically.
- Payload owns D1 schema migrations.
