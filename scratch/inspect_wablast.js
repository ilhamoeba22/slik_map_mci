const mysql = require('mysql2/promise');

async function inspect() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_wablast'
    });

    const targetTables = ['tbl_bi_orang', 'tbl_pemohon', 'tbl_data', 'tbl_lunas'];
    for (let tableName of targetTables) {
      console.log(`\n=== COLUMNS IN '${tableName}' ===`);
      const [columns] = await conn.query(`DESCRIBE \`${tableName}\``);
      console.log(columns.map(c => `${c.Field} (${c.Type})`));

      const [rows] = await conn.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
      console.log("Sample rows:", rows);
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (conn) await conn.end();
  }
}

inspect();
