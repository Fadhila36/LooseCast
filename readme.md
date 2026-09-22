# 🚀 Tomatosuki Stream Kit AIO

**All-in-One Stream Deck Controller & OBS Overlay Ecosystem**  
*Meme Player, Video & Audio FX, Chroma Key, OBS WebSocket Automations, Macro Engine, K/D Counters & Remote Deck via Smartphone.*

---

Tomatosuki Stream Kit AIO adalah aplikasi kontroler streaming profesional berbasis **Electron + Node.js (Express & Socket.io)**. Didesain khusus untuk content creator, gamer, dan streamer di platform Twitch, YouTube, Kick, maupun TikTok Live. Cukup dengan satu URL *Browser Source* di OBS Studio, Anda dapat memicu meme video, sound effect, macro automation, animasi overlay, dan counter game secara *real-time* tanpa membebani performa PC.

---

## 🌟 Fitur Unggulan

### 🎭 1. Multi-Format Meme & Media Player
- **Dukungan Format Luas:** Video (`.mp4`, `.webm`, `.mov`), Audio (`.mp3`, `.wav`, `.ogg`), Animasi (`.gif`, `.webp`), dan Gambar (`.png`, `.jpg`).
- **Built-in Chroma Key:** Otomatis hilangkan background hijau (*green screen*) langsung di browser overlay tanpa perlu filter tambahan di OBS.
- **Visual FX & Screen Shake:** Efek kamera getar (*screen shake*), zoom in/out, flash, dan glitch saat meme dipicu.
- **Audio Normalizer & Volume Control:** Pengaturan volume per media + Master Volume slider dengan integrasi FFmpeg.

### 🔌 2. Integrasi OBS Studio WebSocket v5
- **Scene Switcher:** Ganti scene OBS secara instan langsung dari deck controller.
- **Source Visibility Toggle:** Munculkan atau sembunyikan overlay/source/kamera di OBS dengan 1 klik.
- **Audio Input Mute/Unmute:** Toggle mute mikrofon, game audio, atau musik BGM.
- **Status Indikator Real-time:** Menampilkan status koneksi WebSocket OBS di dashboard secara otomatis.

### ⚡ 3. Macro & Automation Engine
- **Multi-Step Automation:** Gabungkan berbagai aksi dalam 1 tombol (contoh: Putar suara intro ➔ Delay 1.5 detik ➔ Ganti Scene OBS ➔ Munculkan meme video ➔ Unmute mic).
- **Import / Export Macro:** Bagikan dan simpan konfigurasi macro dalam format JSON.

### 🌐 4. MyInstants Soundboard Search & Instant Import
- Cari ribuan sound meme populer langsung dari library **MyInstants** di dalam aplikasi.
- Preview audio seketika dan tambahkan ke Stream Deck Anda hanya dengan 1 klik tanpa perlu download manual.

### 📱 5. Mobile Deck Remote (LAN / Wi-Fi)
- **Connect to Phone via QR Code:** Buka Deck Controller di smartphone atau tablet tanpa install aplikasi tambahan.
- Trigger meme, kontrol counter, dan ganti scene langsung dari HP saat bermain game layar penuh (*fullscreen*) tanpa perlu *alt-tab*.

### ⚔️ 6. Atomic Game Counters (K/D/W/L Tracker)
- Kelola counter Kill, Death, Win, Loss, atau Custom Counter apa pun.
- Nilai counter tersimpan secara otomatis dan atomik ke file `.txt` lokal, siap dihubungkan ke **OBS Text (GDI+) Source**.

### 🛡️ 7. Performa Tinggi & Keamanan Ketat
- **Atomic File Store:** Arsitektur penyimpanan data anti-korup (*atomic write*) dengan fallback aman.
- **Non-blocking Async I/O:** Ringan di CPU dan RAM, tidak mengganggu kestabilan FPS game saat streaming.
- **OWASP Path Traversal Protection:** Sanitasi ketat terhadap nama file dan jalur direktori aset.
- **100% Offline Standalone:** Seluruh asset UI dan dependensi berjalan lokal tanpa ketergantungan CDN eksternal.
- **1-Click Backup & Restore:** Ekspor seluruh aset media, counter, dan preferensi deck ke file ZIP terkompresi.
- **Multi-Language Support:** Antarmuka multibahasa (Bahasa Indonesia, English, Japanese, Spanish).

---

## 🛠️ Persyaratan Sistem

