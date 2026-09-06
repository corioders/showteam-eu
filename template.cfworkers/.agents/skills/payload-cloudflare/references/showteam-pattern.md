# SHOWteam Payload pattern

This is the reusable platform shape proven in `corioders/showteam-eu`. Adapt names and domain collections; retain the boundaries.

## Required files

- `apps/web/payload.config.ts`
- `apps/web/payload-types.ts` (generated and committed)
- `apps/web/migrations/index.ts` plus timestamped migrations
- `apps/web/src/collections/Users.ts` and only the requested domain collections
- `apps/web/src/app/(payload)/layout.tsx`
- `apps/web/src/app/(payload)/admin/importMap.js` (generated and committed)
- `apps/web/src/app/(payload)/admin/[[...segments]]/{page,not-found}.tsx`
- `apps/web/src/app/(payload)/api/[...slug]/route.ts`
- GraphQL routes only when GraphQL is enabled
- an idempotent seed command when initial data or an initial administrator is required
- `apps/web/wrangler.migrations.jsonc` when Payload CLI migrations use remote Cloudflare bindings

Use Payload's generated Next.js files as generated boundaries. Do not hand-redesign them.

## Dependencies and Next.js

Keep `payload`, `@payloadcms/next`, `@payloadcms/db-d1-sqlite`, `@payloadcms/richtext-lexical`, and `@payloadcms/storage-r2` on one exact version. Add `cross-env` and `tsx` only when the scripts use them.

Wrap the existing config without replacing its capabilities:

```ts
import { withPayload } from "@payloadcms/next/withPayload";

export default withPayload(nextConfig, { devBundleServerPackages: false });
```

Keep the existing `cacheComponents`, image policy, output tracing, Turbopack root, and Cloudflare development initialization. Add `pg-cloudflare` to `serverExternalPackages` when required by the Payload bundle. Add the `@payload-config` TypeScript path alias to `payload.config.ts`.

## Cloudflare context and storage

The runtime uses `getCloudflareContext({ async: true })`. Payload CLI, local development, and migration commands use Wrangler's `getPlatformProxy`; import Wrangler dynamically with webpack ignored so it is not bundled into the Worker. Select the preview environment explicitly and dispose the proxy after one-shot scripts.

Use dedicated bindings such as `PAYLOAD_DB` and `PAYLOAD_MEDIA` when the application already owns `D1` or `R2`. Define different resource IDs/names under `env.preview`. Add `/admin*` and `/api/*` to `assets.run_worker_first`; retain every existing application path in that list.

The Payload config requires `PAYLOAD_SECRET` at production runtime. A deterministic placeholder is acceptable only during a production build that cannot access runtime bindings. Never use the placeholder to serve requests.

```ts
db: sqliteD1Adapter({ binding: cloudflare.env.PAYLOAD_DB, push: false }),
admin: { importMap: { autoGenerate: false, baseDir } },
typescript: { autoGenerate: false, outputFile },
plugins: [r2Storage({ bucket: cloudflare.env.PAYLOAD_MEDIA, collections: { media: true } })],
```

Payload owns its D1 schema. Generate a migration for every config schema change, commit it, and run `payload migrate` against the selected binding before deploying the Worker. Never mix `push` with checked-in migrations.

## Authentication and initial administrator

For username-only login:

```ts
export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    cookies: { sameSite: "Strict", secure: process.env.NODE_ENV === "production" },
    loginWithUsername: { allowEmailLogin: false, requireEmail: false },
    removeTokenFromResponses: true,
  },
  admin: { useAsTitle: "username" },
  fields: [],
};
```

The seed looks up `username` and creates only when absent. Read production username and password from environment secrets. Local/test scripts may deliberately default to credentials requested by the user. Keep login throttling/lockout enabled, use secure HTTP-only cookies, and do not expose tokens in responses.

## Stable generated artifacts

Set both `admin.importMap.autoGenerate` and `typescript.autoGenerate` to `false`. Expose explicit commands:

```json
{
  "generate:importmap": "payload generate:importmap",
  "generate:types:payload": "payload generate:types"
}
```

Run them only when Payload config/imports/schema change. Commit `importMap.js`, `payload-types.ts`, and migrations. Development, build, and ordinary checks must leave the worktree clean.

## Acceptance

- Fresh local D1 migrates from zero without `push`.
- Initial-user seed is repeatable and does not reset an existing password.
- `/admin` accepts the configured username/password and rejects an invalid password.
- Auth cookies are secure in production and tokens are absent from auth responses.
- Media upload/read/delete exercises the R2 binding when media is in scope.
- Production and preview use different Payload D1/R2 resources.
- Existing routes, data, telemetry, OpenNext caches, and tests still pass.
