# Cloudflare infrastructure

OpenTofu owns durable OpenNext cache resources: one R2 bucket and D1 database
for production, plus isolated equivalents for the shared preview Worker.
OpenNext/Wrangler owns the generated Worker bundle and deployment.

Set a Cloudflare API token with D1 Edit and Workers R2 Storage Edit permissions:

```sh
export CLOUDFLARE_API_TOKEN=...
tofu -chdir=infra init
tofu -chdir=infra apply \
  -var cloudflare_account_id=... \
  -var project_name=myproject
```

Copy the two output IDs into `apps/web/wrangler.jsonc`:

```sh
tofu -chdir=infra output production_next_tag_cache_d1_id
tofu -chdir=infra output preview_next_tag_cache_d1_id
```

Use a remote state backend before the first shared apply. Do not commit state
files. Existing manually-created resources must be imported before applying;
the resource names are shown in `main.tf`. `prevent_destroy` protects cache
resources from accidental deletion; remove it only when deliberately tearing
down a project.
