# 📱 Panduan Pendaftaran & Konfigurasi Google AdMob & Google AdSense

Dokumen ini berisi panduan langkah-demi-langkah bagi pemilik aplikasi **TrufCard / KancaSela** untuk menyiapkan akun Google AdMob (untuk aplikasi mobile Android APK) dan Google AdSense (untuk website di browser).

---

## 📑 Daftar Isi
1. [Perbedaan Singkat AdMob vs AdSense](#1-perbedaan-singkat-admob-vs-adsense)
2. [Panduan Pendaftaran Google AdMob (Mobile App APK)](#2-panduan-pendaftaran-google-admob-mobile-app-apk)
3. [Panduan Pendaftaran Google AdSense (Web Browser)](#3-panduan-pendaftaran-google-adsense-web-browser)
4. [Daftar Kunci & ID yang Perlu Dimasukkan ke Aplikasi](#4-daftar-kunci--id-yang-perlu-dimasukkan-ke-aplikasi)
5. [Aturan Keamanan: Mencegah Akun Kena Banned (Invalid Traffic)](#5-aturan-keamanan-mencegah-akun-kena-banned-invalid-traffic)

---

## 1. Perbedaan Singkat AdMob vs AdSense

- **Google AdMob**: Khusus untuk aplikasi mobile native (Android APK & iOS) yang dibungkus Capacitor.
- **Google AdSense**: Khusus untuk versi website yang diakses pemain lewat browser (Chrome/Safari di laptop atau HP).
- **Aturan Penting Google**: Jangan gunakan script AdSense web di dalam APK/WebView. Sistem TrufCard sudah otomatis memisahkan keduanya secara cerdas.

---

## 2. Panduan Pendaftaran Google AdMob (Mobile App APK)

### Langkah 2.1: Buat Akun AdMob
1. Kunjungi [https://admob.google.com/](https://admob.google.com/).
2. Masuk menggunakan akun Google Anda.
3. Masukkan negara domisili (**Indonesia**), zona waktu (**Jakarta / WIB**), dan mata uang (**IDR - Indonesian Rupiah**).
4. Lengkapi profil pembayaran (Nama lengkap sesuai KTP, alamat, dan nomor rekening penarikan dana).
5. Akun baru biasanya diproses dalam 24–48 jam.

### Langkah 2.2: Daftarkan Aplikasi KancaSela
1. Masuk ke dashboard AdMob, klik menu **Apps** di sidebar kiri > **Add app**.
2. Pilih Platform: **Android**.
3. Pertanyaan *"Is the app listed on a supported app store?"*:
   - Pilih **No** (jika belum rilis di Google Play Store. Nanti bisa ditautkan setelah aplikasi resmi publish).
4. Masukkan Nama Aplikasi: **KancaSela**.
5. Klik **Add app** > **Done**.
6. Simpan **AdMob App ID** Anda:
   - Format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY` (tanda tilde `~`).

### Langkah 2.3: Buat Unit Iklan (Ad Units)
Buka aplikasi KancaSela yang baru dibuat, klik **Ad units** > **Add ad unit**:

#### 1. Banner Ad (Iklan Spanduk Bawah)
- Pilih format: **Banner**
- Nama unit: `KancaSela_Banner_Dashboard`
- Klik **Create ad unit**.
- Simpan **Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/1111111111` dengan garis miring `/`).

#### 2. Interstitial Ad (Iklan Layar Penuh Selesai Game)
- Pilih format: **Interstitial**
- Nama unit: `KancaSela_Interstitial_GameOver`
- Klik **Create ad unit**.
- Simpan **Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/2222222222`).

#### 3. Rewarded Video Ad (Iklan Berhadiah - Opsional)
- Pilih format: **Rewarded**
- Nama unit: `KancaSela_Rewarded_StoryPerk`
- Reward amount: `1`, Item: `story_vip_unlock`
- Klik **Create ad unit**.
- Simpan **Ad Unit ID** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/3333333333`).

---

## 3. Panduan Pendaftaran Google AdSense (Web Browser)

AdSense digunakan jika pemain mengakses web TrufCard via browser biasa.

### Syarat Kelayakan Situs (Site Eligibility):
- Menggunakan **Custom Domain** (contoh: `kancasela.com` atau `trufcard.id`). Domain gratisan seperti `vercel.app` atau `ngrok` umumnya akan ditolak AdSense.
- Memiliki halaman wajib: **Privacy Policy**, **Terms of Service**, dan **About Us**.

### Langkah 3.1: Daftarkan Akun AdSense
1. Kunjungi [https://adsense.google.com/](https://adsense.google.com/).
2. Login dengan akun Google yang sama dengan AdMob (agar saldo penghasilan tersinkronisasi).
3. Masukkan URL domain web Anda.
4. Pilih negara: **Indonesia**.

### Langkah 3.2: Pasang Kode Verifikasi Situs
1. AdSense akan memberikan kode script verifikasi, contoh:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
   ```
2. Kode tersebut dimasukkan ke dalam file `index.html` di dalam tag `<head>`.
3. Di konsol AdSense, centang *"I've placed the code"* lalu klik **Verify / Request Review**.
4. Proses peninjauan situs membutuhkan waktu antara 2 hari hingga 1 minggu.

### Langkah 3.3: Buat Unit Iklan Web
Setelah status situs Anda berubah menjadi **Ready / Disetujui**:
1. Masuk ke **Ads** > **By ad unit** > **Display ads**.
2. Beri nama: `KancaSela_Web_Banner`.
3. Ad size: **Responsive**.
4. Klik **Create**. Anda akan mendapatkan `data-ad-slot="XXXXXXXXXX"`.

---

## 4. Daftar Kunci & ID yang Perlu Dimasukkan ke Aplikasi

Setelah Anda mendapatkan ID dari AdMob dan AdSense, buat/edit file `.env.local` di root folder proyek:

```env
# ==========================================
# GOOGLE ADMOB (Untuk Mobile Android APK)
# ==========================================
VITE_ADMOB_APP_ID="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
VITE_ADMOB_BANNER_ID="ca-app-pub-XXXXXXXXXXXXXXXX/1111111111"
VITE_ADMOB_INTERSTITIAL_ID="ca-app-pub-XXXXXXXXXXXXXXXX/2222222222"
VITE_ADMOB_REWARDED_ID="ca-app-pub-XXXXXXXXXXXXXXXX/3333333333"

# ==========================================
# GOOGLE ADSENSE (Untuk Web Browser)
# ==========================================
VITE_ADSENSE_CLIENT_ID="ca-pub-XXXXXXXXXXXXXXXX"
VITE_ADSENSE_BANNER_SLOT_ID="XXXXXXXXXX"

# ==========================================
# MODE IKLAN: Set 'true' untuk testing lokal, 'false' untuk rilis produksi
# ==========================================
VITE_ADS_TEST_MODE="true"
```

---

## 5. Aturan Keamanan: Mencegah Akun Kena Banned (Invalid Traffic)

> [!CAUTION]
> **PANTANGAN UTAMA GOOGLE ADS:**
> 1. **DILARANG mengklik iklan sendiri** di HP atau komputer Anda. Google memiliki algoritma deteksi lokasi & akun Google yang sangat canggih.
> 2. **Gunakan Test ID selama proses pengembangan.** Aplikasi TrufCard secara default sudah dikonfigurasikan menggunakan Google Official Test IDs. Iklan produksi hanya aktif jika `VITE_ADS_TEST_MODE="false"`.
> 3. **Daftarkan HP Anda sebagai Test Device**:
>    - Di konsol AdMob, buka menu **Settings** > **Test devices** > **Add test device**.
>    - Masukkan Google Advertising ID (GAID) dari HP Android Anda (bisa dilihat di menu Pengaturan HP > Google > Iklan / Ads). Dengan begitu, HP Anda aman 100% dari risiko penalti klik tidak sengaja.
