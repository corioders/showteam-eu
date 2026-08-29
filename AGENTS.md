<!-- BEGIN:template-maintainer-agent-rules -->

# Local bootstrap credentials

- The Cloudflare account-owned bootstrap token with only `Account API Tokens Write` is stored in macOS Keychain under service `corioders.cloudflare.bootstrap` and account `corioders`.
- Retrieve it with `security find-generic-password -a corioders -s corioders.cloudflare.bootstrap -w` only into a process-local variable. Never print, log, copy into a repository, or pass it on a command line that may be recorded.

# Template migrations

- After changing the template, migrate every repository listed in `template.cfworkers/CONSUMERS.md` that consumes the affected files or subtrees.
- Consumers created by `bootstrap_project.sh` retain template ancestry. Update them with their checked-in `./pull_template.sh template main`; before running it, ensure the clone is not shallow and that remote `template` points to `corioders/cstd-nextjs-template`. If the template change has not reached `main`, pass its explicit source branch instead. Resolve only genuine project customizations; do not manually copy template files. Use a manual migration only for legacy consumers with no template merge base.
- Validate migrations in a disposable clone directly on Windows WSL over SSH; do not run resource-intensive migration test suites on this Mac. CI may also run on `[self-hosted, win24-wsl]`, but it is not the fast-feedback substitute for the direct clone.
- When a migration changes `cstd-ts` or `cstd-next`, commit and push the matching subtree to its canonical cstd repository before pulling it into consumers.
- Treat `shadcn:add` as the complete compatibility gate. Exit 0 proceeds directly to customization without inspecting normalization or running `shadcn:learn`. Only an unknown/stale failure enters learning; inspect its complete compatibility-only patch, test it, and push canonical `cstd-next` before customization. Never hand-write a partial codemod.
- For an explicitly named `@shadcnblocks/<name>`, use the project's direct `pnpm shadcn:add` fast path. Keep all UI skills available, but do not load design or performance guidance merely to install and wire an exact block; use it when the request includes original design, restyling, performance work, or non-trivial React architecture.

<!-- END:template-maintainer-agent-rules -->

# Delivery

- After creating any commit, immediately push the current branch to `origin`.
- After pushing, monitor the resulting CI run and fix it until it is green. Do not declare committed work complete while local `HEAD` is absent from `origin` or its CI is pending, canceled, or failing.
