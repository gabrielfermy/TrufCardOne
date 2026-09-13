# DOKUMENTASI LENGKAP PENGAJUAN & REVIEW AKUN MIDTRANS
**Platform**: KancaSela (All-in-One Tabletop & Card Game Companion)  
**Website URL**: [https://www.kancasela.my.id](https://www.kancasela.my.id)  
**Tanggal Pengajuan**: 13 September 2026  

---

## 📋 JAWABAN FORMULIR MIDTRANS (Copy-Paste Ready)

Berikut adalah teks ringkas dan data isian yang dapat langsung disalin ke setiap kolom pada formulir verifikasi Midtrans:

### 1. Form Bagian: "Dokumen Tambahan"
* **Catatan 1 (Kredensial Akun Tester)**:
  ```text
  URL Website: https://www.kancasela.my.id/
  Email Akun Tester: reviewer.midtrans@kancasela.my.id (atau gabriel@test.com)
  Password: PasswordTester123!
  Role: User (Free Tier untuk pengujian checkout ke Pro)
  ```
* **Catatan 2 (Dokumen Flow Transaksi PDF)**:
  *(Unggah file PDF yang digenerate dari `docs/midtrans_submission_document.html`)*
* **Catatan 3 (Konfirmasi Midtrans Digunakan Untuk Transaksi Apa Saja)**:
  ```text
  Midtrans Payment Gateway digunakan untuk pemrosesan pembayaran langganan digital (Digital SaaS & In-App Subscriptions) pada platform KancaSela:
  1. Paket Langganan "Kanca Pro" (Bulanan Rp 19.000 & Tahunan Rp 129.000) untuk fitur bebas iklan, riwayat pertandingan tanpa batas, dan generator Story Card VIP.
  2. Paket Langganan "Kanca Warkop" (Bulanan Rp 149.000 & Tahunan Rp 1.199.000) untuk pemilik kafe/venue tabletop game (manajemen turnamen dan leaderboard TV display).
  Semua produk berupa layanan digital berlangganan (non-fisik) dengan aktivasi instan otomatis setelah notifikasi pembayaran settlement dari Midtrans diterima.
  ```

---

### 2. Form Bagian: "Perubahan Website pada Dashboard Midtrans"
* **Poin 1**: Pilih **"Iya"** (Sudah menyesuaikan URL ke `https://www.kancasela.my.id/`).

---

### 3. Form Bagian: "Produk Barang/Jasa yang Dijual"
* **Unggah Katalog Produk**:
  *(Unggah dokumen PDF yang sama yang memuat katalog lengkap dan rincian harga)*
* **Jelaskan End-to-End Process**:
  ```text
  Alur Transaksi End-to-End Pengguna KancaSela:
  1. Pengguna membuka web app di https://www.kancasela.my.id/ dan melakukan registrasi/login akun menggunakan Google SSO atau Email & Password.
  2. Pengguna mengakses menu "👑 Kanca Pro / Upgrade" melalui header dashboard atau tombol di banner iklan.
  3. Sistem menampilkan katalog paket langganan (Kanca Pro & Kanca Warkop) beserta opsi siklus tagihan Bulanan atau Tahunan dalam mata uang Rupiah (IDR).
  4. Pengguna memilih paket yang diinginkan dan menekan tombol "🚀 Upgrade ke Kanca Pro".
  5. Sistem memanggil Midtrans Snap API untuk membuat token transaksi dan memunculkan pop-up pembayaran Midtrans Snap di layar pengguna.
  6. Pengguna memilih metode pembayaran yang didukung (QRIS, GoPay, ShopeePay, Virtual Account BCA/BNI/Mandiri/BRI, atau Kartu Kredit) dan menyelesaikan pembayaran.
  7. Midtrans mengirimkan notifikasi Webhook status "settlement" ke server KancaSela.
  8. Server KancaSela secara otomatis dan instan memvalidasi signature key, meng-upgrade profil pengguna ke status "Kanca Pro" (is_pro = true), dan menghilangkan semua iklan dari akun pengguna.
  ```

---

### 4. Form Bagian: "Range Harga Produk Barang/Jasa yang Dijual"
* **Range Harga**:
  ```text
  IDR 19.000 - IDR 1.199.000
  ```
  *(Rincian: Rp 19.000 untuk Pro Bulanan, Rp 129.000 untuk Pro Tahunan, Rp 149.000 untuk Venue Bulanan, dan Rp 1.199.000 untuk Venue Tahunan).*

---

## 📑 RINCIAN KATALOG PRODUK & PRICING RESMI (IDR)

| Kode Paket | Nama Layanan / Produk | Siklus Tagihan | Harga Resmi (IDR) | Deskripsi & Manfaat |
| :--- | :--- | :--- | :--- | :--- |
| `PRO_MONTHLY` | **Kanca Pro Bulanan** | 1 Bulan | **Rp 19.000** | 100% Bebas Iklan, Riwayat Pertandingan Cloud Tanpa Batas, Ekspor 9:16 VIP Story Card |
| `PRO_YEARLY` | **Kanca Pro Tahunan** | 1 Tahun | **Rp 129.000** | Semua fitur Pro Bulanan dengan hemat 45% (Rp 10.750/bulan), lencana mahkota VIP |
| `VENUE_MONTHLY` | **Kanca Warkop (Venue B2B)** | 1 Bulan | **Rp 149.000** | Mode TV Display Kafe, Manajemen Turnamen & Bracket, Branding Custom Kafe |
| `VENUE_YEARLY` | **Kanca Warkop Tahunan** | 1 Tahun | **Rp 1.199.000** | Semua fitur Venue dengan diskon tahunan + dukungan prioritas 24/7 |

---

## 🛡️ KEBIJAKAN PENGIRIMAN & PENGEMBALIAN DANA (Fulfillment & Refund Policy)

1. **Aktivasi Layanan (Delivery / Fulfillment Policy)**:
   - Layanan Kanca Pro merupakan produk digital (Software as a Service).
   - Aktivasi hak akses Pro dilakukan secara **instan dan otomatis (< 3 detik)** setelah Midtrans mengirimkan notifikasi sukses (*settlement*).
   - Pengguna tidak memerlukan pengiriman fisik barang apapun.

2. **Kebijakan Pembatalan & Pengembalian Dana (Cancellation & Refund Policy)**:
   - Pengguna dapat membatalkan perpanjangan langganan kapan saja sebelum periode tagihan berikutnya.
   - Jika terjadi kendala transaksi ganda atau kegagalan sistem, pengguna dapat menghubungi tim bantuan di `support@kancasela.my.id` atau WhatsApp Official untuk proses verifikasi dan pengembalian dana dalam 3x24 jam kerja.
