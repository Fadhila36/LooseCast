# 🚀 Tomatosuki Stream Kit AIO

**All-in-One Overlay & Deck Controller: Meme, Video, Audio, Chroma Key, K/D Counter & Remote HP via Browser Source OBS.**

Tomatosuki Stream Kit AIO adalah aplikasi kontroler stream berbasis **Electron + Node.js (Express & Socket.io)** yang dirancang khusus untuk streamer. Memungkinkan pengelolaan aset interaktif secara *real-time* hanya melalui satu jalur *Browser Source* di OBS Studio, Streamlabs, Polycam, atau XSplit.

---

## 🛠️ Fitur Utama

* 🎭 **Multi-Format Playback:** Putar Video (`.mp4`, `.webm`, `.mov`), Audio (`.mp3`, `.wav`, `.ogg`), Animasi (`.gif`, `.webp`), dan Gambar seketika.
* 🟢 **Built-in Chroma Key:** Otomatis hapus background hijau (*green screen*) pada video meme tanpa perlu filter tambahan di OBS.
* 📱 **Connect to Phone (LAN Remote):** Buka Deck View langsung dari browser HP di jaringan Wi-Fi yang sama untuk trigger meme tanpa *alt-tab* saat live gaming.
* ⚔️ **Atomic K/D Counter:** Counter Win/Loss/Kill/Death yang tersimpan otomatis ke file `.txt` untuk dihubungkan sebagai *Text Source* di OBS.
* ⌨️ **Global Keyboard Shortcut:** Trigger meme dan kontrol counter langsung dari hotkey keyboard.
* 💾 **Atomic File Storage & Non-Blocking Async:** Arsitektur penyimpanan data anti-korup (*atomic write*) dan performa I/O non-blocking yang sangat ringan di CPU.
* 🛡️ **OWASP Path Traversal Protected:** Sistem sanitasi direktori yang aman untuk melindungi aset komputer lokal.
* 🌐 **100% Offline Standalone:** Bebas dari dependensi CDN eksternal, siap digunakan saat offline / LAN party.
* 📦 **Backup & Restore 1-Click:** Ekspor seluruh koleksi meme dan konfigurasi deck ke dalam satu file ZIP.

---

## 🚀 Cara Install & Menjalankan

### Persyaratan:
* [Node.js](https://nodejs.org/) (versi 18 ke atas disarankan).

### Langkah Instalasi:
1. **Clone / Download** repository ini:
   ```bash
   git clone https://github.com/fadhila36/Tomatosuki-Stream-kit-AIO.git
   cd Tomatosuki-Stream-kit-AIO
   ```
2. **Install Dependensi:**
   ```bash
   npm install
   ```
3. **Jalankan Aplikasi:**
   * **Mode Desktop (Electron):**
     ```bash
     npm run dev
     ```
   * **Mode Server Only (Web Server):**
     ```bash
     npm start
     ```
   * **Menjalankan Automated Test Suite (TDD):**
     ```bash
     npm test
     ```

---

## 🖥️ Cara Pasang di OBS Studio

1. Buka **OBS Studio**.
2. Pada panel **Sources**, klik ikon **`+`** ➔ Pilih **Browser**.
3. Beri nama source (misal: `Tomatosuki Meme Overlay`).
4. Pada kolom **URL**, masukkan link overlay lokal Anda (misal: `http://localhost:3000/obs.html` atau `http://192.168.1.XX:3000/obs.html`).
5. Atur **Width** ke `1920` dan **Height** ke `1080` (atau sesuaikan resolusi canvas OBS Anda).
6. Centang opsi:
   * ✅ *Shutdown source when not visible*
   * ✅ *Refresh browser when scene becomes active*
7. Klik **OK**. Selesai!

> 💡 **Tips:** Jika meme tidak muncul saat pertama kali diatur, klik kanan Browser Source di OBS ➔ **Interact** atau **Refresh Cache of Current Page**.

---

## 📱 Cara Menggunakan Remote via HP

1. Pastikan HP dan PC berada dalam jaringan Wi-Fi / LAN yang sama.
2. Buka Dashboard Tomatosuki ➔ Klik **"Connect to Phone"** di Sidebar.
3. Scan **QR Code** yang muncul di layar menggunakan kamera HP Anda, atau ketik alamat IP yang tertera (misal: `http://192.168.1.50:3000/deck.html`).
4. Deck View akan langsung terbuka di layar HP Anda.

---

## 🧪 Arsitektur & Testing

Proyek ini telah direfaktor dengan standar **Senior Clean Code**:
* `src/utils/path-security.js` — Sanitasi nama file dan validasi batas direktori.
* `src/utils/file-store.js` — Operasi non-blocking async JSON & Text dengan atomic write ke temporary file.
* `tests/` — Test harness native Node.js (`node --test`) mencakup unit testing utilitas dan integration test API endpoints.

---

## 🌐 Website & Portofolio

* Website: [fadhilaabiyyu.my.id](https://fadhilaabiyyu.my.id)
* GitHub: [github.com/fadhila36](https://github.com/fadhila36)

---

**© 2026 Crafted with ❤️ by fadhila36.**
