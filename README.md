# 🎮 KancaSela (Konco Selo)

> **All-in-One Tabletop & Card Game Companion Platform (Web PWA & Mobile Native)**  
> Official Website: [https://www.kancasela.my.id](https://www.kancasela.my.id)

---

## ⚖️ Hak Cipta & Ketentuan Lisensi (Proprietary & Source-Available)

> ### 🛑 PERINGATAN HAK CIPTA & ANTI-PENJIPLAKAN (ALL RIGHTS RESERVED)
> **Copyright © 2026 Gabriel Aswinta (KancaSela). Hak Cipta Dilindungi Undang-Undang.**
>
> Repositori ini dipublikasikan secara terbuka (*source-available*) semata-mata untuk keperluan transparansi, verifikasi kepatuhan pihak ketiga (Midtrans Payment Gateway & Google), dan portofolio teknis.
>
> **DILARANG KERAS:**
> - Menyalin, mengkloning, menggandakan, mendistribusikan ulang, atau menjual kembali seluruh atau sebagian kode sumber, logika algoritma kartu (Truf, Remi, Omben), desain antarmuka (UI/UX), dan formula skoring KancaSela.
> - Menggunakan kode atau konsep dalam proyek ini untuk membuat layanan tandingan (*competing derivative applications/services*) baik dalam bentuk Web, PWA, maupun aplikasi Mobile (Android/iOS).
> - Menghosting (*re-hosting*) atau mengoperasikan instance publik/komersial tanpa izin lisensi tertulis dari Pemegang Hak Cipta.
>
> Segala bentuk pelanggaran hak cipta akan diproses secara hukum pidana dan perdata sesuai **UU Republik Indonesia No. 28 Tahun 2014 tentang Hak Cipta** dan ketentuan hukum internasional **WIPO / DMCA**.
>
> Rincian lisensi hukum lengkap tersedia pada berkas [LICENSE](LICENSE).

---

## 🃏 Fitur Utama Platform

1. **Truf (Trup / Trump) Engine**: Kalkulasi otomatis *Main Atas* vs *Main Bawah*, Bid 13 tiebreaker, rotasi dealer, dan denda excess/lack.
2. **Remi 7-Kartu (Indonesian Rummy)**: Keypad denda instan, Tutup Biasa vs Tutup Murni double penalty, dan batas eliminasi.
3. **Omben (Cangkulan)**: Tracking urutan buang kartu (*Juara 1 / Out* vs *Kena Omben*) dan tally hukuman.
4. **Dual Split-Screen Chess Clock**: Jam catur inverted 180° untuk 2 pemain tatap muka dengan preset FIDE (Bullet, Blitz, Rapid, Fischer Increment), Web Audio tick, dan haptik getar.
5. **Generic Scoreboard**: Papan skor fleksibel 2–8 pemain untuk aneka board game.
6. **Tabletop Utilities**: Dadu 3D/2D (D4–D20), Finger Chooser (*"Siapa yang jalan duluan?"*), dan Lempar Koin.
7. **Real-time Spectator & Match Diary**: Sinkronisasi skor live multi-perangkat via WebSocket, 1-tap Google seat claim, dan generator Story Card 9:16 PNG untuk status WhatsApp/Instagram.

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite 8, Vanilla CSS Design System (Glassmorphism & HSL Tokens).
- **Backend**: Supabase (PostgreSQL 17, Row Level Security, Realtime WebSocket Channels, Auth).
- **Mobile Container**: Capacitor 8 (Android & iOS).
- **Payment Gateway**: Midtrans Snap Payment Integration.

---

## 📩 Kontak & Lisensi Komersial
Untuk pertanyaan lisensi komersial, kemitraan venue B2B, atau perizinan resmi:
* **Email**: `legal@kancasela.my.id` / `gabriel.aswinta@gmail.com`
* **Website**: [https://www.kancasela.my.id](https://www.kancasela.my.id)
