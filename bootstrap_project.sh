#!/usr/bin/env bash
# One-time, resumable infrastructure bootstrap for an initialized project.
set -euo pipefail

usage() {
	cat >&2 <<'EOF'
usage: ./bootstrap_project.sh [project-name]

Run once from the template repository root. Requires authenticated gh, curl,
jq, git, and macOS security. The account-owned Cloudflare bootstrap token is read
from macOS Keychain; generated project tokens are rotated on resumed runs.
EOF
}

if [[ $# -gt 1 ]]; then
	usage
	exit 1
fi

cd "$(dirname "$0")"

PROJECT_NAME=${1:-}
if [[ -z "$PROJECT_NAME" ]]; then
	PROJECT_NAME=$(basename "$PWD")
	read -r -p "Use '$PROJECT_NAME' as the project name? [Y/n] " CONFIRM_PROJECT_NAME </dev/tty
	if [[ "$CONFIRM_PROJECT_NAME" =~ ^[Nn]$ ]]; then
		read -r -p "Project name: " PROJECT_NAME </dev/tty
	elif [[ -n "$CONFIRM_PROJECT_NAME" && ! "$CONFIRM_PROJECT_NAME" =~ ^[Yy]$ ]]; then
		echo "Expected y or n." >&2
		exit 1
	fi
fi
if [[ ! "$PROJECT_NAME" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
	echo "Project name must be lowercase alphanumeric with dashes." >&2
	exit 1
fi

for command_name in curl gh git jq security; do
	if ! command -v "$command_name" >/dev/null 2>&1; then
		echo "Missing required command: $command_name" >&2
		exit 1
	fi
	done

register_subtree() {
	local source_prefix=$1
	local target_prefix=$2
	local package_name=$3
	local repository=$4
	local split_commit

	if git log -1 --format=%B --fixed-strings --grep="git-subtree-dir: $target_prefix" | grep -Fxq "git-subtree-dir: $target_prefix"; then
		return
	fi
	if [[ ! -d "$source_prefix" ]]; then
		echo "Cannot register $package_name subtree: missing $source_prefix." >&2
		exit 1
	fi

	git fetch --no-tags "$repository" main
	split_commit=$(git subtree split --prefix "$source_prefix" HEAD)
	git commit --allow-empty \
		-m "chore: register $package_name subtree" \
		-m "git-subtree-dir: $target_prefix
git-subtree-split: $split_commit"
}

register_subtree \
	"template.cfworkers/packages/corioders-lib/cstd-ts" \
	"$PROJECT_NAME.cfworkers/packages/corioders-lib/cstd-ts" \
	"cstd-ts" \
	"git@github.com:corioders/cstd-ts.git"
register_subtree \
	"template.cfworkers/packages/corioders-lib/cstd-next" \
	"$PROJECT_NAME.cfworkers/packages/corioders-lib/cstd-next" \
	"cstd-next" \
	"git@github.com:corioders/cstd-next.git"

gh auth status >/dev/null
GITHUB_OWNER=${GITHUB_OWNER:-}
if [[ -z "$GITHUB_OWNER" ]]; then
	GITHUB_OWNER=$(gh repo view --json owner --jq '.owner.login' 2>/dev/null || true)
fi
if [[ -z "$GITHUB_OWNER" ]]; then
	read -r -p "GitHub owner: " GITHUB_OWNER </dev/tty
fi
KEYCHAIN_ACCOUNT=${CLOUDFLARE_BOOTSTRAP_KEYCHAIN_ACCOUNT:-corioders}
BOOTSTRAP_KEYCHAIN_SERVICE=${CLOUDFLARE_BOOTSTRAP_KEYCHAIN_SERVICE:-corioders.cloudflare.bootstrap}

if [[ -d template.cfworkers ]]; then
	git mv template.cfworkers "$PROJECT_NAME.cfworkers" 2>/dev/null || mv template.cfworkers "$PROJECT_NAME.cfworkers"

	grep -rlZ --binary-files=without-match -e 'template\.cfworkers' -e 'template-cfworkers' \
		--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.turbo \
		--exclude="$(basename "$0")" . |
		xargs -0 sed -i.bak -e "s/template\.cfworkers/$PROJECT_NAME.cfworkers/g" -e "s/template-cfworkers/$PROJECT_NAME-cfworkers/g"
	find . -name '*.bak' -not -path './node_modules/*' -delete

	APP_TITLE=$(printf '%s' "$PROJECT_NAME" | awk -F- '{for (i = 1; i <= NF; i++) {printf "%s%s", (i > 1 ? " " : ""), toupper(substr($i, 1, 1)) substr($i, 2)}}')
	sed -i.bak \
		-e "s/\"Template\"/\"$APP_TITLE\"/g" \
		-e "s/\`Template (/\`$APP_TITLE (/g" \
		"$PROJECT_NAME.cfworkers/apps/web/src/app/layout.tsx"
	rm -- "$PROJECT_NAME.cfworkers/apps/web/src/app/layout.tsx.bak"
	rm -- "$PROJECT_NAME.cfworkers/CONSUMERS.md"
fi

PROJECT_DIRECTORY=""
for candidate in ./*.cfworkers; do
	if [[ ! -d "$candidate" ]]; then
		continue
	fi
	if [[ -n "$PROJECT_DIRECTORY" ]]; then
		echo "Expected exactly one *.cfworkers directory." >&2
		exit 1
	fi
	PROJECT_DIRECTORY=${candidate#./}
done

if [[ -z "$PROJECT_DIRECTORY" || "$PROJECT_DIRECTORY" != "$PROJECT_NAME.cfworkers" ]]; then
	echo "Expected exactly one $PROJECT_NAME.cfworkers directory." >&2
	exit 1
fi

REPOSITORY="$GITHUB_OWNER/$PROJECT_NAME"
WRANGLER_CONFIG="$PROJECT_DIRECTORY/apps/web/wrangler.jsonc"
PRODUCTION_PREFIX="$PROJECT_NAME-cfworkers"
PREVIEW_PREFIX="$PRODUCTION_PREFIX-preview"

if [[ ! "$GITHUB_OWNER" =~ ^[A-Za-z0-9-]+$ ]]; then
	echo "Invalid GitHub owner: $GITHUB_OWNER" >&2
	exit 1
fi
if [[ ! -f "$WRANGLER_CONFIG" ]]; then
	echo "Initialized project files are incomplete." >&2
	exit 1
fi

if ! gh repo view "$REPOSITORY" >/dev/null 2>&1; then
	gh repo create "$REPOSITORY" --private
fi
if [[ $(gh repo view "$REPOSITORY" --json visibility --jq .visibility) != "PRIVATE" ]]; then
	echo "Refusing to bootstrap non-private repository: $REPOSITORY" >&2
	exit 1
fi

TARGET_REMOTE="git@github.com:$REPOSITORY.git"
if git remote get-url origin >/dev/null 2>&1; then
	CURRENT_ORIGIN=$(git remote get-url origin)
	if [[ "$CURRENT_ORIGIN" != "$TARGET_REMOTE" && "$CURRENT_ORIGIN" != "https://github.com/$REPOSITORY.git" ]]; then
		if [[ "$CURRENT_ORIGIN" == *"cstd-nextjs-template.git" && ! $(git remote 2>/dev/null) =~ (^|[[:space:]])template($|[[:space:]]) ]]; then
			git remote rename origin template
		else
			echo "Refusing to replace unrelated origin: $CURRENT_ORIGIN" >&2
			exit 1
		fi
	fi
fi
if ! git remote get-url origin >/dev/null 2>&1; then
	git remote add origin "$TARGET_REMOTE"
fi

if ! BOOTSTRAP_TOKEN=$(security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$BOOTSTRAP_KEYCHAIN_SERVICE" -w 2>/dev/null); then
	echo "Missing Cloudflare bootstrap token in Keychain service '$BOOTSTRAP_KEYCHAIN_SERVICE', account '$KEYCHAIN_ACCOUNT'." >&2
	exit 1
fi

cf_api() {
	local api_token=$1
	local method=$2
	local path=$3
	local body=${4:-}
	local response

	if [[ -n "$body" ]]; then
		response=$(
			{
				printf 'url = "https://api.cloudflare.com/client/v4/%s"\n' "$path"
				printf 'header = "Authorization: Bearer %s"\n' "$api_token"
				printf 'header = "Content-Type: application/json"\n'
			} | curl --silent --show-error --request "$method" --data "$body" --config -
		)
	else
		response=$(
			{
				printf 'url = "https://api.cloudflare.com/client/v4/%s"\n' "$path"
				printf 'header = "Authorization: Bearer %s"\n' "$api_token"
				printf 'header = "Content-Type: application/json"\n'
			} | curl --silent --show-error --request "$method" --config -
		)
	fi

	if ! jq -e '.success == true' >/dev/null <<<"$response"; then
		jq -r '[.errors[]?.message] | join("; ")' <<<"$response" >&2
		return 1
	fi
	printf '%s' "$response"
}

CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-}
if [[ -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
	if ACCOUNT_RESPONSE=$(cf_api "$BOOTSTRAP_TOKEN" GET "accounts?per_page=50" 2>/dev/null); then
		ACCOUNT_COUNT=$(jq -r '.result | length' <<<"$ACCOUNT_RESPONSE")
		if [[ "$ACCOUNT_COUNT" -eq 1 ]]; then
			CLOUDFLARE_ACCOUNT_ID=$(jq -r '.result[0].id' <<<"$ACCOUNT_RESPONSE")
		elif [[ "$ACCOUNT_COUNT" -gt 1 ]]; then
			jq -r '.result | to_entries[] | "\(.key + 1)) \(.value.name) [\(.value.id)]"' <<<"$ACCOUNT_RESPONSE" >/dev/tty
			read -r -p "Cloudflare account number: " ACCOUNT_NUMBER </dev/tty
			if [[ ! "$ACCOUNT_NUMBER" =~ ^[1-9][0-9]*$ || "$ACCOUNT_NUMBER" -gt "$ACCOUNT_COUNT" ]]; then
				echo "Invalid Cloudflare account number." >&2
				exit 1
			fi
			CLOUDFLARE_ACCOUNT_ID=$(jq -r --argjson index "$((ACCOUNT_NUMBER - 1))" '.result[$index].id' <<<"$ACCOUNT_RESPONSE")
		fi
	fi
	if [[ -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
		read -r -p "Cloudflare account ID: " CLOUDFLARE_ACCOUNT_ID </dev/tty
	fi
fi
if [[ ! "$CLOUDFLARE_ACCOUNT_ID" =~ ^[0-9a-f]{32}$ ]]; then
	echo "Cloudflare account ID must be 32 lowercase hexadecimal characters." >&2
	exit 1
fi

cf_api "$BOOTSTRAP_TOKEN" GET "accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/verify" >/dev/null
PERMISSION_RESPONSE=$(cf_api "$BOOTSTRAP_TOKEN" GET "accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/permission_groups")
TOKEN_LIST_RESPONSE=$(cf_api "$BOOTSTRAP_TOKEN" GET "accounts/$CLOUDFLARE_ACCOUNT_ID/tokens?per_page=100")

permission_id() {
	local permission_name=$1
	local permission_id_value
	permission_id_value=$(jq -r --arg name "$permission_name" '.result[] | select(.name == $name) | .id' <<<"$PERMISSION_RESPONSE")
	if [[ -z "$permission_id_value" ]]; then
		echo "Cloudflare permission not found: $permission_name" >&2
		exit 1
	fi
	printf '%s' "$permission_id_value"
}

D1_WRITE_PERMISSION=$(permission_id "D1 Write")
R2_WRITE_PERMISSION=$(permission_id "Workers R2 Storage Write")
WORKERS_SCRIPTS_WRITE_PERMISSION=$(permission_id "Workers Scripts Write")

TOKEN_ID=""
TOKEN_VALUE=""
create_or_rotate_token() {
	local token_name=$1
	local policies=$2
	local token_response
	local token_count

	token_count=$(jq -r --arg name "$token_name" '[.result[] | select(.name == $name and .status == "active")] | length' <<<"$TOKEN_LIST_RESPONSE")
	if [[ "$token_count" -gt 1 ]]; then
		echo "Multiple active Cloudflare tokens are named '$token_name'." >&2
		exit 1
	fi
	TOKEN_ID=$(jq -r --arg name "$token_name" '.result[] | select(.name == $name and .status == "active") | .id' <<<"$TOKEN_LIST_RESPONSE")
	if [[ -n "$TOKEN_ID" ]]; then
		cf_api "$BOOTSTRAP_TOKEN" DELETE "accounts/$CLOUDFLARE_ACCOUNT_ID/tokens/$TOKEN_ID" >/dev/null
	fi

	token_response=$(cf_api "$BOOTSTRAP_TOKEN" POST "accounts/$CLOUDFLARE_ACCOUNT_ID/tokens" "$(jq -cn --arg name "$token_name" --argjson policies "$policies" '{name: $name, policies: $policies}')")
	TOKEN_ID=$(jq -r '.result.id' <<<"$token_response")
	TOKEN_VALUE=$(jq -r '.result.value' <<<"$token_response")
	if [[ -z "$TOKEN_ID" || -z "$TOKEN_VALUE" || "$TOKEN_ID" == "null" || "$TOKEN_VALUE" == "null" ]]; then
		echo "Cloudflare did not return credentials for '$token_name'." >&2
		exit 1
	fi
}

ACCOUNT_RESOURCE="com.cloudflare.api.account.$CLOUDFLARE_ACCOUNT_ID"
PROVIDER_POLICIES=$(jq -cn \
	--arg resource "$ACCOUNT_RESOURCE" \
	--arg d1 "$D1_WRITE_PERMISSION" \
	--arg r2 "$R2_WRITE_PERMISSION" \
	'[{effect: "allow", permission_groups: [{id: $d1}, {id: $r2}], resources: {($resource): "*"}}]')
create_or_rotate_token "$PROJECT_NAME Cloudflare setup" "$PROVIDER_POLICIES"
SETUP_TOKEN=$TOKEN_VALUE

ensure_r2_bucket() {
	local bucket_name=$1
	if cf_api "$SETUP_TOKEN" GET "accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$bucket_name" >/dev/null 2>&1; then
		return
	fi
	cf_api "$SETUP_TOKEN" POST "accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets" \
		"$(jq -cn --arg name "$bucket_name" '{name: $name, locationHint: "eeur", storageClass: "Standard"}')" >/dev/null
}

ensure_d1_database() {
	local database_name=$1
	local database_response
	local database_count

	database_response=$(cf_api "$SETUP_TOKEN" GET "accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database?name=$database_name&per_page=10000")
	database_count=$(jq -r --arg name "$database_name" '[.result[] | select(.name == $name)] | length' <<<"$database_response")
	if [[ "$database_count" -gt 1 ]]; then
		echo "Multiple D1 databases are named '$database_name'." >&2
		exit 1
	fi
	if [[ "$database_count" -eq 0 ]]; then
		database_response=$(cf_api "$SETUP_TOKEN" POST "accounts/$CLOUDFLARE_ACCOUNT_ID/d1/database" \
			"$(jq -cn --arg name "$database_name" '{name: $name, primary_location_hint: "eeur", read_replication: {mode: "disabled"}}')")
		jq -r '.result.uuid' <<<"$database_response"
		return
	fi
	jq -r --arg name "$database_name" '.result[] | select(.name == $name) | .uuid' <<<"$database_response"
}

ensure_r2_bucket "$PRODUCTION_PREFIX-next-inc-cache-r2-bucket"
ensure_r2_bucket "$PREVIEW_PREFIX-next-inc-cache-r2-bucket"
PRODUCTION_D1_ID=$(ensure_d1_database "$PRODUCTION_PREFIX-next-tag-cache-d1")
PREVIEW_D1_ID=$(ensure_d1_database "$PREVIEW_PREFIX-next-tag-cache-d1")

DEPLOY_POLICIES=$(jq -cn \
	--arg resource "$ACCOUNT_RESOURCE" \
	--arg d1 "$D1_WRITE_PERMISSION" \
	--arg r2 "$R2_WRITE_PERMISSION" \
	--arg workers "$WORKERS_SCRIPTS_WRITE_PERMISSION" \
	'[{effect: "allow", permission_groups: [{id: $d1}, {id: $r2}, {id: $workers}], resources: {($resource): "*"}}]')
create_or_rotate_token "$PROJECT_NAME GitHub deploy" "$DEPLOY_POLICIES"
DEPLOY_TOKEN=$TOKEN_VALUE
CLOUDFLARE_WORKERS_DEV_SUBDOMAIN=""
if SUBDOMAIN_RESPONSE=$(cf_api "$DEPLOY_TOKEN" GET "accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain" 2>/dev/null); then
	CLOUDFLARE_WORKERS_DEV_SUBDOMAIN=$(jq -r '.result.subdomain // empty' <<<"$SUBDOMAIN_RESPONSE")
fi
if [[ -z "$CLOUDFLARE_WORKERS_DEV_SUBDOMAIN" ]]; then
	read -r -p "workers.dev subdomain: " CLOUDFLARE_WORKERS_DEV_SUBDOMAIN </dev/tty
fi
if [[ ! "$CLOUDFLARE_WORKERS_DEV_SUBDOMAIN" =~ ^[a-z0-9-]+$ ]]; then
	echo "Cloudflare returned an invalid workers.dev subdomain." >&2
	exit 1
fi

for environment_name in preview production; do
	gh api --method PUT "repos/$REPOSITORY/environments/$environment_name" >/dev/null
	printf '%s' "$DEPLOY_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --env "$environment_name" --repo "$REPOSITORY"
done

gh variable set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID" --repo "$REPOSITORY"
gh variable set CLOUDFLARE_WORKERS_DEV_SUBDOMAIN --body "$CLOUDFLARE_WORKERS_DEV_SUBDOMAIN" --env preview --repo "$REPOSITORY"

sed -i.bak \
	-e "s/REPLACE_WITH_PRODUCTION_D1_DATABASE_ID/$PRODUCTION_D1_ID/g" \
	-e "s/REPLACE_WITH_PREVIEW_D1_DATABASE_ID/$PREVIEW_D1_ID/g" \
	"$WRANGLER_CONFIG"
rm -- "$WRANGLER_CONFIG.bak"

unset BOOTSTRAP_TOKEN SETUP_TOKEN DEPLOY_TOKEN TOKEN_VALUE

git add -A
if ! git diff --cached --quiet; then
	git commit -m "Initialize $PROJECT_NAME"
fi
git push -u origin HEAD:main

echo "Bootstrapped $REPOSITORY."
echo "Add $REPOSITORY to template.cfworkers/CONSUMERS.md in corioders/cstd-nextjs-template."
echo "Still to do: require a reviewer on the production environment if the GitHub plan supports it."
