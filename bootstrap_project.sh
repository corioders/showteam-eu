#!/usr/bin/env bash
# One-time, resumable infrastructure bootstrap for an initialized project.
set -euo pipefail

usage() {
	cat >&2 <<'EOF'
usage: ./bootstrap_project.sh <github-owner> <cloudflare-account-id> <workers-dev-subdomain>

Run after ./init_project.sh, from the repository root. Requires authenticated
gh, curl, jq, tofu, git, and macOS security. Generated Cloudflare credentials
are stored in macOS Keychain so an interrupted bootstrap can be resumed.
EOF
}

if [[ $# -ne 3 ]]; then
	usage
	exit 1
fi

GITHUB_OWNER=$1
CLOUDFLARE_ACCOUNT_ID=$2
CLOUDFLARE_WORKERS_DEV_SUBDOMAIN=$3
KEYCHAIN_ACCOUNT=${CLOUDFLARE_BOOTSTRAP_KEYCHAIN_ACCOUNT:-$GITHUB_OWNER}
BOOTSTRAP_KEYCHAIN_SERVICE=${CLOUDFLARE_BOOTSTRAP_KEYCHAIN_SERVICE:-corioders.cloudflare.bootstrap}

for command_name in curl gh git jq security shasum tofu; do
	if ! command -v "$command_name" >/dev/null 2>&1; then
		echo "Missing required command: $command_name" >&2
		exit 1
	fi
done

cd "$(dirname "$0")"

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

if [[ -z "$PROJECT_DIRECTORY" || -f init_project.sh ]]; then
	echo "Run ./init_project.sh before this script." >&2
	exit 1
fi

PROJECT_NAME=${PROJECT_DIRECTORY%.cfworkers}
REPOSITORY="$GITHUB_OWNER/$PROJECT_NAME"
STATE_BUCKET="$PROJECT_NAME-tofu-state"
STATE_KEY="$PROJECT_NAME/terraform.tfstate"
WRANGLER_CONFIG="$PROJECT_DIRECTORY/apps/web/wrangler.jsonc"
INFRA_DIRECTORY="$PROJECT_DIRECTORY/infra"

if [[ ! "$GITHUB_OWNER" =~ ^[A-Za-z0-9-]+$ ]]; then
	echo "Invalid GitHub owner: $GITHUB_OWNER" >&2
	exit 1
fi
if [[ ! "$CLOUDFLARE_ACCOUNT_ID" =~ ^[0-9a-f]{32}$ ]]; then
	echo "Cloudflare account ID must be 32 lowercase hexadecimal characters." >&2
	exit 1
fi
if [[ ! "$CLOUDFLARE_WORKERS_DEV_SUBDOMAIN" =~ ^[a-z0-9-]+$ ]]; then
	echo "Invalid workers.dev subdomain: $CLOUDFLARE_WORKERS_DEV_SUBDOMAIN" >&2
	exit 1
fi
if [[ ! -f "$WRANGLER_CONFIG" || ! -d "$INFRA_DIRECTORY" ]]; then
	echo "Initialized project files are incomplete." >&2
	exit 1
fi

gh auth status >/dev/null

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

BOOTSTRAP_TOKEN=$(security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$BOOTSTRAP_KEYCHAIN_SERVICE" -w)

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
R2_BUCKET_ITEM_WRITE_PERMISSION=$(permission_id "Workers R2 Storage Bucket Item Write")
WORKERS_SCRIPTS_WRITE_PERMISSION=$(permission_id "Workers Scripts Write")

TOKEN_ID=""
TOKEN_VALUE=""
create_or_load_token() {
	local token_name=$1
	local keychain_service=$2
	local policies=$3
	local token_response
	local token_count

	token_count=$(jq -r --arg name "$token_name" '[.result[] | select(.name == $name and .status == "active")] | length' <<<"$TOKEN_LIST_RESPONSE")
	if [[ "$token_count" -gt 1 ]]; then
		echo "Multiple active Cloudflare tokens are named '$token_name'." >&2
		exit 1
	fi
	TOKEN_ID=$(jq -r --arg name "$token_name" '.result[] | select(.name == $name and .status == "active") | .id' <<<"$TOKEN_LIST_RESPONSE")
	if [[ -n "$TOKEN_ID" ]]; then
		if ! TOKEN_VALUE=$(security find-generic-password -a "$KEYCHAIN_ACCOUNT" -s "$keychain_service" -w 2>/dev/null); then
			echo "Token '$token_name' exists, but its value is missing from Keychain service '$keychain_service'." >&2
			exit 1
		fi
		return
	fi

	token_response=$(cf_api "$BOOTSTRAP_TOKEN" POST "accounts/$CLOUDFLARE_ACCOUNT_ID/tokens" "$(jq -cn --arg name "$token_name" --argjson policies "$policies" '{name: $name, policies: $policies}')")
	TOKEN_ID=$(jq -r '.result.id' <<<"$token_response")
	TOKEN_VALUE=$(jq -r '.result.value' <<<"$token_response")
	if [[ -z "$TOKEN_ID" || -z "$TOKEN_VALUE" || "$TOKEN_ID" == "null" || "$TOKEN_VALUE" == "null" ]]; then
		echo "Cloudflare did not return credentials for '$token_name'." >&2
		exit 1
	fi
	printf '%s\n' "$TOKEN_VALUE" | security add-generic-password -U -a "$KEYCHAIN_ACCOUNT" -s "$keychain_service" -w >/dev/null
}

ACCOUNT_RESOURCE="com.cloudflare.api.account.$CLOUDFLARE_ACCOUNT_ID"
PROVIDER_POLICIES=$(jq -cn \
	--arg resource "$ACCOUNT_RESOURCE" \
	--arg d1 "$D1_WRITE_PERMISSION" \
	--arg r2 "$R2_WRITE_PERMISSION" \
	'[{effect: "allow", permission_groups: [{id: $d1}, {id: $r2}], resources: {($resource): "*"}}]')
create_or_load_token "$PROJECT_NAME OpenTofu" "corioders.cloudflare.$PROJECT_NAME.opentofu" "$PROVIDER_POLICIES"
PROVIDER_TOKEN=$TOKEN_VALUE

if ! cf_api "$PROVIDER_TOKEN" GET "accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/$STATE_BUCKET" >/dev/null 2>&1; then
	cf_api "$PROVIDER_TOKEN" POST "accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets" "$(jq -cn --arg name "$STATE_BUCKET" '{name: $name}')" >/dev/null
fi

STATE_RESOURCE="com.cloudflare.edge.r2.bucket.${CLOUDFLARE_ACCOUNT_ID}_default_$STATE_BUCKET"
STATE_POLICIES=$(jq -cn \
	--arg resource "$STATE_RESOURCE" \
	--arg permission "$R2_BUCKET_ITEM_WRITE_PERMISSION" \
	'[{effect: "allow", permission_groups: [{id: $permission}], resources: {($resource): "*"}}]')
create_or_load_token "$PROJECT_NAME OpenTofu state" "corioders.cloudflare.$PROJECT_NAME.state" "$STATE_POLICIES"
STATE_ACCESS_KEY_ID=$TOKEN_ID
STATE_SECRET_ACCESS_KEY=$(printf '%s' "$TOKEN_VALUE" | shasum -a 256 | awk '{print $1}')

DEPLOY_POLICIES=$(jq -cn \
	--arg resource "$ACCOUNT_RESOURCE" \
	--arg d1 "$D1_WRITE_PERMISSION" \
	--arg r2 "$R2_WRITE_PERMISSION" \
	--arg workers "$WORKERS_SCRIPTS_WRITE_PERMISSION" \
	'[{effect: "allow", permission_groups: [{id: $d1}, {id: $r2}, {id: $workers}], resources: {($resource): "*"}}]')
create_or_load_token "$PROJECT_NAME GitHub deploy" "corioders.cloudflare.$PROJECT_NAME.deploy" "$DEPLOY_POLICIES"
DEPLOY_TOKEN=$TOKEN_VALUE

for environment_name in preview production; do
	gh api --method PUT "repos/$REPOSITORY/environments/$environment_name" >/dev/null
	printf '%s' "$STATE_ACCESS_KEY_ID" | gh secret set TOFU_STATE_ACCESS_KEY_ID --env "$environment_name" --repo "$REPOSITORY"
	printf '%s' "$STATE_SECRET_ACCESS_KEY" | gh secret set TOFU_STATE_SECRET_ACCESS_KEY --env "$environment_name" --repo "$REPOSITORY"
	printf '%s' "$PROVIDER_TOKEN" | gh secret set TOFU_CLOUDFLARE_API_TOKEN --env "$environment_name" --repo "$REPOSITORY"
	printf '%s' "$DEPLOY_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN --env "$environment_name" --repo "$REPOSITORY"
done

gh variable set CLOUDFLARE_ACCOUNT_ID --body "$CLOUDFLARE_ACCOUNT_ID" --repo "$REPOSITORY"
gh variable set TOFU_PROJECT_NAME --body "$PROJECT_NAME" --repo "$REPOSITORY"
gh variable set TOFU_STATE_BUCKET --body "$STATE_BUCKET" --repo "$REPOSITORY"
gh variable set TOFU_STATE_KEY --body "$STATE_KEY" --repo "$REPOSITORY"
gh variable set CLOUDFLARE_WORKERS_DEV_SUBDOMAIN --body "$CLOUDFLARE_WORKERS_DEV_SUBDOMAIN" --env preview --repo "$REPOSITORY"

export AWS_ACCESS_KEY_ID=$STATE_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$STATE_SECRET_ACCESS_KEY
export AWS_ENDPOINT_URL_S3="https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com"
export CLOUDFLARE_API_TOKEN=$PROVIDER_TOKEN
export TF_VAR_cloudflare_account_id=$CLOUDFLARE_ACCOUNT_ID
export TF_VAR_project_name=$PROJECT_NAME

tofu -chdir="$INFRA_DIRECTORY" init -input=false \
	-backend-config="bucket=$STATE_BUCKET" \
	-backend-config="key=$STATE_KEY"
tofu -chdir="$INFRA_DIRECTORY" fmt -check
tofu -chdir="$INFRA_DIRECTORY" validate
tofu -chdir="$INFRA_DIRECTORY" apply -input=false -lock-timeout=5m -auto-approve

PRODUCTION_D1_ID=$(tofu -chdir="$INFRA_DIRECTORY" output -raw production_next_tag_cache_d1_id)
PREVIEW_D1_ID=$(tofu -chdir="$INFRA_DIRECTORY" output -raw preview_next_tag_cache_d1_id)

sed -i.bak \
	-e "s/REPLACE_WITH_PRODUCTION_D1_DATABASE_ID/$PRODUCTION_D1_ID/g" \
	-e "s/REPLACE_WITH_PREVIEW_D1_DATABASE_ID/$PREVIEW_D1_ID/g" \
	"$WRANGLER_CONFIG"
rm -- "$WRANGLER_CONFIG.bak"

unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_ENDPOINT_URL_S3 CLOUDFLARE_API_TOKEN
unset TF_VAR_cloudflare_account_id TF_VAR_project_name
unset BOOTSTRAP_TOKEN PROVIDER_TOKEN DEPLOY_TOKEN TOKEN_VALUE STATE_SECRET_ACCESS_KEY

echo "Bootstrapped $REPOSITORY."
echo "Still to do: require a reviewer on the production environment if the GitHub plan supports it."
