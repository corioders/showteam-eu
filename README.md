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

CMS: `http://localhost:3000/admin`

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

## Google Calendar

Create a Google OAuth web client with Calendar API enabled and this redirect URI:

```text
https://showteam-eu.corioders.workers.dev/api/admin/google-calendar/callback
```

Store the credentials only as Worker secrets:

```sh
pnpm wrangler secret put GOOGLE_CALENDAR_CLIENT_ID
pnpm wrangler secret put GOOGLE_CALENDAR_CLIENT_SECRET
```

`GOOGLE_CALENDAR_TOKEN_KEY` is already generated in production. After setting the OAuth credentials, open `Panel → Kalendarz bazy → Synchronizacja` and connect the shared SHOWteam Google account once.

Infrastructure ownership and import instructions are in [`infra/README.md`](infra/README.md).
