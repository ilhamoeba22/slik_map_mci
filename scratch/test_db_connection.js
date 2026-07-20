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
    console.log("SUCCESS: Connected to database: db_slik_map_mci");
    const [rows] = await conn.query("SHOW TABLES");
    console.log("Tables in database:", rows.map(r => Object.values(r)[0]));
    await conn.end();
  } catch (err) {
    console.error("ERROR connecting to DB:", err);
  }
}
main();
