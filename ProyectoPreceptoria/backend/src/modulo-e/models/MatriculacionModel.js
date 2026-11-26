const { query } = require('../config/db');

class MatriculacionModel {
  /**
   * Obtiene la matrícula general de un alumno en una carrera
   * @param {number} idAlumno
   * @param {number} idCarrera
   */
  static async findByAlumnoYCarrera(idAlumno, idCarrera) {
    const sql = `
      SELECT 
        m.id_alumno,
        m.id_carrera,
        c.nombre_carrera,
        m.anio_inscripcion,
        m.id_turno,
        t.turno,
        m.id_sede,
        s.nombre_sede,
        m.tomo_matriz,
        m.folio_matriz,
        m.fecha_alta,
        m.fecha_mod
      FROM matriculacion m
      INNER JOIN carreras c ON m.id_carrera = c.id_carrera
      INNER JOIN turnos t ON m.id_turno = t.id_turno
      INNER JOIN sedes s ON m.id_sede = s.id_sede
      WHERE m.id_alumno = ? AND m.id_carrera = ?
    `;
    const rows = await query(sql, [idAlumno, idCarrera]);
    return rows[0] || null;
  }

  /**
   * Obtiene las materias inscriptas de un alumno en un año de matriculación
   * @param {number} idAlumno
   * @param {number} idCarrera
   * @param {number} anioMatriculacion
   */
  static async getDetalle(idAlumno, idCarrera, anioMatriculacion) {
    const sql = `
      SELECT 
        md.id_alumno,
        md.id_carrera,
        md.anio_matriculacion,
        md.id_materia,
        m.nombre_materia,
        cm.anio_cursada,
        md.tipo_asistencia,
        CASE md.tipo_asistencia
          WHEN '1' THEN 'Presencial'
          WHEN '2' THEN 'Libre'
          WHEN '3' THEN 'Vocacional'
          ELSE md.tipo_asistencia
        END AS descripcion_asistencia
      FROM matriculacion_detalle md
      INNER JOIN materias m ON md.id_materia = m.id_materia
      INNER JOIN carrera_materias cm ON md.id_carrera = cm.id_carrera AND md.id_materia = cm.id_materia
      WHERE md.id_alumno = ? AND md.id_carrera = ? AND md.anio_matriculacion = ?
      ORDER BY cm.anio_cursada, m.nombre_materia
    `;
    return await query(sql, [idAlumno, idCarrera, anioMatriculacion]);
  }

  /**
   * Inserta o actualiza la cabecera de matriculación (dentro de una transacción)
   * @param {import('mysql2/promise').PoolConnection} connection
   * @param {Object} data
   */
  static async upsertMatriculacion(connection, data) {
    const { id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede } = data;
    const sql = `
      INSERT INTO matriculacion (
        id_alumno, id_carrera, anio_inscripcion, id_turno, id_sede, fecha_alta
      ) VALUES (?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        id_turno = VALUES(id_turno),
        id_sede = VALUES(id_sede),
        fecha_mod = NOW()
    `;
    await connection.execute(sql, [
      id_alumno,
      id_carrera,
      anio_inscripcion,
      id_turno,
      id_sede
    ]);
  }

  /**
   * Reemplaza las materias inscriptas para un ciclo lectivo dado (dentro de una transacción)
   * @param {import('mysql2/promise').PoolConnection} connection
   * @param {number} idAlumno
   * @param {number} idCarrera
   * @param {number} anioMatriculacion
   * @param {Array<{ id_materia: number, tipo_asistencia?: string }>} materias
   */
  static async guardarDetalle(connection, idAlumno, idCarrera, anioMatriculacion, materias) {
    // 1. Eliminar inscripciones anteriores de este ciclo para reescribir la selección
    const deleteSql = `
      DELETE FROM matriculacion_detalle
      WHERE id_alumno = ? AND id_carrera = ? AND anio_matriculacion = ?
    `;
    await connection.execute(deleteSql, [idAlumno, idCarrera, anioMatriculacion]);

    // 2. Insertar las materias seleccionadas
    if (materias && materias.length > 0) {
      const insertSql = `
        INSERT INTO matriculacion_detalle (
          id_alumno, id_carrera, anio_matriculacion, id_materia, tipo_asistencia
        ) VALUES (?, ?, ?, ?, ?)
      `;
      for (const item of materias) {
        const tipoAsistencia = item.tipo_asistencia || '1'; // 1 = Presencial por defecto
        await connection.execute(insertSql, [
          idAlumno,
          idCarrera,
          anioMatriculacion,
          item.id_materia,
          tipoAsistencia
        ]);
      }
    }
  }

