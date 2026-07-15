const mysql = require('mysql2/promise');

async function inspect() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_karyawan'
    });

    console.log("Connected to db_karyawan!");

    // Let's query tbl_pekerjaan for 'Kepala Divisi Bisnis' or any Kepala Divisi Bisnis
    const query = `
      SELECT k.idKaryawan, k.namaLengkap, k.statusKerja, j.namaJabatan, p.tglMasuk, p.tglKeluar
      FROM tbl_pekerjaan p
      JOIN tbl_karyawan k ON p.idKaryawan = k.idKaryawan
      JOIN tbl_jabatan j ON p.idJabatan = j.idJabatan
      WHERE j.namaJabatan LIKE '%Kepala Divisi Bisnis%' OR j.namaJabatan LIKE '%Kadiv Bisnis%'
    `;
    const [rows] = await conn.query(query);
    console.log("Found Kadiv Bisnis rows:", rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (conn) await conn.end();
  }
}

inspect();
