import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

const parseDateDiffMonths = (tglMulai, tglJt) => {
  if (!tglMulai || !tglJt || tglMulai.length < 6 || tglJt.length < 6) return 1;
  const thnMulai = parseInt(tglMulai.substring(0, 4), 10);
  const blnMulai = parseInt(tglMulai.substring(4, 6), 10);
  const thnJt = parseInt(tglJt.substring(0, 4), 10);
  const blnJt = parseInt(tglJt.substring(4, 6), 10);
  const diff = (thnJt - thnMulai) * 12 + (blnJt - blnMulai);
  return diff <= 0 ? 1 : diff;
};

const formatDateMySQL = (str) => {
  if (!str || str.length !== 8) return null;
  // Convert YYYYMMDD to YYYY-MM-DD
  return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
};

export async function POST(request) {
  let connection;
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const key = formData.get('key'); // 'Individual' or 'Perusahaan'
    const nuptk = formData.get('nuptk'); // Code link to debiturs table

    if (!file || !key || !nuptk) {
      return NextResponse.json({ success: false, message: 'File, Jenis Checking, dan Debitur Link wajib diisi.' }, { status: 400 });
    }

    const jsonText = await file.text();
    const array = JSON.parse(jsonText);

    // Common Header details
    const id = array.header?.idPermintaan;
    const tgl_slik = formatDateMySQL(array.header?.tanggalHasil) || array.header?.tanggalHasil;
    const pembuat = array.header?.dibuatOleh;

    if (!id) {
      return NextResponse.json({ success: false, message: 'JSON format invalid: idPermintaan tidak ditemukan di header.' }, { status: 400 });
    }

    // Get database connection
    const db = getDb();
    connection = await db.getConnection();
    await connection.beginTransaction();

    if (key === 'Individual') {
      const tgl_data = formatDateMySQL(array.individual?.posisiDataTerakhir) || array.individual?.posisiDataTerakhir;
      const nama_debitur = array.individual?.dataPokokDebitur?.[0]?.namaDebitur || '';
      const npwp_debitur = array.individual?.dataPokokDebitur?.[0]?.npwp || '';
      const id_debitur = array.individual?.dataPokokDebitur?.[0]?.noIdentitas || '';
      const alamat = array.individual?.dataPokokDebitur?.[0]?.alamat || '';

      // 1. Delete existing records for this SLIK ID
      await connection.query('DELETE FROM tbl_data WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_agunan WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_in_out WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_bi_orang WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_lunas WHERE id = ?', [id]);

      // 2. Insert into tbl_data
      const insertDataSql = `
        INSERT INTO tbl_data (id, kode, nik, npwp, nama, alamat, jns_bi, tgl_hasil_slik, created_bi, petugas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      `;
      await connection.query(insertDataSql, [id, nuptk, id_debitur, npwp_debitur, nama_debitur, alamat, key, tgl_slik, pembuat]);

      // 3. Process fasilitas kredit
      const kredit = array.individual?.fasilitas?.kreditPembiayan || [];
      for (const item of kredit) {
        const id_bank = item.ljk;
        const n_bank = item.ljkKet;
        const kondisi_ket = item.kondisiKet || '';
        const platfond = parseFloat(item.plafonAwal || '0');
        const kol = item.kualitasKet || '';
        const bakidebet = parseFloat(item.bakiDebet || '0');
        const tgl_mulai = item.tanggalMulai;
        const tgl_jt = item.tanggalJatuhTempo;
        const bunga = parseFloat(item.sukuBungaImbalan || '0');
        const id_bunga = parseInt(item.jenisSukuBungaImbalan || '0', 10);
        const jns_bunga = item.jenisSukuBungaImbalanKet || '';
        const cabang = item.cabangKet || '';
        const agunan = item.agunan || [];
        const restrukturisasiKet = item.restrukturisasiKet || '';
        const keterangan = item.keterangan || '';
        const tanggalKondisi = formatDateMySQL(item.tanggalKondisi) || item.tanggalKondisi;
        const sifatKreditPembiayaan = item.sifatKreditPembiayaan || '';
        const jenisKreditPembiayaanKet = item.jenisKreditPembiayaanKet || '';
        const akadKreditPembiayaanKet = item.akadKreditPembiayaanKet || '';
        const sektorEkonomiKet = item.sektorEkonomiKet || '';

        const s_all = parseDateDiffMonths(tgl_mulai, tgl_jt);
        const bunga_tahun = (bunga / 12) / 100;
        
        let angs = 0;
        if (platfond > 0 && s_all > 0) {
          if (id_bunga !== 2) {
            const pokok = platfond / s_all;
            const margin = bunga_tahun * platfond;
            angs = pokok + margin;
          } else {
            const a = platfond * (bunga / 100);
            const b = 1 - Math.pow(1 + bunga_tahun, -s_all);
            if (bunga <= 0 || b === 0) {
              angs = a / 12;
            } else {
              angs = (a / b) / 12;
            }
          }
        }

        const mysqlTglM = formatDateMySQL(tgl_mulai);
        const mysqlTglJt = formatDateMySQL(tgl_jt);

        if (bakidebet !== 0) {
          // Active Loan
          const insertBiSql = `
            INSERT INTO tbl_bi_orang (id, id_bank, nm_bank, kol, jns_bunga, angsuran, platfond, bakidebet, bunga, jkw, tgl_m, tgl_jt, kondisi_ket, created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          await connection.query(insertBiSql, [id, id_bank, n_bank, kol, jns_bunga, angs, platfond, bakidebet, bunga, s_all, mysqlTglM, mysqlTglJt, kondisi_ket]);

          // Save collateral
          for (const ag of agunan) {
            const insertAgunanSql = `
              INSERT INTO tbl_agunan (id, id_bank, nm_bank, cabangKet, bakidebet, jenisAgunanKet, nilaiAgunanMenurutLJK, tanggalUpdate, nomorAgunan, jenisPengikatanKet, tanggalPengikatan, namaPemilikAgunan, buktiKepemilikan, nilaiAgunanNjop, alamatAgunan)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.query(insertAgunanSql, [
              id, id_bank, n_bank, cabang, bakidebet,
              ag.jenisAgunanKet || '', parseFloat(ag.nilaiAgunanMenurutLJK || '0'),
              formatDateMySQL(ag.tanggalUpdate) || ag.tanggalUpdate,
              ag.nomorAgunan || '', ag.jenisPengikatanKet || '',
              formatDateMySQL(ag.tanggalPengikatan) || ag.tanggalPengikatan,
              ag.namaPemilikAgunan || '', ag.buktiKepemilikan || '',
              parseFloat(ag.nilaiAgunanNjop || '0'), ag.alamatAgunan || ''
            ]);
          }
        } else {
          // Paid Off Loan
          const insertLunasSql = `
            INSERT INTO tbl_lunas (id, id_bank, nm_bank, kol, platfond, jkw, tgl_m, tgl_jt, kondisi_ket, sifatKreditPembiayaan, jenisKreditPembiayaanKet, akadKreditPembiayaanKet, sektorEkonomiKet, restrukturisasiKet, tanggalKondisi, keterangan, created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          await connection.query(insertLunasSql, [
            id, id_bank, n_bank, kol, platfond, s_all, mysqlTglM, mysqlTglJt, kondisi_ket,
            sifatKreditPembiayaan, jenisKreditPembiayaanKet, akadKreditPembiayaanKet, sektorEkonomiKet,
            restrukturisasiKet, tanggalKondisi, keterangan
          ]);
        }
      }

    } else if (key === 'Perusahaan') {
      const tgl_data = formatDateMySQL(array.perusahaan?.posisiDataTerakhir) || array.perusahaan?.posisiDataTerakhir;
      const nama_debitur = array.perusahaan?.dataPokokDebitur?.[0]?.namaDebitur || '';
      const npwp_debitur = array.perusahaan?.dataPokokDebitur?.[0]?.npwp || '';
      const alamat = array.perusahaan?.dataPokokDebitur?.[0]?.alamat || '';
      const kelurahan = array.perusahaan?.dataPokokDebitur?.[0]?.kelurahan || '';
      const kecamatan = array.perusahaan?.dataPokokDebitur?.[0]?.kecamatan || '';
      const kota = array.perusahaan?.dataPokokDebitur?.[0]?.kabKotaKet || '';
      const alamat_lengkap = `${alamat} ${kelurahan} ${kecamatan} ${kota}`.trim();

      // 1. Delete existing records for this SLIK ID
      await connection.query('DELETE FROM tbl_data WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_agunan_pt WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_bi_pt WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_pemilik WHERE id = ?', [id]);
      await connection.query('DELETE FROM tbl_lunas WHERE id = ?', [id]);

      // 2. Insert into tbl_data
      const insertDataSql = `
        INSERT INTO tbl_data (id, kode, nik, npwp, nama, alamat, jns_bi, tgl_hasil_slik, created_bi, petugas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
      `;
      await connection.query(insertDataSql, [id, nuptk, npwp_debitur, npwp_debitur, nama_debitur, alamat_lengkap, key, tgl_slik, pembuat]);

      // 3. Process pengurus/pemilik
      const kelompokPengurusPemilik = array.perusahaan?.kelompokPengurusPemilik || [];
      for (const group of kelompokPengurusPemilik) {
        const kodeLJK = group.kodeLJK || '';
        const namaLJK = group.namaLJK || '';
        const pengurusPemilik = group.pengurusPemilik || [];
        for (const pp of pengurusPemilik) {
          const ppAlamat = `${pp.alamat || ''}_${pp.kelurahan || ''}_${pp.kecamatan || ''}_${pp.kodeKota || ''}_${pp.kota || ''}`;
          const insertPemilikSql = `
            INSERT INTO tbl_pemilik (id, kodeLJK, namaLJK, namaSesuaiIdentitas, nomorIdentitas, jenisKelamin, posisiPekerjaan, prosentaseKepemilikan, statusPengurusPemilik, alamat)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await connection.query(insertPemilikSql, [
            id, kodeLJK, namaLJK, pp.namaSesuaiIdentitas || '', pp.nomorIdentitas || '', pp.jenisKelamin || '',
            `${pp.kodePosisiPekerjaan || ''}_${pp.posisiPekerjaan || ''}`, pp.prosentaseKepemilikan || 0,
            pp.statusPengurusPemilik || '', ppAlamat
          ]);
        }
      }

      // 4. Process fasilitas kredit
      const fasilitas = array.perusahaan?.fasilitas?.kreditPembiayan || [];
      for (const item of fasilitas) {
        const id_bank = item.ljk;
        const n_bank = item.ljkKet;
        const kondisi_ket = item.kondisiKet || '';
        const platfond = parseFloat(item.plafonAwal || '0');
        const kol = item.kualitasKet || '';
        const bakidebet = parseFloat(item.bakiDebet || '0');
        const tgl_mulai = item.tanggalMulai;
        const tgl_jt = item.tanggalJatuhTempo;
        const bunga = parseFloat(item.sukuBungaImbalan || '0');
        const id_bunga = parseInt(item.jenisSukuBungaImbalan || '0', 10);
        const jns_bunga = item.jenisSukuBungaImbalanKet || '';
        const cabang = item.cabangKet || '';
        const agunan = item.agunan || [];
        const restrukturisasiKet = item.restrukturisasiKet || '';
        const keterangan = item.keterangan || '';
        const tanggalKondisi = formatDateMySQL(item.tanggalKondisi) || item.tanggalKondisi;
        const sifatKreditPembiayaan = item.sifatKreditPembiayaan || '';
        const jenisKreditPembiayaanKet = item.jenisKreditPembiayaanKet || '';
        const akadKreditPembiayaanKet = item.akadKreditPembiayaanKet || '';
        const sektorEkonomiKet = item.sektorEkonomiKet || '';
        const tahunBulan21 = item.tahunBulan21 || '';
        const tahunBulan21Kol = item.tahunBulan21Kol || '';
        const tahunBulan22 = item.tahunBulan22 || '';
        const tahunBulan22Kol = item.tahunBulan22Kol || '';
        const tahunBulan23 = item.tahunBulan23 || '';
        const tahunBulan23Kol = item.tahunBulan23Kol || '';
        const tahunBulan24 = item.tahunBulan24 || '';
        const tahunBulan24Kol = item.tahunBulan24Kol || '';

        const s_all = parseDateDiffMonths(tgl_mulai, tgl_jt);
        const bunga_tahun = (bunga / 12) / 100;
        
        let angs = 0;
        if (platfond > 0 && s_all > 0) {
          if (id_bunga !== 2) {
            const pokok = platfond / s_all;
            const margin = bunga_tahun * platfond;
            angs = pokok + margin;
          } else {
            const a = platfond * (bunga / 100);
            const b = 1 - Math.pow(1 + bunga_tahun, -s_all);
            if (bunga <= 0 || b === 0) {
              angs = a / 12;
            } else {
              angs = (a / b) / 12;
            }
          }
        }

        const mysqlTglM = formatDateMySQL(tgl_mulai);
        const mysqlTglJt = formatDateMySQL(tgl_jt);

        if (bakidebet !== 0) {
          // Active Loan
          const insertPtSql = `
            INSERT INTO tbl_bi_pt (id, id_bank, nm_bank, kol, jns_bunga, angsuran, platfond, bakidebet, bunga, jkw, tgl_m, tgl_jt, kondisi_ket, sifatKreditPembiayaan, jenisKreditPembiayaanKet, akadKreditPembiayaanKet, tahunBulan21, tahunBulan21Kol, tahunBulan22, tahunBulan22Kol, tahunBulan23, tahunBulan23Kol, tahunBulan24, tahunBulan24Kol, sektorEkonomiKet, created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          await connection.query(insertPtSql, [
            id, id_bank, n_bank, kol, jns_bunga, angs, platfond, bakidebet, bunga, s_all, mysqlTglM, mysqlTglJt, kondisi_ket,
            sifatKreditPembiayaan, jenisKreditPembiayaanKet, akadKreditPembiayaanKet,
            tahunBulan21, tahunBulan21Kol, tahunBulan22, tahunBulan22Kol, tahunBulan23, tahunBulan23Kol, tahunBulan24, tahunBulan24Kol, SektorEkonomiKet
          ]);

          // Save collateral pt
          for (const ag of agunan) {
            const insertAgunanPtSql = `
              INSERT INTO tbl_agunan_pt (id, id_bank, nm_bank, cabangKet, bakidebet, jenisAgunanKet, nilaiAgunanMenurutLJK, tanggalUpdate, nomorAgunan, jenisPengikatanKet, tanggalPengikatan, namaPemilikAgunan, buktiKepemilikan, nilaiAgunanNjop, alamatAgunan)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            await connection.query(insertAgunanPtSql, [
              id, id_bank, n_bank, cabang, bakidebet,
              ag.jenisAgunanKet || '', parseFloat(ag.nilaiAgunanMenurutLJK || '0'),
              formatDateMySQL(ag.tanggalUpdate) || ag.tanggalUpdate,
              ag.nomorAgunan || '', ag.jenisPengikatanKet || '',
              formatDateMySQL(ag.tanggalPengikatan) || ag.tanggalPengikatan,
              ag.namaPemilikAgunan || '', ag.buktiKepemilikan || '',
              parseFloat(ag.nilaiAgunanNjop || '0'), ag.alamatAgunan || ''
            ]);
          }
        } else {
          // Paid Off Loan
          const insertLunasSql = `
            INSERT INTO tbl_lunas (id, id_bank, nm_bank, kol, platfond, jkw, tgl_m, tgl_jt, kondisi_ket, sifatKreditPembiayaan, jenisKreditPembiayaanKet, akadKreditPembiayaanKet, sektorEkonomiKet, restrukturisasiKet, tanggalKondisi, keterangan, created)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `;
          await connection.query(insertLunasSql, [
            id, id_bank, n_bank, kol, platfond, s_all, mysqlTglM, mysqlTglJt, kondisi_ket,
            sifatKreditPembiayaan, jenisKreditPembiayaanKet, akadKreditPembiayaanKet, sektorEkonomiKet,
            restrukturisasiKet, tanggalKondisi, keterangan
          ]);
        }
      }
    }

    // 4. Update the debitur's has_slik status if it matches debiturs table
    // (This links the OJK output back to our MAP Generator)
    // Wait, in our MAP Generator we link by NIK or Nopen. Let's see: `nuptk` is used as link (e.g. `nopen` in `debiturs` table!)
    // Let's run a query to update `has_slik = 1` in `debiturs` where `nopen = ?` or `nik = ?`
    const updateDebiturSql = `UPDATE debiturs SET has_slik = 1 WHERE nopen = ?`;
    await connection.query(updateDebiturSql, [nuptk]);

    // Commit Transaction
    await connection.commit();

    return NextResponse.json({ success: true, message: 'JSON Hasil SLIK berhasil di-upload dan di-parser ke database.', id });
  } catch (error) {
    console.error('Error parsing JSON SLIK:', error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rErr) {
        console.error('Rollback error:', rErr);
      }
    }
    return NextResponse.json({ success: false, message: `Gagal memproses file JSON: ${error.message}` }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
