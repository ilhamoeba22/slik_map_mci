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
    
    // Show tables
    const [tables] = await conn.query("SHOW TABLES");
    console.log("Tables in db_karyawan:");
    tables.forEach(row => {
      console.log("- " + Object.values(row)[0]);
    });

    // Let's inspect any table related to jabatan/posisi/struktural
    for (let row of tables) {
      const tableName = Object.values(row)[0];
      if (tableName.toLowerCase().includes('jabatan') || tableName.toLowerCase().includes('divisi') || tableName.toLowerCase().includes('level') || tableName.toLowerCase().includes('posisi') || tableName.toLowerCase().includes('departemen')) {
        console.log(`\n--- Columns in Table '${tableName}' ---`);
        const [columns] = await conn.query(`DESCRIBE \`${tableName}\``);
        console.log(columns.map(c => `${c.Field} (${c.Type})`));

        const [rows] = await conn.query(`SELECT * FROM \`${tableName}\` LIMIT 5`);
        console.log("Sample rows:", rows);
      }
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (conn) await conn.end();
  }
}

inspect();
