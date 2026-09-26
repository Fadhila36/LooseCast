# Release Notes - LooseCast v1.1.6

## 🚀 Perbaikan & Peningkatan Utama

### 1. Perbaikan Menyeluruh Sistem Terjemahan (i18n)
- **Implementasi Fungsi i18n Inti**: Menambahkan implementasi lengkap `applyPageStrings()`, `switchLang()`, dan `onLangChange()` pada `loosecast-ui.js` dan `stream-kit-ui.js`.
- **Eliminasi String Mentah**: Memperbaiki masalah di mana label antarmuka menampilkan key mentah seperti `stat_total_memes`, `card_custom_deck_title`, `ob_guide_title`, dll.
- **Tombol Bahasa Responsif**: Tombol switcher bahasa (Indonesia 🇮🇩 / English 🇬🇧) kini beralih secara instan di seluruh halaman dan sidebar tanpa reload atau error.

### 2. Penanganan Navigasi & Koneksi Localhost (ERR_CONNECTION_REFUSED)
- **Pembaruan Asset Bundling**: Seluruh file frontend (`public/**/*`, `lang/**/*`, `src/**/*`, `server.js`, `node_modules/**/*`) kini dibundle secara lengkap ke dalam resources NSIS installer.
- **Multi-Path Sidecar & Script Discovery**: Runtime Rust kini memeriksa kandidat path sidecar `loosecast-server-x86_64-pc-windows-msvc.exe` dan `server.js` di direktori instalasi, `resources/`, dan `_up_/` sehingga Express server selalu aktif dan tidak gagal menyajikan halaman `/customdeck.html`, `/deck.html`, dan `/obs.html`.

### 3. Fitur System Tray & Pembaruan
- **Menu Buka Log Aplikasi**: Akses cepat ke folder log aplikasi langsung dari tray Windows.
- **Menu Periksa Pembaruan**: Pemeriksaan versi update otomatis terhubung ke repositori GitHub resmi.
- **Menu Navigasi Browser**: Buka LooseCast Studio langsung di browser default.

---
**LooseCast Team**
