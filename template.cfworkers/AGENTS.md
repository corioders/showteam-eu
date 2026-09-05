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
- Payload applications must disable `typescript.autoGenerate` and `admin.importMap.autoGenerate`. Regenerate and commit `payload-types.ts` and the import map explicitly when their source configuration changes; `pnpm dev` must not rewrite versioned artifacts.

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

- **SHADCN-ONLY UI IS MANDATORY.** Build every page, section, and UI element from `@shadcnblocks` and shadcn/ui components. Use as much of the registry implementation as possible. Do not create a custom UI component, custom styled substitute, or bespoke visual implementation when shadcn can supply or compose the result.
- Before writing UI code, search purchased `@shadcnblocks` from the workspace root with `pnpm shadcn:search -- -q "<need>"`. Install the closest matching page or section with `pnpm shadcn:add @shadcnblocks/<name>`, then fill every remaining UI need with existing or newly installed shadcn/ui components. If the first result is unsuitable, search for another registry item; do not fall back to custom UI.
- **DO NOT RESTYLE REGISTRY CODE.** Preserve the installed block and component structure and all visual styling exactly as installed. Do not add, remove, or change visual `className` values, inline `style`, colors, typography, spacing, sizing, radii, borders, shadows, animation, responsive behavior, theme tokens, CSS, or visual variants. Do not replace or simplify installed markup.
- After `shadcn:add` succeeds, treat every generated component and block file as immutable vendor UI. Do not delete, add, reorder, extract, or rewrite its JSX elements; do not reduce a block to a selected subset; do not create a derivative replacement. Keep the complete installed block.
- Never hand-create a visual `.tsx` component. Files under `src/components/` may be created only by `pnpm shadcn:add`; route files may import and render those installed exports but must not recreate their UI with raw JSX or Tailwind. If another visual is needed, install another registry item.
- Application-authored route, feature, and wiring files must not contain visual `className`, inline `style`, or presentational HTML (`div`, `section`, `main`, headings, paragraphs, lists, tables, and similar). Compose registry exports only through unstyled React fragments, control flow, and their existing public props. A page assembled from shadcn primitives with new layout classes or bespoke markup is custom UI and is forbidden.
- Allowed application edits inside installed blocks are limited to replacing copy and static sample data with domain data, links, event handlers, accessibility labels, and imports. These edits must leave the JSX tree, every visual prop, and every `className`/`style` byte-for-byte unchanged from the post-install result. Use component props already present in the installed implementation; do not use them to redesign it.
- The only permitted edits to installed shadcn styling or structure are generic compatibility fixes required after `shadcn:add` reports an unknown or stale incompatibility. Make only the compatibility patch, validate it with `pnpm shadcn:patch`, and do not combine it with application customization or visual changes.
- If no single registry item covers the requirement, compose multiple complete shadcn blocks/components without app-authored visual wrappers or restyling. If shadcn truly has no applicable primitive, stop and ask the user instead of implementing custom UI.
- Before finalizing UI work, compare every installed block/component against its post-install registry form. Any JSX-structure or visual-style diff outside an approved compatibility patch is a failed implementation and must be reverted, not justified.
- If the user supplies an exact `@shadcnblocks/<name>`, skip search, info, docs and upstream source inspection; run `pnpm shadcn:add @shadcnblocks/<name>` directly. The wrapper owns authentication, installation and compatibility validation.
- `shadcn:add` is the complete compatibility gate. It automatically pulls a linear canonical `cstd-next` update and reports that pull; divergence requires agent reconciliation. Exit 0 → customize immediately; do not inspect its implementation, rerun compatibility work, or run `shadcn:patch`.
- Unknown/stale incompatibility → `shadcn:add` leaves the fetched files at their exact destination paths. Before any customization, fix only generic compatibility errors in those files and run `pnpm shadcn:patch`; it verifies the style-specific patch, commits it and pushes canonical `cstd-next`. Never hand-write a partial codemod or customize Shadcn files before this gate succeeds.
- Before `shadcn:patch`, add or update `apps/web/tests/e2e/shadcn/<registry-item>.spec.ts`. It must render the installed block against the project's configured Shadcn base, exercise every interactive state, and fail on browser `console.error` or `pageerror`. `shadcn:patch` rejects a missing or unchanged test and must pass the production build plus that exact Playwright test before it may commit or push compatibility data.
- After a successful exact-block install, inspect only changed filenames, the exported component, and identifiers relevant to the requested copy, data or branding. Use `git diff --name-only`, `rg` and narrow ranges; do not dump or read the whole generated block unless a concrete error or ambiguity requires it.
- Keep the installed UI skills. Do not invoke frontend-design to invent or restyle UI governed by this policy. Performance guidance may be used for non-visual React architecture without changing installed UI.
- Wire the exported block, make only the allowed non-visual application edits, then run `pnpm check`.
- Authentication is injected by the workspace wrappers from Infisical. Never read, print, export or write `SHADCNBLOCKS_API_KEY`; authenticate with Infisical when the wrapper reports access is missing.
<!-- BEGIN:template-env-agent-rule -->

- Project secrets live in the Infisical project linked by `.infisical.json`. Never read, print, export, or write them to `.env`; use `infisical run` or an existing workspace wrapper.

<!-- END:template-env-agent-rule -->
