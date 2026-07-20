const mysql = require('mysql2/promise');

async function main() {
  let connWablast, connNew;
  try {
    connWablast = await mysql.createConnection({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_wablast'
    });

    connNew = await mysql.createConnection({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_slik_map_mci'
    });

    console.log('Menyinkronkan tb_slik_request dari db_wablast ke db_slik_map_mci...\n');

    const [wRequests] = await connWablast.query('SELECT * FROM tb_slik_request');
    
    let copied = 0;
    for (const r of wRequests) {
      // Check if already exists by id_slik or id_request
      const [existing] = await connNew.query('SELECT id_request FROM tb_slik_request WHERE id_slik = ? AND nik = ?', [r.id_slik, r.nik]);
      if (existing.length === 0) {
        const sql = `
          INSERT INTO tb_slik_request (
            id_slik, pembiayaan, tujuan_permintaan, type_checking,
            nik, nama, ttl, alamat,
            nik_2, nama_2, ttl_2, alamat_2,
            file_ktp, ao, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          r.id_slik, r.pembiayaan || '', r.tujuan_permintaan || '01', r.type_checking || 'Individual',
          r.nik, r.nama, r.ttl || '', r.alamat || '',
          r.nik_2 || '', r.nama_2 || '', r.ttl_2 || '', r.alamat_2 || '',
          r.file_ktp || '', r.ao || 'AO_USER', r.created_at || new Date()
        ];
        await connNew.query(sql, params);
        copied++;
      }
    }

    console.log(`Disinkronkan ${copied} baris tb_slik_request tambahan.`);

    // Re-check count
    const [wRows] = await connWablast.query(`SELECT COUNT(*) as cnt FROM tb_slik_request`);
    const [nRows] = await connNew.query(`SELECT COUNT(*) as cnt FROM tb_slik_request`);

    console.log(`\nJumlah Akhir tb_slik_request:`);
    console.log(`  - db_wablast      : ${wRows[0].cnt} baris`);
    console.log(`  - db_slik_map_mci : ${nRows[0].cnt} baris`);

  } catch (error) {
    console.error('Sync error:', error.message);
  } finally {
    if (connWablast) await connWablast.end();
    if (connNew) await connNew.end();
  }
}

main();
