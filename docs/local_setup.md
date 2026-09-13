# Local Setup & Infrastructure Guide - KancaSela

Dokumen ini berisi panduan teknis langkah demi langkah untuk menyiapkan lingkungan pengembangan lokal (*100% local development environment*), menjalankan Supabase lokal dengan Docker, melakukan migrasi database multi-tenant, serta menguji seluruh integrasi pihak ketiga (Google AdSense, Google AdMob, Midtrans Payment Gateway Sandbox, Web Audio Synthesizer, Haptics, WakeLock, dan Canvas Story Generator).

---

## 1. Prasyarat Sistem
Pastikan perangkat Anda memiliki:
- **Node.js** (Versi 18+ atau 20+ LTS direkomendasikan)
- **Docker Desktop** (Diperlukan untuk menjalankan container Supabase lokal)
- **Git CLI**
- **Android Studio** (Opsional, jika ingin meng-compile APK / menjalankan di emulator Android)

---

## 2. Instalasi Proyek

1. Clone repositori dan instal seluruh dependensi:
   ```bash
   npm install
   ```

2. File konfigurasi `.env.local` telah disiapkan:
   ```env
   # Supabase Local Docker Stack
   VITE_SUPABASE_URL=http://127.0.0.1:54341
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

   # Google AdSense & AdMob Test Mode
   VITE_ADS_TEST_MODE=true
   VITE_ADSENSE_CLIENT_ID="ca-pub-5832618604638694"
   VITE_ADSENSE_BANNER_SLOT_ID="1234567890"

   # Midtrans Payment Gateway (Sandbox)
   VITE_MIDTRANS_CLIENT_KEY="SB-Mid-client-sample-sandbox-key"
   VITE_MIDTRANS_IS_PRODUCTION=false
   ```

---

## 3. Menjalankan Supabase Lokal (Database, Auth, Realtime, Studio, Mailpit)

Proyek menggunakan Supabase CLI dengan Docker lokal pada port terisolasi:

1. **Jalankan Stack Supabase**:
   ```bash
   npx supabase start
   ```
   *Dashboard & Services Lokal:*
   - **API URL**: `http://127.0.0.1:54341`
   - **Supabase Studio (Web UI Database)**: `http://127.0.0.1:54343`
   - **PostgreSQL Direct**: `postgresql://postgres:postgres@127.0.0.1:54332/postgres`
   - **Mailpit (Inbucket Email Tester)**: `http://127.0.0.1:54344`

2. **Terapkan Migrasi & Seed Data**:
   ```bash
   npx supabase db reset
   ```
   > ⚠️ **Catatan Keamanan**: Perintah `npx supabase db reset` hanya mereset container Docker di komputer Anda (`127.0.0.1:54332`) dan **tidak akan pernah menyentuh database cloud / remote produksi**.

---

## 4. Akun Uji Coba Lokal (*Pre-seeded Test Accounts*)

Setelah `supabase db reset`, akun berikut langsung tersedia untuk login 1-klik di modal auth:

| Email | Password | Role | Status Langganan |
| :--- | :--- | :--- | :--- |
| `gabriel@test.com` | `123456` | **Admin** | **Kanca Pro 👑** (Bebas Iklan + Admin Portal) |
| `pro@kancasela.local` | `123456` | **User** | **Kanca Pro 👑** (Bebas Iklan + Fitur VIP) |
| `free@kancasela.local` | `123456` | **User** | **Free Player 🎮** (Iklan Banner & Interstitial aktif) |

---

## 5. Pengujian Integrasi Pihak Ketiga (*Third-Party Integrations Testing*)

Saat menjalankan aplikasi di browser lokal (`npm run dev`), Anda memiliki tombol terapung **`🛠️ Local DevTools`** di pojok kanan bawah layar untuk menguji seluruh integrasi secara instan:

### 1. Midtrans Payment Gateway (Snap Sandbox)
- **Cara Uji**:
  1. Klik tombol **"Lihat Pro"** atau buka dari **DevTools > Test Midtrans Snap Checkout**.
  2. Pilih paket **Kanca Pro (Bulanan/Tahunan)** atau **Kanca Warkop**.
  3. Dialog pembayaran **Midtrans Snap Sandbox** akan muncul dengan simulasi metode pembayaran (QRIS, GoPay, BCA/Mandiri Virtual Account, Kartu Kredit).
  4. Klik **"⚡ Bayar Sekarang (Simulasi Sukses)"**. Status akun Anda di database Supabase akan langsung di-upgrade menjadi `is_pro = true` dengan masa aktif 1 bulan / 1 tahun, dan iklan akan otomatis hilang seketika!
- **Edge Functions**:
  - Generator Token: `supabase/functions/create-midtrans-payment/index.ts`
  - Webhook Handler: `supabase/functions/midtrans-webhook/index.ts` (Verifikasi SHA512 Signature Key).

### 2. Google AdSense & Google AdMob (Simulasi Web & Native)
- **AdSense Banner**: Di browser, saat akun dalam status Free, banner iklan simulasi responsif akan ditampilkan lengkap dengan disclaimer resmi. Saat beralih ke Kanca Pro, banner otomatis hilang.
- **AdMob Interstitial**: Iklan layar penuh muncul otomatis setiap kali pertandingan selesai *(Game Over)* dengan timer 3 detik dan tombol lewati. Anda juga dapat memicunya langsung dari **DevTools > Interstitial Ad**.
- **AdMob Rewarded Video**: Simulasi video 5 detik dengan progress bar untuk membuka reward eksklusif *(VIP Story Template)*.

### 3. Web Audio Synthesizer (Zero Audio Asset Files)
- Suara dihasilkan secara prosedural via Web Audio API tanpa file `.mp3` eksternal (100% offline & instan).
- Dapat diuji via DevTools: `Click`, `Tick` (Jam Catur), `Beep Warning (<10s)`, `Victory Chime`, `Card Deal`, `Dice Roll`.

### 4. Haptic Feedback & Screen Wake-Lock
- **Haptic**: Web Vibration API fallback untuk browser desktop/mobile + `@capacitor/haptics` untuk native.
- **WakeLock**: Mencegah layar HP mati saat pertandingan catur / kartu berlangsung.

### 5. Canvas 9:16 Social Story Card
- Merender gambar PNG 1080x1920 untuk status WhatsApp dan IG Stories menggunakan HTML5 Canvas 2D context tanpa dependensi backend.

---

## 6. Menjalankan Server Frontend Lokal

```bash
npm run dev
```
Buka browser di `http://localhost:5173`.

---

## 7. Menjalankan di Perangkat Mobile Android (Capacitor)

1. Build aset web produksi:
   ```bash
   npm run build
   ```
2. Sinkronkan aset ke folder native Android:
   ```bash
   npx cap sync android
   ```
3. Buka Android Studio:
   ```bash
   npx cap open android
   ```
4. Tekan tombol **Run (▶)** di Android Studio untuk menjalankan di Emulator atau HP fisik.
