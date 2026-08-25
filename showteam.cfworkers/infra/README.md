# SHOWteam Cloudflare infrastructure

OpenTofu adopts and protects the production CMS, media and OpenNext cache resources plus fully isolated preview equivalents. Production identifiers remain unchanged; preview uses `showteam-preview-*` resources.

```sh
export CLOUDFLARE_API_TOKEN=...
tofu -chdir=infra init
tofu -chdir=infra plan
tofu -chdir=infra apply
```

Use a remote state backend before a shared apply. Every durable resource has `prevent_destroy`; do not remove it for routine deploys.
