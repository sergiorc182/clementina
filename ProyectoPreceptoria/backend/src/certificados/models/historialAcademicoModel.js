const { pool } = require('../config/db');

let columnaObservacionesVerificada = false;
async function asegurarColumnaObservaciones() {
  if (columnaObservacionesVerificada) return;
  try {
    await pool.query(
      `ALTER TABLE historial_academico ADD COLUMN IF NOT EXISTS observaciones VARCHAR(255) DEFAULT NULL`
    );
  } catch (_) { }
  columnaObservacionesVerificada = true;
}

class HistorialAcademicoModel {
  /**
   * Obtiene todas las materias aprobadas por un alumno para una carrera específica.
   * Considera aprobadas aquellas con nota >= 4 o validado_examen = 'T'.
   * @param {number|string} idAlumno
   * @param {number|string} idCarrera
   * @returns {Promise<Array>}
   */
  static async obtenerMateriasAprobadas(idAlumno, idCarrera) {
    await asegurarColumnaObservaciones();
    const sql = `
      SELECT 
        h.id_alumno,
        h.id_carrera,
        h.id_materia,
        m.nombre_materia,
        cm.anio_cursada,
        cm.id_materia AS orden_plan,
        CONCAT('MAT-', LPAD(cm.id_materia, 2, '0')) AS codigo_espacio,
        h.anio_regular,
        h.fecha_aprobacion,
        h.tomo_acta,
        h.folio_acta,
        h.nota,
        h.tipo_alumno,
        h.resolucion,
        h.observaciones
      FROM historial_academico h
      INNER JOIN materias m ON h.id_materia = m.id_materia
      INNER JOIN carrera_materias cm ON (h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia)
      WHERE 
        h.id_alumno = ?
        AND h.id_carrera = ?
        AND (h.nota >= 4 OR h.validado_examen = 'T')
      ORDER BY cm.anio_cursada ASC, cm.id_materia ASC
    `;
    const [rows] = await pool.query(sql, [idAlumno, idCarrera]);
    return rows;
  }

  /**
   * Obtiene el historial completo (aprobadas, regulares, equivalencias, etc.).
   * @param {number|string} idAlumno
   * @param {number|string} idCarrera
   * @returns {Promise<Array>}
   */
  static async obtenerTodoHistorial(idAlumno, idCarrera) {
    await asegurarColumnaObservaciones();
    const sql = `
      SELECT 
        h.id_alumno,
        h.id_carrera,
        h.id_materia,
        m.nombre_materia,
        cm.anio_cursada,
        cm.id_materia AS orden_plan,
        CONCAT('MAT-', LPAD(cm.id_materia, 2, '0')) AS codigo_espacio,
        h.anio_regular,
        h.fecha_aprobacion,
        h.tomo_acta,
        h.folio_acta,
        h.nota,
        h.tipo_alumno,
        h.validado_regular,
        h.validado_examen,
        h.resolucion,
        h.observaciones
      FROM historial_academico h
      INNER JOIN materias m ON h.id_materia = m.id_materia
      LEFT JOIN carrera_materias cm ON (h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia)
      WHERE h.id_alumno = ? AND h.id_carrera = ?
      ORDER BY cm.anio_cursada ASC, cm.id_materia ASC
    `;
    const [rows] = await pool.query(sql, [idAlumno, idCarrera]);
    return rows;
  }