- **Sistem Operasi:** Windows 10 / 11, macOS, atau Linux
- **Node.js:** Versi 18.x atau lebih baru ([Download Node.js](https://nodejs.org/))
- **OBS Studio:** Versi 28+ (sudah memiliki OBS WebSocket v5 bawaan)

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Clone Repository
```bash
git clone https://github.com/fadhila36/Tomatosuki-Stream-kit-AIO.git
cd Tomatosuki-Stream-kit-AIO
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Jalankan Aplikasi
Pilih mode yang sesuai dengan kebutuhan Anda:

* **Mode Desktop App (Electron GUI):**
  ```bash
  npm run dev
  ```
* **Mode Web Server Saja (Headless / Browser):**
  ```bash
  npm start
  ```
  *Dashboard dapat diakses di: [http://localhost:3000](http://localhost:3000)*

* **Menjalankan Automated Unit & Integration Tests:**
  ```bash
  npm test
  ```

---

## 🖥️ Panduan Setup di OBS Studio

### Langkah 1: Pasang Browser Source Overlay
1. Buka **OBS Studio**.
2. Pada panel **Sources**, klik tombol **`+`** ➔ Pilih **Browser**.
3. Beri nama source (misalnya: `Tomatosuki Stream Kit Overlay`).
4. Masukkan URL:
   ```text
   http://localhost:3000/obs.html
   ```
5. Atur resolusi:
   - **Width:** `1920` (sesuaikan dengan canvas Anda)
   - **Height:** `1080` (sesuaikan dengan canvas Anda)
6. Centang opsi:
   - ✅ *Shutdown source when not visible*
   - ✅ *Refresh browser when scene becomes active*
7. Klik **OK**.

### Langkah 2: Hubungkan OBS WebSocket (Opsional untuk Kontrol Scene & Audio)
1. Di OBS Studio, buka menu **Tools** ➔ **WebSocket Server Settings**.
2. Pastikan opsi **Enable WebSocket server** dicentang (Port default: `4455`).
3. Di Dashboard Tomatosuki (Tab Settings), masukkan Port & Password OBS WebSocket Anda lalu klik **Connect**.

### Langkah 3: Menampilkan Counter di OBS
1. Buat counter di Dashboard Tomatosuki (misal: `Win Streak`).
2. Di OBS Studio, tambah Source **Text (GDI+)**.
3. Centang opsi **Read from file**, lalu pilih file teks counter yang berada di dalam folder proyek Anda (folder `assets/`).

---

## 📱 Panduan Menggunakan HP sebagai Stream Deck

1. Pastikan PC dan Smartphone Anda terhubung ke jaringan Wi-Fi / LAN yang sama.
2. Di dashboard Tomatosuki, buka tab **Connect to Phone** atau klik ikon barcode/HP.
3. Scan **QR Code** yang tampil menggunakan kamera HP Anda, atau ketik alamat IP lokal yang tertera (contoh: `http://192.168.1.50:3000/deck.html`).
4. Deck controller interaktif akan langsung terbuka dan siap digunakan di layar smartphone Anda.

---

## 🏗️ Struktur Proyek

```text
Tomatosuki-Stream-kit-AIO/
├── assets/                  # Penyimpanan file media (video, audio, gambar)
├── electron/                # Konfigurasi & lifecycle Electron Desktop
│   ├── main.js
│   └── preload.js
├── lang/                    # File lokalisasi bahasa (id.json, en.json, dll.)
├── public/                  # Antarmuka web frontend
│   ├── index.html           # Dashboard utama
│   ├── deck.html            # Deck view mobile / tablet
│   ├── obs.html             # Browser source overlay untuk OBS
│   └── css / js / fonts     # Aset statis lokal tanpa CDN eksternal
├── src/
│   ├── config/              # Konfigurasi & konstanta aplikasi
│   ├── controllers/         # Handler route REST API
│   ├── services/            # Business logic (Media, OBS, Macros, Counters, MyInstants, Backup)
│   └── utils/               # Path security, atomic file store, network detection
├── tests/                   # Native test suite (Unit & Integration tests)
├── server.js                # Entry point server Express & Socket.io
└── package.json
```

---

## 📦 Build Installer / Portable Desktop

Untuk mengompilasi aplikasi menjadi executable Windows (`.exe`):

```bash
# Build Installer & Portable (.exe)
npm run build

# Build NSIS Installer saja
npm run build:installer

# Build Portable (.exe standalone) saja
npm run build:portable
```
File installer yang telah selesai dibuat akan berada di folder `dist/`.

---

## 🧪 Testing & Kualitas Kode

Proyek ini dilengkapi dengan 40+ unit dan integration test suite menggunakan test runner bawaan Node.js:
- ✅ **Path Traversal Security:** Validasi pencegahan eksploitasi file system.
- ✅ **Atomic File Transactions:** Menjamin integritas data JSON/Text dari kegagalan crash atau power-cut.
- ✅ **Macro Sequencing & OBS Integration:** Pengujian aliran aksi multi-step secara sinkron dan asinkron.
- ✅ **Media Lifecycle:** Pengujian parsing metadata, upload, dan filter format.

---

## 🌐 Author & Portofolio

* **Developer:** Fadhila Abiyyu
* **Website:** [fadhilaabiyyu.my.id](https://fadhilaabiyyu.my.id)
* **GitHub:** [@fadhila36](https://github.com/fadhila36)

---

**© 2026 Crafted with ❤️ by fadhila36.**
