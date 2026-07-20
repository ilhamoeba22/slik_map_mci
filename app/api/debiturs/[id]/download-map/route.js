import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db';
import { queryWablast } from '../../../../../lib/db_wablast';
import { queryKaryawan } from '../../../../../lib/db_karyawan';
import { cookies } from 'next/headers';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

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

function calculateAgeString(birthDateStr, compareDateStr) {
  const birthDate = new Date(birthDateStr);
  const compareDate = new Date(compareDateStr);
  
  let years = compareDate.getFullYear() - birthDate.getFullYear();
  let months = compareDate.getMonth() - birthDate.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return `${years} Tahun ${months} Bulan`;
}

export async function GET(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch Debitur details
    const debiturs = await query('SELECT * FROM debiturs WHERE id = ?', [id]);
    if (debiturs.length === 0) {
      return NextResponse.json({ success: false, message: 'Debitur tidak ditemukan' }, { status: 404 });
    }

    const debitur = debiturs[0];

    // Format fields for placeholder replacement
    const formatNumber = (num) => {
      return new Intl.NumberFormat('id-ID').format(Math.round(num));
    };

    const formatDateIndo = (dateStr) => {
      if (!dateStr || dateStr === '-') return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${String(date.getDate()).padStart(2, '0')} - ${months[date.getMonth()]} - ${date.getFullYear()}`;
    };

    const formatDateSlash = (dateStr) => {
      if (!dateStr || dateStr === '-') return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    // Calculate age at submission and age at settlement
    const usiaSekarang = calculateAgeString(debitur.tanggal_lahir, debitur.submitted_at);
    
    // Age at settlement = birthdate to (submission + tenor in months)
    const settlementDate = new Date(debitur.submitted_at);
    settlementDate.setMonth(settlementDate.getMonth() + debitur.tenor);
    const usiaLunas = calculateAgeString(debitur.tanggal_lahir, settlementDate);

    // Calculate Angsuran Nett (Annuity PMT formula)
    const rate = (debitur.margin_efektif / 100) / 12;
    const pmt = rate > 0 
      ? (debitur.plafon_pengajuan * rate) / (1 - Math.pow(1 + rate, -debitur.tenor))
      : debitur.plafon_pengajuan / debitur.tenor;
    const angsuran = Math.round(pmt);

    const formatNoRegistrasi = (id, dateStr) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][date.getMonth()];
      const idStr = String(id).padStart(5, '0');
      return `${idStr}/MI/PBY/${monthRoman}/${year}`;
    };

    // Fetch SLIK records from db_wablast using NIK
    let slikRecordsRaw = [];
    let slikRecords = [];

    try {
      const dataRows = await queryWablast('SELECT id FROM tbl_data WHERE NIK = ? LIMIT 1', [debitur.nik]);
      if (dataRows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'SLIK nasabah belum tersedia di database (db_wablast). Dokumen MAP belum dapat diunduh.' 
        }, { status: 400 });
      }

      const biId = dataRows[0].id;
      slikRecordsRaw = await queryWablast(
        'SELECT nm_bank, kol, platfond, bakidebet, angsuran, jkw, kondisi_ket FROM tbl_bi_orang WHERE id = ?',
        [biId]
      );
      
      slikRecords = slikRecordsRaw.map(row => ({
        nama_bank: row.nm_bank ? row.nm_bank.toUpperCase() : '-',
        baki_debet: formatNumber(row.bakidebet || 0),
        angsuran: formatNumber(row.angsuran || 0),
        kolektibilitas: row.kol || 'Lancar',
        status: row.kondisi_ket ? row.kondisi_ket.toUpperCase() : ''
      }));
    } catch (err) {
      console.error('Error fetching SLIK from db_wablast:', err);
      return NextResponse.json({ success: false, message: 'Gagal melakukan koneksi ke database SLIK: ' + err.message }, { status: 500 });
    }

    // Fetch Kadiv Bisnis name from db_karyawan
    let kadivBisnisName = 'FARADAYS MUHAMMAD';
    try {
      const kadivRows = await queryKaryawan(`
        SELECT k.namaLengkap 
        FROM tbl_pekerjaan p
        JOIN tbl_karyawan k ON p.idKaryawan = k.idKaryawan
        JOIN tbl_jabatan j ON p.idJabatan = j.idJabatan
        WHERE j.namaJabatan = 'Kepala Divisi Bisnis' AND k.statusKerja = 'aktif'
        ORDER BY p.tglMasuk DESC LIMIT 1
      `);
      if (kadivRows.length > 0) {
        kadivBisnisName = kadivRows[0].namaLengkap.toUpperCase();
      }
    } catch (err) {
      console.error('Error fetching Kadiv Bisnis name:', err);
    }

    const payload = {
      NO_REGISTRASI: formatNoRegistrasi(debitur.id, debitur.submitted_at),
      gaji_num: debitur.gaji_pensiun,
      angsuran_num: angsuran,
      slik_records: slikRecords,
      slik_records_raw: slikRecordsRaw,
      AO_NAME: debitur.ao_nama ? debitur.ao_nama.toUpperCase() : session.nama.toUpperCase(),
      KADIV_BISNIS: debitur.kadiv_nama ? debitur.kadiv_nama.toUpperCase() : kadivBisnisName,
      CATATAN_APPROVAL: debitur.catatan_approval || '',
      KEPUTUSAN_APPROVAL: debitur.keputusan_approval || '',
      CATATAN_ANALISA: debitur.catatan_analisa || '',
      NAMA: debitur.nama.toUpperCase(),
      NIK: debitur.nik,
      NOPEN: debitur.nopen,
      GAJI: formatNumber(debitur.gaji_pensiun),
      NAMA_PENSIUN: debitur.nama_pensiun.toUpperCase(),
      ALAMAT: debitur.alamat.toUpperCase(),
      NO_HP: debitur.no_hp,
      SK_TEMPAT: debitur.sk_dikeluarkan_di ? debitur.sk_dikeluarkan_di.toUpperCase() : 'YOGYAKARTA',
      KANTOR_ASAL: debitur.kantor_bayar_asal.toUpperCase(),
      KANTOR_TUJUAN: debitur.kantor_bayar_tujuan.toUpperCase(),
      SK_TANGGAL: formatDateSlash(debitur.tanggal_sk_pensiun),
      PENSIUNAN_DARI: debitur.pensiunan_dari.toUpperCase(),
      NO_SK: debitur.no_sk_pensiun,
      TGL_LAHIR: formatDateIndo(debitur.tanggal_lahir),
      USIA_SEKARANG: usiaSekarang,
      USIA_LUNAS: usiaLunas,
      PLAFON: formatNumber(debitur.plafon_pengajuan),
      TENOR: `${debitur.tenor} bulan`,
      MARGIN: `${debitur.margin_efektif}% p.a`,
      ANGSURAN: formatNumber(angsuran),
      TUJUAN: debitur.tujuan_penggunaan,
      PENGHASILAN_KOTOR_TAHUN: formatNumber(debitur.gaji_pensiun * 12),
      BIAYA_ADMINISTRASI: formatNumber(debitur.biaya_administrasi),
      HARGA_JUAL: formatNumber(angsuran * debitur.tenor),
      MARGIN_NETT: formatNumber((angsuran * debitur.tenor) - debitur.plafon_pengajuan),
      
      // New dynamic demographic & status fields
      JENIS_KELAMIN: (debitur.jenis_kelamin || '-').toUpperCase(),
      NAMA_PASANGAN: (debitur.nama_pasangan || '-').toUpperCase(),
      NIK_PASANGAN: (debitur.nik_pasangan || '-').toUpperCase(),
      TGL_LAHIR_PASANGAN: debitur.tanggal_lahir_pasangan ? formatDateSlash(debitur.tanggal_lahir_pasangan) : '-',
      JUMLAH_TANGGUNGAN: debitur.jumlah_tanggungan !== null ? String(debitur.jumlah_tanggungan) : '0',
      PERJANJIAN_PISAH_HARTA: (debitur.perjanjian_pisah_harta || 'TIDAK').toUpperCase(),
      SUMBER_PENGHASILAN: (debitur.sumber_penghasilan || 'GAJI PENSIUN').toUpperCase(),
      NAMA_PENERIMA_PENSIUN: (debitur.nama_penerima_pensiun || debitur.nama_pensiun).toUpperCase(),
      STATUS_SK: (debitur.status_sk || 'ASLI').toUpperCase(),
      
      // Table 0 dynamic fields
      JENIS_NASABAH: (debitur.jenis_nasabah || 'Perorangan').toUpperCase(),
      STATUS_NASABAH: (debitur.status_nasabah || 'Nasabah Baru').toUpperCase(),
      PRODUK_PEMBIAYAAN: (debitur.produk_pembiayaan || 'Multiguna Pensiunan').toUpperCase(),
      MITRA_VENDOR: (debitur.mitra_vendor || 'BPRS MCI').toUpperCase(),
      PKS_NO: (debitur.pks_no || '-').toUpperCase(),
      JENIS_PEMBIAYAAN: (debitur.jenis_pembiayaan || 'Multiguna').toUpperCase(),
      JENIS_AKAD: (debitur.jenis_akad || 'Murabahah').toUpperCase(),
      JENIS_PENGIKATAN: (debitur.jenis_pengikatan || 'Fidusia').toUpperCase(),
      NO_CIF: (debitur.no_cif || '-').toUpperCase(),
      NO_REK_PEMBIAYAAN: (debitur.no_rek_pembiayaan || '-').toUpperCase(),
      NO_REK_SIMPANAN: (debitur.no_rek_simpanan || '-').toUpperCase(),
      STATUS_PEMBIAYAAN: (debitur.status_pembiayaan || 'SK Ditangan').toUpperCase(),
      ASURANSI: (debitur.asuransi || 'Reliance (Asuransi Jiwa)').toUpperCase(),
      JENIS_PEMBAYARAN: (debitur.jenis_pembayaran || 'Angsuran Bulanan').toUpperCase(),
      SKEMA_PEMBAYARAN: (debitur.skema_pembayaran || 'Flat').toUpperCase(),
      JENIS_PENGGUNAAN: (debitur.jenis_penggunaan || 'Konsumtif').toUpperCase()
    };

    // Invoke Python generator script
    const pyScriptPath = path.join(process.cwd(), 'lib', 'generate_map.py');
    
    const runGenerator = () => {
      return new Promise((resolve, reject) => {
        const child = exec(`python "${pyScriptPath}"`, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message));
          } else {
            resolve(stdout.trim());
          }
        });
        child.stdin.write(JSON.stringify(payload));
        child.stdin.end();
      });
    };

    const tempFilePath = await runGenerator();

    // Read the generated temp file
    const fileBuffer = await fs.readFile(tempFilePath);

    // Delete the temp file to avoid leaving garbage
    await fs.unlink(tempFilePath);

    // Serve as file download
    const cleanFilename = `MAP_${debitur.nama.replace(/\s+/g, '_')}_${debitur.nopen}.docx`;

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${cleanFilename}"`
      }
    });

  } catch (error) {
    console.error('Error generating MAP:', error);
    return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: 500 });
  }
}
