-- Create database if not exists
CREATE DATABASE IF NOT EXISTS grahadi_mci;
USE grahadi_mci;

-- Drop tables if exist
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS debiturs;

-- Debiturs table (History of generated MAPs)
CREATE TABLE debiturs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    nik VARCHAR(16) NOT NULL,
    nopen VARCHAR(50) NOT NULL,
    tanggal_lahir DATE NOT NULL,
    status_perkawinan VARCHAR(50) NOT NULL,
    alamat TEXT NOT NULL,
    no_hp VARCHAR(20) NOT NULL,
    gaji_pensiun DECIMAL(15, 2) NOT NULL,
    
    -- SK Pensiun
    nama_pensiun VARCHAR(255) NOT NULL,
    no_sk_pensiun VARCHAR(100) NOT NULL,
    tanggal_sk_pensiun DATE NOT NULL,
    pensiunan_dari VARCHAR(100) NOT NULL,
    kantor_bayar_asal VARCHAR(100) NOT NULL,
    kantor_bayar_tujuan VARCHAR(100) NOT NULL,
    
    -- Finansial
    plafon_pengajuan DECIMAL(15, 2) NOT NULL,
    tenor INT NOT NULL,
    tujuan_penggunaan VARCHAR(255) NOT NULL,
    margin_efektif DECIMAL(5, 2) NOT NULL,
    biaya_administrasi DECIMAL(15, 2) NOT NULL,
    biaya_asuransi DECIMAL(15, 2) NOT NULL,
    biaya_tabungan DECIMAL(15, 2) NOT NULL,
    biaya_meterai DECIMAL(15, 2) NOT NULL,
    biaya_lain DECIMAL(15, 2) NOT NULL,
    nominal_take_over DECIMAL(15, 2) NOT NULL,
    
    -- Historical Approval fields from Grahadi
    ao_nama VARCHAR(100) NULL,
    kadiv_nama VARCHAR(100) NULL,
    catatan_approval TEXT NULL,
    keputusan_approval VARCHAR(100) NULL,
    catatan_analisa TEXT NULL,
    
    -- Additional Dynamic Fields from Grahadi TXT
    jenis_kelamin VARCHAR(20) NULL,
    nama_pasangan VARCHAR(100) NULL,
    nik_pasangan VARCHAR(20) NULL,
    tanggal_lahir_pasangan VARCHAR(20) NULL,
    jumlah_tanggungan INT DEFAULT 0,
    perjanjian_pisah_harta VARCHAR(20) NULL,
    sumber_penghasilan VARCHAR(100) NULL,
    nama_penerima_pensiun VARCHAR(100) NULL,
    status_sk VARCHAR(50) NULL,
    sk_dikeluarkan_di VARCHAR(100) NULL,
    jenis_nasabah VARCHAR(100) NULL,
    status_nasabah VARCHAR(100) NULL,
    produk_pembiayaan VARCHAR(100) NULL,
    mitra_vendor VARCHAR(100) NULL,
    pks_no VARCHAR(100) NULL,
    jenis_pembiayaan VARCHAR(100) NULL,
    jenis_akad VARCHAR(100) NULL,
    jenis_pengikatan VARCHAR(100) NULL,
    no_cif VARCHAR(100) NULL,
    no_rek_pembiayaan VARCHAR(100) NULL,
    no_rek_simpanan VARCHAR(100) NULL,
    status_pembiayaan VARCHAR(100) NULL,
    asuransi VARCHAR(100) NULL,
    jenis_pembayaran VARCHAR(100) NULL,
    skema_pembayaran VARCHAR(100) NULL,
    jenis_penggunaan VARCHAR(100) NULL,
    
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    debitur_id INT NOT NULL,
    username VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (debitur_id) REFERENCES debiturs(id) ON DELETE CASCADE
);
