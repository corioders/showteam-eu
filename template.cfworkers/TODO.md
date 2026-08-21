# TODO

Agents read this file before starting work and keep its statuses current.
One line per task; delete a line when it is done and committed.

- [ ] Upgrade template to current Next.js/OpenNext and document template consumers plus migration procedure
- [ ] Provision Cloudflare cache R2/D1 with OpenTofu and paste the D1 output ids into `apps/web/wrangler.jsonc`
- [ ] Set the app title and metadata in `apps/web/src/app/layout.tsx`
