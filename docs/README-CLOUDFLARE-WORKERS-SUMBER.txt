KLIKTIVA TOP100 — CLOUDFLARE WORKERS

Paket ini menggunakan Cloudflare Workers Builds dan Workers Static Assets, bukan Pages Functions.

- Root repository: src/, public/, wrangler.jsonc, package.json, Code.gs, docs/.
- Worker entry point: src/index.js.
- Static assets: public/ via binding ASSETS.
- API proxy: src/api-proxy.js dipanggil oleh entry point Worker untuk /api.
- Set APPS_SCRIPT_URL lewat Worker Settings > Variables and Secrets.
- Pastikan nama Worker pada Dashboard sama dengan properti name dalam wrangler.jsonc.
- Jangan gunakan Worker existing yang hanya static assets tanpa script entry point; import repository agar Worker memiliki runtime code.
