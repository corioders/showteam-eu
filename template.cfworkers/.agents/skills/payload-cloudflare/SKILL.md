---
name: payload-cloudflare
description: "Integrate or maintain Payload CMS inside this Next.js OpenNext application using the proven SHOWteam pattern: Cloudflare D1, R2, explicit migrations and generated artifacts, and Payload Admin authentication. Use for adding Payload, collections, admin login, media, migrations, or Cloudflare bindings. Do not use for an unrelated CMS or a standalone Payload server."
---

# Payload on Cloudflare

Use the existing Next.js application as Payload's host. Preserve every inherited OpenNext cache, telemetry, application binding, and route; Payload adds D1/R2 resources alongside them.

Before changing an integration, read [references/showteam-pattern.md](references/showteam-pattern.md). Inventory the current app, bindings, migrations, environment validation, deploy workflow, and tests first. Reuse an existing Payload integration instead of scaffolding a second one.

Apply the smallest complete slice:

1. Pin `payload` and all `@payloadcms/*` packages to the same exact version.
2. Mount the generated Payload Next.js route group in `src/app/(payload)` and wrap the existing Next config with `withPayload`.
3. Bind a dedicated Payload D1 database and media R2 bucket, with distinct production and preview resources. Keep OpenNext's `NEXT_TAG_CACHE_D1`, `NEXT_INC_CACHE_R2_BUCKET`, and `WORKER_SELF_REFERENCE` unchanged.
4. Configure `sqliteD1Adapter({ binding, push: false })`; Payload migrations are the only schema authority. Run them before app deployment.
5. Disable automatic import-map and TypeScript artifact generation. Generate both explicitly, review them, and commit them.
6. For username/password login, configure the auth collection with `loginWithUsername: { allowEmailLogin: false, requireEmail: false }`. Seed an initial user idempotently. Weak convenience credentials may exist only as explicit local/test defaults; production credentials must come from secrets and must not be logged or committed.
7. Put uploaded media in the bound R2 bucket through `@payloadcms/storage-r2`; do not replace application or OpenNext storage.
8. Verify migrations against a fresh local D1, exercise `/admin` login and the affected collection/API path, then run the project's normal checks and CI.

Do not copy SHOWteam's product collections, custom admin views, branding, operational tables, or seeds unless the target product asks for them. Copy the platform shape, not its domain model.
