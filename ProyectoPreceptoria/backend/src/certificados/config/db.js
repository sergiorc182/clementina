const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clementina',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Verificación inicial de la conexión
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Conectado exitosamente a MySQL (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`);
    connection.release();
    return true;
  } catch (error) {
    console.error('[DB ERROR] Error al conectar con MySQL:', error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection
};
