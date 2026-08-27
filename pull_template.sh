#!/usr/bin/env bash
set -uo pipefail

if [[ ${1:-} != template ]]; then
	exec git pull "$@"
fi

strip_template_maintainer_agent_rules() {
	local begin_marker='<!-- BEGIN:template-maintainer-agent-rules -->'
	local end_marker='<!-- END:template-maintainer-agent-rules -->'

	[[ -f AGENTS.md ]] || return 0
	grep -Fq "$begin_marker" AGENTS.md || return 0
	if ! grep -Fq "$end_marker" AGENTS.md; then
		echo "Template pull found an incomplete maintainer block in AGENTS.md." >&2
		return 1
	fi

	sed -i.bak "/$begin_marker/,/$end_marker/d" AGENTS.md
	rm -- AGENTS.md.bak
	git add -- AGENTS.md
}

continue_template_merge() {
	strip_template_maintainer_agent_rules || return
	GIT_EDITOR=true git merge --continue
}

pull_output=$(git -c merge.directoryRenames=true pull --no-rebase --no-commit --no-ff --autostash "$@" 2>&1)
pull_status=$?
if (( pull_status == 0 )); then
	printf '%s\n' "$pull_output"
	if git rev-parse --verify --quiet MERGE_HEAD >/dev/null; then
		continue_template_merge || exit $?
	fi
	exit 0
fi

unmerged_paths=$(git diff --name-only --diff-filter=U)
if [[ -z "$unmerged_paths" ]]; then
	printf '%s\n' "$pull_output" >&2
	exit "$pull_status"
fi

while IFS= read -r unmerged_path; do
	case "$unmerged_path" in
		AGENTS.md)
			if git cat-file -e ":2:$unmerged_path" 2>/dev/null; then
				printf '%s\n' "$pull_output" >&2
				echo "Template pull needs manual resolution: $unmerged_path" >&2
				exit "$pull_status"
			fi
			git checkout --theirs -- "$unmerged_path"
			git add -- "$unmerged_path"
			;;
		bootstrap_project.sh | encrypt_template_env.sh | showteam.cfworkers/CONSUMERS.md | showteam.cfworkers/apps/web/.env.age)
			git rm --quiet --force -- "$unmerged_path"
			;;
		*)
			printf '%s\n' "$pull_output" >&2
			echo "Template pull needs manual resolution: $unmerged_path" >&2
			exit "$pull_status"
			;;
	esac
done <<<"$unmerged_paths"

continue_template_merge
