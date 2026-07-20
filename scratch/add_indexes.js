const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: '192.168.1.199',
    port: 33006,
    user: 'root',
    password: 'Xurang1234!!',
    database: 'db_slik_map_mci'
  });

  try {
    console.log("Adding indexes to debiturs table...");
    try {
      await conn.query("ALTER TABLE debiturs ADD INDEX idx_debiturs_nik (nik)");
      console.log("- Added index on debiturs(nik)");
    } catch (e) { console.log("- Index on debiturs(nik) might already exist or error:", e.message); }

    try {
      await conn.query("ALTER TABLE debiturs ADD INDEX idx_debiturs_nopen (nopen)");
      console.log("- Added index on debiturs(nopen)");
    } catch (e) { console.log("- Index on debiturs(nopen) might already exist or error:", e.message); }

    try {
      await conn.query("ALTER TABLE debiturs ADD INDEX idx_debiturs_submitted_at (submitted_at)");
      console.log("- Added index on debiturs(submitted_at)");
    } catch (e) { console.log("- Index on debiturs(submitted_at) might already exist or error:", e.message); }

    console.log("Adding indexes to tbl_data table...");
    try {
      await conn.query("ALTER TABLE tbl_data ADD INDEX idx_tbl_data_nik (nik)");
      console.log("- Added index on tbl_data(nik)");
    } catch (e) { console.log("- Index on tbl_data(nik) might already exist or error:", e.message); }

    try {
      await conn.query("ALTER TABLE tbl_data ADD INDEX idx_tbl_data_kode (kode)");
      console.log("- Added index on tbl_data(kode)");
    } catch (e) { console.log("- Index on tbl_data(kode) might already exist or error:", e.message); }

    console.log("Adding indexes to foreign key columns in child tables...");
    const childTables = ['tbl_bi_orang', 'tbl_bi_pt', 'tbl_lunas', 'tbl_agunan', 'tbl_agunan_pt', 'tbl_pemilik'];
    for (const table of childTables) {
      try {
        await conn.query(`ALTER TABLE ${table} ADD INDEX idx_${table}_id (id)`);
        console.log(`- Added index on ${table}(id)`);
      } catch (e) {
        console.log(`- Index on ${table}(id) might already exist or error:`, e.message);
      }
    }

    console.log("Database indexing completed successfully!");
  } catch (err) {
    console.error("ERROR running migration:", err);
  } finally {
    await conn.end();
  }
}
main();
