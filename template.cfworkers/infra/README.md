# Cloudflare infrastructure

OpenTofu owns durable Cloudflare resources. OpenNext/Wrangler owns generated
Worker bundles and deployments. State lives in a dedicated bootstrap R2 bucket;
native S3 conditional locking creates `<key>.tflock` while OpenTofu is running.

## One-time bootstrap

1. Create `<project>-tofu-state` in R2. This bucket deliberately stays outside
   its own state so destroying a stack cannot remove the state needed to recover it.
2. Create an R2 Account API token named `<project> OpenTofu state` with only
   `Object Read & Write`, restricted to that bucket.
3. Create a Cloudflare Account API token named `<project> OpenTofu` with only
   `D1 Write` and `Workers R2 Storage Write`. Keep it separate from the broader
   `CLOUDFLARE_API_TOKEN` used by Wrangler deploys.
4. Create GitHub environments `preview` and `production`. Add these secrets to both:
   `TOFU_STATE_ACCESS_KEY_ID`, `TOFU_STATE_SECRET_ACCESS_KEY`,
   `TOFU_CLOUDFLARE_API_TOKEN`.
5. Add repository variables `CLOUDFLARE_ACCOUNT_ID`, `TOFU_PROJECT_NAME`,
   `TOFU_STATE_BUCKET` and `TOFU_STATE_KEY` (`<project>/terraform.tfstate`).
6. Require a reviewer on the `production` environment. Preview plans never apply;
   only a reviewed `deploy` branch run can apply.

For local use, export the same values:

```sh
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_ENDPOINT_URL_S3=https://ACCOUNT_ID.r2.cloudflarestorage.com
export CLOUDFLARE_API_TOKEN=...
export TF_VAR_cloudflare_account_id=ACCOUNT_ID
export TF_VAR_project_name=myproject

tofu -chdir=infra init \
  -backend-config=bucket=myproject-tofu-state \
  -backend-config=key=myproject/terraform.tfstate
tofu -chdir=infra fmt -check
tofu -chdir=infra validate
tofu -chdir=infra plan -lock-timeout=5m
```

Copy the two output IDs into `apps/web/wrangler.jsonc`:

```sh
tofu -chdir=infra output production_next_tag_cache_d1_id
tofu -chdir=infra output preview_next_tag_cache_d1_id
```

Existing resources must be imported before the first apply. Reconcile location
and replication fields until the import-only plan reports zero creates, changes
and destroys; only then apply the imports. Run a second plan and require
`No changes`. Never accept a replacement plan while adopting production data.

The reusable `Infrastructure` workflow is part of every `Deploy` run: branch
pushes plan, while `deploy` applies through the review-protected `production`
environment. Pull requests also run it directly. External forks get only
backend-free format/validation on Blacksmith and never receive credentials.
`prevent_destroy` remains mandatory for durable resources.