  /**
   * Actualiza el tipo de examen y el texto de equivalencia para una materia específica.
   * Tipos válidos: Libre, Regular, Promoción, Equivalencia.
   * @param {number|string} idAlumno
   * @param {number|string} idCarrera
   * @param {number|string} idMateria
   * @param {string} tipoExamen - 'Libre', 'Regular', 'Promoción' o 'Equivalencia'
   * @param {string} equivalenciaTexto - Texto de resolución/instituto cuando es Equivalencia
   * @returns {Promise<boolean>}
   */
  static async actualizarTipoExamen(idAlumno, idCarrera, idMateria, tipoExamen, equivalenciaTexto = '') {
    await asegurarColumnaObservaciones();
    let codigoTipo = 'R';
    let observaciones = 'Examen Final Regular';
    let resolucion = null;

    const tipoNorm = (tipoExamen || '').trim().toLowerCase();

    if (tipoNorm === 'libre' || tipoNorm === 'l') {
      codigoTipo = 'L';
      observaciones = 'Examen Libre';
    } else if (tipoNorm === 'promoción' || tipoNorm === 'promocion' || tipoNorm === 'p') {
      codigoTipo = 'P';
      observaciones = 'Promoción Directa';
    } else if (tipoNorm === 'equivalencia' || tipoNorm === 'e') {
      codigoTipo = 'E';
      resolucion = (equivalenciaTexto || '').trim();
      observaciones = resolucion ? `Equivalencia: ${resolucion}` : 'Aprobado por Equivalencia';
    } else {
      codigoTipo = 'R';
      observaciones = 'Examen Final Regular';
    }

    const sql = `
      UPDATE historial_academico
      SET 
        tipo_alumno = ?,
        resolucion = ?,
        observaciones = ?,
        fecha_mod = NOW()
      WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?
    `;

    const [result] = await pool.query(sql, [
      codigoTipo,
      resolucion,
      observaciones,
      idAlumno,
      idCarrera,
      idMateria
    ]);

    return result.affectedRows > 0;
  }

  /**
   * Registra o actualiza la aprobación de una materia para un alumno.
   * @param {Object} datos
   * @returns {Promise<boolean>}
   */
  static async registrarAprobacion({
    idAlumno,
    idCarrera,
    idMateria,
    nota,
    fechaAprobacion,
    tomoActa = 0,
    folioActa = 0,
    tipoExamen = 'Regular',
    equivalenciaTexto = ''
  }) {
    let codigoTipo = 'R';
    let observaciones = 'Examen Final Regular';
    let resolucion = null;

    const tipoNorm = (tipoExamen || '').trim().toLowerCase();

    if (tipoNorm === 'libre' || tipoNorm === 'l') {
      codigoTipo = 'L';
      observaciones = 'Examen Libre';
    } else if (tipoNorm === 'promoción' || tipoNorm === 'promocion' || tipoNorm === 'p') {
      codigoTipo = 'P';
      observaciones = 'Promoción Directa';
    } else if (tipoNorm === 'equivalencia' || tipoNorm === 'e') {
      codigoTipo = 'E';
      resolucion = (equivalenciaTexto || '').trim();
      observaciones = resolucion ? `Equivalencia: ${resolucion}` : 'Aprobado por Equivalencia';
    }

    await asegurarColumnaObservaciones();
    const fechaValida = fechaAprobacion || new Date().toISOString().slice(0, 10);
    const anioRegular = new Date(fechaValida).getFullYear();

    const sql = `
      INSERT INTO historial_academico (
        id_alumno, id_carrera, id_materia, anio_regular, fecha_aprobacion,
        tomo_acta, folio_acta, nota, tipo_alumno, validado_regular, validado_examen, resolucion, observaciones,
        fecha_alta, fecha_mod
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'T', 'T', ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        nota = VALUES(nota),
        fecha_aprobacion = VALUES(fecha_aprobacion),
        tomo_acta = VALUES(tomo_acta),
        folio_acta = VALUES(folio_acta),
        tipo_alumno = VALUES(tipo_alumno),
        validado_examen = 'T',
        resolucion = VALUES(resolucion),
        observaciones = VALUES(observaciones),
        fecha_mod = NOW()
    `;

    const [result] = await pool.query(sql, [
      idAlumno,
      idCarrera,
      idMateria,
      anioRegular,
      fechaValida,
      Number(tomoActa) || 0,
      Number(folioActa) || 0,
      Number(nota) || 4,
      codigoTipo,
      resolucion,
      observaciones
    ]);

    return result.affectedRows > 0;
  }
}

module.exports = HistorialAcademicoModel;
