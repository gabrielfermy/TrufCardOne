# Game Rules & Mathematical Scoring Reference - KancaSela

Dokumen ini adalah referensi lengkap aturan main, terminologi, dan rumus matematika penilaian (*scoring formula*) untuk semua permainan yang didukung dalam **KancaSela**. Dokumen ini dirancang sebagai panduan definitif bagi pengembang dan agen AI saat membangun atau memperluas modul permainan.

---

## 1. Permainan Kartu Truf (Trup / Indonesian Trick-Taking)

### 1.1. Ringkasan Permainan
- **Jumlah Pemain**: Tepat 4 pemain (bermain secara individual/bebas, bukan berpasangan).
- **Dek Kartu**: 1 dek standar 52 kartu tanpa Joker.
- **Jumlah Kartu**: Masing-masing pemain mendapatkan 13 kartu.
- **Trik per Ronde**: Tepat 13 trik (*putaran/lecutan*).

### 1.2. Tingkatan Kembang Truf (*Suit Hierarchy*)
Jika terjadi penawaran bid tertinggi yang sama antara dua atau lebih pemain, kembang ditentukan berdasarkan hierarki resmi Indonesia:
1. ♠ **Sekop (Spade)** — Kasta tertinggi (*Supreme*)
2. ♥ **Hati (Heart)** — Kasta kedua
3. ♦ **Wajik (Diamond)** — Kasta ketiga
4. ♣ **Keriting (Club)** — Kasta keempat
5. 🚫 **Tanpa Truf (No Truf)** — Tidak ada kembang truf yang berlaku

### 1.3. Struktur Ronde & Siklus Fase
Setiap ronde memiliki 2 fase input:
1. **Fase Bid (Penawaran)**:
   - Pemain secara bergiliran (searah jarum jam dimulai dari sebelah kiri dealer) menyebutkan jumlah trik yang ditargetkan untuk dimenangkan (0 hingga 13).
   - Pemain dengan bid tertinggi (atau pemenang tiebreaker kembang) berhak menentukan kembang Truf untuk ronde tersebut.
   - **Aturan Bid 13 (Kondisi Kritis)**:
     - Jika jumlah total bid dari ke-4 pemain pas berjumlah **13**, permainan berada dalam kondisi netral tanpa pecundang alami.
     - Penawar terakhir (biasanya Dealer) diberi opsi keputusan:
       - **Mode Paksa Main Atas**: Salah satu pemain dipaksa menaikkan target atau sistem memperlakukan ronde sebagai Main Atas.
       - **Mode Paksa Main Bawah**: Sistem memperlakukan ronde sebagai Main Bawah.
2. **Fase Won (Hasil Trik Kemenangan)**:
   - Setelah 13 trik kartu fisik selesai dimainkan di meja, host mencatat jumlah trik aktual yang dimenangkan oleh masing-masing dari 4 pemain.
   - **Validasi Sistem**: Total `Won` dari ke-4 pemain **WAJIB tepat berjumlah 13**. Jika `Total Won !== 13`, tombol simpan dikunci dan pesan kesalahan validasi ditampilkan.

### 1.4. Rumus Skor Detail Truf
- **Klasifikasi Ronde**:
  - **Main Atas**: `Total Bid > 13` (Karakteristik: Poin agresif, penalti kurang trik sangat berat).
  - **Main Bawah**: `Total Bid < 13` (Karakteristik: Poin defensif, penalti kelebihan trik sangat berat).
- **Parameter Pengaturan Standar**:
  - `multiplier` = `1` (atau `10` untuk format puluhan).
  - `bid0Bonus` = `0` (atau `10` / `50` untuk aturan bonus).
  - `atasLackMult` = `-2` (Penalti jika kurang dari bid saat Main Atas).
  - `atasExcessMult` = `-1` (Penalti jika lebih dari bid saat Main Atas).
  - `bawahLackMult` = `-1` (Penalti jika kurang dari bid saat Main Bawah).
  - `bawahExcessMult` = `-2` (Penalti jika lebih dari bid saat Main Bawah).

#### Tabel Perhitungan Poin per Pemain:
| Kondisi Pemain | Main Atas (`Total Bid > 13`) | Main Bawah (`Total Bid < 13`) |
| :--- | :--- | :--- |
| **Tepat Sasaran (`Won == Bid > 0`)** | `+ (Bid * multiplier)` | `+ (Bid * multiplier)` |
| **Bid 0 Sukses (`Won == 0 && Bid == 0`)** | `+ (bid0Bonus * multiplier)` | `+ (bid0Bonus * multiplier)` |
| **Bid 0 Gagal (`Won > 0 && Bid == 0`)** | `-(Won * 2 * multiplier)` | `-(Won * 2 * multiplier)` |
| **Kurang Trik (`Won < Bid`)** | `-( (Bid - Won) * 2 * multiplier)` | `-( (Bid - Won) * 1 * multiplier)` |
| **Kelebihan Trik (`Won > Bid`)** | `-( (Won - Bid) * 1 * multiplier)` | `-( (Won - Bid) * 2 * multiplier)` |

---

## 2. Permainan Kartu Remi (Indonesian 7-Card / Rummy)

### 2.1. Ringkasan Permainan
- **Jumlah Pemain**: 2 hingga 6 pemain (standar meja: 4 pemain).
- **Dek Kartu**: 1 dek standar (untuk 2-4 pemain) atau 2 dek (untuk 5-6 pemain), dengan atau tanpa Joker.
- **Jumlah Kartu di Tangan**: Masing-masing pemain mendapatkan 7 kartu (atau 11 kartu pada variasi tertentu).
- **Tujuan**: Menghabiskan kartu di tangan dengan menyusun kombinasi sah (*melds*) dan menutup (*close/tutup*).

