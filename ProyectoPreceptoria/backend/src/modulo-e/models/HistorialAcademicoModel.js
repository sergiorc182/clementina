const { query } = require('../config/db');

class HistorialAcademicoModel {
  /**
   * Obtiene todo el historial académico de un alumno en una carrera
   * @param {number} idAlumno
   * @param {number} idCarrera
   */
  static async getByAlumnoYCarrera(idAlumno, idCarrera) {
    const sql = `
      SELECT 
        ha.id_alumno,
        ha.id_carrera,
        ha.id_materia,
        m.nombre_materia,
        cm.anio_cursada,
        ha.anio_regular,
        ha.fecha_aprobacion,
        ha.nota,
        ha.tipo_alumno,
        ha.validado_regular,
        ha.validado_examen,
        ha.resolucion
      FROM historial_academico ha
      INNER JOIN materias m ON ha.id_materia = m.id_materia
      INNER JOIN carrera_materias cm ON ha.id_carrera = cm.id_carrera AND ha.id_materia = cm.id_materia
      WHERE ha.id_alumno = ? AND ha.id_carrera = ?
    `;
    return await query(sql, [idAlumno, idCarrera]);
  }

  /**
   * Obtiene el estado académico de una materia específica para un alumno
   * @param {number} idAlumno
   * @param {number} idCarrera
   * @param {number} idMateria
   */
  static async getMateriaEstado(idAlumno, idCarrera, idMateria) {
    const sql = `
      SELECT 
        ha.id_alumno,
        ha.id_carrera,
        ha.id_materia,
        ha.anio_regular,
        ha.fecha_aprobacion,
        ha.nota,
        ha.validado_regular,
        ha.validado_examen
      FROM historial_academico ha
      WHERE ha.id_alumno = ? AND ha.id_carrera = ? AND ha.id_materia = ?
      LIMIT 1
    `;
    const rows = await query(sql, [idAlumno, idCarrera, idMateria]);
    return rows[0] || null;
  }
}

module.exports = HistorialAcademicoModel;
