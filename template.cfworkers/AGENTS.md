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
- Run registry commands from `apps/web`, for example `pnpm dlx shadcn@latest search @shadcnblocks -q "hero"` and `pnpm dlx shadcn@latest add @shadcnblocks/<name>`.
- Registry authentication comes from `SHADCNBLOCKS_API_KEY`. If it is unavailable, stop and request it; never print or commit the key.
- Inspect and adapt installed source to the project instead of treating registry output as an opaque dependency.
<!-- BEGIN:template-env-agent-rule -->

- Shared bootstrap secrets are tracked only as `apps/web/.env.age`. Never read, print, or commit plaintext `.env`; maintainers refresh the ciphertext with `./encrypt_template_env.sh` from the template repository root.

<!-- END:template-env-agent-rule -->
