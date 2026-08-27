# Local bootstrap credentials

- The Cloudflare account-owned bootstrap token with only `Account API Tokens Write` is stored in macOS Keychain under service `corioders.cloudflare.bootstrap` and account `corioders`.
- Retrieve it with `security find-generic-password -a corioders -s corioders.cloudflare.bootstrap -w` only into a process-local variable. Never print, log, copy into a repository, or pass it on a command line that may be recorded.

# Template migrations

- After changing the template, migrate every repository listed in `template.cfworkers/CONSUMERS.md` that consumes the affected files or subtrees.
- Validate migrations in a disposable clone directly on Windows WSL over SSH; do not run resource-intensive migration test suites on this Mac. CI may also run on `[self-hosted, win24-wsl]`, but it is not the fast-feedback substitute for the direct clone.
- When a migration changes `cstd-ts` or `cstd-next`, commit and push the matching subtree to its canonical cstd repository before pulling it into consumers.
- Run Shadcnblocks compatibility learning only when `shadcn:add` reports an unknown or stale incompatibility. Learning writes a complete self-verified per-block patch into vendored `cstd-next`; inspect it for compatibility-only changes, test it, and push canonical `cstd-next` before project customization. A successful `shadcn:add` proceeds directly to customization. Do not replace learned patches with hand-written partial codemod rules.
