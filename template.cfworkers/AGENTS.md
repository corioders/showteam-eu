# Toolchain

- Use `pnpm`. Never `npm` or `yarn`.
- Run checks with `pnpm check` (template invariants + lint + typecheck) before committing. `pnpm lint:fix` applies safe fixes.
- After creating any commit, immediately push the current branch to `origin`, monitor its CI run, and fix it until green. Do not declare committed work complete while local `HEAD` is absent from `origin` or its CI is pending, canceled, or failing.
- `packages/corioders-lib/cstd-ts` and `cstd-next` are git subtrees of the shared libraries. Change them here only when the fix belongs upstream. Before declaring such work complete, commit it and push the matching subtree to the canonical `cstd` remote — see the root README.

# Template capabilities

- Preserve inherited platform capabilities. Do not disable `cstdNextConfig.cacheComponents`, remove the OpenNext R2 incremental-cache or D1 tag-cache adapters/bindings, or replace those bindings with application storage. Add project bindings alongside them.
- Production and preview must use distinct durable resources. A production binding must never reference a preview D1 database or R2 bucket.
- Do not weaken shared Biome, TypeScript, environment-validation, build, or test rules to make new code pass. Use a narrow, justified suppression only where the underlying boundary requires it.
- Treat build and framework deprecation warnings as required work, but do not mechanically rename working `middleware.ts` to `proxy.ts`: the current OpenNext Cloudflare adapter does not support Next.js Node Proxy. Preserve Edge Middleware required by the application until the adapter supports Proxy; do not add either boundary when the application does not need one.
- Preserve existing providers and other starter capabilities unless the project explicitly removes them. Do not register a global service worker when only one feature needs its scope.

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
- Authentication is injected by the workspace wrappers from Infisical. Never read, print, export or write `SHADCNBLOCKS_API_KEY`; authenticate with Infisical when the wrapper reports access is missing.
<!-- BEGIN:template-env-agent-rule -->

- Project secrets live in the Infisical project linked by `.infisical.json`. Never read, print, export, or write them to `.env`; use `infisical run` or an existing workspace wrapper.

<!-- END:template-env-agent-rule -->
