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

- For page sections and reusable UI, search the purchased `@shadcnblocks` registry before writing a custom implementation. Search from `apps/web` with `pnpm dlx shadcn@latest search @shadcnblocks -q "hero"`; install with `pnpm shadcn:add @shadcnblocks/<name>`.
- Registry authentication comes from `SHADCNBLOCKS_API_KEY`. If it is unavailable, stop and request it; never print or commit the key.
- Preserve the installed block instead of replacing it with a simplified custom implementation. If normalization reports an unknown incompatibility, make the smallest safe fix, run `pnpm shadcn:learn`, then generalize it as a cstd-next codemod with a synthetic regression test; never copy Shadcnblocks source into cstd-next.

# Cloudflare infrastructure

- The CMS, media, and cache D1/R2 resources bound in `apps/web/wrangler.jsonc` are durable. Never delete or replace them automatically.
- Payload owns D1 schema migrations.
