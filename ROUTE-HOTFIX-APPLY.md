# Hotfix: Wrangler `Invalid routes in run_worker_first`

The previous deployment failed because `wrangler.jsonc` listed both `/admin/` and `/admin/*`. Wrangler reports the exact `/admin/` rule as redundant.

Correct `assets.run_worker_first` configuration:

```jsonc
"run_worker_first": [
  "/api",
  "/api/*",
  "/admin",
  "/admin/*",
  "/admin.html",
  "/top100-admin.html"
]
```

If the repository is already connected to Cloudflare, edit `wrangler.jsonc` in GitHub and remove only the line containing `"/admin/",`. Commit the change to the production branch; Cloudflare should rebuild automatically. Or replace the repository contents with this corrected package, taking care not to remove customer-specific configuration files.
