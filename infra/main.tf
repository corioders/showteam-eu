resource "cloudflare_d1_database" "cms" {
  account_id            = var.cloudflare_account_id
  name                  = "showteam-cms"
  primary_location_hint = "eeur"

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_r2_bucket" "media" {
  account_id    = var.cloudflare_account_id
  name          = "showteam-media"
  location      = "eeur"
  storage_class = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}

import {
  to = cloudflare_d1_database.cms
  id = "a747ec8edeeea0e6381a32a376091ffa/fb4ccca4-31e6-4ed0-b3e5-a36b520d89c6"
}

import {
  to = cloudflare_r2_bucket.media
  id = "a747ec8edeeea0e6381a32a376091ffa/showteam-media/default"
}
