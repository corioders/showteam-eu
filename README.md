# cstd Next.js template

Corioders house template: Next.js on Cloudflare Workers via OpenNext, in a turborepo
driven by pnpm, biome and lefthook, with `cstd-ts` / `cstd-next` vendored as git subtrees.

## Layout

```
.github/workflows/     reusable validation + pull-request and deploy entrypoints
.vscode/               editor settings (biome as formatter)
AGENTS.md               repository delivery rules; template-only rules are removed by bootstrap
lefthook.yml           pre-commit invariant and biome checks
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

<!-- BEGIN:template-bootstrap-docs -->

## First run

On macOS, authenticate `gh` and `infisical`, and store an account-owned Cloudflare token with only
`Account API Tokens Write` in Keychain. The complete fresh-project bootstrap is:

```bash
git clone --origin template git@github.com:corioders/cstd-nextjs-template.git myproject
cd myproject
./bootstrap_project.sh
```

The script proposes the clone directory name as the project name and asks for confirmation;
an explicit name can still be passed as `./bootstrap_project.sh myproject`. It registers
the renamed `cstd-ts` and `cstd-next` directories as pullable git subtrees, creates or resumes a delete-protected Infisical project
with the same name, copies the template's `dev` secrets, and configures a read-only GitHub Actions identity using OIDC. It discovers
the GitHub owner, Cloudflare account and workers.dev subdomain (prompting when a value is missing or ambiguous), creates the private
GitHub repository, least-privilege Cloudflare setup and deploy tokens, isolated production/preview D1 and R2 resources, stores the
deploy token in Infisical `staging`/`prod`, and creates GitHub environments/variables, then writes the D1 IDs into Wrangler,
removes the one-shot bootstrap script, and commits and pushes the initialized project. On resumed runs it rotates generated
project tokens; only the account-owned bootstrap token remains in Keychain.
Existing durable resources are reused by name and never deleted. GitHub production reviewers remain manual
when the private-repository plan does not expose deployment protection rules.
The new repository adds one initialization commit followed by one registration
commit for each pullable `cstd` subtree. Template ancestry is retained so later
updates work through `git pull template main`.

<!-- END:template-bootstrap-docs -->

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
| `pnpm check` | template invariants + biome + tsc across the workspace |
| `pnpm lint:fix` | apply Biome's safe fixes |
| `pnpm test:unit` | run Vitest |
| `pnpm test:e2e` | run Playwright against Chromium and WebKit |
| `pnpm preview` | inject `staging` secrets, build for Workers and serve locally through workerd |
| `pnpm deploy` | inject `prod` secrets, build and deploy production |
| `pnpm logs` | inject `prod` secrets and tail production Worker logs |
| `pnpm logs:preview` | inject `staging` secrets and tail preview Worker logs |

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

## Project secrets

The committed `template.cfworkers/.infisical.json` links this repository to its Infisical EU project. `pnpm dev` injects the same
`staging` secrets used by preview, then applies optional `apps/web/.env` and `apps/web/.env.local` overrides in that order without
writing vault values to disk. Other secret-dependent local commands use the Infisical `dev` environment. Bootstrap commits a
project-specific `.infisical.json`. Developers authenticate with their own Infisical accounts; CI uses short-lived GitHub OIDC
credentials and loads deployment secrets directly from Infisical.

<!-- END:template-env-docs -->

<!-- BEGIN:template-not-included-docs -->

## Not included on purpose

Add these per project; each has a reference implementation in another repository.

| need | copy from |
| --- | --- |
| i18n (lingui, `[lang]` routing, negotiator middleware) | `corioders.com` |
| Payload CMS on D1 + R2 storage, migrations | `showteam-eu` |
| Google Drive/Docs/Sheets as CMS | `poland20`, `impact-speaker-tracker` |
| Firebase auth on Workers | `impact-speaker-tracker` |
| UI sections and components | From the cfworkers root, search with `pnpm shadcn:search -- -q "<need>"`, then run `pnpm shadcn:add @shadcnblocks/<name>`; exit 0 means customize immediately without `shadcn:patch` |

<!-- END:template-not-included-docs -->
