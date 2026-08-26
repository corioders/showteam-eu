# TODO

Agents read this file before starting work and keep its statuses current.
One line per task; delete a line when it is done and committed.
- [ ] Remove OpenTofu; provision Cloudflare D1/R2 in bootstrap and migrate existing consumers.
- [ ] Merge initialization and bootstrap into one `bootstrap_project.sh <project-name>` command that discovers unambiguous settings and prompts otherwise.
