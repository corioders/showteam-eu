#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

SOURCE_ENV="template.cfworkers/apps/web/.env"
ENCRYPTED_ENV="$SOURCE_ENV.age"

if [[ ! -f "$SOURCE_ENV" ]]; then
	echo "Missing $SOURCE_ENV." >&2
	exit 1
fi

run_age() {
	if command -v age >/dev/null 2>&1; then
		age "$@"
		return
	fi
	if command -v nix >/dev/null 2>&1; then
		nix shell nixpkgs/33da5f36e599b50aa7dbbfacb718254423b18354#age --command age "$@"
		return
	fi
	echo "Missing age. Install age or Nix." >&2
	exit 1
}

TEMPORARY_ENV=$(mktemp "${ENCRYPTED_ENV}.XXXXXX")
trap 'rm -f "$TEMPORARY_ENV"' EXIT

run_age --passphrase --output "$TEMPORARY_ENV" "$SOURCE_ENV"
mv "$TEMPORARY_ENV" "$ENCRYPTED_ENV"
trap - EXIT

echo "Updated $ENCRYPTED_ENV. Plaintext $SOURCE_ENV remains ignored."
