# Kliktiva — Paket Upgrade Produksi Top100

**Status:** paket kandidat upgrade untuk staging/pengujian. Paket ini belum dipublikasikan ke Cloudflare dan belum diuji terhadap spreadsheet/akun pelanggan live.

## Tujuan paket

Paket ini mengganti layout website publik dan area kerja Admin dengan sistem template Top100, sementara autentikasi, sesi/login, pemeriksaan lisensi, proxy `/api`, manajemen akun administrator, serta modul Analytics di-host oleh halaman Admin produksi tetap dipertahankan.

- `public/top100-admin.html` — Admin/preview berbasis Top100.
- `public/top100-renderer.html` — renderer website publik untuk 100 template.
- `public/admin.html` — shell Admin produksi, login, sesi, Accounts, Analytics produksi, dan bridge aman ke Admin Top100.
- `public/index.html` — alur publik produksi: pemeriksaan lisensi, cache/retry, tracking Analytics, dan bridge renderer Top100.
- `src/api-proxy.js` — proxy Cloudflare Workers ke Apps Script dengan action allowlist.
- `Code.gs` — backend Apps Script produksi ditambah API/state Top100 dan pembuatan sheet tambahan secara aditif.
- `License_Server.gs` — mekanisme lisensi yang sudah ada; tidak diganti desainnya.

## Komposisi template

| Kategori | Template | ID |
|---|---:|---|
| Affiliator | 20 | 1–10, 21–25, 66–70 |
| Content Creator | 10 | 11–20 |
| UMKM / Small Business | 10 | 26–35 |
| Edukasi / Pendidikan | 10 | 36–45 |
| Marketing / Agency | 10 | 46–55 |
| Usaha Kuliner | 10 | 56–65 |
| Komunitas dan Organisasi | 10 | 71–80 |
| Entertainment | 10 | 81–90 |
| Jasa Profesional | 10 | 91–100 |

**Catatan:** urutan/kelompok kategori mengikuti katalog Top100 di Admin; ID template lama dipertahankan dan template tambahan memakai ID 66–100 tanpa menggeser 1–65.

## Model database Google Sheets

File `Database_Project_Bio_Affiliate_Toko.xlsx` di paket adalah **model/rujukan struktur** untuk spreadsheet operasional. File tersebut bukan salinan data produksi live. Jangan mengganti spreadsheet produksi yang sudah terhubung ke Script Properties dengan workbook kosong ini.

### Sheet lama yang dipertahankan

- `Products` — master produk yang menjadi sumber kompatibilitas untuk sistem lama dan baru.
- `Collections` — master koleksi.
- `Settings` — pengaturan brand, tautan, dan kunci konfigurasi.
- `PETUNJUK` — petunjuk workbook.

### Sheet tambahan Top100 (aditif)

1. `Top100_Links` — `LinkID, Type, Label, URL, Status, UrutanTampilan, Dibuat Pada, Diubah Pada`.
2. `Top100_Product_Metadata` — `ProductID, Deskripsi Produk, Tipe Link, Link Gambar 2, Link Gambar 3, Dibuat Pada, Diubah Pada`.
3. `Top100_Collection_Metadata` — `CollectionID, Status Publikasi, Deskripsi Koleksi, Foto Cover, Dibuat Pada, Diubah Pada`.
4. `Top100_Product_Collections` — `ProductID, CollectionID, UrutanRelasi, Dibuat Pada, Diubah Pada`.

`Settings` menambahkan kunci seperti `uiTemplate`, `about`, `seoTitle`, `seoDescription`, `address`, `locationMode`, `coordinates`, `mapsUrl`, pengaturan banner, `homeVisibility`, `homeLabels`, daftar favorit, `navigationItems`, `top100Font`, `top100Language`, dan `top100SidebarCollapsed`. Kunci yang belum ada akan ditulis oleh backend saat diperlukan.

Backend akan membuat empat sheet Top100 tersebut saat panggilan API pertama jika belum tersedia, dan menambahkan header yang belum ada tanpa menghapus sheet lama. Database Accounts, Analytics, dan Lisensi tetap memakai workbook terpisah seperti arsitektur produksi.

### Sebelum migrasi

1. Buat backup terpisah untuk spreadsheet operasional, Accounts, Analytics, dan Lisensi.
2. Periksa `Script Properties` Apps Script saat ini: ID spreadsheet utama, ID Accounts, ID Analytics, dan property lisensi. Pertahankan ID yang memang masih digunakan.
3. Jangan mengimpor workbook model di atas ke spreadsheet live dengan opsi yang menimpa sheet; gunakan hanya sebagai referensi struktur. Setelah versi Apps Script baru ter-deploy, backend menyiapkan tab tambahan secara otomatis.
4. Uji satu akun/site staging dengan beberapa produk, koleksi, foto, tautan WhatsApp, dan Analytics sebelum menerapkan ke pelanggan.

## Urutan upgrade staging

1. **Backup** repo Cloudflare dan seluruh spreadsheet yang digunakan.
2. Buat branch/repository staging baru; jangan langsung mengganti deployment produksi.
3. Deploy file Apps Script `Code.gs` yang baru. Pertahankan `License_Server.gs` dan properti rahasia/ID yang sudah benar. Buat versi deployment Web App baru atau perbarui deployment yang ada. Jika URL `/exec` berubah, perbarui `APPS_SCRIPT_URL` pada Cloudflare Workers.
4. Upload isi paket ini ke repository staging (isi folder paket menjadi root repository).
5. Cloudflare Workers Builds: `wrangler.jsonc` menjadi konfigurasi sumber kebenaran. Set variable `APPS_SCRIPT_URL` pada Worker Settings > Variables and Secrets.
6. Jalankan pemeriksaan lokal `npm run check:all`.
7. Uji login seluruh role, license aktif/kedaluwarsa, penyimpanan brand, upload foto, 100 template, tambah/edit/hapus produk, relasi multi-Collection, tautan Find Me, website publik, tracking klik/page view, serta filter Analytics.
8. Setelah semua test lulus, baru rencanakan penggantian production deployment. Jangan melakukan cutover hanya berdasarkan lulus sintaks.

## Pengecekan yang sudah dilakukan pada paket ini

- Sintaks `Code.gs`, `src/index.js`, dan `src/api-proxy.js` diverifikasi.
- Script inline pada empat halaman HTML diperiksa sintaksnya.
- Pemeriksaan paket dan 11 test otomatis Cloudflare Worker tersedia melalui `npm run check:all`.
- Sheet tambahan dan header model workbook diverifikasi dengan `artifact_tool`.

## Batasan validasi

Belum dilakukan deployment, browser end-to-end pada akun Cloudflare, panggilan ke Web App Apps Script aktif, validasi data pelanggan live, atau pengujian semua 100 layout lintas perangkat. Perlakukan hasil ini sebagai paket staging kandidat sampai checklist manual lulus.
