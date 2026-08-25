output "production_cms_d1_id" { value = cloudflare_d1_database.cms.id }
output "production_next_tag_cache_d1_id" { value = cloudflare_d1_database.next_tag_cache.id }
output "preview_cms_d1_id" { value = cloudflare_d1_database.preview_cms.id }
output "preview_next_tag_cache_d1_id" { value = cloudflare_d1_database.preview_next_tag_cache.id }
