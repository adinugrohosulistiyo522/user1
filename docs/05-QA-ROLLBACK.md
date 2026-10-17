# 05 — QA, diagnosis, keamanan, dan rollback

## A. Checklist sebelum dianggap live

- [ ] GitHub Actions `npm run check:all` sukses.
- [ ] Cloudflare Worker deployment sukses pada project customer yang benar.
- [ ] `GET /api` mengembalikan `appsScriptUrlConfigured: true`.
- [ ] Homepage publik tampil.
- [ ] Admin dapat dibuka melalui `/admin`.
- [ ] Login `SYSTEM_ADMIN` berhasil, kredensial unik per customer.
- [ ] Aktivasi lisensi aktif berhasil; kode invalid/expired ditolak.
- [ ] Profil/brand dapat disimpan dan bertahan setelah refresh.
- [ ] Upload foto menyimpan ke folder Drive customer, bukan folder global.
- [ ] Product Create/Edit/Delete berjalan; gambar/tautan tampil sesuai.
- [ ] Collection dan relasi produk bekerja.
- [ ] Semua 9 kategori dan 100 template dapat dipilih/preview.
- [ ] Website publik dibuka dari desktop dan ponsel.
- [ ] Analytics mencatat page view, click event dan halaman/rentang tanggal yang sesuai.
- [ ] Tidak ada spreadsheet Accounts atau Global License yang dishare publik.

## B. Error cepat

**`APPS_SCRIPT_URL_NOT_CONFIGURED`** — variable Worker belum ada/typo atau environment salah. Tambahkan sebagai Production variable di Settings > Variables and Secrets dan deploy versi baru.

**`APPS_SCRIPT_BAD_RESPONSE`** — biasanya URL bukan `/exec`, deployment Apps Script belum aktif, atau endpoint mengembalikan halaman login/HTML. Periksa kolom `APPS_SCRIPT_URL` dan access deployment.

**`LICENSE_API_NOT_CONFIGURED` / lisensi tidak dapat dihubungi** — periksa `LICENSE_API_URL` pada System_Config, `LICENSE_SERVER_URL` di Global Server Config, dan deployment License Server global. Jangan membuat server lisensi per customer.

**`403 org_internal` saat OAuth** — OAuth Audience mungkin Internal tetapi akun developer berasal dari luar organisasi. Untuk development dengan Gmail personal, sesuaikan Audience External jika diizinkan dan tambahkan akun sebagai Test User.

**Drive `ID file atau folder tidak valid`** — pastikan generator mendapat folder ID saja (bukan URL lengkap), dan folder diakses oleh akun yang menjalankan Apps Script.

## C. Keamanan penting

- Database Accounts menggunakan kolom Password yang kompatibel dengan backend sekarang; spreadsheet itu memuat kredensial dan wajib dibatasi ke admin tepercaya. Gunakan password unik dan kuat per customer. Jangan menaruh kredensial di README/GitHub.
- Global License Database memuat kode aktivasi, status, dan data pelanggan lisensi. Simpan private. License Server hanya digunakan untuk memvalidasi kode dan mengembalikan status yang diperlukan frontend.
- Folder induk Drive dan Database Master adalah aset administratif; jangan share “Anyone with the link”.
- `APPS_SCRIPT_URL` memang perlu dikirim kepada Cloudflare runtime sebagai konfigurasi; jangan menuliskannya hard-coded ke file client.
- Repository sebaiknya Private karena menyimpan source backend dan script operasional. Folder `public/` adalah aset statis yang dipublikasikan; `src/index.js` dan `src/api-proxy.js` dijalankan sebagai Worker code.

## D. Rollback

1. Jangan hapus deployment Apps Script lama yang mungkin masih digunakan.
2. Di Cloudflare Workers, pilih deployment terakhir yang sehat dan gunakan fitur rollback/Retry deployment sesuai opsi yang tersedia.
3. Jika code commit menyebabkan regresi, revert commit di branch `main`, lalu push. Git integration akan menjalankan deployment baru dari commit revert.
4. Jangan restore database dari workbook model kosong. Restore data hanya dari backup riil milik customer yang sesuai.
5. Jika `APPS_SCRIPT_URL` salah, kembalikan environment variable ke URL yang benar lalu redeploy.
