const { query } = require('../config/db');

class CorrelatividadModel {
  /**
   * Obtiene todas las correlatividades de una carrera
   * @param {number} idCarrera
   */
  static async getCorrelativasPorCarrera(idCarrera) {
    const sql = `
      SELECT 
        c.id_carrera,
        c.id_materia,
        m.nombre_materia,
        c.id_materia_correlativa,
        mc.nombre_materia AS nombre_materia_correlativa
      FROM correlatividades c
      INNER JOIN materias m ON c.id_materia = m.id_materia
      INNER JOIN materias mc ON c.id_materia_correlativa = mc.id_materia
      WHERE c.id_carrera = ?
    `;
    return await query(sql, [idCarrera]);
  }

  /**
   * Obtiene las materias correlativas requeridas para cursar una materia específica
   * @param {number} idCarrera
   * @param {number} idMateria
   */
  static async getCorrelativasDeMateria(idCarrera, idMateria) {
    const sql = `
      SELECT 
        c.id_materia_correlativa,
        m.nombre_materia AS nombre_materia_correlativa,
        cm.anio_cursada
      FROM correlatividades c
      INNER JOIN materias m ON c.id_materia_correlativa = m.id_materia
      INNER JOIN carrera_materias cm ON c.id_carrera = cm.id_carrera AND c.id_materia_correlativa = cm.id_materia
      WHERE c.id_carrera = ? AND c.id_materia = ?
    `;
    return await query(sql, [idCarrera, idMateria]);
  }
}

module.exports = CorrelatividadModel;
