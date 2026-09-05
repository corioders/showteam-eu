<!-- BEGIN:template-maintainer-agent-rules -->

# Local bootstrap credentials

- The Cloudflare account-owned bootstrap token with only `Account API Tokens Write` is stored in macOS Keychain under service `corioders.cloudflare.bootstrap` and account `corioders`.
- Retrieve it with `security find-generic-password -a corioders -s corioders.cloudflare.bootstrap -w` only into a process-local variable. Never print, log, copy into a repository, or pass it on a command line that may be recorded.

# Template migrations

- After changing the template, migrate every repository listed in `template.cfworkers/CONSUMERS.md` that consumes the affected files or subtrees.
- Consumers created by `bootstrap_project.sh` retain template ancestry. Update them with their checked-in `./pull_template.sh template main`; before running it, ensure the clone is not shallow and that remote `template` points to `corioders/cstd-nextjs-template`. If the template change has not reached `main`, pass its explicit source branch instead. Resolve only genuine project customizations; do not manually copy template files. Use a manual migration only for legacy consumers with no template merge base.
- Treat CI for the exact pushed consumer HEAD as the migration acceptance gate. If the baseline was green, the migrated HEAD must remain green. If the baseline was already failing, accept the migration when it introduces no new failure; preserve the existing failure as separate project work. Do not duplicate CI with a mandatory disposable-clone validation. If a local check is needed for fast feedback or failure diagnosis, run the smallest relevant check directly on Windows WSL over SSH; never run resource-intensive migration suites on this Mac.
- Keep CI jobs behind `.github/workflows/schedule-runner.yml` and its dynamic `runner-label` output. Never target `win24-wsl` or a concrete worker label directly; bypassing the scheduler can strand jobs when a host sleeps or a relay token cannot see a repository.
- When a migration changes `cstd-ts` or `cstd-next`, commit and push the matching subtree to its canonical cstd repository before pulling it into consumers.
- Treat `shadcn:add` as the complete compatibility gate. Exit 0 proceeds directly to customization without inspecting normalization or running `shadcn:patch`. Only an unknown/stale failure enters learning; inspect its complete compatibility-only patch, add or update the required block-specific Playwright test, exercise every interactive state against the configured Shadcn base, and reject browser console/page errors. `shadcn:patch` must pass the production build and that exact fresh test before it can push canonical `cstd-next`. Never hand-write a partial codemod.
- For an explicitly named `@shadcnblocks/<name>`, use the project's direct `pnpm shadcn:add` fast path. Keep all UI skills available, but do not load design or performance guidance merely to install and wire an exact block; use it when the request includes original design, restyling, performance work, or non-trivial React architecture.

<!-- END:template-maintainer-agent-rules -->

# Delivery

- After creating any commit, immediately push the current branch to `origin`.
- After pushing, monitor the resulting CI run and fix it until it is green. Do not declare committed work complete while local `HEAD` is absent from `origin` or its CI is pending, canceled, or failing.
