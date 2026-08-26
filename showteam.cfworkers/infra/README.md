# SHOWteam Cloudflare infrastructure

OpenTofu owns and protects the production CMS, media and OpenNext cache resources plus fully isolated preview equivalents. Production identifiers remain unchanged; preview uses `showteam-preview-*` resources.

State is stored in the bootstrap R2 bucket `showteam-tofu-state` at `showteam/terraform.tfstate`. Native S3 conditional locking creates `showteam/terraform.tfstate.tflock`. The bucket is intentionally outside this state so it remains available to read the state.

Required environment variables:

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: R2 Object Read & Write credentials restricted to `showteam-tofu-state`;
- `TOFU_CLOUDFLARE_API_TOKEN` in GitHub (exported locally as `CLOUDFLARE_API_TOKEN`): Cloudflare token restricted to D1 and R2 management;
- `TF_VAR_cloudflare_account_id`: Cloudflare account ID.

```sh
tofu -chdir=infra init
tofu -chdir=infra fmt -check
tofu -chdir=infra validate
tofu -chdir=infra plan -lock-timeout=5m
```

The `Infrastructure` workflow plans trusted pull requests. A push to `deploy` plans again and applies only after approval in the GitHub `production` environment. Fork pull requests run backend-free formatting and validation on Blacksmith and never receive credentials.

Every durable resource has `prevent_destroy`; do not remove it for routine deploys. Worker artifacts stay in Wrangler/OpenNext and Payload owns D1 schema migrations.
