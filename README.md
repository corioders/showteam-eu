# cstd Next.js template

Corioders house template: Next.js on Cloudflare Workers via OpenNext, in a turborepo
driven by pnpm, biome and lefthook, with `cstd-ts` / `cstd-next` vendored as git subtrees.

## Layout

```
.github/workflows/     code-style + deploy (sparse-checkouts the app directory)
.vscode/               editor settings (biome as formatter)
lefthook.yml           pre-commit biome check
rename-project.sh      one-shot rename of the template, deletes itself
template.cfworkers/    the monorepo
├── apps/web/          Next.js app, deployed as a Cloudflare Worker
├── packages/
│   └── corioders-lib/ cstd-ts, cstd-next — git subtrees
├── .agents/skills/    agent skills, symlinked as .claude/skills
├── AGENTS.md          house rules for agents (CLAUDE.md points at it)
├── biome.jsonc        extends cstd-ts/config/biome.jsonc
└── turbo.json
```

The wrapper directory (`<project>.cfworkers/`) is deliberate: workflows and hooks live at
the repository root, the deployable monorepo lives one level down, and CI sparse-checkouts
only that subdirectory.

## First run

```bash
./rename-project.sh myproject
```

Then create the Cloudflare resources the app expects and paste the D1 ids into
`myproject.cfworkers/apps/web/wrangler.jsonc`:

```bash
pnpm dlx wrangler r2 bucket create myproject-cfworkers-next-inc-cache-r2-bucket
pnpm dlx wrangler r2 bucket create myproject-cfworkers-preview-next-inc-cache-r2-bucket
pnpm dlx wrangler d1 create myproject-cfworkers-next-tag-cache-d1
pnpm dlx wrangler d1 create myproject-cfworkers-preview-next-tag-cache-d1
```

Install and start:

```bash
cd myproject.cfworkers && pnpm install && pnpm dev
```

## Commands

Run from the `<project>.cfworkers/` directory.

| command | what it does |
| --- | --- |
| `pnpm dev` | `next dev` plus a watch build of the cstd libraries |
| `pnpm build` | production Next.js build |
| `pnpm check` | biome + tsc across the workspace |
| `pnpm check-biome-fix` | apply biome's safe fixes |
| `pnpm --dir apps/web preview` | build for Workers and serve locally through workerd |
| `pnpm --dir apps/web deploy` | build and deploy production |
| `pnpm --dir apps/web logs` | tail production Worker logs |

## Deployment

CI deploys on every push. Pushing to `deploy` publishes production; any other branch
uploads an isolated preview version and refreshes a shared preview Worker whose logs you
can tail with `pnpm --dir <project>.cfworkers/apps/web logs:preview`. The preview URLs are
printed in the workflow summary. See the header of `.github/workflows/deploy.yml` for the
tokens, environments and variables it needs.

## Working on cstd-ts / cstd-next

They are git subtrees, so they are ordinary tracked files — edit them in place and commit
normally. To move changes between this repository and the upstream libraries:

```bash
# pull upstream changes in
git subtree pull --prefix <project>.cfworkers/packages/corioders-lib/cstd-ts \
  git@github.com:corioders/cstd-ts.git master --squash

# push local changes back upstream
git subtree push --prefix <project>.cfworkers/packages/corioders-lib/cstd-ts \
  git@github.com:corioders/cstd-ts.git master
```

Same for `cstd-next` with `git@github.com:corioders/cstd-next.git`.

## Not included on purpose

Add these per project; each has a reference implementation in another repository.

| need | copy from |
| --- | --- |
| i18n (lingui, `[lang]` routing, negotiator middleware) | `corioders.com` |
| Payload CMS on D1 + R2 storage, migrations | `showteam-eu` |
| Google Drive/Docs/Sheets as CMS | `poland20`, `impact-speaker-tracker` |
| Firebase auth on Workers | `impact-speaker-tracker` |
| shadcn UI components | `pnpm dlx shadcn@latest add <component>` |
