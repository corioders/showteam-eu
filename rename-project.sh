#!/usr/bin/env bash
# Renames this template to a real project. Run once, from the repository root:
#   ./rename-project.sh myproject
# Renames template.cfworkers/ -> myproject.cfworkers/ and rewrites every reference
# (workflows, lefthook, package name, worker/bucket/database names), then deletes itself.
set -euo pipefail

NAME="${1:-}"
if [[ -z "$NAME" ]]; then
	echo "usage: $0 <project-name>   # lowercase, no dots, e.g. showteam" >&2
	exit 1
fi
if [[ ! "$NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
	echo "Project name must be lowercase alphanumeric with dashes." >&2
	exit 1
fi

cd "$(dirname "$0")"
if [[ ! -d template.cfworkers ]]; then
	echo "template.cfworkers/ not found — this script has already been run." >&2
	exit 1
fi

git mv template.cfworkers "$NAME.cfworkers" 2>/dev/null || mv template.cfworkers "$NAME.cfworkers"

# Rewrite references in tracked text files. Longest token first so the dashed
# form is not left behind by the dotted replacement.
grep -rlZ --binary-files=without-match -e 'template\.cfworkers' -e 'template-cfworkers' \
	--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.turbo \
	--exclude="$(basename "$0")" . |
	xargs -0 sed -i.bak -e "s/template\.cfworkers/$NAME.cfworkers/g" -e "s/template-cfworkers/$NAME-cfworkers/g"
find . -name '*.bak' -not -path './node_modules/*' -delete

echo "Renamed to $NAME.cfworkers."
echo "Still to do:"
echo "  - provision R2/D1 with OpenTofu in $NAME.cfworkers/infra, paste the D1 ids into $NAME.cfworkers/apps/web/wrangler.jsonc"
echo "  - set the app title in $NAME.cfworkers/apps/web/src/app/layout.tsx"
rm -- "$0"
