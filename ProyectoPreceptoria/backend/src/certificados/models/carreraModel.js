const { pool } = require('../config/db');

class CarreraModel {
  /**
   * Lista todas las carreras disponibles en la institución.
   * @returns {Promise<Array>}
   */
  static async listarTodas() {
    const sql = `
      SELECT 
        id_carrera,
        nro_resolucion,
        nombre_carrera,
        nombre_carrera_corto,
        titulo
      FROM carreras
      ORDER BY nombre_carrera ASC
    `;
    const [rows] = await pool.query(sql);
    return rows;
  }

  /**
   * Obtiene la información de una carrera por ID.
   * @param {number|string} idCarrera
   * @returns {Promise<Object|null>}
   */
  static async obtenerPorId(idCarrera) {
    const sql = `
      SELECT 
        id_carrera,
        nro_resolucion,
        nombre_carrera,
        nombre_carrera_corto,
        titulo
      FROM carreras
      WHERE id_carrera = ?
    `;
    const [rows] = await pool.query(sql, [idCarrera]);
    return rows[0] || null;
  }

  /**
   * Obtiene la estructura completa del plan de estudios de la carrera.
   * @param {number|string} idCarrera
   * @returns {Promise<Array>}
   */
  static async obtenerPlanMaterias(idCarrera) {
    const sql = `
      SELECT 
        cm.id_carrera,
        cm.id_materia,
        cm.anio_cursada,
        cm.id_materia AS orden_plan,
        CONCAT('MAT-', LPAD(cm.id_materia, 2, '0')) AS codigo_espacio,
        m.nombre_materia
      FROM carrera_materias cm
      INNER JOIN materias m ON cm.id_materia = m.id_materia
      WHERE cm.id_carrera = ?
      ORDER BY cm.anio_cursada ASC, cm.id_materia ASC
    `;
    const [rows] = await pool.query(sql, [idCarrera]);
    return rows;
  }
}

module.exports = CarreraModel;
