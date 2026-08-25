resource "cloudflare_d1_database" "cms" {
  account_id            = var.cloudflare_account_id
  name                  = "showteam-cms"
  primary_location_hint = "eeur"
  lifecycle { prevent_destroy = true }
}
resource "cloudflare_r2_bucket" "media" {
  account_id    = var.cloudflare_account_id
  name          = "showteam-media"
  location      = "eeur"
  storage_class = "Standard"
  lifecycle { prevent_destroy = true }
}
resource "cloudflare_d1_database" "next_tag_cache" {
  account_id            = var.cloudflare_account_id
  name                  = "showteam-next-tags"
  primary_location_hint = "eeur"
  lifecycle { prevent_destroy = true }
}
resource "cloudflare_r2_bucket" "next_incremental_cache" {
  account_id    = var.cloudflare_account_id
  name          = "showteam-next-cache"
  location      = "eeur"
  storage_class = "Standard"
  lifecycle { prevent_destroy = true }
}
resource "cloudflare_d1_database" "preview_cms" {
  account_id            = var.cloudflare_account_id
  name                  = "showteam-preview-cms"
  primary_location_hint = "eeur"
  lifecycle { prevent_destroy = true }
}
resource "cloudflare_r2_bucket" "preview_media" {
  account_id    = var.cloudflare_account_id
  name          = "showteam-preview-media"
  location      = "eeur"
  storage_class = "Standard"
  lifecycle { prevent_destroy = true }
}
resource "cloudflare_d1_database" "preview_next_tag_cache" {
  account_id            = var.cloudflare_account_id
  name                  = "showteam-preview-next-tags"
  primary_location_hint = "eeur"
  lifecycle { prevent_destroy = true }
}
resource "cloudflare_r2_bucket" "preview_next_incremental_cache" {
  account_id    = var.cloudflare_account_id
  name          = "showteam-preview-next-cache"
  location      = "eeur"
  storage_class = "Standard"
  lifecycle { prevent_destroy = true }
}

import {
  to = cloudflare_d1_database.cms
  id = "a747ec8edeeea0e6381a32a376091ffa/fb4ccca4-31e6-4ed0-b3e5-a36b520d89c6"
}
import {
  to = cloudflare_r2_bucket.media
  id = "a747ec8edeeea0e6381a32a376091ffa/showteam-media/default"
}
import {
  to = cloudflare_d1_database.next_tag_cache
  id = "a747ec8edeeea0e6381a32a376091ffa/d574cbf4-5ab1-4545-a66b-3bb1545a379d"
}
import {
  to = cloudflare_r2_bucket.next_incremental_cache
  id = "a747ec8edeeea0e6381a32a376091ffa/showteam-next-cache/default"
}
import {
  to = cloudflare_d1_database.preview_cms
  id = "a747ec8edeeea0e6381a32a376091ffa/f5fa2b42-977f-4048-8fae-8be5f19fefea"
}
import {
  to = cloudflare_r2_bucket.preview_media
  id = "a747ec8edeeea0e6381a32a376091ffa/showteam-preview-media/default"
}
import {
  to = cloudflare_d1_database.preview_next_tag_cache
  id = "a747ec8edeeea0e6381a32a376091ffa/918c4892-49ca-4473-b346-67780535421f"
}
import {
  to = cloudflare_r2_bucket.preview_next_incremental_cache
  id = "a747ec8edeeea0e6381a32a376091ffa/showteam-preview-next-cache/default"
}
