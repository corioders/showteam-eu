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

auto_resolve_agent_rules() {
	local temporary_directory base_file ours_file theirs_file result_file

	git cat-file -e ":1:AGENTS.md" 2>/dev/null || return 1
	git cat-file -e ":2:AGENTS.md" 2>/dev/null || return 1
	git cat-file -e ":3:AGENTS.md" 2>/dev/null || return 1

	temporary_directory=$(mktemp -d)
	base_file=$temporary_directory/base
	ours_file=$temporary_directory/ours
	theirs_file=$temporary_directory/theirs
	result_file=$temporary_directory/result
	git show ":1:AGENTS.md" >"$base_file"
	git show ":2:AGENTS.md" >"$ours_file"
	git show ":3:AGENTS.md" >"$theirs_file"

	for file in "$base_file" "$ours_file" "$theirs_file"; do
		sed -i.bak '/<!-- BEGIN:template-maintainer-agent-rules -->/,/<!-- END:template-maintainer-agent-rules -->/d' "$file"
		rm -- "$file.bak"
	done

	if git merge-file --quiet --stdout "$ours_file" "$base_file" "$theirs_file" >"$result_file"; then
		cp "$result_file" AGENTS.md
		git add -- AGENTS.md
		rm -r -- "$temporary_directory"
		return 0
	fi
	rm -r -- "$temporary_directory"
	return 1
}

continue_template_merge() {
	strip_template_maintainer_agent_rules || return
	GIT_EDITOR=true git merge --continue
}

consumer_directory=""
for candidate in ./*.cfworkers; do
	[[ -d $candidate && $candidate != ./template.cfworkers ]] || continue
	if [[ -n $consumer_directory ]]; then
		consumer_directory=""
		break
	fi
	consumer_directory=${candidate#./}
done

auto_resolve_bootstrap_replacements() {
	local unmerged_path=$1
	local temporary_directory base_file ours_file theirs_file result_file project_name

	[[ -n $consumer_directory ]] || return 1
	git cat-file -e ":1:$unmerged_path" 2>/dev/null || return 1
	git cat-file -e ":2:$unmerged_path" 2>/dev/null || return 1
	git cat-file -e ":3:$unmerged_path" 2>/dev/null || return 1

	project_name=${consumer_directory%.cfworkers}
	temporary_directory=$(mktemp -d)
	base_file=$temporary_directory/base
	ours_file=$temporary_directory/ours
	theirs_file=$temporary_directory/theirs
	result_file=$temporary_directory/result
	git show ":1:$unmerged_path" >"$base_file"
	git show ":2:$unmerged_path" >"$ours_file"
	git show ":3:$unmerged_path" >"$theirs_file"
	sed -i.bak \
		-e "s/template\\.cfworkers/$consumer_directory/g" \
		-e "s/template-cfworkers/$project_name-cfworkers/g" \
		"$base_file" "$theirs_file"
	rm -- "$base_file.bak" "$theirs_file.bak"

	if git merge-file --quiet --stdout "$ours_file" "$base_file" "$theirs_file" >"$result_file"; then
		cp "$result_file" "$unmerged_path"
		git add -- "$unmerged_path"
		rm -r -- "$temporary_directory"
		return 0
	fi
	rm -r -- "$temporary_directory"
	return 1
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

manual_paths=()
while IFS= read -r unmerged_path; do
	case "$unmerged_path" in
		AGENTS.md)
			auto_resolve_agent_rules || manual_paths+=("$unmerged_path")
			;;
		bootstrap_project.sh | encrypt_template_env.sh | template.*workers/CONSUMERS.md | template.*workers/apps/web/.env.age)
			git rm --quiet --force -- "$unmerged_path"
			;;
		*.cfworkers/.infisical.json)
			git checkout --ours -- "$unmerged_path"
			git add -- "$unmerged_path"
			;;
		*)
			auto_resolve_bootstrap_replacements "$unmerged_path" || manual_paths+=("$unmerged_path")
			;;
	esac
done <<<"$unmerged_paths"

if (( ${#manual_paths[@]} > 0 )); then
	printf '%s\n' "$pull_output" >&2
	printf 'Template pull needs manual resolution: %s\n' "${manual_paths[@]}" >&2
	exit "$pull_status"
fi

continue_template_merge
