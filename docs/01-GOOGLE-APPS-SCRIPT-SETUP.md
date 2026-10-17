# 01 — Persiapan Google Cloud, OAuth, dan Apps Script API

Lakukan langkah ini satu kali pada akun Google yang mengelola Kliktiva. Nama menu dapat sedikit berbeda mengikuti UI Google.

## A. Buat project Apps Script generator

1. Buka `https://script.google.com/home` lalu buat project baru bernama `Kliktiva Top100 AutoDeploy`. Gunakan project generator terpisah; jangan mengubah project backend customer atau script produksi lama.
2. Di editor, buka **Project Settings** (ikon roda gigi) dan aktifkan opsi untuk menampilkan file manifest `appsscript.json` di editor.
3. Buat/ganti `Kode.gs` dengan isi `google-apps-script/generator/Kode.gs`.
4. Isi `PARENT_FOLDER_ID` menggunakan ID folder induk Google Drive yang benar (ID saja, bukan URL lengkap). Pastikan akun yang menjalankan script punya akses Editor ke folder itu. Isi ini di Apps Script editor pribadi, jangan commit ID tersebut ke GitHub.
5. Ganti isi `appsscript.json` di project generator menggunakan file paket `google-apps-script/generator/appsscript.json`, lalu simpan.

## B. Hubungkan Google Cloud project standar

1. Buka Project Settings Apps Script, bagian **Google Cloud Platform (GCP) Project**. Kalau masih `Default`, buat/pilih project Google Cloud yang khusus untuk AutoDeploy, misalnya `Kliktiva Top100 AutoDeploy`.
2. Dari Google Cloud Console, salin **Project number** (angka), bukan Project ID berbentuk teks. Masukkan pada Apps Script lalu klik **Set project / Tetapkan project**. Penggantian dari GCP Default bersifat penting; lakukan pada project generator baru, bukan project Apps Script lama yang masih dibutuhkan.
3. Google Cloud Console > **APIs & Services > Library**: aktifkan **Google Apps Script API** dan **Google Drive API** pada project yang benar. Generator juga memakai Drive/Sheets Apps Script services. Jika akun tidak boleh mengaktifkan service, pemilik/administrator GCP harus memberi izin yang tepat.
4. Buka `https://script.google.com/home/usersettings` dan aktifkan akses Google Apps Script API bagi aplikasi yang kamu kelola, bila toggle tersebut ditampilkan.
5. Jika pernah muncul `403: org_internal` karena OAuth Audience internal tetapi login memakai Gmail personal, buka **Google Cloud > Google Auth Platform > Audience**, ubah User type ke **External** untuk pengembangan bila opsi diizinkan, lalu tambahkan akun yang digunakan ke **Test users**. Simpan. Jangan publikasikan aplikasi OAuth untuk publik; ini hanya untuk akses developer selama pengembangan.
6. Kembali ke Apps Script, simpan, pilih fungsi `preflightKliktivaAppsScriptApi`, lalu klik Run. Setujui scope yang diminta. Target sukses ialah log `PREFLIGHT_OK` dan `projectContentReadable: true`.

## C. Jika preflight gagal

- `403 org_internal`: Audience masih Internal atau akun bukan bagian dari organisasi yang diizinkan.
- `Izin ditolak saat mengaktifkan API: drive`: buka Google Drive API di Cloud Console dan klik Enable secara manual; akun harus punya hak mengaktifkan API.
- `HTTP 400 INVALID_ARGUMENT`: gunakan generator final yang memeriksa project menggunakan `ScriptApp.getScriptId()`—jangan versi lama dengan fake ID.
- `Apps Script API ... 401/403`: pastikan Apps Script API Enabled, toggle user settings aktif, manifest scope tersimpan, lalu jalankan ulang untuk otorisasi ulang.
- `ID file atau folder tidak valid`: `PARENT_FOLDER_ID` salah/terpotong atau tidak dapat diakses. Gunakan ID dari URL `drive.google.com/drive/folders/<ID>`, tanpa bagian URL lain.

Jangan jalankan fungsi pembuatan dataset sebelum preflight lulus.

Referensi resmi:
- Apps Script API setup: https://developers.google.com/apps-script/api/how-tos/enable
- Manage Apps Script projects: https://developers.google.com/apps-script/api/how-tos/manage-projects
- Apps Script cloud projects: https://developers.google.com/apps-script/guides/cloud-platform-projects
