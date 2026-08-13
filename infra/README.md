# SHOWteam Cloudflare infrastructure

Terraform owns the durable CMS resources. OpenNext/Wrangler owns the generated Worker bundle and deploy transport because application bundles are build artifacts, not durable infrastructure.

Required environment variable:

```sh
export CLOUDFLARE_API_TOKEN=...
```

The token needs D1 Read/Write and Workers R2 Storage Write for the configured account. Then run:

```sh
terraform -chdir=infra init
terraform -chdir=infra plan
terraform -chdir=infra apply
```

The import blocks adopt the existing `showteam-cms` database and `showteam-media` bucket. Both use `prevent_destroy` to protect content and uploads.

Production teams should configure a remote backend before the first shared apply. Do not commit `terraform.tfstate`.
