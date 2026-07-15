import mysql from 'mysql2/promise';

let pool;

export function getKaryawanDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: '192.168.1.199',
      port: 33006,
      user: 'root',
      password: 'Xurang1234!!',
      database: 'db_karyawan',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0
    });
  }
  return pool;
}

export async function queryKaryawan(sql, params) {
  const db = getKaryawanDb();
  const [results] = await db.execute(sql, params);
  return results;
}
