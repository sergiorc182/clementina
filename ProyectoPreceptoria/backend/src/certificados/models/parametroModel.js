const { pool } = require('../config/db');

class ParametroModel {
  /**
   * Obtiene los parámetros generales institucionales (Nombre del Instituto, Ciclo Lectivo).
   * @returns {Promise<Object>}
   */
  static async obtenerGenerales() {
    const sql = `
      SELECT 
        id_registro,
        nombre_instituto,
        ciclo_lectivo
      FROM parametros_generales
      LIMIT 1
    `;
    const [rows] = await pool.query(sql);
    return rows[0] || {
      nombre_instituto: 'Instituto Superior de Formación Técnica N° 182',
      ciclo_lectivo: new Date().getFullYear()
    };
  }
}

module.exports = ParametroModel;