  /**
   * Consulta inscripciones para el reporte con filtros combinables:
   * Carrera, Año de cursada, Ciclo lectivo (cohorte/año matriculación), Situación académica
   * @param {Object} filtros
   */
  static async getReporteInscripciones(filtros = {}) {
    const { idCarrera, anioCursada, cicloLectivo, situacion } = filtros;

    let sql = `
      SELECT 
        a.id_alumno,
        a.legajo,
        a.numero_documento,
        CONCAT(a.primer_apellido, ' ', COALESCE(a.otros_apellidos, '')) AS apellidos,
        CONCAT(a.primer_nombre, ' ', COALESCE(a.otros_nombres, '')) AS nombres,
        c.id_carrera,
        c.nombre_carrera,
        c.nombre_carrera_corto,
        m.id_materia,
        m.nombre_materia,
        cm.anio_cursada,
        md.anio_matriculacion AS ciclo_lectivo,
        md.tipo_asistencia,
        CASE md.tipo_asistencia
          WHEN '1' THEN 'Presencial'
          WHEN '2' THEN 'Libre'
          WHEN '3' THEN 'Vocacional'
          ELSE md.tipo_asistencia
        END AS situacion_asistencia,
        CASE 
          WHEN ha.id_materia IS NOT NULL AND ha.anio_regular > 0 AND ha.anio_regular < md.anio_matriculacion THEN 'Recursa'
          ELSE 'Cursa'
        END AS condicion_cursada,
        t.turno,
        s.nombre_sede,
        ha.validado_regular,
        ha.validado_examen,
        ha.nota,
        ha.anio_regular
      FROM matriculacion_detalle md
      INNER JOIN alumnos a ON md.id_alumno = a.id_alumno
      INNER JOIN carreras c ON md.id_carrera = c.id_carrera
      INNER JOIN materias m ON md.id_materia = m.id_materia
      INNER JOIN carrera_materias cm ON md.id_carrera = cm.id_carrera AND md.id_materia = cm.id_materia
      INNER JOIN matriculacion mat ON md.id_alumno = mat.id_alumno AND md.id_carrera = mat.id_carrera
      INNER JOIN turnos t ON mat.id_turno = t.id_turno
      INNER JOIN sedes s ON mat.id_sede = s.id_sede
      LEFT JOIN historial_academico ha ON md.id_alumno = ha.id_alumno 
                                      AND md.id_carrera = ha.id_carrera 
                                      AND md.id_materia = ha.id_materia
      WHERE 1=1
    `;

    const params = [];

    if (idCarrera) {
      sql += ' AND md.id_carrera = ?';
      params.push(Number(idCarrera));
    }

    if (anioCursada) {
      sql += ' AND cm.anio_cursada = ?';
      params.push(Number(anioCursada));
    }

    if (cicloLectivo) {
      sql += ' AND md.anio_matriculacion = ?';
      params.push(Number(cicloLectivo));
    }

    // Filtros de situación académica:
    // - recursante: si ya tenía registro previo en historial_academico o anio_regular anterior
    // - libre: tipo_asistencia = '2'
    // - regular: tipo_asistencia = '1'
    // - atraso: alumno cursa materia de año menor a su cohorte/año de inicio
    if (situacion) {
      const sit = String(situacion).toLowerCase();
      if (sit === 'libre') {
        sql += " AND md.tipo_asistencia = '2'";
      } else if (sit === 'regular') {
        sql += " AND md.tipo_asistencia = '1'";
      } else if (sit === 'recursante') {
        sql += ' AND (ha.id_materia IS NOT NULL AND ha.anio_regular > 0 AND ha.anio_regular < md.anio_matriculacion)';
      } else if (sit === 'atraso') {
        sql += ' AND (md.anio_matriculacion - mat.anio_inscripcion > cm.anio_cursada)';
      }
    }

    sql += ' ORDER BY c.nombre_carrera, cm.anio_cursada, a.primer_apellido, a.primer_nombre, m.nombre_materia';

    return await query(sql, params);
  }
}

module.exports = MatriculacionModel;
