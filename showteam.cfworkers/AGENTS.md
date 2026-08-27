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

# UI components

- For page sections and reusable UI, use purchased `@shadcnblocks` before custom code. From the workspace root: `pnpm shadcn:search -- -q "hero"`, then `pnpm shadcn:add @shadcnblocks/<name>`. Preserve the installed block; customize it instead of replacing or simplifying it.
- If the user supplies an exact `@shadcnblocks/<name>`, skip search, info, docs and upstream source inspection; run `pnpm shadcn:add @shadcnblocks/<name>` directly. The wrapper owns authentication, installation and compatibility validation.
- `shadcn:add` is the complete compatibility gate. Exit 0 → customize immediately; do not inspect its implementation, rerun compatibility work, or run `shadcn:learn`.
- Unknown/stale incompatibility → before customization, fix only generic compatibility errors and run `pnpm shadcn:learn`; follow its test/commit/canonical `cstd-next` push instructions. Never hand-write a partial codemod.
- After a successful exact-block install, inspect only changed filenames, the exported component, and identifiers relevant to the requested copy, data or branding. Use `git diff --name-only`, `rg` and narrow ranges; do not dump or read the whole generated block unless a concrete error or ambiguity requires it.
- Keep the installed UI skills. Do not invoke frontend-design or React performance guidance merely to install and wire an exact block; invoke them when the request includes original design, restyling, performance work, or non-trivial React architecture.
- Wire the exported block, make only the requested project customizations, then run `pnpm check`.
- Authentication is loaded by the wrappers from `apps/web/.env`. Never read, print, source or manually export `SHADCNBLOCKS_API_KEY`; request it only when the wrapper reports it missing.

# Cloudflare infrastructure

- The CMS, media, and cache D1/R2 resources bound in `apps/web/wrangler.jsonc` are durable. Never delete or replace them automatically.
- Payload owns D1 schema migrations.
