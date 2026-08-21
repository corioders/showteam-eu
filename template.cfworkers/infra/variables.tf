variable "cloudflare_account_id" {
  description = "Cloudflare account that owns the Worker and cache resources."
  type        = string
}

variable "project_name" {
  description = "Project prefix used by the Worker and cache resource names."
  type        = string
}

variable "location" {
  description = "Cloudflare location hint for D1 and R2 resources."
  type        = string
  default     = "eeur"
}
