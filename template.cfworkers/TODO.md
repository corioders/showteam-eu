# TODO

Agents read this file before starting work and keep its statuses current.
One line per task; delete a line when it is done and committed.

- [in progress] Centralize cstd env definitions, replace preview flags with APP_ENV, push cstd/template changes, and migrate template consumers.
- [in progress] Persist Next.js and Playwright browser caches in validation workflows and migrate consumers.
- [in progress] Reduce `apps/web/src/app` to a polished representative starter page and remove demo fixtures.
- [in progress] Remove Nuqs from the template until a project explicitly needs it.
- [in progress] Bake Playwright system dependencies into the Windows WSL self-hosted runner image and remove per-run installation.
