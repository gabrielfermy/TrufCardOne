# Product Requirement Document (PRD) - Truf Card Game Score Tracker

## 1. Latar Belakang
Permainan kartu Truf (atau Trup) adalah salah satu permainan kartu taktis yang sangat populer di Indonesia. Pencatatan skor secara tradisional menggunakan kertas dan pulpen seringkali merepotkan, rawan salah hitung karena rumus Main Atas & Main Bawah yang cukup kompleks, serta mudah hilang. 

Aplikasi ini bertujuan untuk mendigitalkan proses pencatatan skor tersebut secara praktis, cepat, dan otomatis dengan mendukung multi-user (multi-tenant) sehingga setiap pemain dapat menyimpan riwayat permainan mereka, melanjutkannya kapan saja, dan melihat statistik permainan.

---

## 2. Tujuan & Sasaran
- Menyediakan aplikasi web (SPA) yang responsif dan dioptimalkan untuk perangkat mobile (mobile-first).
- Memungkinkan pendaftaran dan masuk pengguna menggunakan Akun Google (OAuth SSO) maupun email secara manual.
- Mengotomatiskan perhitungan skor permainan kartu Truf berdasarkan aturan standar Indonesia (termasuk Main Atas dan Main Bawah).
- Mendukung fitur offline (PWA) agar tetap bisa digunakan di area dengan sinyal lemah saat bermain kartu.

---

## 3. Fitur Utama & Kebutuhan Fungsional

### 3.1. Autentikasi Pengguna & Multi-Tenant
- **Registrasi & Login**:
  - Dukungan Google OAuth (SSO) sebagai metode pendaftaran/login utama yang praktis.
  - Opsi login/daftar manual menggunakan alamat email dan kata sandi.
- **Isolasi Data (Multi-Tenant)**:
  - Setiap pengguna yang login hanya dapat melihat, membuat, dan memodifikasi sesi permainan milik mereka sendiri.

### 3.2. Manajemen Sesi Permainan (Sessions)
- **Dashboard Utama**:
  - Tombol untuk memulai sesi permainan baru.
  - Daftar riwayat sesi permainan sebelumnya (aktif & selesai).
  - Setiap item sesi di riwayat menunjukkan tanggal main, nama-nama pemain, ronde terakhir, dan skor kumulatif terkini.
  - Opsi untuk melanjutkan sesi aktif atau menghapus sesi.
- **Konfigurasi Game Baru (Setup)**:
  - Input nama untuk 4 pemain.
  - Opsi Pengaturan Aturan (Default otomatis terisi aturan standar):
    - Multiplier Poin (x1 atau x10).
    - Skor bonus keberhasilan Bid 0 (Default: +10 poin).
    - Larangan total bid = 13 (Mencegah jumlah bid pas 13 untuk memaksa salah satu pemain gagal).

### 3.3. Logika & Input Skor Permainan (Gameplay Core)
- **Siklus Ronde**:
  - Setiap ronde terdiri dari dua fase: **Fase Bid** dan **Fase Won**.
  - **Fase Bid (Penawaran)**:
    - Input angka bid (0 hingga 13) untuk masing-masing dari 4 pemain.
    - Menampilkan total bid secara real-time. Jika total bid = 13 dan opsi larangan aktif, sistem akan memblokir submit dan memberi peringatan pada penawar terakhir.
    - Menampilkan dealer ronde saat ini (berganti berputar searah jarum jam).
    - Menampilkan penentu jenis Truf (pemain dengan bid tertinggi). Jika ada bid tertinggi yang sama, tampilkan tiebreaker kembang (Sekop ♠ > Hati ♥ > Wajik ♦ > Keriting ♣).
  - **Fase Won (Hasil Kemenangan)**:
    - Input jumlah trik/putaran yang dimenangkan oleh masing-masing pemain (0 hingga 13).
    - Validasi otomatis: Total jumlah kemenangan dari ke-4 pemain harus tepat 13. Jika tidak, tampilkan error dan blokir penyimpanan ronde.
- **Perhitungan Skor Otomatis**:
  - Sistem mengklasifikasikan ronde ke dalam **Main Atas** (Total Bid > 13) atau **Main Bawah** (Total Bid < 13).
  - Skor dihitung secara otomatis untuk masing-masing pemain menggunakan rumus yang disepakati (Detail rumus ada di dokumen Arsitektur).
- **Kontrol Sesi**:
  - Tombol **Undo**: Untuk menghapus ronde terakhir jika terjadi kesalahan input.
  - Tombol **Selesaikan Game**: Mengunci sesi permainan dan menandainya sebagai selesai.

### 3.4. Papan Skor & Visualisasi
- **Leaderboard Dinamis**: Urutan peringkat pemain (1 sampai 4) diperbarui secara real-time berdasarkan total skor kumulatif.
- **Tabel Riwayat Ronde**: Tabel komprehensif yang menampilkan baris untuk setiap ronde yang berisi Bid, Won, dan Skor Ronde masing-masing pemain.

---

## 4. Kebutuhan Non-Fungsional

### 4.1. Teknologi & Platform
- **Frontend**: Single Page Application (SPA) berbasis React dengan Vite untuk build tool yang cepat.
- **Styling**: Vanilla CSS dengan desain modern (Glassmorphism, Dark Theme, font modern, responsive breakpoints).
- **Backend/Database**: Supabase untuk manajemen autentikasi (Google Auth), penyimpanan database PostgreSQL, dan real-time updates.
- **Hosting**: Vercel untuk deployment cepat dan integrasi CI/CD dari Git.
- **PWA (Progressive Web App)**: Service worker dasar untuk offline caching sehingga aset utama aplikasi tetap dapat dimuat tanpa koneksi internet.

### 4.2. Keamanan & Performa
- Keamanan data menggunakan kebijakan Supabase Row Level Security (RLS) untuk memastikan pengguna hanya bisa mengakses data sesi mereka sendiri.
- Waktu muat aplikasi di browser mobile di bawah 2 detik pada koneksi 3G/4G lambat.
- Tombol input yang besar (minimal 44x44px target sentuh) agar nyaman digunakan di browser HP.
