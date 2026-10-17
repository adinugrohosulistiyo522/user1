# 03 — GitHub → Cloudflare Workers (bukan Pages)

Paket ini menggunakan **Cloudflare Workers Builds + Static Assets**. Ini penting karena UI harus menayangkan `public/`, sedangkan kode Worker perlu berjalan untuk `/api` dan membaca `APPS_SCRIPT_URL` dari Variables & Secrets.

## A. Buat repository GitHub

1. Buat repository **Private** untuk satu customer, misalnya `kliktiva-top100-customer-001`.
2. Ekstrak ZIP ini dan upload isi folder `Kliktiva_Top100_Complete_Deployment` ke root repository, bukan folder pembungkus.
3. Root repository harus langsung memiliki `public/`, `src/`, `wrangler.jsonc`, `package.json`, `Code.gs`, `google-apps-script/`, `database-models/`, `docs/`, `scripts/`, `test/`, dan `.github/`.
4. Commit ke branch `main`. GitHub Actions akan menjalankan `npm run check:all`; itu adalah validasi, bukan deployment Cloudflare.

## B. Buat Worker baru dari GitHub

1. Buka Cloudflare Dashboard → **Workers & Pages** → **Create application**.
2. Pilih **Import a repository / GitHub** (nama label dapat berubah), lalu hubungkan GitHub dan pilih repository customer.
3. Gunakan nama Worker yang sama persis dengan `name` dalam `wrangler.jsonc`. Default paket adalah `kliktiva-top100-customer-001`. Jika memilih nama lain, ubah `wrangler.jsonc` agar cocok sebelum deploy.
4. Root directory: root repository.
5. Build command: `npm run check:all`.
6. Deploy command: `npx wrangler deploy` (atau `npm run deploy`).
7. Pastikan konfigurasi Worker menggunakan `wrangler.jsonc` dari repository. File itu menyatakan entry point `src/index.js` dan aset statis pada `public/` dengan binding `ASSETS`.
8. Klik **Save and Deploy**.

Jangan gunakan Worker lama yang hanya berisi static assets seperti `user1` tanpa script entrypoint. Worker perlu memiliki `src/index.js` sebagai `main` agar bisa menjalankan route `/api` dan menyediakan Runtime Variables & Secrets.

## C. Apa yang dikerjakan Worker

- Static assets di `public/` dilayani melalui Cloudflare Workers Static Assets.
- `src/index.js` menjadi entrypoint Worker.
- `src/api-proxy.js` memuat proxy API dengan action allowlist.
- `wrangler.jsonc` mengatur `run_worker_first` pada `/api`, `/admin`, dan route terkait. Permintaan statis lain bisa dilayani layer asset tanpa memanggil kode Worker terlebih dahulu.
- `/admin` dipetakan ke `public/admin.html`.
- Folder `functions/` khusus Cloudflare Pages tidak digunakan dalam paket Worker.

## D. Isi `APPS_SCRIPT_URL`

Setelah Worker pertama berhasil dideploy:

1. Buka Workers & Pages → Worker customer → **Settings** → **Variables and Secrets**.
2. Tambahkan variable pada environment Production:
   - Name: `APPS_SCRIPT_URL`
   - Value: URL Web App customer dari Database Master → tab `Apps Script Deployments`, berakhiran `/exec`.
3. Save. Jika Dashboard meminta deployment baru atau versi baru untuk menerapkan perubahan, ikuti instruksinya.

Jangan menaruh `APPS_SCRIPT_URL` di HTML, `src/`, `wrangler.jsonc`, atau commit GitHub. Jangan simpan Database Accounts atau kode aktivasi di repo. `LICENSE_SERVER_URL` tetap global dan dikonfigurasi pada database/backend customer; jangan membuat License Server per customer.

## E. Deployment otomatis dari GitHub

Untuk Worker yang sudah terhubung ke repository, buka Worker → Settings → Builds dan pastikan GitHub integration aktif. Push/merge commit ke branch `main` memicu build dan deploy otomatis. Pull request dapat membuat preview sesuai pengaturan Workers Builds. Nama Worker di Dashboard harus sama dengan `name` di `wrangler.jsonc`.

## F. Uji endpoint dan halaman

Setelah `APPS_SCRIPT_URL` terpasang, buka:

- `https://<nama-worker>.<subdomain>.workers.dev/api` — harus merespons JSON dengan `ok: true` dan `appsScriptUrlConfigured: true`, tanpa membocorkan URL.
- `https://<nama-worker>.<subdomain>.workers.dev/` — website publik.
- `https://<nama-worker>.<subdomain>.workers.dev/admin` — Admin.

Lalu uji login, lisensi, simpan profil, upload gambar, produk, koleksi, 100 template, tampilan ponsel, dan Analytics.

## G. Custom domain

Setelah domain `workers.dev` lulus uji, buka Worker → Settings/Domains & Routes (atau Domains) dan tambahkan custom domain mengikuti instruksi Cloudflare untuk zona domain yang dikelola. Pastikan custom domain mengarah ke Worker yang benar.

## Dokumentasi resmi

- Workers Git integration: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/
- Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/
- Static assets configuration: https://developers.cloudflare.com/workers/static-assets/binding/
- Runtime variables: https://developers.cloudflare.com/workers/configuration/environment-variables/

### Troubleshooting — `Invalid routes in run_worker_first`
If Wrangler reports that `/admin/` is redundant because `/admin/*` already covers it, ensure the `assets.run_worker_first` array in `wrangler.jsonc` contains `/admin` and `/admin/*` but **not** the separate `/admin/` entry. The corrected package already applies this fix.
