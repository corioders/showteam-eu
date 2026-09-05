# Template consumers

This is the source of truth for repositories that must receive template and
shared-subtree migrations. Add a project when it is created from this template;
remove it only after archival.

`bootstrap_project.sh` deletes this file from the generated project and prints the
exact reminder to add that project to this source registry.

| Repository | App directory | Preserve | Migration blocker | Status | Template revision |
| --- | --- | --- | --- | --- | --- |
| `corioders/corioders-dashboard` | `corioders-dashboard.cfworkers/apps/web` | Telemetry collector, trace storage and observability UI | Payload artifact invariant | Migration pending | `de6f202` (`c3863ef`) |
| `corioders/corioders.com` | `corioders.cfworkers/apps/web` | Lingui routing and typed env | Reconcile application bindings | Planned | — |
| `corioders/impact-speaker-tracker` | `impact.cfworkers/apps/web` | Firebase, Drive CMS, uploads and document workflows | Reconcile Firebase and cache bindings | Planned | Partial D1 isolation capability: `18a4f7a` |
| `corioders/impact-new-agenda` | `impact-new-agenda.cfworkers/apps/web` | — | Payload artifact invariant | Migration pending | `de6f202` (`7cf9b0d`) |
| `corioders/showteam-eu` | `showteam.cfworkers/apps/web` | Payload, D1/R2 migrations, fixtures, tests and reminder Worker | Payload artifact invariant | Migration pending | `de6f202` (`5359531`) |
| `corioders/corioders-tickets` | `corioders-tickets.cfworkers/apps/web` | Active dashboard implementation | Payload artifact invariant | Migration pending | `de6f202` (`23627b9`) |
| `corioders/handbook` | `handbook.cloudflare/apps/web` | Nextra and Pagefind | Replace Next on Pages with OpenNext | Planned | — |
| `corioders/ui` | `ui.cloudflare/apps/web` | shadcn registry generator | Replace Next on Pages and staged-only CI check | Planned | — |
| `poland2-0/poland20` | `poland20.cloudflare/apps/web` | Lingui routing and Drive CMS | Replace Next on Pages and staged-only CI check | Planned | — |

## Migration rule

For every template or `cstd-*` change, update this table first, then make and
verify one migration per listed consumer. Shared-library changes go upstream
first and are brought into each consumer through its subtree.

`cstd-next` config source is `next.config.ts`; TypeScript emits
`next.config.js`. Consumers must import:

```ts
import { nextConfig } from "cstd-next/config/next.config.js";
```

Consumer application scripts must run `cstd-next-clean-images` as `prebuild`,
keep `build` cacheable, and transform its standalone output with the cacheable
`build:worker` task instead of invoking `next build` again. Turbo hashes source
and declared environment values; applications with build-time CMS or other
external reads must set `CSTD_EXTERNAL_BUILD_INPUTS_HASH` to a digest of the exact external
snapshot. Restore that snapshot together with the cache so a hit reproduces the
same build inputs. Development assets remain intact while stale production assets
and obsolete descriptor output are removed before each build. `LocalStaticImage`
and `RemoteStaticImage` are Server Components; interactive consumers receive
them through `children`/slot composition so client-side navigation carries the
final `<picture>` in the existing RSC payload without a metadata fetch.
Keep `apps/web/public/.assetsignore`: Wrangler uses it to exclude development
image namespaces from production static-asset uploads without deleting files
needed by a concurrently running `next dev` process.

Register build-time external data in `external-build-inputs.json`:

```json
{
  "version": 1,
  "dependencies": [
    {
      "name": "public-cms",
      "command": ["node", "script/snapshot-public-cms.js"]
    }
  ]
}
```

The resolver runs every deploy before Turborepo checks its cache. Each provider
inherits the build environment and writes its complete, immutable point-in-time
snapshot below `CSTD_BUILD_INPUT_DIRECTORY`; it must not print secrets. The
resolver atomically installs those files under `.cstd/build-inputs/<name>`, hashes
their names and bytes, and exports the aggregate `CSTD_EXTERNAL_BUILD_INPUTS_HASH`. Build
code must read that snapshot instead of querying mutable upstream state again.
Providers run concurrently. Projects with pure builds or fully server-side CMS
reads omit the registry and retain the constant empty-input fingerprint.

After a dependency/runtime change, require green CI for each exact pushed consumer
HEAD. Run focused local checks only when needed for feedback or diagnosis, directly
on Windows WSL rather than duplicating the complete CI gate.

## Migration acceptance checklist

- Record the starting template revision and every capability that must survive.
- Preserve or improve existing unit, browser and integration tests before changing infrastructure.
- Inventory environment variables, Worker bindings, cron triggers and additional Workers.
- Port D1 migrations and fixtures; verify them against a freshly reset local database.
- Confirm CI runs the required Biome, typecheck, Vitest, browser, Next and OpenNext checks.
- Update the row to `Migrated` with the applied template commit only after all checks pass.
