# Validation Report — Kliktiva Top100 Production Upgrade

## Ringkasan status

**Paket staging kandidat. Belum di-deploy ke production.**

## Pemeriksaan otomatis

- `npm run check:all`: lulus.
- Sintaks `Code.gs`: lulus pemeriksaan parser JavaScript (sintaks Apps Script yang dipakai paket).
- Sintaks `src/api-proxy.js` dan `src/index.js`: lulus.
- Inline JavaScript pada `public/index.html`, `public/admin.html`, `public/top100-admin.html`, dan `public/top100-renderer.html`: lulus pemeriksaan parser.
- Katalog UI: 100 entri, ID 1–100 unik dan tidak bolong.
- Kategori: tepat 9 kategori; Affiliator 20 template dan delapan kategori lain masing-masing 10.
- Paket Workers final menjalankan `test/worker.test.mjs`; lihat `VALIDATION-REPORT-WORKERS.md` untuk jumlah tes terbaru.
- Workbook model diperiksa menggunakan `artifact_tool`: sheet lama dan empat sheet tambahan ditemukan; header sesuai model.

## Perlindungan migrasi

- `License_Server.gs` tidak dimodifikasi dari baseline paket produksi.
- Database Accounts, Analytics, dan Lisensi pada paket tidak dimodifikasi.
- Analytics pada Admin induk tetap menggunakan action backend produksi `adminGetAnalytics`.
- Login dan session token tetap berada pada halaman Admin induk; iframe Top100 berkomunikasi melalui `postMessage` pada origin yang sama dan tidak menerima token.
- Empat sheet `Top100_*` dibuat secara aditif oleh backend bila belum ada.
- Penulisan `Products` dan `Collections` diperbarui secara kolom terkelola agar kolom khusus tambahan tidak ditimpa untuk ID yang masih ada. Baris hanya dikosongkan saat produk/koleksi tersebut memang dihapus melalui Admin.
- File `Database_Project_Bio_Affiliate_Toko.xlsx` adalah model struktur, bukan pengganti spreadsheet operasional live.

## Belum diuji

- Deployment Cloudflare Worker aktual pada akun pemilik.
- Panggilan langsung ke URL Web App Apps Script serta Script Properties live.
- Uji browser end-to-end dengan akun berlisensi untuk semua role.
- Upload foto real ke Google Drive, izin file, limit/quota Apps Script, dan konsistensi semua operasi produk/koleksi pada Google Sheets live.
- Uji visual manual pada seluruh 100 template serta ukuran desktop/mobile.

## Kriteria sebelum cutover production

1. Backup repo dan keempat spreadsheet terpisah (operasional, Accounts, Analytics, lisensi).
2. Jalankan staging dengan database salinan; jangan pertama kali menguji dengan spreadsheet produksi yang aktif.
3. Tes login, role, validasi lisensi, penyimpanan Home Page/Find Me/Collections/Produk/Pilihan Template, dan upload foto.
4. Verifikasi public site memakai template tersimpan setelah refresh, produk dan multi-Collection tampil benar, CTA lisensi tetap berfungsi, dan Analytics mencatat serta menampilkan page view/klik sesuai periode.
5. Uji site lama dan migrasi rollback sebelum cutover.
6. Baru setelah hasil tes manual lulus, rencanakan penggantian deployment produksi.
