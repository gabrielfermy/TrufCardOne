# Local Setup & Infrastructure Guide - Game Night Suite

Dokumen ini berisi panduan teknis langkah demi langkah untuk menyiapkan lingkungan pengembangan lokal (*local development environment*), menjalankan Supabase lokal dengan Docker, melakukan migrasi database multi-tenant, dan menjalankan aplikasi web dan mobile Capacitor.

---

## 1. Prasyarat Sistem
Pastikan perangkat Anda memiliki:
- **Node.js** (Versi 18+ atau 20+ LTS direkomendasikan)
- **Docker Desktop** (Diperlukan untuk menjalankan Supabase lokal)
- **Git CLI**
- **Android Studio** (Opsional, jika ingin meng-compile APK / menjalankan di emulator Android)

---

## 2. Struktur Repositori & Instalasi Dependensi

1. Clone repositori dan instal dependensi npm:
   ```bash
   npm install
   ```

2. Instal dependensi pendukung untuk Capacitor dan hardware audio/haptics:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen @capacitor/app @capacitor-community/keep-awake
   ```

---

## 3. Menjalankan Supabase Lokal (Database, Auth, Realtime)

Supabase lokal menyediakan lingkungan PostgreSQL terisolasi lengkap dengan dashboard Studio dan server WebSocket Realtime:

1. Inisialisasi Supabase (jika belum ada):
   ```bash
   npx supabase init
   ```
2. Jalankan container Supabase lokal (pastikan Docker Desktop aktif):
   ```bash
   npx supabase start
   ```
   Setelah proses selesai, terminal akan menampilkan kredensial lokal:
   ```text
   API URL: http://localhost:54321
   GraphQL URL: http://localhost:54321/graphql/v1
   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
   Studio URL: http://localhost:54323
   anon key: eyJhbGci...
   service_role key: eyJhbGci...
   ```
3. Terapkan file migrasi skema database multi-tenant terbaru:
   ```bash
   npx supabase db reset
   ```
4. Buka **Supabase Studio** di browser Anda: `http://localhost:54323` untuk menginspeksi tabel `profiles`, `game_sessions`, `game_rounds`, dan `player_scores`.

---

## 4. Konfigurasi Variabel Lingkungan (`.env.local`)

Buat atau perbarui file `.env.local` di root folder proyek:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=masukkan_anon_key_dari_supabase_start_di_atas
```

*(Untuk mode produksi di Vercel, arahkan kedua variabel di atas ke URL dan Anon Key proyek Supabase Cloud Anda).*

---

## 5. Menjalankan Server Pengembangan Frontend (Web)

Jalankan server Vite lokal:
```bash
npm run dev
```
Buka browser di `http://localhost:5173`. Aplikasi langsung dapat diakses dengan responsivitas mobile dan desktop.

---

## 6. Menjalankan di Perangkat Mobile (Capacitor)

1. Build aset web produksi:
   ```bash
   npm run build
   ```
2. Sinkronkan aset ke folder native:
   ```bash
   npx cap sync
   ```
3. Buka proyek native di Android Studio:
   ```bash
   npx cap open android
   ```
4. Di Android Studio, tekan tombol **Run (▶)** untuk meluncurkan aplikasi di HP fisik atau Emulator Android.

---

## 7. Pengujian & Linting Kode
- **Uji Build Produksi**: `npm run build`
- **Linter Cepat**: `npx oxlint`

---

## 8. Otomatisasi CI/CD Database Migration (GitHub Actions)

Proyek ini telah dilengkapi pipeline otomatisasi migrasi database menggunakan GitHub Actions di `.github/workflows/supabase-migration.yml`. Setiap kali ada file SQL baru di `supabase/migrations/` yang di-merge ke branch `master`, sistem akan otomatis menjalankan `supabase db push` ke Supabase Cloud (serupa dengan `php artisan migrate` di Laravel).

### Konfigurasi GitHub Repository Secrets:
Buka repositori GitHub Anda di **Settings > Secrets and variables > Actions**, lalu tambahkan 3 secrets:
1. `SUPABASE_ACCESS_TOKEN`: Dibuat di [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens).
2. `SUPABASE_PROJECT_ID`: Reference ID proyek Anda (misal: `abcdefghijklmno`).
3. `SUPABASE_DB_PASSWORD`: Password database PostgreSQL yang ditentukan saat pembuatan proyek Supabase.

