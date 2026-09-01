# Mobile App & Capacitor Engineering Guide - Game Night Suite

Dokumen ini adalah panduan teknis untuk strategi peluncuran mobile, instalasi PWA tanpa biaya (*Zero-Cost Bootstrap*), dan panduan kompilasi native untuk **Android (APK/AAB)** dan **iOS (IPA)** menggunakan **Capacitor**.

---

## 1. Strategi Peluncuran Bertahap (*Phased Rollout Strategy*)

Untuk memaksimalkan efisiensi modal (*capital efficiency*) dan mencapai kecocokan pasar produk (*product-market fit*) dengan **biaya awal $0**, proyek ini menerapkan strategi peluncuran 2 fase:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ FASE 1: PELUNCURAN WEB-FIRST & PWA (BIAYA $0 / ZERO-BURN BOOTSTRAP)       │
│ • Infrastruktur Gratis: Vercel Free Tier + Supabase Free Tier           │
│ • Akses Instan: Link WhatsApp tanpa perlu download Play Store/App Store  │
│ • Instalasi PWA: Pengguna klik "Add to Home Screen" di Android & iOS    │
│ • Pengalaman Native: Tampil fullscreen standalone tanpa address bar      │
│ • Target: Akuisisi 1.000–10.000 user aktif & validasi monetisasi        │
└──────────────────────────────────────────────────────────────────────────┘
                                     │
                    [ TRIGGER: PENDAPATAN / PENDANAAN MASUK ]
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ FASE 2: DISTRIBUSI NATIVE APP STORE (GOOGLE PLAY & APPLE APP STORE)      │
│ • Registrasi Akun: Google Play Console ($25) & Apple Developer ($99/th) │
│ • Kompilasi Instan: Menggunakan pipeline Capacitor yang sudah siap      │
│ • Keuntungan: Peringkat ASO, Push Notification, dan kredibilitas brand  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fase 1: Distribusi PWA (Progressive Web App) Tanpa Biaya

Tanpa perlu membayar biaya developer Google atau Apple di awal, pengguna dapat menginstal aplikasi langsung dari browser ke home screen mereka:

### 2.1. Di Perangkat Android (Google Chrome)
1. Buka link web aplikasi (contoh: `https://trufcard.app`).
2. Banner otomatis atau pop-up browser akan muncul: **"Tambahkan Game Night Suite ke Layar Utama"** atau **"Install App"**.
3. Ikon aplikasi akan terpasang di App Drawer dan Home Screen.
4. Saat dibuka, aplikasi berjalan dalam mode **Standalone Fullscreen** (tanpa bilah URL browser), dengan splash screen gelap elegan dan performa animasi 60 FPS.

### 2.2. Di Perangkat iPhone / iOS (Safari)
1. Buka link web di browser Safari.
2. Tekan tombol **Share / Bagikan (📤)** di bilah bawah Safari.
3. Gulir ke bawah dan pilih **"Add to Home Screen" (Tambahkan ke Layar Utama)**.
4. Ikon aplikasi terpasang di layar utama iPhone dan berjalan fullscreen tanpa frame Safari.

---

## 3. Fase 2: Kompilasi Native via Capacitor (Saat Siap Rilis Toko Aplikasi)

Seluruh arsitektur kode React telah dirancang **100% kompatibel dengan Capacitor**. Ketika pendapatan atau pendanaan telah tersedia, tim tidak perlu menulis ulang kode.

