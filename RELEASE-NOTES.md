# Release Notes — Kliktiva Top100 Workers Deployment

## 1.1.0-top100-workers
- Mengubah target deployment dari Pages Functions menjadi Cloudflare Workers + Static Assets.
- Menambahkan `wrangler.jsonc` dengan `src/index.js` sebagai Worker entry point dan `public/` sebagai asset directory.
- Memindahkan API proxy ke `src/api-proxy.js` dan merutekan `/api` melalui Worker runtime.
- Menambahkan route `/admin` yang menyajikan `public/admin.html`.
- Environment variable `APPS_SCRIPT_URL` dipasang pada Worker yang memiliki script entry point.
- Menjaga arsitektur database per customer dan satu License Server global.
- Tidak mengubah deployment produksi lama.

## Hotfix deployment 1.1.1 — Wrangler route validation
- Removed the redundant exact `"/admin/"` entry from `assets.run_worker_first`; `"/admin/*"` already covers that route pattern and Wrangler 4.68.0 rejects the redundant entry.
- Added a static assertion to `scripts/check-workers.mjs` to prevent this regression.

## Hotfix deployment 1.1.2 — deploy-safety
- `compatibility_date` diubah ke `2026-01-15` (tanggal hari-ini/UTC bisa ditolak Cloudflare sebagai "masa depan" dan tidak didukung penuh runtime Wrangler 4.68.0).
- Worker tidak lagi me-rewrite `/admin` ke `/admin.html` (Workers Assets mengarahkan `/admin.html` kembali ke `/admin` sehingga terjadi redirect loop). `/admin` dan `/top100-admin` kini diminta ke asset layer lewat URL bersih, dengan fallback ke `.html` bila 404.
- Ditambahkan route `/top100-admin` di `run_worker_first` agar header noindex tetap berlaku.
- Ditambahkan script `build` no-op di `package.json` supaya build command `npm run build` di Cloudflare tidak gagal.
- Tes diperbarui (16 tes, semua lulus) dan pemeriksaan statis ditambah.
