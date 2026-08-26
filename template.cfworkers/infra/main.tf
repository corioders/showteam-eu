locals {
  production_prefix = "${var.project_name}-cfworkers"
  preview_prefix    = "${local.production_prefix}-preview"
}

resource "cloudflare_r2_bucket" "next_incremental_cache" {
  account_id    = var.cloudflare_account_id
  name          = "${local.production_prefix}-next-inc-cache-r2-bucket"
  location      = var.location
  storage_class = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_d1_database" "next_tag_cache" {
  account_id            = var.cloudflare_account_id
  name                  = "${local.production_prefix}-next-tag-cache-d1"
  primary_location_hint = var.location
  read_replication = {
    mode = "disabled"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_r2_bucket" "preview_next_incremental_cache" {
  account_id    = var.cloudflare_account_id
  name          = "${local.preview_prefix}-next-inc-cache-r2-bucket"
  location      = var.location
  storage_class = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_d1_database" "preview_next_tag_cache" {
  account_id            = var.cloudflare_account_id
  name                  = "${local.preview_prefix}-next-tag-cache-d1"
  primary_location_hint = var.location
  read_replication = {
    mode = "disabled"
  }

  lifecycle {
    prevent_destroy = true
  }
}
