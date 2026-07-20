# BPRS HIK MCI — Portal Pembiayaan Pensiunan & SLIK OJK 🚀

Aplikasi web internal profesional untuk mengotomatisasi pembuatan dokumen **MAP (Memo Analisa Pembiayaan)** pensiunan, verifikasi data nasabah, pengajuan request checking SLIK OJK (batch TXT), parser iDeb SLIK OJK (JSON), serta Dashboard Rekapitulasi Eksekutif.

Aplikasi ini dibangun menggunakan teknologi modern Next.js App Router dengan tampilan antarmuka (UI) premium bernuansa **Glassmorphism**, antarmuka yang responsif, *collapsible sidebar*, serta dukungan tema Terang / Gelap (Light / Dark Mode).

---

## 🛠️ Tech Stack

* **Framework**: Next.js 15+ (App Router, Turbopack) — React
* **Database**: MySQL / MariaDB (`db_slik_map_mci` pada server `192.168.1.199:33006`)
* **Template Processor**: Python (menggunakan library `python-docx` untuk memproses template `.docx` dinamis)
* **Styling**: Custom Vanilla CSS (Design system modular dengan Glassmorphic Cards & Theme Tokens)
* **Authentication**: SSO NIK Karyawan (Integrasi `db_karyawan`)

---

## ✨ Fitur Utama

1. **📊 Executive Dashboard & Rekapitulasi**:
   * Rekapitulasi KPI (Total MAP, Total Plafond, Permintaan SLIK, Data SLIK Ter-parser).
   * Grafik Tren Bulanan Pengajuan (Interactive SVG Bar Chart).
   * Grafik Distribusi Segmen Nasabah SLIK (Interactive SVG Donut Chart).
   * Activity Feeds pengajuan & hasil SLIK terbaru.

2. **📁 MAP Generator (Memo Analisa Pembiayaan)**:
   * Parsing & integrasi berkas TXT data pengajuan nasabah secara cepat.
   * Ekspor otomatis ke dokumen Word MAP (.docx) yang siap diunduh dan dicetak.
   * Pencarian, filter tahun/bulan, dan pagination server-side yang responsif.

3. **🔍 Permintaan Checking SLIK OJK (`/slik-request`)**:
   * Form pengajuan checking SLIK OJK perorangan maupun pasangan (lengkap dengan upload berkas KTP).
   * Generator otomatis berkas **TXT Batch OJK** (`REQ_SLIK_BATCH_...txt`) yang sesuai dengan standar format OJK.
   * Riwayat pengajuan dengan tata letak vertikal (*stacked layout*).

4. **📥 Upload & Parser JSON Hasil SLIK (`/slik-parser`)**:
   * Parser otomatis berkas JSON iDeb SLIK OJK (Perorangan & Perusahaan).
   * Relasi data ke calon debitur (Nopen / Nomor Pensiun).
   * Halaman Detail SLIK Interaktif (`/slik-detail/[id]/[type]`) yang memisahkan pembiayaan aktif, fasilitas lunas, dan rincian agunan.

5. **🎨 Desain UI/UX & Fitur Kenyamanan**:
   * **Collapsible Sidebar**: Sidebar responsif yang dapat di-minimize dengan ikon `mci_ico.ico`.
   * **Iconic Theme Toggle**: Switch mode terang / gelap berbentuk ikon Matahari ☀️ dan Bulan 🌙.
   * **Custom Exit Confirmation Modal**: Modal konfirmasi keluar berbasis glassmorphism (tanpa dialog bawaan browser).
   * **Server-Side Pagination & Indexing**: Kinerja rendering instan tanpa lagging.

---

## ⚙️ Konfigurasi Environment (`.env.local`)

Buat file bernama `.env.local` di root direktori proyek dengan format berikut:

```env
DB_HOST=192.168.1.199
DB_PORT=33006
DB_USER=root
DB_PASSWORD=Xurang1234!!
DB_NAME=db_slik_map_mci
```

---

## 🏃 Menjalankan Aplikasi

### Mode Pengembangan (Development)
```bash
npm install
npm run dev
```
Akses aplikasi di browser pada: [http://localhost:3000](http://localhost:3000)

### Mode Produksi (Production Build & Start)
```bash
npm run build
npm run start
```

---

## 🌐 Layanan Background Service Windows Server (`192.168.1.199`)

Aplikasi dikonfigurasi untuk berjalan 24/7 di latar belakang server lokal menggunakan **Windows Scheduled Task** / **PM2**.

### Menjalankan Service Manual via Node:
```cmd
npm run start -- --hostname 192.168.1.199 --port 3000
```

---

## 🔒 Hak Cipta & Lisensi
Copyright &copy; 2026 &bull; Developed by **IT, MIS, & Product Development BPRS HIK MCI**.
