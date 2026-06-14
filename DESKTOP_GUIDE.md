# 🖥️ Panduan Instalasi Aplikasi Desktop & Cara Membuat File `.exe`

Aplikasi **SI-HUBIN PKL DKV** ini dapat dijalankan langsung dan diinstal pada Laptop/PC Windows atau Mac Anda menggunakan **2 Metode Praktis**:

---

## ⚡ Metode 1: Instalasi Instan via Browser (PWA - Progressive Web App)
**Sangat Direkomendasikan!** Anda tidak memerlukan keahlian pemrograman atau mengunduh aplikasi tambahan apa pun. Cukup gunakan browser Google Chrome atau Microsoft Edge yang sudah ada di komputer Anda.

### Cara Instalasi:
1. Jalankan aplikasi ini melalui tautan web preview Anda di browser (Google Chrome atau Microsoft Edge).
2. Di sebelah kanan kolom alamat (Address Bar/URL Bar) bagian atas browser, Anda akan melihat ikon **"Instal Aplikasi" ⊞** atau **"Aplikasi tersedia. Instal..." (Install App)**.
3. Klik ikon tersebut, lalu tekan tombol **Instal** ketika muncul konfirmasi.
4. Aplikasi akan langsung terunduh, membuat shortcut pintar di Desktop/Start Menu laptop Anda, dan terbuka dalam jendela mandiri yang luas tanpa bilah navigasi situs web browser!
5. **Kelebihan:** Sangat ringan, pembaruan otomatis, tidak membutuhkan spesifikasi PC tinggi, dan instan!

---

## 🛠️ Metode 2: Kompilasi Menjadi File Installer Desktop `.exe` Mandiri (Electron)
Jika Anda ingin mendistribusikan file `.exe` yang terisolasi sepenuhnya ke laptop guru-guru lain agar dapat diinstal layaknya aplikasi software bawaan Windows, Anda dapat merakit aslinya menggunakan mesin generator **Electron**.

### Langkah Kompilasi Lokal di Laptop Anda:

#### 1. Persiapan Awal
Pastikan laptop Anda sudah terpasang tools berikut:
* **Node.js** (Rekomendasi versi LTS terbaru) -> Unduh gratis di [nodejs.org](https://nodejs.org/).

#### 2. Unduh/Ekspor Source Code
1. Pada menu navigasi editor atau setelan sebelah kanan atas AI Studio Workspace, pilih opsi **"Export as ZIP"** untuk mengunduh seluruh berkas aplikasi ini ke komputer Anda.
2. Ekstrak file ZIP tersebut ke folder khusus di laptop Anda (misal: `D:\SI-HUBIN-DKV`).

#### 3. Instalasi Pemaket (Electron Builder)
Buka terminal cmd/powershell Anda di dalam folder hasil ekstraksi tersebut, kemudian ketik perintah berikut secara beruntun:

```bash
# 1. Instal semua dependensi aplikasi web utama
npm install

# 2. Tambahkan paket Electron runtime dan bundler installer khusus Windows
npm install electron electron-builder --save-dev
```

#### 4. Tambahkan Konfigurasi `package.json`
Buka file `package.json` di folder proyek Anda dengan teks editor (seperti Notepad atau VS Code), kemudian tambahkan konfigurasi builder berikut di bagian paling bawah sebelum kurung kurawal penutup:

```json
  "main": "electron-main.cjs",
  "build": {
    "appId": "com.smkn1teluknaga.sihubindkv",
    "productName": "SI_HUBIN_PKL_DKV",
    "directories": {
      "output": "dist-desktop"
    },
    "win": {
      "target": [
        "nsis",
        "portable"
      ],
      "icon": "public/electronic-agreement.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "runAfterFinish": true
    }
  }
```

Dan tambahkan baris perintah ini di bagian blok `"scripts"` pada `package.json`:
```json
    "build:web": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "desktop:dist": "npm run build:web && electron-builder --windows"
```

#### 5. Jalankan Proses Kompilasi `.exe`
Setelah konfigurasi di atas selesai disimpan, ketik perintah final berikut di terminal Anda:

```bash
npm run desktop:dist
```

#### 6. Hasil Akhir File `.exe`
Setelah proses selesai, buka folder baru bernama `dist-desktop/` di direktori proyek Anda. Anda akan menemukan file instalasi Windows:
* **`SI_HUBIN_PKL_DKV_Setup.exe`** -> File installer resmi Windows berukuran penuh dengan setup wizard installasi.
* **`SI_HUBIN_PKL_DKV Portable.exe`** -> Versi portable sekali klik jalan tanpa perlu diinstal secara formal.

---

### 🎨 Mengapa Metode PWA adalah Opsi Terbaik untuk Lingkungan Sekolah Anda?
1. **Lebih Ringkas:** Aplikasi langsung terintegrasi dengan Google Workspace, Drive API, dan Akun Gmail guru Anda secara aman menggunakan sesi browser yang sudah login.
2. **Kinerja Maksimal:** Membuka file local storage lebih hemat konsumsi RAM laptop hingga 90% dibandingkan bundler Electron.
3. **Instalasi Satu Detik:** Cukup buka link website dari browser, instal, selesai! Sempurna untuk komputer lab sekolah, laptop kepala jurusan, maupun perangkat kerja pribadi guru.
