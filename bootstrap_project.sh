#!/usr/bin/env bash
# One-time, resumable infrastructure bootstrap for an initialized project.
set -euo pipefail

usage() {
	cat >&2 <<'EOF'
usage: ./bootstrap_project.sh [--template-branch main|payload] [project-name]

Run once from the template repository root. Requires authenticated gh and Infisical
CLIs, curl, jq, git, and macOS security. A new Infisical project receives the shared
template secrets. The account-owned Cloudflare bootstrap token is read from macOS
Keychain; generated project tokens are rotated on resumed runs.
EOF
}

cd "$(dirname "$0")"

TEMPLATE_BRANCH=""
if [[ ${1:-} == --template-branch ]]; then
	if [[ $# -lt 2 ]]; then
		usage
		exit 1
	fi
	TEMPLATE_BRANCH=$2
	shift 2
fi
if [[ $# -gt 1 ]]; then
	usage
	exit 1
fi
if [[ -f .template-branch ]]; then
	CONFIGURED_TEMPLATE_BRANCH=$(tr -d '[:space:]' <.template-branch)
	if [[ -n "$TEMPLATE_BRANCH" && "$TEMPLATE_BRANCH" != "$CONFIGURED_TEMPLATE_BRANCH" && ! -d template.cfworkers ]]; then
		echo "This bootstrap already selected template branch '$CONFIGURED_TEMPLATE_BRANCH'." >&2
		exit 1
	fi
	TEMPLATE_BRANCH=${TEMPLATE_BRANCH:-$CONFIGURED_TEMPLATE_BRANCH}
fi
TEMPLATE_BRANCH=${TEMPLATE_BRANCH:-main}
if [[ "$TEMPLATE_BRANCH" != main && "$TEMPLATE_BRANCH" != payload ]]; then
	echo "Template branch must be 'main' or 'payload'." >&2
	exit 1
fi
if [[ -d template.cfworkers ]]; then
	if ! git remote get-url template >/dev/null 2>&1; then
		echo "Missing template git remote." >&2
		exit 1
	fi
	git fetch --no-tags template "$TEMPLATE_BRANCH"
	git merge --ff-only "template/$TEMPLATE_BRANCH"
	printf '%s\n' "$TEMPLATE_BRANCH" >.template-branch
fi

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
if [[ ${#PROJECT_NAME} -gt 36 ]]; then
	echo "Project name must be at most 36 characters for its Infisical slug." >&2
	exit 1
fi
APP_TITLE=$(printf '%s' "$PROJECT_NAME" | awk -F- '{for (i = 1; i <= NF; i++) {printf "%s%s", (i > 1 ? " " : ""), toupper(substr($i, 1, 1)) substr($i, 2)}}')

for command_name in curl gh git infisical jq node security; do
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
	git push -u origin HEAD:main
}

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

	sed -i.bak \
		-e "s/\"Template\"/\"$APP_TITLE\"/g" \
		-e "s/\`Template (/\`$APP_TITLE (/g" \
		"$PROJECT_NAME.cfworkers/apps/web/src/app/layout.tsx"
	rm -- "$PROJECT_NAME.cfworkers/apps/web/src/app/layout.tsx.bak"
	rm -- "$PROJECT_NAME.cfworkers/CONSUMERS.toml"
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

INFISICAL_CONFIG="$PROJECT_DIRECTORY/.infisical.json"
if ! jq -e '.workspaceId | type == "string" and length > 0' "$INFISICAL_CONFIG" >/dev/null 2>&1; then
	echo "Missing or invalid $INFISICAL_CONFIG." >&2
	exit 1
fi
INFISICAL_SOURCE_PROJECT_ID=$(jq -r '.workspaceId' "$INFISICAL_CONFIG")
INFISICAL_DOMAIN=$(jq -r '.domain // "https://app.infisical.com"' "$INFISICAL_CONFIG")
if [[ ! "$INFISICAL_DOMAIN" =~ ^https://[^/]+$ ]]; then
	echo "Invalid Infisical domain in $INFISICAL_CONFIG." >&2
	exit 1
fi
INFISICAL_API_URL="$INFISICAL_DOMAIN/api"
if ! INFISICAL_ACCESS_TOKEN=$(infisical user get token --plain --silent --domain "$INFISICAL_API_URL" 2>/dev/null); then
	echo "Infisical authentication is required. Run: infisical login --domain $INFISICAL_API_URL" >&2
	exit 1
fi

infisical_api() {
	local method=$1
	local path=$2
	local body=${3:-}
	local response

	if [[ -n "$body" ]]; then
		response=$(
			{
				printf 'url = "%s/api/%s"\n' "$INFISICAL_DOMAIN" "$path"
				printf 'header = "Authorization: Bearer %s"\n' "$INFISICAL_ACCESS_TOKEN"
				printf 'header = "Content-Type: application/json"\n'
			} | curl --silent --show-error --fail-with-body --request "$method" --data "$body" --config -
		)
	else
		response=$(
			{
				printf 'url = "%s/api/%s"\n' "$INFISICAL_DOMAIN" "$path"
				printf 'header = "Authorization: Bearer %s"\n' "$INFISICAL_ACCESS_TOKEN"
			} | curl --silent --show-error --fail-with-body --request "$method" --config -
		)
	fi
	printf '%s' "$response"
}

INFISICAL_PROJECTS_RESPONSE=$(infisical_api GET "v1/projects")
INFISICAL_PROJECT_COUNT=$(jq -r --arg slug "$PROJECT_NAME" '[.projects[] | select(.slug == $slug)] | length' <<<"$INFISICAL_PROJECTS_RESPONSE")
if [[ "$INFISICAL_PROJECT_COUNT" -gt 1 ]]; then
	echo "Multiple Infisical projects use slug '$PROJECT_NAME'." >&2
	exit 1
fi
INFISICAL_PROJECT_ID=$(jq -r --arg slug "$PROJECT_NAME" '.projects[] | select(.slug == $slug) | .id' <<<"$INFISICAL_PROJECTS_RESPONSE")
if [[ -z "$INFISICAL_PROJECT_ID" ]]; then
	INFISICAL_PROJECT_RESPONSE=$(infisical_api POST "v1/projects" "$(jq -cn --arg name "$PROJECT_NAME" '{projectName: $name, slug: $name, type: "secret-manager", shouldCreateDefaultEnvs: true, hasDeleteProtection: true}')")
	INFISICAL_PROJECT_ID=$(jq -r '.project.id // empty' <<<"$INFISICAL_PROJECT_RESPONSE")
elif [[ $(jq -r --arg slug "$PROJECT_NAME" '.projects[] | select(.slug == $slug) | .name' <<<"$INFISICAL_PROJECTS_RESPONSE") != "$PROJECT_NAME" ]]; then
	echo "Infisical slug '$PROJECT_NAME' belongs to a differently named project." >&2
	exit 1
fi
if [[ ! "$INFISICAL_PROJECT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
	echo "Infisical returned an invalid project ID." >&2
	exit 1
fi
INFISICAL_TEMP_DIRECTORY=$(mktemp -d)
trap 'rm -f -- "$INFISICAL_TEMP_DIRECTORY/template.env"; rmdir "$INFISICAL_TEMP_DIRECTORY"' EXIT
INFISICAL_TOKEN="$INFISICAL_ACCESS_TOKEN" infisical export --silent --domain "$INFISICAL_API_URL" \
	--projectId "$INFISICAL_SOURCE_PROJECT_ID" --env dev --format dotenv >"$INFISICAL_TEMP_DIRECTORY/template.env"
if [[ -s "$INFISICAL_TEMP_DIRECTORY/template.env" ]]; then
	INFISICAL_TOKEN="$INFISICAL_ACCESS_TOKEN" infisical secrets set --silent --domain "$INFISICAL_API_URL" \
		--projectId "$INFISICAL_PROJECT_ID" --env dev --file "$INFISICAL_TEMP_DIRECTORY/template.env" >/dev/null
fi
rm -f -- "$INFISICAL_TEMP_DIRECTORY/template.env"
rmdir "$INFISICAL_TEMP_DIRECTORY"
trap - EXIT
jq -n --arg workspaceId "$INFISICAL_PROJECT_ID" --arg domain "$INFISICAL_DOMAIN" \
	'{workspaceId: $workspaceId, defaultEnvironment: "dev", domain: $domain}' >"$INFISICAL_CONFIG.tmp"
mv "$INFISICAL_CONFIG.tmp" "$INFISICAL_CONFIG"
sed -i.bak \
	-e "1s/.*/# $APP_TITLE/" \
	-e "s/^Corioders house template: /$APP_TITLE: /" \
	-e "s/myproject\.cfworkers/$PROJECT_NAME.cfworkers/g" \
	-e "s/<project>\.cfworkers/$PROJECT_NAME.cfworkers/g" \
	-e '/bootstrap_project\.sh.*one-shot project\/repository\/Cloudflare bootstrap/d' \
	-e '/<!-- BEGIN:template-bootstrap-docs -->/,/<!-- END:template-bootstrap-docs -->/d' \
	-e '/<!-- BEGIN:template-not-included-docs -->/,/<!-- END:template-not-included-docs -->/d' \
	README.md
rm -- README.md.bak
sed -i.bak '/<!-- BEGIN:template-maintainer-agent-rules -->/,/<!-- END:template-maintainer-agent-rules -->/d' AGENTS.md
rm -- AGENTS.md.bak
sed -i.bak '/^- \[/d' "$PROJECT_DIRECTORY/TODO.md"
rm -- "$PROJECT_DIRECTORY/TODO.md.bak"

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

INFISICAL_IDENTITY_NAME="$PROJECT_NAME GitHub Actions"
INFISICAL_IDENTITIES_RESPONSE=$(infisical_api GET "v1/projects/$INFISICAL_PROJECT_ID/identities?limit=1000")
INFISICAL_IDENTITY_COUNT=$(jq -r --arg name "$INFISICAL_IDENTITY_NAME" '[.identities[] | select(.name == $name)] | length' <<<"$INFISICAL_IDENTITIES_RESPONSE")
if [[ "$INFISICAL_IDENTITY_COUNT" -gt 1 ]]; then
	echo "Multiple Infisical identities are named '$INFISICAL_IDENTITY_NAME'." >&2
	exit 1
fi
INFISICAL_IDENTITY_ID=$(jq -r --arg name "$INFISICAL_IDENTITY_NAME" '.identities[] | select(.name == $name) | .id' <<<"$INFISICAL_IDENTITIES_RESPONSE")
if [[ -z "$INFISICAL_IDENTITY_ID" ]]; then
	INFISICAL_IDENTITY_RESPONSE=$(infisical_api POST "v1/projects/$INFISICAL_PROJECT_ID/identities" \
		"$(jq -cn --arg name "$INFISICAL_IDENTITY_NAME" '{name: $name, hasDeleteProtection: true, roles: [{role: "viewer", isTemporary: false}]}')")
	INFISICAL_IDENTITY_ID=$(jq -r '.identity.id // empty' <<<"$INFISICAL_IDENTITY_RESPONSE")
	INFISICAL_OIDC_RESPONSE=""
else
	INFISICAL_OIDC_RESPONSE=$(jq -r --arg name "$INFISICAL_IDENTITY_NAME" '.identities[] | select(.name == $name) | .authMethods[]?' <<<"$INFISICAL_IDENTITIES_RESPONSE")
fi
if [[ ! "$INFISICAL_IDENTITY_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
	echo "Infisical returned an invalid identity ID." >&2
	exit 1
fi
INFISICAL_OIDC_METHOD=PATCH
if ! grep -Fxq "oidc-auth" <<<"$INFISICAL_OIDC_RESPONSE"; then
	INFISICAL_OIDC_METHOD=POST
fi
infisical_api "$INFISICAL_OIDC_METHOD" "v1/auth/oidc-auth/identities/$INFISICAL_IDENTITY_ID" "$(jq -cn \
	--arg repository "$REPOSITORY" \
	--arg audience "https://github.com/$GITHUB_OWNER" \
	'{oidcDiscoveryUrl: "https://token.actions.githubusercontent.com", boundIssuer: "https://token.actions.githubusercontent.com", boundClaims: {repository: $repository}, boundAudiences: $audience, boundSubject: "", accessTokenTrustedIps: [{ipAddress: "0.0.0.0/0"}, {ipAddress: "::/0"}], accessTokenTTL: 3600, accessTokenMaxTTL: 3600, accessTokenNumUsesLimit: 0}')" >/dev/null

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

CURRENT_BRANCH=$(git branch --show-current)
if [[ -z "$CURRENT_BRANCH" ]]; then
	echo "Bootstrap requires a checked-out branch." >&2
	exit 1
fi
git config remote.pushDefault origin
git config "branch.$CURRENT_BRANCH.remote" origin
git config "branch.$CURRENT_BRANCH.merge" refs/heads/main
git config "branch.$CURRENT_BRANCH.rebase" true
git config merge.directoryRenames true
git config --unset-all "branch.$CURRENT_BRANCH.pushRemote" 2>/dev/null || true

ORIGIN_MAIN_EXISTS=false
if git ls-remote --exit-code --heads origin refs/heads/main >/dev/null 2>&1; then
	ORIGIN_MAIN_EXISTS=true
	git fetch --no-tags origin main:refs/remotes/origin/main
	if ! git merge-base --is-ancestor refs/remotes/origin/main HEAD; then
		echo "Refusing to overwrite divergent origin/main in $REPOSITORY." >&2
		echo "Use an empty repository or reconcile its history before rerunning bootstrap." >&2
		exit 1
	fi
fi

if [[ "$ORIGIN_MAIN_EXISTS" == false ]] && git rev-parse --is-shallow-repository | grep -Fxq true; then
	git fetch --unshallow template
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
		jq -r '.result.uuid // .result.id // empty' <<<"$database_response"
		return
	fi
	jq -r --arg name "$database_name" '.result[] | select(.name == $name) | (.uuid // .id // empty)' <<<"$database_response"
}

ensure_r2_bucket "$PRODUCTION_PREFIX-next-inc-cache-r2-bucket"
ensure_r2_bucket "$PREVIEW_PREFIX-next-inc-cache-r2-bucket"
PRODUCTION_D1_ID=$(ensure_d1_database "$PRODUCTION_PREFIX-next-tag-cache-d1")
PREVIEW_D1_ID=$(ensure_d1_database "$PREVIEW_PREFIX-next-tag-cache-d1")
for database_id in "$PRODUCTION_D1_ID" "$PREVIEW_D1_ID"; do
	if [[ ! "$database_id" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
		echo "Cloudflare returned an invalid D1 database ID: ${database_id:-<empty>}." >&2
		exit 1
	fi
done

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
done

INFISICAL_TEMP_DIRECTORY=$(mktemp -d)
trap 'rm -f -- "$INFISICAL_TEMP_DIRECTORY/deploy.env"; rmdir "$INFISICAL_TEMP_DIRECTORY"' EXIT
printf 'CLOUDFLARE_API_TOKEN=%s\n' "$DEPLOY_TOKEN" >"$INFISICAL_TEMP_DIRECTORY/deploy.env"
for infisical_environment in staging prod; do
	INFISICAL_TOKEN="$INFISICAL_ACCESS_TOKEN" infisical secrets set --silent --domain "$INFISICAL_API_URL" \
		--projectId "$INFISICAL_PROJECT_ID" --env "$infisical_environment" --file "$INFISICAL_TEMP_DIRECTORY/deploy.env" >/dev/null
done
rm -f -- "$INFISICAL_TEMP_DIRECTORY/deploy.env"
rmdir "$INFISICAL_TEMP_DIRECTORY"
trap - EXIT

gh variable set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID" --repo "$REPOSITORY"
gh variable set CLOUDFLARE_WORKERS_DEV_SUBDOMAIN --body "$CLOUDFLARE_WORKERS_DEV_SUBDOMAIN" --env preview --repo "$REPOSITORY"
gh variable set INFISICAL_DOMAIN --body "$INFISICAL_DOMAIN" --repo "$REPOSITORY"
gh variable set INFISICAL_IDENTITY_ID --body "$INFISICAL_IDENTITY_ID" --repo "$REPOSITORY"

sed -i.bak \
	-e "s/REPLACE_WITH_PRODUCTION_D1_DATABASE_ID/$PRODUCTION_D1_ID/g" \
	-e "s/REPLACE_WITH_PREVIEW_D1_DATABASE_ID/$PREVIEW_D1_ID/g" \
	"$WRANGLER_CONFIG"
rm -- "$WRANGLER_CONFIG.bak"

node "$PROJECT_DIRECTORY/script/check-template-invariants.js"

unset BOOTSTRAP_TOKEN DEPLOY_TOKEN INFISICAL_ACCESS_TOKEN SETUP_TOKEN TOKEN_VALUE
rm -f -- bootstrap_project.sh

git add -A
if ! git diff --cached --quiet; then
	git commit -m "Initialize $PROJECT_NAME"
	git push -u origin HEAD:main
fi

register_subtree \
	"$PROJECT_NAME.cfworkers/packages/corioders-lib/cstd-ts" \
	"$PROJECT_NAME.cfworkers/packages/corioders-lib/cstd-ts" \
	"cstd-ts" \
	"git@github.com:corioders/cstd-ts.git"
register_subtree \
	"$PROJECT_NAME.cfworkers/packages/corioders-lib/cstd-next" \
	"$PROJECT_NAME.cfworkers/packages/corioders-lib/cstd-next" \
	"cstd-next" \
	"git@github.com:corioders/cstd-next.git"

git push -u origin HEAD:main

echo "Bootstrapped $REPOSITORY."
echo "Add $REPOSITORY to template.cfworkers/CONSUMERS.toml in corioders/cstd-nextjs-template."