### 2.2. Kombinasi Kartu Sah (*Valid Melds*)
1. **Seri Kembang (*Straight Flush / Run*)**: Minimal 3 kartu berurutan dengan kembang yang sama (contoh: 7♠ - 8♠ - 9♠).
2. **Kartu Kembar (*Set / Book*)**: 3 atau 4 kartu dengan angka yang sama tetapi kembang berbeda (contoh: K♠ - K♥ - K♦).

### 2.3. Nilai Denda Kartu Standar Indonesia
Saat ada pemain yang menutup meja, pemain lain yang masih memegang kartu di tangan menghitung denda berdasarkan nilai nominal kartu:
- **Kartu As (A)**: `15 poin`
- **Kartu Gambar (King, Queen, Jack)**: `10 poin` per lembar
- **Kartu Angka (2 hingga 10)**: Sesuai angka kartu (`2` = 2 poin, `5` = 5 poin, `10` = 10 poin)
- **Kartu Joker**: `25 poin` (atau `50 poin` pada variasi lokal tertentu)

### 2.4. Jenis Penutupan Ronde (*Close Types*)
- **Tutup Biasa (Normal Close)**:
  - Pemain berhasil menyusun seluruh kartu dan membuang 1 kartu sisa setelah sebelumnya pernah membuka sebagian kombinasi di meja.
  - Pemenang: `0 poin denda`.
  - Pemain Lain: `- (total denda kartu di tangan)`.
- **Tutup Murni / Remi Istimewa (Pure Close)**:
  - Pemain langsung menutup dalam satu tarikan tanpa pernah membuka kartu sebelumnya (*one-shot win*).
  - Pemenang: `0 poin denda` (atau bonus kemenangan).
  - Pemain Lain: `- (total denda kartu di tangan * 2)` (Denda ganda).

### 2.5. Kondisi Akhir Permainan
- Permainan dimainkan secara berseri (*series*) hingga ada satu pemain yang mencapai **Ambang Batas Denda Maksimum** (misal: `-500 poin` atau `-1000 poin`).
- Pemain dengan denda terkecil (skor tertinggi / mendekati 0) dinobatkan sebagai Juara Utama.

---

## 3. Permainan Kartu Omben (Indonesian Cangkulan Card Game)

### 3.1. Ringkasan Permainan
- **Jumlah Pemain**: 2 hingga 6 pemain (standar: 4 pemain).
- **Dek Kartu**: 1 dek standar 52 kartu (atau variasi kartu 41).
- **Pembagian Kartu**: Setiap pemain dibagikan 4 hingga 7 kartu di awal ronde. Sisa kartu diletakkan tertutup di tengah meja sebagai tumpukan cangkulan (*stock pile*).

### 3.2. Mekanika Putaran & Istilah "Omben / Cangkul"
- Pemain pertama (*lead*) mengeluarkan 1 kartu sembarang ke meja.
- Pemain berikutnya wajib mengeluarkan kartu dengan **kembang yang sama** (*follow suit*).
- **Aksi Cangkul / Ngomben**:
  - Jika seorang pemain tidak memiliki kartu dengan kembang yang sesuai di tangannya, pemain tersebut **wajib mengambil kartu satu per satu dari tumpukan tengah (*ngombe/cangkul*)** sampai ia mendapatkan kembang yang cocok atau sampai tumpukan kartu habis.
  - Kartu dengan nilai tertinggi dari kembang yang diminta memenangkan putaran trik dan berhak memulai putaran berikutnya.

### 3.3. Penentuan Skor & Juara Ronde
- **Juara 1 (Out / Menang Ronde)**: Pemain yang pertama kali berhasil membuang seluruh kartu di tangannya.
- **Juara 2 & Juara 3**: Pemain yang menghabiskan kartunya pada urutan berikutnya.
- **Kena "Omben" (Pecundang Ronde)**: Pemain terakhir yang tersisa dan masih memegang kartu di tangan saat ronde berakhir.
- **Pencatatan Aplikasi**:
  - Menghitung jumlah akumulasi kekalahan *"Omben"* tiap pemain sepanjang sesi.
  - Opsi tambahan: Mencatat jumlah lembar sisa kartu yang tertinggal di tangan sebagai poin penalti sekunder.
  - **Batas Kalah / Taruhan Game**: Sesi berakhir saat ada pemain yang mencapai batas Omben yang disepakati (misal: 5 kali Omben). Pemain tersebut mendapatkan hukuman sosial (misal: mentraktir kopi/makanan atau dare).

---

## 4. Jam Catur (Chess Clock & Time Controls)

### 4.1. Format Kontrol Waktu Resmi FIDE
1. **Bullet**:
   - `1 min + 0s` (Ultra Bullet)
   - `1 min + 1s`
   - `2 min + 1s`
2. **Blitz**:
   - `3 min + 0s`
   - `3 min + 2s` (Format standar turnamen kilat FIDE)
   - `5 min + 0s`
   - `5 min + 3s`
3. **Rapid**:
   - `10 min + 0s` (Standar online rapid)
   - `15 min + 10s` (Format standar turnamen cepat FIDE)
   - `30 min + 0s`

### 4.2. Logika Tambahan Waktu
- **Fischer Increment**: Setiap kali seorang pemain menyelesaikan giliran dan menekan tombol jam, waktu pemain tersebut langsung ditambahkan sebesar $X$ detik sebelum giliran lawan berjalan.
- **Bronstein / Simple Delay**: Jam menunggu selama $Y$ detik sebelum waktu pemain mulai berkurang. Jika pemain bergerak sebelum $Y$ detik habis, tidak ada waktu yang terbuang.
