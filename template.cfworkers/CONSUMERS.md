# Template consumers

This is the source of truth for repositories that must receive template and
shared-subtree migrations. Add a project when it is created from this template;
remove it only after archival.

`rename-project.sh` deletes this file from the generated project and prints the
exact reminder to add that project to this source registry.

| Repository | App directory | Known state |
| --- | --- | --- |
| `corioders/corioders.com` | `corioders.cfworkers/apps/web` | Uses `cstd-next/config/next.config.js`; requires the `.mjs` migration. |
| `corioders/impact-speaker-tracker` | `impact.cfworkers/apps/web` | Uses `cstd-next/config/next.config.js`; requires the `.mjs` migration. |

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
