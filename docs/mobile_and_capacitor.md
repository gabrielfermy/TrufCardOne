# Mobile App & Capacitor Engineering Guide - Game Night Suite

Dokumen ini adalah panduan teknis untuk mengemas aplikasi **Game Night Suite** (React 19 + Vite) menjadi aplikasi mobile native untuk **Android (APK & AAB)** dan **iOS (IPA)** menggunakan **Capacitor**.

---

## 1. Arsitektur Mobile Capacitor

Capacitor menjembatani (*bridge*) kode web Vite (`dist/`) ke dalam *container* WebView native performa tinggi dengan akses penuh ke API perangkat keras native.

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

## 2. Dependensi & Plugin Mobile Native

Instal paket Capacitor yang diperlukan:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm install @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen @capacitor/app
npm install @capacitor-community/keep-awake
```

---

## 3. Konfigurasi `capacitor.config.json`

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
      "launchShowDuration": 1800,
      "launchAutoHide": true,
      "backgroundColor": "#0D0E15",
      "androidSplashResourceName": "splash",
      "androidScaleType": "CENTER_CROP",
      "showSpinner": false
    },
    "StatusBar": {
      "style": "DARK",
      "backgroundColor": "#0D0E15",
      "overlaysWebView": false
    },
    "KeepAwake": {
      "supported": true
    }
  }
}
```

---

## 4. Alur Kerja Build & Sinkronisasi Native

### 4.1. Inisialisasi Platform Android & iOS (Sekali Saja)
```bash
# 1. Build aset web
npm run build

# 2. Tambahkan folder native Android dan iOS
npx cap add android
npx cap add ios
```

### 4.2. Siklus Pengembangan Harian (Daily Dev Loop)
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

### 4.3. Menjalankan Live Reload di HP Android Fisik
Untuk live debugging langsung di layar HP saat mengubah kode secara real-time:
1. Hubungkan HP Android ke PC via kabel USB (aktifkan **USB Debugging** di menu Opsi Pengembang).
2. Di file `capacitor.config.json`, arahkan server ke IP lokal PC:
   ```json
   "server": {
     "url": "http://192.168.1.XX:5173",
     "cleartext": true
   }
   ```
3. Jalankan `npm run dev` di terminal PC.
4. Jalankan `npx cap run android -l --external`.

---

## 5. Konfigurasi Deep Linking untuk Supabase Google OAuth

Saat pengguna menekan tombol *"Masuk dengan Google"* di dalam aplikasi mobile native, alur OAuth akan membuka browser sistem dan mengarahkan kembali ke aplikasi via *custom URL scheme*.

### 5.1. Konfigurasi Android (`android/app/src/main/AndroidManifest.xml`)
Tambahkan intent filter di dalam tag `<activity>` utama:
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.trufcard.gamenight" android:host="login-callback" />
</intent-filter>
```

### 5.2. Konfigurasi Dashboard Supabase
1. Buka **Supabase Dashboard > Authentication > URL Configuration**.
2. Tambahkan ke daftar **Redirect URLs**:
   - `com.trufcard.gamenight://login-callback`
   - `https://trufcard.app/login-callback` (untuk versi web)

### 5.3. Penanganan Listener di React (`src/services/authService.js`)
```javascript
import { App } from '@capacitor/app'
import { supabase } from './supabaseClient'

export function initMobileDeepLinkAuth() {
  App.addListener('appUrlOpen', async (event) => {
    if (event.url.includes('login-callback') || event.url.includes('#access_token=')) {
      const url = new URL(event.url)
      const hashParams = new URLSearchParams(url.hash.replace('#', '?'))
      const accessToken = hashParams.get('access_token') || url.searchParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token') || url.searchParams.get('refresh_token')

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
      }
    }
  })
}
```

---

## 6. Integrasi Perangkat Keras Native

### 6.1. Haptik / Getaran Fisik (`src/services/hapticsService.js`)
Memberikan feedback getaran saat menekan tombol jam catur, membalik kartu, atau mengocok dadu:
```javascript
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export const hapticsService = {
  light: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      if (navigator.vibrate) navigator.vibrate(15)
    }
  },
  medium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {
      if (navigator.vibrate) navigator.vibrate(35)
    }
  },
  heavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch {
      if (navigator.vibrate) navigator.vibrate(70)
    }
  }
}
```

### 6.2. Screen Wake-Lock (`src/services/wakeLockService.js`)
Menjaga layar tetap menyala selama jam catur aktif atau saat sesi bermain kartu berlangsung:
```javascript
import { KeepAwake } from '@capacitor-community/keep-awake'

export const wakeLockService = {
  enable: async () => {
    try {
      await KeepAwake.keepAwake()
    } catch {
      if ('wakeLock' in navigator) {
        try {
          await navigator.wakeLock.request('screen')
        } catch (e) {
          console.warn('Web WakeLock error', e)
        }
      }
    }
  },
  disable: async () => {
    try {
      await KeepAwake.allowSleep()
    } catch (e) {
      console.warn('KeepAwake disable error', e)
    }
  }
}
```

---

## 7. Checklist Rilis Produksi (Google Play & App Store)

1. **Ikon & Splash Screen**: Siapkan ikon beresolusi tinggi di `resources/icon.png` (1024x1024) dan splash screen `resources/splash.png` (2732x2732). Gunakan `@capacitor/assets` untuk generate otomatis seluruh ukuran platform.
2. **Build Release Android AAB**:
   - Buka folder `android/` di Android Studio.
   - Pilih menu **Build > Generate Signed Bundle / APK > Android App Bundle**.
   - Masukkan keystore dan alias signing.
3. **Pemeriksaan Izin AndroidManifest**:
   - Pastikan hanya izin yang diperlukan yang aktif (`VIBRATE`, `WAKE_LOCK`, `INTERNET`).
