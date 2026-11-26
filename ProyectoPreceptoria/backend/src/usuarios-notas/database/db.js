const mysql = require('mysql2/promise');
const { AsyncLocalStorage } = require('node:async_hooks');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clementina',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const txStorage = new AsyncLocalStorage();

function getExecutor() {
  return txStorage.getStore() || pool;
}

/**
 * Ejecuta una consulta en MySQL y retorna todos los registros coincidentes.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Array>}
 */
async function queryAll(sql, params = []) {
  const [rows] = await getExecutor().query(sql, params);
  return rows;
}

/**
 * Ejecuta una consulta en MySQL y retorna el primer registro o null.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<Object|null>}
 */
async function queryOne(sql, params = []) {
  const [rows] = await getExecutor().query(sql, params);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Ejecuta un comando INSERT, UPDATE o DELETE en MySQL.
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<{ changes: number, lastInsertRowid: number|bigint }>}
 */
async function run(sql, params = []) {
  const [result] = await getExecutor().query(sql, params);
  return {
    changes: result.affectedRows,
    lastInsertRowid: result.insertId
  };
}

/**
 * Ejecuta una función dentro de una transacción atómica (ACID) en MySQL.
 * Si ya existe una transacción activa en el contexto actual, reutiliza la conexión.
 * @param {Function} callback
 * @returns {Promise<*>}
 */
async function transaction(callback) {
  const existingConn = txStorage.getStore();
  if (existingConn) {
    return await callback(existingConn);
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await txStorage.run(connection, async () => await callback(connection));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  queryAll,
  queryOne,
  run,
  transaction
};
