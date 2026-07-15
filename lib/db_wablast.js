import mysql from 'mysql2/promise';

let pool;

export function getWablastDb() {
  if (!pool) {
    try {
      pool = mysql.createPool({
        host: '192.168.1.199',
        port: 33006,
        user: 'root',
        password: 'Xurang1234!!',
        database: 'db_wablast',
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        connectTimeout: 3000, // timeout 3 detik agar tidak hang
      });
    } catch (e) {
      console.warn('[db_wablast] Gagal membuat pool:', e.message);
      return null;
    }
  }
  return pool;
}

export async function queryWablast(sql, params) {
  try {
    const db = getWablastDb();
    if (!db) return [];
    const [results] = await db.execute(sql, params);
    return results;
  } catch (e) {
    console.warn('[db_wablast] Query gagal (server mungkin offline):', e.message);
    return [];
  }
}
