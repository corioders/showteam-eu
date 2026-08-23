# Template consumers

This is the source of truth for repositories that must receive template and
shared-subtree migrations. Add a project when it is created from this template;
remove it only after archival.

`init_project.sh` deletes this file from the generated project and prints the
exact reminder to add that project to this source registry.

| Repository | App directory | Preserve | Migration blocker | Status | Template revision |
| --- | --- | --- | --- | --- | --- |
| `corioders/corioders.com` | `corioders.cfworkers/apps/web` | Lingui routing and typed env | Reconcile application bindings | Planned | — |
| `corioders/impact-speaker-tracker` | `impact.cfworkers/apps/web` | Firebase, Drive CMS, uploads and document workflows | Reconcile Firebase and cache bindings | Planned | — |
| `corioders/showteam-eu` | repository root | Payload, D1/R2 migrations, fixtures, tests and reminder Worker | Introduce `cstd-*` without regressing Payload's webpack build | Planned | — |
| `corioders/handbook` | `handbook.cloudflare/apps/web` | Nextra and Pagefind | Replace Next on Pages with OpenNext | Planned | — |
| `corioders/ui` | `ui.cloudflare/apps/web` | shadcn registry generator | Replace Next on Pages and staged-only CI check | Planned | — |
| `poland2-0/poland20` | `poland20.cloudflare/apps/web` | Lingui routing and Drive CMS | Replace Next on Pages and staged-only CI check | Planned | — |

## Migration rule

For every template or `cstd-*` change, update this table first, then make and
verify one migration per listed consumer. Shared-library changes go upstream
first and are brought into each consumer through its subtree.

`cstd-next` config source is `next.config.mts`; TypeScript emits
`next.config.mjs`. Consumers must import:

```ts
import { nextConfig } from "cstd-next/config/next.config.mjs";
```

After a dependency/runtime change, run `pnpm install --frozen-lockfile`,
`pnpm build`, `pnpm check`, and `pnpm --filter web exec opennextjs-cloudflare build`
in every consumer.

## Migration acceptance checklist

- Record the starting template revision and every capability that must survive.
- Preserve or improve existing unit, browser and integration tests before changing infrastructure.
- Inventory environment variables, Worker bindings, cron triggers and additional Workers.
- Port D1 migrations and fixtures; verify them against a freshly reset local database.
- Run full Biome, typecheck, Vitest, Chromium, WebKit, Next build and OpenNext build.
- Update the row to `Migrated` with the applied template commit only after all checks pass.
