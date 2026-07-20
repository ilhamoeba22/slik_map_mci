import { NextResponse } from 'next/server';
import { query, queryRaw } from '../../../lib/db';
import { queryWablast } from '../../../lib/db_wablast';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

// Helper to check authentication
async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');
    if (!sessionCookie) return null;
    return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('ascii'));
  } catch (e) {
    return null;
  }
}

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const checkNiks = searchParams.get('check_niks');
    const checkNopens = searchParams.get('check_nopens');

    if (checkNiks || checkNopens) {
      const nikList = checkNiks ? checkNiks.split(',').filter(x => x.trim().length > 0) : [];
      const nopenList = checkNopens ? checkNopens.split(',').filter(x => x.trim().length > 0) : [];
      
      if (nikList.length === 0 && nopenList.length === 0) {
        return NextResponse.json({ success: true, duplicates: [] });
      }
      
      const queryParams = [];
      const whereClauses = [];
      if (nikList.length > 0) {
        whereClauses.push(`nik IN (${nikList.map(() => '?').join(',')})`);
        queryParams.push(...nikList);
      }
      if (nopenList.length > 0) {
        whereClauses.push(`nopen IN (${nopenList.map(() => '?').join(',')})`);
        queryParams.push(...nopenList);
      }
      
      const sqlCheck = `SELECT id, nik, nopen, nama FROM debiturs WHERE ${whereClauses.join(' OR ')}`;
      const duplicates = await query(sqlCheck, queryParams);
      return NextResponse.json({ success: true, duplicates });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const filter_slik = searchParams.get('has_slik'); // 'yes' or 'no'
    const sort_by = searchParams.get('sort_by') || 'date_desc'; // 'plafond_desc', 'plafond_asc', 'date_desc', 'date_asc'
    const filter_year = searchParams.get('year');
    const filter_month = searchParams.get('month');

    const whereClauses = [];
    const params = [];

    if (search) {
      whereClauses.push('(nama LIKE ? OR nik LIKE ? OR nopen LIKE ?)');
      const searchWild = `%${search}%`;
      params.push(searchWild, searchWild, searchWild);
    }

    if (filter_year) {
      whereClauses.push('YEAR(submitted_at) = ?');
      params.push(filter_year);
    }

    if (filter_month) {
      whereClauses.push('MONTH(submitted_at) = ?');
      params.push(filter_month);
    }

    const whereStr = whereClauses.length > 0 ? ` WHERE ${whereClauses.join(' AND ')}` : '';

    // Get count
    const countSql = `SELECT COUNT(*) as total FROM debiturs${whereStr}`;
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    // Determine Sort Order SQL
    let orderSql = ' ORDER BY submitted_at DESC';
    if (sort_by === 'plafond_desc') {
      orderSql = ' ORDER BY plafon_pengajuan DESC';
    } else if (sort_by === 'plafond_asc') {
      orderSql = ' ORDER BY plafon_pengajuan ASC';
    } else if (sort_by === 'date_asc') {
      orderSql = ' ORDER BY submitted_at ASC';
    } else if (sort_by === 'date_desc') {
      orderSql = ' ORDER BY submitted_at DESC';
    }

    // Get paginated rows — gunakan queryRaw agar LIMIT/OFFSET tidak crash di mysql2 prepared statement
    const offset = (page - 1) * limit;
    const sql = `SELECT id, nama, nik, nopen, submitted_at, plafon_pengajuan, tenor, tujuan_penggunaan FROM debiturs${whereStr}${orderSql} LIMIT ? OFFSET ?`;
    
    const pageParams = [...params, limit, offset];
    let debiturs = await queryRaw(sql, pageParams);

    // Dynamic batch check for SLIK presence in db_wablast
    if (debiturs.length > 0) {
      const nics = debiturs.map(d => d.nik);
      const placeholders = nics.map(() => '?').join(',');
      try {
        const slikExistsRows = await query(
          `SELECT nik FROM tbl_data WHERE nik IN (${placeholders})`,
          nics
        );
        const activeSlikNiks = new Set(slikExistsRows.map(r => r.nik));
        
        debiturs.forEach(d => {
          d.has_slik = activeSlikNiks.has(d.nik);
        });
      } catch (err) {
        console.error('Error batch checking SLIK status:', err);
        debiturs.forEach(d => {
          d.has_slik = false;
        });
      }
    }

    // Filter SLIK presence post-fetch (if requested)
    if (filter_slik === 'yes') {
      debiturs = debiturs.filter(d => d.has_slik);
    } else if (filter_slik === 'no') {
      debiturs = debiturs.filter(d => !d.has_slik);
    }

    return NextResponse.json({
      success: true,
      debiturs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      limit
    });

  } catch (error) {
    console.error('Error fetching debiturs:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Parse Form Data
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

    // New approval fields
    const ao_nama = formData.get('ao_nama');
    const kadiv_nama = formData.get('kadiv_nama');
    const catatan_approval = formData.get('catatan_approval');
    const keputusan_approval = formData.get('keputusan_approval');
    const catatan_analisa = formData.get('catatan_analisa');

    // Additional dynamic fields from TXT
    const jenis_kelamin = formData.get('jenis_kelamin');
    const nama_pasangan = formData.get('nama_pasangan');
    const nik_pasangan = formData.get('nik_pasangan');
    const tanggal_lahir_pasangan = formData.get('tanggal_lahir_pasangan');
    const jumlah_tanggungan = parseInt(formData.get('jumlah_tanggungan') || '0', 10);
    const perjanjian_pisah_harta = formData.get('perjanjian_pisah_harta');
    const sumber_penghasilan = formData.get('sumber_penghasilan');
    const nama_penerima_pensiun = formData.get('nama_penerima_pensiun');
    const status_sk = formData.get('status_sk');
    const sk_dikeluarkan_di = formData.get('sk_dikeluarkan_di');
    const jenis_nasabah = formData.get('jenis_nasabah');
    const status_nasabah = formData.get('status_nasabah');
    const produk_pembiayaan = formData.get('produk_pembiayaan');
    const mitra_vendor = formData.get('mitra_vendor');
    const pks_no = formData.get('pks_no');
    const jenis_pembiayaan = formData.get('jenis_pembiayaan');
    const jenis_akad = formData.get('jenis_akad');
    const jenis_pengikatan = formData.get('jenis_pengikatan');
    const no_cif = formData.get('no_cif');
    const no_rek_pembiayaan = formData.get('no_rek_pembiayaan');
    const no_rek_simpanan = formData.get('no_rek_simpanan');
    const status_pembiayaan = formData.get('status_pembiayaan');
    const asuransi = formData.get('asuransi');
    const jenis_pembayaran = formData.get('jenis_pembayaran');
    const skema_pembayaran = formData.get('skema_pembayaran');
    const jenis_penggunaan = formData.get('jenis_penggunaan');

    if (!nama || !nik || !nopen) {
      return NextResponse.json({ success: false, message: 'Nama, NIK, dan Nopen wajib diisi.' }, { status: 400 });
    }

    // Check if debitur already exists
    const existing = await query('SELECT id FROM debiturs WHERE nopen = ? OR nik = ?', [nopen, nik]);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, message: `Debitur dengan NIK atau Nopen tersebut sudah terdaftar.` }, { status: 400 });
    }

    // Save to Database
    const sql = `
      INSERT INTO debiturs (
        nama, nik, nopen, tanggal_lahir, status_perkawinan, alamat, no_hp, gaji_pensiun,
        nama_pensiun, no_sk_pensiun, tanggal_sk_pensiun, pensiunan_dari, kantor_bayar_asal, kantor_bayar_tujuan,
        plafon_pengajuan, tenor, tujuan_penggunaan, margin_efektif, biaya_administrasi, biaya_asuransi,
        biaya_tabungan, biaya_meterai, biaya_lain, nominal_take_over,
        ao_nama, kadiv_nama, catatan_approval, keputusan_approval, catatan_analisa,
        jenis_kelamin, nama_pasangan, nik_pasangan, tanggal_lahir_pasangan, jumlah_tanggungan,
        perjanjian_pisah_harta, sumber_penghasilan, nama_penerima_pensiun, status_sk, sk_dikeluarkan_di, jenis_nasabah,
        status_nasabah, produk_pembiayaan, mitra_vendor, pks_no, jenis_pembiayaan,
        jenis_akad, jenis_pengikatan, no_cif, no_rek_pembiayaan, no_rek_simpanan,
        status_pembiayaan, asuransi, jenis_pembayaran, skema_pembayaran, jenis_penggunaan
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `;

    const params = [
      nama, nik, nopen, tanggal_lahir, status_perkawinan, alamat, no_hp, gaji_pensiun,
      nama_pensiun, no_sk_pensiun, tanggal_sk_pensiun, pensiunan_dari, kantor_bayar_asal, kantor_bayar_tujuan,
      plafon_pengajuan, tenor, tujuan_penggunaan, margin_efektif, biaya_administrasi, biaya_asuransi,
      biaya_tabungan, biaya_meterai, biaya_lain, nominal_take_over,
      ao_nama, kadiv_nama, catatan_approval, keputusan_approval, catatan_analisa,
      jenis_kelamin, nama_pasangan, nik_pasangan, tanggal_lahir_pasangan, jumlah_tanggungan,
      perjanjian_pisah_harta, sumber_penghasilan, nama_penerima_pensiun, status_sk, sk_dikeluarkan_di, jenis_nasabah,
      status_nasabah, produk_pembiayaan, mitra_vendor, pks_no, jenis_pembiayaan,
      jenis_akad, jenis_pengikatan, no_cif, no_rek_pembiayaan, no_rek_simpanan,
      status_pembiayaan, asuransi, jenis_pembayaran, skema_pembayaran, jenis_penggunaan
    ];

    const result = await query(sql, params);
    
    // Create Audit Log
    await query(
      'INSERT INTO audit_logs (debitur_id, username, action, notes) VALUES (?, ?, ?, ?)',
      [result.insertId, 'AO_USER', 'MANUAL_IMPORT', 'Data pengajuan di-import manual via TXT']
    );

    return NextResponse.json({
      success: true,
      message: 'Data pengajuan berhasil di-import.',
      id: result.insertId
    }, { status: 201 });

  } catch (error) {
    console.error('Error handling AO Manual POST:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}
