#!/usr/bin/env bash
set -uo pipefail

if [[ ${1:-} != template ]]; then
	exec git pull "$@"
fi

pull_output=$(git -c merge.directoryRenames=true pull --no-rebase --autostash "$@" 2>&1)
pull_status=$?
if (( pull_status == 0 )); then
	printf '%s\n' "$pull_output"
	exit 0
fi

unmerged_paths=$(git diff --name-only --diff-filter=U)
if [[ -z "$unmerged_paths" ]]; then
	printf '%s\n' "$pull_output" >&2
	exit "$pull_status"
fi

while IFS= read -r unmerged_path; do
	case "$unmerged_path" in
		AGENTS.md | bootstrap_project.sh | encrypt_template_env.sh | template.cfworkers/CONSUMERS.md | template.cfworkers/apps/web/.env.age)
			git rm --quiet --force -- "$unmerged_path"
			;;
		*)
			printf '%s\n' "$pull_output" >&2
			echo "Template pull needs manual resolution: $unmerged_path" >&2
			exit "$pull_status"
			;;
	esac
done <<<"$unmerged_paths"

GIT_EDITOR=true git merge --continue
