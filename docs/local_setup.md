# Local Setup & Infrastructure Guide - Truf Card Game Score Tracker

Dokumen ini berisi panduan untuk menyiapkan infrastruktur lokal proyek agar dapat dijalankan dan diuji secara offline sebelum di-deploy secara live ke Vercel dan Supabase Cloud.

---

## 1. Prasyarat Sistem
Pastikan perangkat Anda sudah terinstal:
- [Node.js](https://nodejs.org/) (Versi 18+ direkomendasikan)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Diperlukan jika ingin menjalankan database Supabase secara lokal)
- Git CLI

---

## 2. Setup Awal Git & Workspace
Workspace telah diinisialisasi dengan repositori Git. Buat file `.gitignore` di root folder proyek untuk mengecualikan file dependensi dan variabel lingkungan rahasia.

### 2.1. File `.gitignore` [NEW]
```text
# Dependency directories
node_modules/
dist/
dist-ssr/
*.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Supabase local config
supabase/.temp/
```

---

## 3. Setup Frontend Lokal (Vite + React)
Untuk membuat proyek frontend menggunakan Vite + React dengan TypeScript/JavaScript:

1. Jalankan perintah pembuatan proyek di root direktori:
   ```bash
   npm create vite@latest ./ -- --template react
   ```
2. Instal dependensi dasar:
   ```bash
   npm install
   ```
3. Instal library Supabase JS SDK:
   ```bash
   npm install @supabase/supabase-js
   ```

---

## 4. Setup Supabase Lokal (Database & Auth)
Menjalankan Supabase secara lokal sangat direkomendasikan agar Anda dapat melakukan migrasi database, menguji database trigger, dan menguji relasi tabel di komputer Anda sebelum live.

1. Instal Supabase CLI secara global (atau jalankan via npx):
   ```bash
   npm install supabase --save-dev
   ```
2. Inisialisasi konfigurasi Supabase di proyek:
   ```bash
   npx supabase init
   ```
   Perintah ini akan membuat folder `/supabase` di root proyek.
3. Jalankan Supabase lokal menggunakan Docker:
   ```bash
   npx supabase start
   ```
   *Catatan: Docker Desktop harus dalam keadaan aktif.* Perintah ini akan meluncurkan tiruan dari seluruh ekosistem Supabase di komputer Anda (PostgreSQL, Auth, Studio, dll.) dan menampilkan URL API lokal serta kunci anonim (Anon Key).
4. Buat file migrasi untuk skema database (menggunakan kode SQL dari `architecture.md`):
   ```bash
   npx supabase migration new init_truf_schema
   ```
   Buka file `.sql` yang baru dibuat di `supabase/migrations/` dan masukkan skrip pembuatan tabel, kebijakan RLS, serta trigger sinkronisasi profil pengguna.
5. Jalankan migrasi lokal:
   ```bash
   npx supabase db reset
   ```

---

## 5. Konfigurasi Google OAuth (SSO) Lokal
Agar Google Auth dapat diuji secara lokal:
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru dan buka menu **APIs & Services > Credentials**.
3. Buat **OAuth client ID** dengan jenis aplikasi **Web application**.
4. Tambahkan URL Pengalihan Resmi (Authorized Redirect URIs):
   - Masukkan URL pengalihan lokal Supabase Auth: `http://localhost:54321/auth/v1/callback`
5. Salin **Client ID** dan **Client Secret**.
6. Konfigurasikan pada Supabase lokal di file `supabase/config.toml`:
   ```toml
   [auth.external.google]
   enabled = true
   client_id = "MASUKKAN_CLIENT_ID_GOOGLE_ANDA"
   secret = "MASUKKAN_SECRET_GOOGLE_ANDA"
   redirect_uri = "http://localhost:54321/auth/v1/callback"
   ```
7. Restart Supabase lokal:
   ```bash
   npx supabase stop
   npx supabase start
   ```

---

## 6. Variabel Lingkungan (.env)
Buat file `.env.local` di root proyek untuk memetakan kredensial Supabase lokal ke aplikasi React:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=masukkan_anon_key_lokal_dari_supabase_start
```
Dalam kode React Anda, inisialisasi client Supabase dengan:
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```
