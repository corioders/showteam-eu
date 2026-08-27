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

- For page sections and reusable UI, search the purchased `@shadcnblocks` registry before writing a custom implementation. From the cfworkers workspace root, search with `pnpm shadcn:search -- -q "hero"`; install with `pnpm shadcn:add @shadcnblocks/<name>`.
- Registry authentication comes from `apps/web/.env` through the cstd wrappers. Never read, print, source or manually export `SHADCNBLOCKS_API_KEY`; if the wrapper reports it missing, request it.
- Preserve the installed Shadcnblocks block instead of replacing or simplifying it. Treat it as upstream source; this is a Corioders compatibility migration before it is project UI work.
- Keep compatibility and customization as separate phases. Compatibility includes reusable Biome, TypeScript, accessibility, runtime and house-convention fixes. Branding, copy, domain behavior and demo data are project customization and must wait.
- If normalization reports an unknown incompatibility, stop before customization. Fix only the generic compatibility errors in the installed block, then run `pnpm shadcn:learn`. That command captures evidence; it does not write the codemod.
- Complete the workflow printed by `shadcn:learn`: implement the smallest reusable rule in the vendored `cstd-next/script/shadcn/codemods.js`, add a synthetic regression test without paid source, run the cstd-next tests, commit it, and push the subtree to `git@github.com:corioders/cstd-next.git` `main`. The integration is incomplete until canonical cstd-next is pushed. Only then customize the block for the project.

# Cloudflare infrastructure

- The CMS, media, and cache D1/R2 resources bound in `apps/web/wrangler.jsonc` are durable. Never delete or replace them automatically.
- Payload owns D1 schema migrations.
