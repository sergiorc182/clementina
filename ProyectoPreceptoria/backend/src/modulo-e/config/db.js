const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clementina',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true
});

/**
 * Ejecuta una consulta SQL en el pool
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array>}
 */
async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

/**
 * Obtiene una conexión para transacciones ACID
 * @returns {Promise<import('mysql2/promise').PoolConnection>}
 */
async function getConnection() {
  return await pool.getConnection();
}

/**
 * Prueba la conectividad con la base de datos
 */
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log('[DB] Conexión exitosa a MySQL (' + (process.env.DB_NAME || 'u714838186_desarrollo') + ')');
    return true;
  } catch (error) {
    console.warn('[DB] Advertencia: No se pudo conectar a MySQL:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  query,
  getConnection,
  testConnection
};
