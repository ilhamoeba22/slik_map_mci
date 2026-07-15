# MAP Generator (Grahadi App) 🚀

Aplikasi web internal untuk mengotomatisasi pembuatan dokumen **MAP (Memo Analisa Pembiayaan)** dari file TXT Grahadi, melakukan verifikasi data nasabah, memproses status SLIK OJK, dan melakukan integrasi database.

Aplikasi ini menggunakan teknologi modern dengan tampilan antarmuka (UI) premium bernuansa **Glassmorphism**, transisi **macOS Genie Effect**, serta **3D Swinging Pendulum Light Bulb**.

---

## 🛠️ Tech Stack

*   **Framework**: Next.js 16.2.10 (Turbopack) - React
*   **Database**: MySQL / MariaDB (XAMPP / Laragon)
*   **Warp Effect**: SVG `feTurbulence` + `feDisplacementMap` + CSS keyframes (Genie Transition)
*   **Template Processor**: Python (menggunakan library `python-docx` untuk memproses template `.docx`)
*   **Styling**: Custom CSS (dengan dukungan variabel CSS modular & Dark Mode 3D)

---

## ✨ Fitur Utama

1.  **Parsing & Integrasi Data TXT**: Mengurai file data TXT dari sistem Grahadi secara massal dan menyimpannya secara otomatis ke database lokal.
2.  **Generasi Template MAP (.docx)**: Mengekspor file Word MAP secara dinamis berdasarkan data debitur dengan template `.docx` yang dapat diunduh langsung.
3.  **Genie Modal Transition**: Animasi buka-tutup modal pemicu yang "dihisap" secara meliuk (organik seperti asap/cairan) menggunakan kombinasi SVG Displacement filter dan requestAnimationFrame.
4.  **3D Rocker Light Switch**: Saklar lampu 3D interaktif di header untuk mengganti tema (Light / Dark Mode).
5.  **Pendulum 3D Light Bulb**: Animasi bohlam lampu 3D yang berayun dengan pancaran sinar 270° yang halus pada area dashboard dalam tema gelap.
6.  **Database Isolation**: Menangani error secara aman bila database eksternal (`db_wablast` atau `db_karyawan`) tidak merespons tanpa mengganggu performa dashboard utama.

---

## ⚙️ Persiapan & Konfigurasi Lokal

### 1. Prasyarat
*   Node.js (versi 20+)
*   MySQL Server (XAMPP / Laragon)
*   Python 3 (dengan library `python-docx` terinstal)

### 2. Konfigurasi Environment (`.env.local`)
Buat file bernama `.env.local` di root direktori dengan format berikut:
```env
DB_HOST=127.0.0.1
DB_PORT=33006
DB_USER=root
DB_PASSWORD=password_database_anda
DB_NAME=grahadi_mci
```

### 3. Mengimpor Skema Database
Impor file **`setup.sql`** yang disediakan ke server MySQL Anda untuk membuat database `grahadi_mci` beserta tabel `debiturs` dan `audit_logs`.

---

## 🏃 Menjalankan Aplikasi

### Mode Pengembangan (Development)
```bash
npm install
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

### Mode Produksi (Production Build & Start)
```bash
npm run build
npm run start
```

---

## 🌐 Panduan Deployment di Server Windows (`192.168.1.199`)

Project ini telah dikonfigurasi untuk berjalan 24/7 di latar belakang server lokal menggunakan **Windows Scheduled Task** di bawah akun **`SYSTEM`**.

### Perintah Pendaftaran Background Service (PowerShell Admin)
Jika Anda ingin memperbarui atau mendaftarkan ulang layanannya secara manual di server:
```powershell
# Buat action task scheduler
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d C:\Users\server\grahadi-app && npm run start -- --hostname 192.168.1.199 --port 3000"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Daftarkan task
Register-ScheduledTask -TaskName "GrahadiAppService" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force

# Jalankan task
Start-ScheduledTask -TaskName "GrahadiAppService"
```

### Cara Mengontrol Service lewat Command Line
*   **Menghentikan Service**:
    ```cmd
    schtasks /end /tn GrahadiAppService
    ```
*   **Menjalankan Service**:
    ```cmd
    schtasks /run /tn GrahadiAppService
    ```

---

## 🔒 Hak Cipta
Copyright &copy; 2026 &bull; Developed by **IT, MIS, & Product Development BPRS HIK MCI**.
