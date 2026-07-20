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
    
    console.log("--- INDEXES ON tbl_data ---");
    const [indexesTblData] = await conn.query("SHOW INDEX FROM tbl_data");
    console.log(indexesTblData.map(i => ({ Table: i.Table, Column: i.Column_name, Name: i.Key_name, Unique: !i.Non_unique })));
    
    console.log("\n--- INDEXES ON debiturs ---");
    const [indexesDebiturs] = await conn.query("SHOW INDEX FROM debiturs");
    console.log(indexesDebiturs.map(i => ({ Table: i.Table, Column: i.Column_name, Name: i.Key_name, Unique: !i.Non_unique })));

    await conn.end();
  } catch (err) {
    console.error("ERROR checking indexes:", err);
  }
}
main();
