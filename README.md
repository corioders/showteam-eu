# cstd Next.js template

Corioders house template: Next.js on Cloudflare Workers via OpenNext, in a turborepo
driven by pnpm, biome and lefthook, with `cstd-ts` / `cstd-next` vendored as git subtrees.

## Layout

```
.github/workflows/     reusable validation + pull-request and deploy entrypoints
.vscode/               editor settings (biome as formatter)
lefthook.yml           pre-commit biome check
bootstrap_project.sh   one-shot project/repository/Cloudflare bootstrap
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

On macOS, authenticate `gh` and store an account-owned Cloudflare token with only
`Account API Tokens Write` in Keychain. The complete fresh-project bootstrap is:

```bash
git clone --depth 1 --origin template git@github.com:corioders/cstd-nextjs-template.git myproject
cd myproject
./bootstrap_project.sh
```

The script proposes the clone directory name as the project name and asks for confirmation;
an explicit name can still be passed as `./bootstrap_project.sh myproject`. It registers
the renamed `cstd-ts` and `cstd-next` directories as pullable git subtrees, discovers the GitHub owner, Cloudflare account and
workers.dev subdomain (prompting when a value is missing or ambiguous), creates the private GitHub repository, least-privilege
Cloudflare setup and deploy tokens, isolated production/preview D1 and R2 resources,
and GitHub environments/secrets/variables, then writes the D1 IDs into Wrangler,
commits and pushes the initialized project. On resumed runs it rotates generated
project tokens; only the account-owned bootstrap token remains in Keychain.
Existing durable resources are reused by name and never deleted. GitHub production reviewers remain manual
when the private-repository plan does not expose deployment protection rules.
The new repository starts with one root initialization commit followed by one
registration commit for each pullable `cstd` subtree; template history is not retained.

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
| `pnpm test:unit` | run Vitest |
| `pnpm test:e2e` | run Playwright against Chromium and WebKit |
| `pnpm --dir apps/web preview` | build for Workers and serve locally through workerd |
| `pnpm --dir apps/web deploy` | build and deploy production |
| `pnpm --dir apps/web logs` | tail production Worker logs |

## Deployment

Pull requests run full validation. Every push must pass Biome, typecheck, build,
Vitest and Playwright on Chromium/WebKit before deployment starts. Pushing to
`deploy` publishes production; any other branch uploads
an isolated preview version and refreshes a shared preview Worker whose logs you can
tail with `pnpm --dir <project>.cfworkers/apps/web logs:preview`. The preview URLs are
printed in the workflow summary. See the header of `.github/workflows/deploy.yml` for
the tokens, environments and variables it needs.

## Working on cstd-ts / cstd-next

They are git subtrees, so they are ordinary tracked files — edit them in place and commit
normally. To move changes between this repository and the upstream libraries:

```bash
# pull upstream changes in
git subtree pull --prefix <project>.cfworkers/packages/corioders-lib/cstd-ts \
  git@github.com:corioders/cstd-ts.git main --squash

# push local changes back upstream
git subtree push --prefix <project>.cfworkers/packages/corioders-lib/cstd-ts \
  git@github.com:corioders/cstd-ts.git main
```

Same for `cstd-next` with `git@github.com:corioders/cstd-next.git`.

<!-- BEGIN:template-env-docs -->

## Shared template environment

`template.cfworkers/apps/web/.env` stays ignored. After changing its shared values, run `./encrypt_template_env.sh` and commit only `.env.age`. New project bootstrap asks for the passphrase and restores the local `.env` without overwriting an existing one.

<!-- END:template-env-docs -->

## Not included on purpose

Add these per project; each has a reference implementation in another repository.

| need | copy from |
| --- | --- |
| i18n (lingui, `[lang]` routing, negotiator middleware) | `corioders.com` |
| Payload CMS on D1 + R2 storage, migrations | `showteam-eu` |
| Google Drive/Docs/Sheets as CMS | `poland20`, `impact-speaker-tracker` |
| Firebase auth on Workers | `impact-speaker-tracker` |
| UI sections and components | Search the purchased `@shadcnblocks` registry first; run `pnpm dlx shadcn@latest search @shadcnblocks -q "<need>"` from `apps/web` |
