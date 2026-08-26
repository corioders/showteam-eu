terraform {
  required_version = ">= 1.10.0, < 2.0.0"

  backend "s3" {
    bucket = "showteam-tofu-state"
    key    = "showteam/terraform.tfstate"
    region = "auto"

    endpoints = {
      s3 = "https://a747ec8edeeea0e6381a32a376091ffa.r2.cloudflarestorage.com"
    }

    use_lockfile                = true
    use_path_style              = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.22"
    }
  }
}

provider "cloudflare" {}