```mermaid
graph TD
    ReactVite[React 19 + Vite Codebase] -->|npm run build| Dist[dist / Web Production Assets]
    Dist -->|npx cap sync| CapBridge[Capacitor Native Bridge]
    
    subgraph Android Native Project android/
        CapBridge --> AndroidStudio[Android Studio / Gradle]
        AndroidStudio --> APK[Debug/Release .apk]
        AndroidStudio --> AAB[Google Play Bundle .aab]
    end

    subgraph iOS Native Project ios/
        CapBridge --> Xcode[Xcode / CocoaPods]
        Xcode --> IPA[Apple App Store .ipa]
    end

    subgraph Native Hardware Plugins
        CapBridge --> Haptics[@capacitor/haptics: Getaran sentuh & clock hit]
        CapBridge --> WakeLock[@capacitor-community/keep-awake: Cegah layar mati]
        CapBridge --> StatusBar[@capacitor/status-bar: Immersive dark mode]
        CapBridge --> SplashScreen[@capacitor/splash-screen: Layar intro hitam elegan]
        CapBridge --> DeepLinks[@capacitor/app: Listener URL Google OAuth]
    end
```

---

## 4. Dependensi & Plugin Mobile Native

Paket Capacitor yang telah terpasang di proyek:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm install @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen @capacitor/app
npm install @capacitor-community/keep-awake
```

---

## 5. Konfigurasi `capacitor.config.json`

File konfigurasi di root proyek:
```json
{
  "appId": "com.trufcard.gamenight",
  "appName": "Game Night Companion",
  "webDir": "dist",
  "server": {
    "androidScheme": "https",
    "cleartext": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 1500,
      "launchAutoHide": true,
      "backgroundColor": "#0B0C14",
      "showSpinner": false
    },
    "StatusBar": {
      "style": "DARK",
      "backgroundColor": "#0B0C14"
    },
    "KeepAwake": {
      "supported": true
    }
  }
}
```

---

## 6. Alur Kerja Build & Sinkronisasi Native

### 6.1. Inisialisasi Platform Android & iOS (Sekali Saja)
```bash
# 1. Build aset web
npm run build

# 2. Tambahkan folder native Android dan iOS
npx cap add android
npx cap add ios
```

### 6.2. Siklus Pengembangan Harian (Daily Dev Loop)
Setiap kali Anda mengubah kode React/CSS:
```bash
# 1. Build bundle web terbaru
npm run build

# 2. Sinkronkan aset web dan plugin native ke Android/iOS
npx cap sync

# 3. Buka di Android Studio atau Xcode
npx cap open android
npx cap open ios
```

---

## 7. Konfigurasi Deep Linking untuk Supabase Google OAuth

Saat pengguna menekan tombol *"Masuk dengan Google"* di dalam aplikasi mobile native, alur OAuth akan membuka browser sistem dan mengarahkan kembali ke aplikasi via *custom URL scheme*.

### 7.1. Konfigurasi Android (`android/app/src/main/AndroidManifest.xml`)
Tambahkan intent filter di dalam tag `<activity>` utama:
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.trufcard.gamenight" android:host="login-callback" />
</intent-filter>
```

### 7.2. Konfigurasi Dashboard Supabase
1. Buka **Supabase Dashboard > Authentication > URL Configuration**.
2. Tambahkan ke daftar **Redirect URLs**:
   - `com.trufcard.gamenight://login-callback`
   - `https://your-vercel-domain.vercel.app` (untuk versi web)

---

## 8. Layanan Eksternal yang Perlu Didaftarkan (Pada Fase 2)

| Layanan | Platform | Biaya | Kapan Didaftarkan? |
| :--- | :--- | :--- | :--- |
| **Vercel** | Web & PWA | **Gratis** (Hobby) | **Fase 1 (Sekarang)** |
| **Supabase Cloud** | Backend / Database | **Gratis** (Tier Free) | **Fase 1 (Sekarang)** |
| **Google Cloud Console** | Google OAuth SSO | **Gratis** | **Fase 1 (Sekarang)** |
| **Google Play Console** | Android App Store | **$25** *(Sekali seumur hidup)* | **Fase 2 (Setelah ada revenue/dana)** |
| **Apple Developer** | iOS App Store | **$99 / tahun** | **Fase 2 (Setelah ada revenue/dana)** |
