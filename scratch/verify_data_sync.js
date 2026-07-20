const mysql = require('mysql2/promise');

async function main() {
  let connWablast, connNew;
  try {
    // 1. Connect to db_wablast
    connWablast = await mysql.createConnection({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_wablast'
    });

    // 2. Connect to db_slik_map_mci
    connNew = await mysql.createConnection({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_slik_map_mci'
    });

    console.log('=== VERIFIKASI PERBANDINGAN DATA db_wablast VS db_slik_map_mci ===\n');

    const tables = [
      'tb_slik_request',
      'tbl_data',
      'tbl_bi_orang',
      'tbl_bi_pt',
      'tbl_lunas',
      'tbl_agunan',
      'tbl_agunan_pt',
      'tbl_pemilik'
    ];

    for (const table of tables) {
      try {
        const [wRows] = await connWablast.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        const [nRows] = await connNew.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);

        const wCount = wRows[0].cnt;
        const nCount = nRows[0].cnt;
        const isMatch = wCount === nCount;

        console.log(`Tabel [${table}]:`);
        console.log(`  - db_wablast      : ${wCount} baris`);
        console.log(`  - db_slik_map_mci : ${nCount} baris`);
        console.log(`  - Status Match    : ${isMatch ? '✅ MATCH (100% SAMA)' : '⚠️ BERBEDA'}`);
        console.log('--------------------------------------------------');
      } catch (err) {
        console.log(`Tabel [${table}]: Error - ${err.message}`);
        console.log('--------------------------------------------------');
      }
    }

  } catch (error) {
    console.error('Koneksi Error:', error.message);
  } finally {
    if (connWablast) await connWablast.end();
    if (connNew) await connNew.end();
  }
}

main();
