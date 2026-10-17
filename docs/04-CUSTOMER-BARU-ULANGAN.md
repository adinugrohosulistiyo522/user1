# 04 — Prosedur membuat customer baru (ulang)

Ikuti checklist ini untuk setiap customer setelah generator satu kali setup dan License Server global sudah aktif.

1. Buka project Apps Script `Kliktiva Top100 AutoDeploy` dan jalankan `createKliktivaTop100DatabaseSet()` **satu kali saja**.
2. Tunggu hingga Execution log menampilkan `KLIKTIVA TOP100 DATASET + APPS SCRIPT BERHASIL DIBUAT` dan status `COMPLETE`.
3. Catat `NO ID`, folder customer, Database Operasional, Accounts, Analytics, dan `APPS_SCRIPT_URL`. URL juga berada di Database Master > `Apps Script Deployments`.
4. Siapkan repository GitHub baru untuk customer. Cara aman: buat repository dari template repository Private, atau upload isi paket ini ke repository Private baru. Jangan memakai repository customer lain jika tiap customer perlu riwayat/akses terpisah sesuai operasi Kliktiva.
5. Hubungkan repository baru ke Worker baru yang terhubung ke repository GitHub. Gunakan Workers Builds settings pada tutorial 03.
6. Set `APPS_SCRIPT_URL` untuk customer baru. **Jangan menggunakan URL customer sebelumnya.**
7. Jalankan tes `/api`, website, Admin, login, aktivasi, upload dan Analytics.
8. Tambahkan custom domain bila siap.

URL tetap:
- `APPS_SCRIPT_URL`: unik per customer.
- `LICENSE_SERVER_URL`: global, satu URL untuk seluruh customer.

Hindari dua kali klik Run pada generator. Setiap pemanggilan yang berhasil mengalokasikan NO ID baru. Jika gagal, periksa Database Master dan `Apps Script Deployments` lebih dulu; jangan mengulang secara buta karena generator bukan mode resume.
