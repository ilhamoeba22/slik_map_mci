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

    console.log("=== COLUMNS IN 'tbl_bi_orang' ===");
    const [columns] = await conn.query("DESCRIBE `tbl_bi_orang`");
    console.log(columns.map(c => `${c.Field} (${c.Type})`));

    const [rows] = await conn.query("SELECT * FROM `tbl_bi_orang` LIMIT 3");
    console.log("Sample rows:", rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (conn) await conn.end();
  }
}

inspect();
