const { query } = require('../config/db');

class ParametrosModel {
  /**
   * Obtiene los parámetros generales institucionales (nombre, ciclo lectivo)
   */
  static async getGenerales() {
    const sql = `
      SELECT id_registro, nombre_instituto, ciclo_lectivo
      FROM parametros_generales
      ORDER BY id_registro DESC
      LIMIT 1
    `;
    const rows = await query(sql);
    return rows[0] || {
      id_registro: 1,
      nombre_instituto: 'ISFT 182',
      ciclo_lectivo: new Date().getFullYear()
    };
  }

  /**
   * Obtiene los parámetros de fechas y ciclo para matriculación
   */
  static async getMatriculacion() {
    const sql = `
      SELECT id_registro, anio_matriculacion, fecha_inicio, fecha_fin
      FROM parametros_matriculacion
      ORDER BY id_registro DESC
      LIMIT 1
    `;
    const rows = await query(sql);
    return rows[0] || {
      id_registro: 1,
      anio_matriculacion: new Date().getFullYear(),
      fecha_inicio: null,
      fecha_fin: null
    };
  }
}

module.exports = ParametrosModel;
