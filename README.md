# SHOWteam.eu

Polish SHOWteam website and editable Payload CMS, deployed as a Next.js application on Cloudflare Workers.

## Stack

- Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- Payload CMS with Cloudflare D1 and R2
- OpenNext for Cloudflare deployment
- Terraform/OpenTofu for durable Cloudflare resources
- Vitest unit tests and Playwright E2E tests

## Development

```sh
pnpm install
pnpm dev
```

CMS: `http://localhost:3000/a/admin`

## Validation

```sh
pnpm lint
pnpm test:unit
pnpm test:e2e
pnpm build
```

Run E2E against production:

```sh
PLAYWRIGHT_BASE_URL=https://showteam-eu.corioders.workers.dev pnpm test:e2e
```

## Deployment

```sh
pnpm deploy
```

Infrastructure ownership and import instructions are in [`infra/README.md`](infra/README.md).
