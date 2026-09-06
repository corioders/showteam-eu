#!/usr/bin/env bash
set -uo pipefail

if [[ ${1:-} != template ]]; then
	exec git pull "$@"
fi

shift
if [[ $# -gt 1 ]]; then
	echo "usage: ./pull_template.sh template [branch]" >&2
	exit 1
fi
template_branch=${1:-}
if [[ -z $template_branch ]]; then
	if [[ ! -f .template-branch ]]; then
		echo "Missing .template-branch; pass main or payload once." >&2
		exit 1
	fi
	template_branch=$(tr -d '[:space:]' <.template-branch)
fi
if [[ $template_branch != main && $template_branch != payload ]]; then
	echo "Template branch must be 'main' or 'payload'." >&2
	exit 1
fi

if [[ -z ${CSTD_TEMPLATE_PULL_BOOTSTRAPPED:-} ]]; then
	git fetch --quiet template "$template_branch" || exit
	latest_script_hash=$(git show FETCH_HEAD:pull_template.sh | git hash-object --stdin) || exit
	current_script_hash=$(git hash-object "$0") || exit
	if [[ $latest_script_hash != "$current_script_hash" ]]; then
		git show FETCH_HEAD:pull_template.sh | CSTD_TEMPLATE_PULL_BOOTSTRAPPED=1 bash -s -- template "$template_branch"
		exit $?
	fi
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
	if [[ -n $consumer_directory ]] && git cat-file -e MERGE_HEAD:pull_template.sh 2>/dev/null; then
		git show MERGE_HEAD:pull_template.sh >pull_template.sh
		chmod +x pull_template.sh
		git add -- pull_template.sh
	fi
	printf '%s\n' "$template_branch" >.template-branch
	git add -- .template-branch
	if [[ -n $consumer_directory ]]; then
		local project_name staged_path template_path target_path
		project_name=${consumer_directory%.cfworkers}
		while IFS= read -r -d '' template_path; do
			target_path=$consumer_directory/${template_path#template.cfworkers/}
			mkdir -p -- "$(dirname "$target_path")"
			git mv -- "$template_path" "$target_path"
		done < <(git diff --cached --name-only --diff-filter=A -z -- template.cfworkers)
		while IFS= read -r -d '' staged_path; do
			[[ -f $staged_path ]] || continue
			[[ $staged_path == "$consumer_directory/script/pull-template.test.js" ]] && continue
			grep -Iq . "$staged_path" || continue
			sed -i.bak \
				-e "s/template\\.cfworkers/$consumer_directory/g" \
				-e "s/template-cfworkers/$project_name-cfworkers/g" \
				"$staged_path"
			rm -- "$staged_path.bak"
			git add -- "$staged_path"
		done < <(git diff --cached --name-only --diff-filter=ACMR -z -- "$consumer_directory")
	fi
	if ! git cat-file -e HEAD:TODO.md 2>/dev/null && [[ -f TODO.md ]]; then
		git rm --quiet --force -- TODO.md
	fi
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

normalize_deploy_invariant_transition() {
	local base_file=$1 ours_file=$2 theirs_file=$3
	node - "$base_file" "$ours_file" "$theirs_file" <<'NODE'
import fs from "node:fs";

const [basePath, oursPath, theirsPath] = process.argv.slice(2);
let base = fs.readFileSync(basePath, "utf8");
let ours = fs.readFileSync(oursPath, "utf8");
const theirs = fs.readFileSync(theirsPath, "utf8");
const sharedInvariant = /shared scheduler and deploy workflow/;
if (sharedInvariant.test(base) || sharedInvariant.test(ours) || !sharedInvariant.test(theirs)) {
	process.exit(0);
}
const sectionPattern = /const deployWorkflow = read\("\.\.\/\.github\/workflows\/deploy\.yml"\);[\s\S]*?(?=const packageJson =)/;
const sharedSection = theirs.match(sectionPattern)?.[0];
if (!sharedSection || !sectionPattern.test(base) || !sectionPattern.test(ours)) {
	process.exit(1);
}
base = base.replace(sectionPattern, sharedSection);
ours = ours.replace(sectionPattern, sharedSection);
fs.writeFileSync(basePath, base);
fs.writeFileSync(oursPath, ours);
NODE
}

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

	if [[ $unmerged_path == *.cfworkers/script/check-template-invariants.js ]]; then
		normalize_deploy_invariant_transition "$base_file" "$ours_file" "$theirs_file" || {
			rm -r -- "$temporary_directory"
			return 1
		}
	fi
	sed -i.bak \
		-e "s/template\\.cfworkers/$consumer_directory/g" \
		-e "s/template-cfworkers/$project_name-cfworkers/g" \
		"$base_file" "$theirs_file"
	rm -- "$base_file.bak" "$theirs_file.bak"

	if [[ $unmerged_path == .github/workflows/deploy.yml ]] && node - "$base_file" "$ours_file" "$theirs_file" "$consumer_directory" <<'NODE'
import fs from "node:fs";
import path from "node:path";

const [basePath, oursPath, theirsPath, consumerDirectory] = process.argv.slice(2);
const base = fs.readFileSync(basePath, "utf8");
const ours = fs.readFileSync(oursPath, "utf8");
let result = fs.readFileSync(theirsPath, "utf8");
const sharedWorkflowPattern = /uses:\s*(?:corioders\/cstd-next\/\.github\/workflows\/deploy\.yml@[0-9a-f]{40}|\.\/\.github\/workflows\/_deploy\.yml)/;
const webDirectory = path.join(consumerDirectory, "apps", "web");
const packageJson = JSON.parse(fs.readFileSync(path.join(webDirectory, "package.json"), "utf8"));
const wrangler = fs.readFileSync(path.join(webDirectory, "wrangler.jsonc"), "utf8");
const scripts = packageJson.scripts ?? {};
const workerNames = [...wrangler.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
const configuredWorkerName = workerNames[0];
const normalizedWorkerName = configuredWorkerName?.replace(/-web$/, "");
const productionWorkerName = normalizedWorkerName ? (normalizedWorkerName.endsWith("-cfworkers") ? normalizedWorkerName : `${normalizedWorkerName}-cfworkers`) : null;
const previewWorkerName = productionWorkerName ? `${productionWorkerName}-preview` : null;
if (!(productionWorkerName && previewWorkerName)) {
	process.exit(1);
}

if (sharedWorkflowPattern.test(base) && sharedWorkflowPattern.test(ours) && sharedWorkflowPattern.test(result)) {
	const normalizeWorkerInputs = (source) => source.replace(/^(\s+(?:worker-name|preview-worker-name):)\s*.+$/gm, "$1 __WORKER__");
	if (normalizeWorkerInputs(base) !== normalizeWorkerInputs(result)) {
		process.exit(1);
	}
	result = ours;
} else if (sharedWorkflowPattern.test(base) || sharedWorkflowPattern.test(ours) || !sharedWorkflowPattern.test(result)) {
	process.exit(1);
}

const cacheBuckets = [...wrangler.matchAll(/"binding"\s*:\s*"NEXT_INC_CACHE_R2_BUCKET"[\s\S]*?"bucket_name"\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
if (cacheBuckets.length < 2) {
	process.exit(1);
}

function setInput(name, value) {
	const pattern = new RegExp(`^(\\s+${name}:)\\s*.+$`, "m");
	if (!pattern.test(result)) {
		process.exit(1);
	}
	result = result.replace(pattern, `$1 ${value}`);
}

setInput("app-directory", consumerDirectory);
setInput("worker-name", productionWorkerName);
setInput("preview-worker-name", previewWorkerName);
setInput("production-cache-bucket", cacheBuckets[0]);
setInput("preview-cache-bucket", cacheBuckets[1]);

const extraInputs = [];
const payload = fs.existsSync(path.join(webDirectory, "payload.config.ts"));
setInput("payload", String(payload));
if (payload) {
	const payloadBinding = /"binding"\s*:\s*"PAYLOAD_DB"/.test(wrangler) ? "PAYLOAD_DB" : /"binding"\s*:\s*"D1"/.test(wrangler) ? "D1" : null;
	if (!payloadBinding) {
		process.exit(1);
	}
	if (payloadBinding !== "PAYLOAD_DB") {
		extraInputs.push(`      payload-d1-binding: ${payloadBinding}`);
	}
	const commands = [
		["payload-local-migrate-command", "payload:migrate:local", "migrate:local"],
		["payload-local-seed-command", "payload:seed:local", "seed:local"],
		["payload-preview-migrate-command", "payload:migrate:preview", "deploy:database:preview"],
		["payload-preview-seed-command", "payload:seed:preview", "seed:preview"],
		["payload-production-migrate-command", "payload:migrate:production", "deploy:database"],
	];
	for (const [inputName, standardScript, fallbackScript] of commands) {
		const selectedScript = scripts[standardScript] ? standardScript : scripts[fallbackScript] ? fallbackScript : null;
		if (!selectedScript) {
			process.exit(1);
		}
		if (selectedScript !== standardScript) {
			extraInputs.push(`      ${inputName}: pnpm ${selectedScript}`);
		}
	}
	if (!scripts["payload:seed:production"]) {
		extraInputs.push("      payload-seed-production: false");
	}
}
if (/"binding"\s*:\s*"CORIODERS_TELEMETRY_DB"/.test(wrangler)) {
	extraInputs.push("      telemetry-d1-binding: CORIODERS_TELEMETRY_DB");
}
if (/name:\s*Install Playwright browsers/.test(ours)) {
	extraInputs.push("      install-playwright: true");
}
const adminEmail = ours.match(/E2E_ADMIN_EMAIL:\s*([^\s]+)/)?.[1];
const adminPassword = ours.match(/E2E_ADMIN_PASSWORD:\s*([^\s]+)/)?.[1];
if (adminEmail) {
	extraInputs.push(`      e2e-admin-email: ${adminEmail}`);
}
if (adminPassword) {
	extraInputs.push(`      e2e-admin-password: ${adminPassword}`);
}
const productionHealthUrl = ours.match(/name:\s*Check deployed production[\s\S]*?(https:\/\/[^"'\s\\]+)/)?.[1];
if (productionHealthUrl) {
	extraInputs.push(`      production-health-url: ${productionHealthUrl}`);
}
if (extraInputs.length > 0) {
	result = result.replace(/^(\s+payload:\s*(?:true|false))$/m, `$1\n${extraInputs.join("\n")}`);
}
fs.writeFileSync(oursPath, result);
NODE
	then
		cp "$ours_file" "$unmerged_path"
		git add -- "$unmerged_path"
		rm -r -- "$temporary_directory"
		return 0
	fi

	if [[ $unmerged_path == .github/workflows/deploy.yml ]] && node - "$base_file" "$ours_file" "$theirs_file" <<'NODE'
import fs from "node:fs";

const [basePath, oursPath, theirsPath] = process.argv.slice(2);
const oldValidation = '      - name: Validate, build, and run browser tests\n        env:\n          CSTD_D1_PERSIST_PATH: ${{ runner.temp }}/cstd-d1-${{ github.run_id }}-${{ github.run_attempt }}\n        run: pnpm validate:ci';
const inlineValidation = '      - name: Validate, build, and run browser tests\n        run: CSTD_D1_PERSIST_PATH="${{ runner.temp }}/cstd-d1-${{ github.run_id }}-${{ github.run_attempt }}" pnpm validate:ci';
const localValidation = '      - name: Validate, build, and run browser tests\n        run: CSTD_D1_PERSIST_PATH=".wrangler/state" pnpm validate:ci';
const versionedLocalValidation = '      - name: Validate, build, and run browser tests\n        run: CSTD_D1_PERSIST_PATH=".wrangler/state/v3" pnpm validate:ci';
const base = fs.readFileSync(basePath, "utf8");
let ours = fs.readFileSync(oursPath, "utf8");
const theirs = fs.readFileSync(theirsPath, "utf8");

const migration = [
	[oldValidation, inlineValidation],
	[inlineValidation, localValidation],
	[localValidation, versionedLocalValidation],
].find(([from, to]) => base.includes(from) && ours.includes(from) && theirs.includes(to));
if (!migration) {
	process.exit(1);
}

fs.writeFileSync(basePath, base.replace(migration[0], migration[1]));
ours = ours.replace(migration[0], migration[1]);
fs.writeFileSync(oursPath, ours);
NODE
	then
		:
	fi

	if git merge-file --quiet --stdout "$ours_file" "$base_file" "$theirs_file" >"$result_file"; then
		cp "$result_file" "$unmerged_path"
		git add -- "$unmerged_path"
		rm -r -- "$temporary_directory"
		return 0
	fi
	if [[ $unmerged_path == .github/workflows/deploy.yml ]]; then
		git merge-file --diff3 --stdout "$ours_file" "$base_file" "$theirs_file" >"$result_file" || true
		if node - "$result_file" <<'NODE'
import fs from "node:fs";

const [resultPath] = process.argv.slice(2);
const source = fs.readFileSync(resultPath, "utf8");
const conflictPattern = /^<<<<<<<.*\n([\s\S]*?)^\|\|\|\|\|\|\|.*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>>.*$/gm;
let conflictCount = 0;
let valid = true;

function parseSteps(section, allowConsumerPrefix = false) {
	const firstStep = section.search(/^\s+- name: /m);
	if (firstStep < 0) {
		return allowConsumerPrefix ? { blocks: [], prefix: section, steps: new Map() } : null;
	}
	if (!allowConsumerPrefix && section.slice(0, firstStep).trim()) {
		return null;
	}
	const prefix = section.slice(0, firstStep);
	const blocks = section.slice(firstStep).split(/(?=^\s+- name: )/m);
	const steps = new Map();
	for (const block of blocks) {
		const name = block.match(/^\s+- name: (.+)$/m)?.[1];
		if (!name || steps.has(name)) {
			return null;
		}
		steps.set(name, block);
	}
	return { blocks, prefix, steps };
}

const resolved = source.replace(conflictPattern, (_match, oursSection, baseSection, theirsSection) => {
	conflictCount += 1;
	const ours = parseSteps(oursSection, true);
	const base = parseSteps(baseSection);
	const theirs = parseSteps(theirsSection);
	if (!ours || !base || !theirs) {
		valid = false;
		return _match;
	}
	for (const [name, theirsBlock] of theirs.steps) {
		const baseBlock = base.steps.get(name);
		if (baseBlock && baseBlock !== theirsBlock) {
			valid = false;
			return _match;
		}
	}
	const additions = theirs.blocks.filter((block) => {
		const name = block.match(/^\s+- name: (.+)$/m)?.[1];
		return name && !base.steps.has(name) && !ours.steps.has(name);
	});
	return `${ours.prefix}${ours.blocks.join("")}${additions.join("")}`;
});

if (!valid || conflictCount === 0 || resolved.includes("<<<<<<<")) {
	process.exit(1);
}
fs.writeFileSync(resultPath, resolved);
NODE
		then
			cp "$result_file" "$unmerged_path"
			git add -- "$unmerged_path"
			rm -r -- "$temporary_directory"
			return 0
		fi
	fi
	if [[ $unmerged_path == *.cfworkers/script/check-template-invariants.js ]] &&
		git merge-file --union --stdout "$ours_file" "$base_file" "$theirs_file" >"$result_file" &&
		node --check "$result_file"; then
		cp "$result_file" "$unmerged_path"
		git add -- "$unmerged_path"
		rm -r -- "$temporary_directory"
		return 0
	fi
	rm -r -- "$temporary_directory"
	return 1
}

auto_resolve_renamed_template_path() {
	local template_path=$1 temporary_directory base_file ours_file theirs_file result_file target_path project_name

	[[ -n $consumer_directory && $template_path == template.cfworkers/* ]] || return 1
	git cat-file -e ":1:$template_path" 2>/dev/null || return 1
	git cat-file -e ":3:$template_path" 2>/dev/null || return 1
	target_path=$consumer_directory/${template_path#template.cfworkers/}
	[[ -f $target_path ]] || return 1

	project_name=${consumer_directory%.cfworkers}
	temporary_directory=$(mktemp -d)
	base_file=$temporary_directory/base
	ours_file=$temporary_directory/ours
	theirs_file=$temporary_directory/theirs
	result_file=$temporary_directory/result
	git show ":1:$template_path" >"$base_file"
	cp "$target_path" "$ours_file"
	git show ":3:$template_path" >"$theirs_file"
	sed -i.bak \
		-e "s/template\\.cfworkers/$consumer_directory/g" \
		-e "s/template-cfworkers/$project_name-cfworkers/g" \
		"$base_file" "$theirs_file"
	rm -- "$base_file.bak" "$theirs_file.bak"

	if [[ $target_path == *.cfworkers/script/check-template-invariants.js ]]; then
		normalize_deploy_invariant_transition "$base_file" "$ours_file" "$theirs_file" || {
			rm -r -- "$temporary_directory"
			return 1
		}
	fi

	if [[ $target_path == *.cfworkers/apps/web/wrangler.jsonc ]] && node - "$base_file" "$ours_file" "$theirs_file" <<'NODE'
import fs from "node:fs";

const [basePath, oursPath, theirsPath] = process.argv.slice(2);
const base = fs.readFileSync(basePath, "utf8");
let ours = fs.readFileSync(oursPath, "utf8");
const theirs = fs.readFileSync(theirsPath, "utf8");
const firstWorkerName = (source) => source.match(/"name"\s*:\s*"([^"]+)"/)?.[1];
const baseWorkerName = firstWorkerName(base);
const nextWorkerName = firstWorkerName(theirs);
const currentWorkerName = firstWorkerName(ours);
if (!(baseWorkerName && nextWorkerName && currentWorkerName)) {
	process.exit(1);
}

function normalizeTemplateWorkerNames(source, workerName, telemetryWorkerName) {
	return source
		.replaceAll(`${workerName}-preview`, "__SELF_PREVIEW__")
		.replaceAll(workerName, "__SELF_PRODUCTION__")
		.replaceAll(`${telemetryWorkerName}-preview`, "__TELEMETRY_PREVIEW__")
		.replaceAll(telemetryWorkerName, "__TELEMETRY_PRODUCTION__");
}

const oldTelemetryWorkerName = "corioders-dashboard-cfworkers-web";
const nextTelemetryWorkerName = "corioders-dashboard-cfworkers";
if (
	normalizeTemplateWorkerNames(base, baseWorkerName, oldTelemetryWorkerName) !==
	normalizeTemplateWorkerNames(theirs, nextWorkerName, nextTelemetryWorkerName)
) {
	process.exit(1);
}

const normalizedWorkerName = currentWorkerName.replace(/-web$/, "");
const productionWorkerName = normalizedWorkerName.endsWith("-cfworkers") ? normalizedWorkerName : `${normalizedWorkerName}-cfworkers`;
ours = ours
	.replaceAll(currentWorkerName, productionWorkerName)
	.replaceAll(oldTelemetryWorkerName, nextTelemetryWorkerName);
fs.writeFileSync(oursPath, ours);
NODE
	then
		cp "$ours_file" "$target_path"
		git add -- "$target_path"
		git rm --quiet --force -- "$template_path"
		rm -r -- "$temporary_directory"
		return 0
	fi

	if node - "$base_file" "$ours_file" "$theirs_file" <<'NODE'
import fs from "node:fs";

const [basePath, oursPath, theirsPath] = process.argv.slice(2);
const guard = '!process.env["CLOUDFLARE_API_TOKEN"]';
const base = fs.readFileSync(basePath, "utf8");
let ours = fs.readFileSync(oursPath, "utf8");
const theirs = fs.readFileSync(theirsPath, "utf8");
const normalize = (value) => value.replace(` || ${guard}`, "").replace(/\s+/g, " ").trim();

if (base.includes(guard) || ours.includes(guard) || !theirs.includes(guard) || normalize(base) !== normalize(theirs)) {
	process.exit(1);
}

const cloudflareContext = /(const cloudflare: CloudflareContext[^\n]* =)\s*([\s\S]*?)(\?\s*await getCloudflareContextFromWrangler\(\)\s*:\s*await getCloudflareContext\(\{ async: true \}\);)/;
const match = ours.match(cloudflareContext);
if (!match) {
	process.exit(1);
}

const condition = match[2].replace(/\s+/g, " ").trim();
ours = ours.replace(
	cloudflareContext,
	`${match[1].trimEnd()}\n\t${condition} || ${guard}\n\t\t? await getCloudflareContextFromWrangler()\n\t\t: await getCloudflareContext({ async: true });`,
);
fs.writeFileSync(oursPath, ours);
NODE
	then
		cp "$ours_file" "$target_path"
		git add -- "$target_path"
		git rm --quiet --force -- "$template_path"
		rm -r -- "$temporary_directory"
		return 0
	fi

	if git merge-file --quiet --stdout "$ours_file" "$base_file" "$theirs_file" >"$result_file"; then
		cp "$result_file" "$target_path"
		git add -- "$target_path"
		git rm --quiet --force -- "$template_path"
		rm -r -- "$temporary_directory"
		return 0
	fi
	if [[ $target_path == *.cfworkers/script/check-template-invariants.js ]] &&
		git merge-file --union --stdout "$ours_file" "$base_file" "$theirs_file" >"$result_file" &&
		node --check "$result_file"; then
		cp "$result_file" "$target_path"
		git add -- "$target_path"
		git rm --quiet --force -- "$template_path"
		rm -r -- "$temporary_directory"
		return 0
	fi
	rm -r -- "$temporary_directory"
	return 1
}

pull_output=$(git -c merge.directoryRenames=true pull --no-rebase --no-commit --no-ff --autostash template "$template_branch" 2>&1)
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
		TODO.md)
			if git cat-file -e ":2:$unmerged_path" 2>/dev/null; then
				auto_resolve_bootstrap_replacements "$unmerged_path" || manual_paths+=("$unmerged_path")
			else
				git rm --quiet --force -- "$unmerged_path"
			fi
			;;
		bootstrap_project.sh | encrypt_template_env.sh)
			git rm --quiet --force -- "$unmerged_path"
			;;
		.github/workflows/schedule-runner.yml | .github/workflows/validate.yml)
			git rm --quiet --force -- "$unmerged_path"
			;;
		template.cfworkers/*)
			auto_resolve_renamed_template_path "$unmerged_path" || manual_paths+=("$unmerged_path")
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
