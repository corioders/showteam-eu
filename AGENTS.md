<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project workflow

- Read `TODO.md` before starting work, keep its statuses current, and use it to resume unfinished work after context loss.
- Keep commits small and focused: one working, reversible change per commit.
- After verifying each change, commit it with a descriptive message and push it to the remote repository so rollback stays simple.
- Do not combine unrelated features or fixes in one commit.

# Admin UX

- The people operating SHOWteam are non-technical. Primary admin workflows must use plain Polish, task-based screens, clear validation, large mobile controls, and actionable error messages.
- Never require operators to understand collections, slugs, APIs, database concepts, or Payload terminology for routine work.
- Keep the full Payload CMS available only as a secondary advanced route; quick actions and custom task screens are the primary interface.
