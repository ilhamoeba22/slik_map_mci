import { NextResponse } from 'next/server';
import { query } from '../../../lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    // 1. Check API Key Autentikasi
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== (process.env.API_KEY || 'MCI_API_SECRET')) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    // 2. Parse Form Data
    const formData = await request.formData();

    // Fields text
    const nama = formData.get('nama');
    const nik = formData.get('nik');
    const nopen = formData.get('nopen');
    const tanggal_lahir = formData.get('tanggal_lahir');
    const status_perkawinan = formData.get('status_perkawinan');
    const alamat = formData.get('alamat');
    const no_hp = formData.get('no_hp');
    const gaji_pensiun = parseFloat(formData.get('gaji_pensiun') || '0');

    const nama_pensiun = formData.get('nama_pensiun');
    const no_sk_pensiun = formData.get('no_sk_pensiun');
    const tanggal_sk_pensiun = formData.get('tanggal_sk_pensiun');
    const pensiunan_dari = formData.get('pensiunan_dari');
    const kantor_bayar_asal = formData.get('kantor_bayar_asal');
    const kantor_bayar_tujuan = formData.get('kantor_bayar_tujuan');

    const nama_penjamin = formData.get('nama_penjamin');
    const nik_penjamin = formData.get('nik_penjamin');
    const pekerjaan_penjamin = formData.get('pekerjaan_penjamin');
    const alamat_penjamin = formData.get('alamat_penjamin');

    const plafon_pengajuan = parseFloat(formData.get('plafon_pengajuan') || '0');
    const tenor = parseInt(formData.get('tenor') || '0', 10);
    const tujuan_penggunaan = formData.get('tujuan_penggunaan');
    const margin_efektif = parseFloat(formData.get('margin_efektif') || '0');
    const biaya_administrasi = parseFloat(formData.get('biaya_administrasi') || '0');
    const biaya_asuransi = parseFloat(formData.get('biaya_asuransi') || '0');
    const biaya_tabungan = parseFloat(formData.get('biaya_tabungan') || '0');
    const biaya_meterai = parseFloat(formData.get('biaya_meterai') || '0');
    const biaya_lain = parseFloat(formData.get('biaya_lain') || '0');
    const nominal_take_over = parseFloat(formData.get('nominal_take_over') || '0');

    // Parse RAB Items (expected JSON string)
    const rab_items_raw = formData.get('rab_items');
    let rab_items = null;
    if (rab_items_raw) {
      try {
        rab_items = JSON.parse(rab_items_raw);
      } catch (e) {
        console.error('Error parsing rab_items JSON:', e);
      }
    }

    if (!nama || !nik || !nopen) {
      return NextResponse.json({ success: false, message: 'Nama, NIK, dan Nopen wajib diisi.' }, { status: 400 });
    }

    // 3. Create directory for applicant uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', nopen);
    await fs.mkdir(uploadDir, { recursive: true });

    // Helper function to save file
    const saveFile = async (fileKey, defaultName) => {
      const file = formData.get(fileKey);
      if (!file || typeof file === 'string' || file.size === 0) return null;
      
      const fileExt = path.extname(file.name) || (fileKey.includes('video') ? '.mp4' : '.pdf');
      const filename = `${defaultName}${fileExt}`;
      const filepath = path.join(uploadDir, filename);
      
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(filepath, buffer);
      
      // Return web accessible path
      return `/uploads/${nopen}/${filename}`;
    };

    // Save all files
    const ktp_path = await saveFile('file_ktp', 'ktp');
    const kk_path = await saveFile('file_kk', 'kk');
    const sk_path = await saveFile('file_sk_pensiun', 'sk_pensiun');
    const rab_path = await saveFile('file_rab', 'rab');
    const pas_foto_path = await saveFile('file_pas_foto', 'pas_foto');
    const skbi_path = await saveFile('file_skbi', 'skbi');
    const surat_pernyataan_path = await saveFile('file_surat_pernyataan', 'surat_pernyataan');
    const video_asuransi_path = await saveFile('file_video_asuransi', 'video_asuransi');
    const video_wawancara_path = await saveFile('file_video_wawancara', 'video_wawancara');

    // 4. Save to Database
    const sql = `
      INSERT INTO debiturs (
        nama, nik, nopen, tanggal_lahir, status_perkawinan, alamat, no_hp, gaji_pensiun,
        nama_pensiun, no_sk_pensiun, tanggal_sk_pensiun, pensiunan_dari, kantor_bayar_asal, kantor_bayar_tujuan,
        nama_penjamin, nik_penjamin, pekerjaan_penjamin, alamat_penjamin,
        plafon_pengajuan, tenor, tujuan_penggunaan, margin_efektif, biaya_administrasi, biaya_asuransi,
        biaya_tabungan, biaya_meterai, biaya_lain, nominal_take_over,
        rab_items,
        ktp_file_path, kk_file_path, sk_file_path, rab_file_path, pas_foto_file_path,
        skbi_file_path, surat_pernyataan_file_path, video_asuransi_file_path, video_wawancara_file_path,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AO_REVIEW')
    `;

    const params = [
      nama, nik, nopen, tanggal_lahir, status_perkawinan, alamat, no_hp, gaji_pensiun,
      nama_pensiun, no_sk_pensiun, tanggal_sk_pensiun, pensiunan_dari, kantor_bayar_asal, kantor_bayar_tujuan,
      nama_penjamin, nik_penjamin, pekerjaan_penjamin, alamat_penjamin,
      plafon_pengajuan, tenor, tujuan_penggunaan, margin_efektif, biaya_administrasi, biaya_asuransi,
      biaya_tabungan, biaya_meterai, biaya_lain, nominal_take_over,
      rab_items ? JSON.stringify(rab_items) : null,
      ktp_path, kk_path, sk_path, rab_path, pas_foto_path,
      skbi_path, surat_pernyataan_path, video_asuransi_path, video_wawancara_path
    ];

    const result = await query(sql, params);
    
    // Create Audit Log
    await query(
      'INSERT INTO audit_logs (debitur_id, username, action, notes) VALUES (?, ?, ?, ?)',
      [result.insertId, 'EXTERNAL_API', 'SUBMIT', 'Data pengajuan diterima melalui API External']
    );

    return NextResponse.json({
      success: true,
      message: 'Data pengajuan berhasil disimpan.',
      data: {
        id: result.insertId,
        nama,
        nopen,
        status: 'AO_REVIEW'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error handling API submit:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}
