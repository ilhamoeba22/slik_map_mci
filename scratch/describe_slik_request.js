const mysql = require('mysql2/promise');

async function main() {
  try {
    const conn = await mysql.createConnection({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_slik_map_mci'
    });
    
    const [colsData] = await conn.query("DESCRIBE tbl_data");
    console.log("tbl_data:", colsData.map(c => c.Field));
    
    const [colsOrang] = await conn.query("DESCRIBE tbl_bi_orang");
    console.log("tbl_bi_orang:", colsOrang.map(c => c.Field));
    
    const [colsPt] = await conn.query("DESCRIBE tbl_bi_pt");
    console.log("tbl_bi_pt:", colsPt.map(c => c.Field));

    const [colsLunas] = await conn.query("DESCRIBE tbl_lunas");
    console.log("tbl_lunas:", colsLunas.map(c => c.Field));

    const [colsAgunan] = await conn.query("DESCRIBE tbl_agunan");
    console.log("tbl_agunan:", colsAgunan.map(c => c.Field));

    await conn.end();
  } catch (err) {
    console.error("ERROR describing tables:", err);
  }
}
main();
