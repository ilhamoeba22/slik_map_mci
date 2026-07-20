import mysql from 'mysql2/promise';

let pool;

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'db_slik_map_mci',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // Fix: allow bigint support
      supportBigNumbers: true,
      bigNumberStrings: false,
    });
  }
  return pool;
}

// Gunakan execute() untuk query dengan params biasa (INSERT, UPDATE, DELETE, SELECT tanpa LIMIT)
export async function query(sql, params) {
  const db = getDb();
  const [results] = await db.execute(sql, params);
  return results;
}

// Gunakan queryRaw() untuk query dengan LIMIT ? OFFSET ? 
// (mysql2 execute() punya bug dengan integer di LIMIT/OFFSET)
export async function queryRaw(sql, params) {
  const db = getDb();
  // Pastikan semua params adalah tipe primitif yang aman (bukan BigInt)
  const safeParams = (params || []).map(p =>
    typeof p === 'bigint' ? Number(p) : p
  );
  const [results] = await db.query(sql, safeParams);
  return results;
}

