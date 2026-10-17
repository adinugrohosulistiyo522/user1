# Kliktiva Top100 — GitHub + Cloudflare Workers + Apps Script AutoDeploy

Paket ini adalah **deployment baru berbasis Cloudflare Workers**, bukan Cloudflare Pages. Frontend disajikan sebagai Workers Static Assets, sementara Worker runtime menjalankan proxy `/api` dan membaca `APPS_SCRIPT_URL` dari Variables & Secrets.

## Isi paket

- `public/` — website publik Top100, Admin, preview, renderer, dan aset statis.
- `src/index.js` — entry point Worker; menangani `/api`, route `/admin`, lalu menggunakan binding `ASSETS` untuk aset.
- `src/api-proxy.js` — proxy aman ke backend Apps Script dengan action allowlist.
- `wrangler.jsonc` — nama Worker, entry point, static assets, binding `ASSETS`, dan `run_worker_first` untuk route dinamis.
- `.github/workflows/validate.yml` — validasi otomatis pada push dan pull request; deploy diproses Cloudflare Workers Builds.
- `google-apps-script/generator/` — generator satu dataset customer per eksekusi, License Server global yang digunakan bersama, dan auto-deploy backend Apps Script customer.
- `google-apps-script/templates/` — template `Code.gs` customer dan License Server global.
- `database-models/` — workbook referensi struktur database, bukan data customer aktual.
- `docs/` — tutorial Google Apps Script, dataset, Workers/GitHub, onboarding customer, dan QA/rollback.

## Arsitektur

```text
GitHub repository per customer
  ├── public/               -> Cloudflare Workers Static Assets
  ├── src/index.js           -> Worker runtime
  ├── src/api-proxy.js       -> GET/POST /api
  └── APPS_SCRIPT_URL        -> variable khusus customer
                                  |
                                  v
                        Apps Script Code.gs customer
                          ├─ Operational Database
                          ├─ Accounts Database
                          ├─ Analytics Database
                          └─ LICENSE_API_URL
                                  |
                                  v
                     satu License Server global
                                  |
                                  v
                       Global License Database
```

Database Master induk mencatat `Database Master`, `Global Server Config`, dan `Apps Script Deployments`. Setiap customer memiliki `APPS_SCRIPT_URL` berbeda, sedangkan `LICENSE_SERVER_URL` digunakan bersama.

## Mulai dari sini

1. [01 — Persiapan Google & Apps Script API](docs/01-GOOGLE-APPS-SCRIPT-SETUP.md)
2. [02 — Generator database dan URL](docs/02-GENERATOR-DATABASE-DAN-URL.md)
3. [03 — GitHub + Cloudflare Workers](docs/03-GITHUB-CLOUDFLARE-WORKERS.md)
4. [04 — Membuat customer berikutnya](docs/04-CUSTOMER-BARU-ULANGAN.md)
5. [05 — QA, diagnosis, dan rollback](docs/05-QA-ROLLBACK.md)
6. [Laporan validasi paket Workers](docs/VALIDATION-REPORT-WORKERS.md)

## Penting sebelum deploy

- Gunakan repository GitHub **Private** dan satu Worker per customer.
- Pada `wrangler.jsonc`, properti `name` harus sama persis dengan nama Worker pada Cloudflare. Default paket: `kliktiva-top100-customer-001`.
- Jangan menaruh `APPS_SCRIPT_URL`, password, kode aktivasi, OAuth credentials, atau data Accounts ke GitHub.
- Isi `APPS_SCRIPT_URL` melalui Worker → Settings → Variables and Secrets setelah Worker code berhasil di-deploy.
- `public/` adalah aset yang diterbitkan. Jangan memindahkan file `.gs`, database model, atau tutorial ke `public/`.
- Jangan hubungkan repository ini ke Worker produksi lama. Buat Worker baru untuk development/customer pertama.

## Worker configuration

`wrangler.jsonc` mengatur:

- `main: src/index.js` — Worker runtime sehingga Variables & Secrets dapat digunakan.
- `assets.directory: ./public/` dan `binding: ASSETS` — penyajian file statis.
- `run_worker_first` pada `/api` dan `/admin` — permintaan tersebut melewati Worker; aset lain tetap dapat dilayani langsung oleh layer static-assets.

Ini berbeda dari Worker yang hanya memiliki static assets tanpa entry point code. Worker statis saja tidak dapat menjalankan proxy ini dan dashboard tidak menampilkan pengaturan runtime variables/bindings yang dibutuhkan.

## Validasi lokal

```bash
npm install
npm run check:all
```

## Deployment status

Source dan paket ini diperiksa secara lokal. Deployment live ke akun Cloudflare/Google pengguna belum dijalankan oleh paket ini. Ikuti tutorial dan lakukan uji end-to-end sebelum menganggap customer production siap.
