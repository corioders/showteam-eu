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

- For page sections and reusable UI, search the purchased `@shadcnblocks` registry before writing a custom implementation. In this template, `@shadcnblocks` is the default registry when the user does not name another one.
- Run registry commands from the cfworkers workspace root. Search with `pnpm shadcn:search -- -q "hero"`; install with `pnpm shadcn:add @shadcnblocks/<name>` so cstd normalizes only the files changed by the official CLI.
- Registry authentication comes from `apps/web/.env` through the cstd wrappers. Never read, print, source or manually export `SHADCNBLOCKS_API_KEY`; if the wrapper reports it missing, request it.
- Preserve the installed Shadcnblocks block instead of replacing or simplifying it. Treat it as upstream source; this is a Corioders compatibility migration before it is project UI work.
- Keep compatibility and customization as separate phases. Compatibility includes reusable Biome, TypeScript, accessibility, runtime and house-convention fixes. Branding, copy, domain behavior and demo data are project customization and must wait.
- If normalization reports an unknown or stale incompatibility, stop before customization. Fix every generic compatibility error in the installed block, then run `pnpm shadcn:learn`. It records and self-verifies the complete per-block patch against the exact upstream source; do not hand-write partial codemod rules.
- If `pnpm shadcn:add` succeeds, do not run `pnpm shadcn:learn`; the canonical compatibility patch is already valid, so proceed directly to project customization.
- Complete the workflow printed by `shadcn:learn`: inspect the learned patch for compatibility-only changes, run the cstd-next tests, commit it, and push the subtree to `git@github.com:corioders/cstd-next.git` `main`. The integration is incomplete until canonical cstd-next is pushed. Only then customize the block for the project.
<!-- BEGIN:template-env-agent-rule -->

- Shared bootstrap secrets are tracked only as `apps/web/.env.age`. Never read, print, or commit plaintext `.env`; maintainers refresh the ciphertext with `./encrypt_template_env.sh` from the template repository root.

<!-- END:template-env-agent-rule -->
