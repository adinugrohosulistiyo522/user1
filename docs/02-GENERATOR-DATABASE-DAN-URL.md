# 02 — Jalankan generator, database baru, dan URL Apps Script

## A. Fungsi yang dipakai

Setelah `preflightKliktivaAppsScriptApi()` sukses, jalankan `createKliktivaTop100DatabaseSet()`. Perhatikan: **setiap kali fungsi ini dijalankan, satu dataset customer baru dibuat**. Jangan klik dua kali jika satu customer saja yang sedang dibuat. Nomor folder dihitung sebagai `MAX(NO ID) + 1` dari Database Master.

## B. Pada eksekusi pertama

Generator akan menyiapkan satu kali: 

- Spreadsheet `KLIKTIVA TOP100 - DATABASE MASTER` dan tab `Database Master`
- Tab tambahan `Global Server Config`
- Tab tambahan `Apps Script Deployments`
- Satu spreadsheet **Global License Database** (di folder induk/admin, bukan di folder tiap customer)
- Satu Apps Script **License Server global** dan satu Web App URL bersama

Lalu, untuk customer pertama, membuat folder bernomor, Database Operasional Top100, Accounts, Analytics, folder `Uploads`, manifest/README, satu project Apps Script backend customer, serta deployment Web App customer.

## C. Pada eksekusi berikutnya

License Server global yang tercatat akan dipakai kembali. Generator membuat folder, tiga spreadsheet customer, dan backend/deployment baru. Database Master mendapat satu baris baru. Tidak ada Database Lisensi baru per customer.

## D. Di mana URL disimpan?

1. Buka spreadsheet **Database Master** di folder induk.
2. Tab `Apps Script Deployments`: kolom `APPS_SCRIPT_URL` berisi URL `/exec` unik per customer dan status deployment.
3. Tab `Global Server Config`: berisi `LICENSE_SERVER_URL`, `LICENSE_DATABASE_ID`, `LICENSE_DEPLOYMENT_ID`, dan konfigurasi server pusat. URL ini sama untuk seluruh customer.
4. Dalam Database Operasional customer, tab `System_Config` menyimpan `APPS_SCRIPT_URL`, `APPS_SCRIPT_PROJECT_ID`, `APPS_SCRIPT_DEPLOYMENT_ID`, dan `LICENSE_API_URL`/`LICENSE_SERVER_URL`.
5. Folder customer berisi `DATABASE-SET-MANIFEST.json` dan `README - SET DATABASE.txt` yang merangkum URL dan ID set.

## E. Buat akun SYSTEM_ADMIN pertama

Generator sengaja tidak membuat password default yang sama untuk semua customer. Setelah customer dibuat:

1. Buka URL editor Apps Script customer dari kolom `SCRIPT_EDITOR_URL` di `Apps Script Deployments`.
2. Buka **Project Settings > Script Properties** dan tambahkan `INITIAL_SYSTEM_ADMIN_USERNAME` dan `INITIAL_SYSTEM_ADMIN_PASSWORD` dengan nilai yang kamu tentukan. Password minimal 10 karakter; gunakan password unik.
3. Pada dropdown fungsi, jalankan `createInitialSystemAdmin()` satu kali.
4. Fungsi menghapus nilai Script Property password setelah membuat akun. Simpan kredensial dengan aman untuk admin customer. Spreadsheet Accounts harus tetap private.

## F. Keamanan dan lisensi

- Global License Database hanya untuk admin Kliktiva; jangan bagikan secara publik.
- `LICENSE_SERVER_URL` adalah URL umum Web App, tetapi Database Lisensi tetap private.
- Backend customer memakai `LICENSE_API_URL` dan memvalidasi ke License Server pusat.
- URL web app customer diatur oleh generator. Jika kelak kamu membuat deployment baru secara manual dan URL berubah, perbarui `APPS_SCRIPT_URL` di Cloudflare.
- Jika generator gagal setelah membuat sebagian resource, periksa status/notes di Database Master dan tab `Apps Script Deployments` sebelum memutuskan apakah harus menjalankan lagi. Eksekusi baru memang membuat dataset berikutnya, bukan resume dataset gagal.
