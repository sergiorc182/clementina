const { queryAll, queryOne, run, transaction } = require('../database/db');
const { logAction } = require('./auditService');

/**
 * Mapeo oficial del campo historial_academico.tipo_alumno (Tipo de Examen / Acreditación).
 * Corrige el bug histórico donde 'P' (Promoción) o 'X' se mostraban como "No definido".
 */
const TIPO_EXAMEN_MAP = {
  P: 'Promoción',
  R: 'Regular',
  L: 'Libre',
  E: 'Equivalencia'
};

function normalizarTipoExamen(codigoRaw) {
  const code = String(codigoRaw || '').trim().toUpperCase();
  if (TIPO_EXAMEN_MAP[code]) {
    return { codigo: code, label: TIPO_EXAMEN_MAP[code], sinDefinir: false };
  }
  return { codigo: code || 'X', label: 'Sin definir (Corregir)', sinDefinir: true };
}

/**
 * Semáforo Oficial de Validación de Notas (Requerimiento Cliente - Módulo C):
 * - GREEN  (Verde):   Verificado con final aprobado (validado_examen = 'T').
 * - ORANGE (Naranja): Regularizada y verificada con preceptoría (validado_regular = 'T', sin final verificado).
 * - RED    (Rojo):    Sin verificar (validado_regular != 'T' y validado_examen != 'T').
 */
function calcularSemaforoValidacion(row) {
  const valExamen = String(row.validado_examen || 'F').toUpperCase() === 'T';
  const valRegular = String(row.validado_regular || 'F').toUpperCase() === 'T';
  const tipo = normalizarTipoExamen(row.tipo_alumno);
  const notaNum = row.nota !== null && row.nota !== undefined && Number(row.nota) > 0 ? Number(row.nota) : null;

  if (valExamen) {
    const esPromocion = tipo.codigo === 'P';
    return {
      color: 'GREEN',
      label: esPromocion ? 'Verificado (Promoción Aprobada)' : 'Verificado (Final Aprobado)',
      status: esPromocion ? 'APROBADA_PROMOCION' : 'APROBADA_FINAL',
      reason: esPromocion
        ? `Acreditada por Promoción verificada${notaNum ? ` (Nota: ${notaNum})` : ''}.`
        : `Final aprobado y verificado${notaNum ? ` (Nota: ${notaNum})` : ''}.`
    };
  }

  if (valRegular) {
    return {
      color: 'ORANGE',
      label: 'Regularizada y Verificada (Preceptoría)',
      status: 'REGULAR',
      reason: `Cursada regularizada${Number(row.anio_regular) > 0 ? ` (Año ${row.anio_regular})` : ''} y verificada con preceptoría. Pendiente de examen final.`
    };
  }

  return {
    color: 'RED',
    label: 'Sin Verificar',
    status: 'SIN_VERIFICAR',
    reason: 'Registro pendiente de verificación por Preceptoría o Administración.'
  };
}

class ExamService {
  /**
   * Lista las calificaciones y estados de verificación directamente desde MySQL (`historial_academico`)
   * con el semáforo oficial (Verde / Naranja / Rojo) y el Tipo de Examen corregido.
   */
  static async getAcademicRecords({
    page = 1,
    limit = 100,
    search = '',
    subjectId = null,
    color = null,
    career = null,
    tipoExamen = null,
    restrictedStudentId = null
  }) {
    const conditions = [];
    const params = [];
    const summaryConditions = [];
    const summaryParams = [];

    // Seguridad por rol: si el usuario es ALUMNO, restringir estrictamente a su propio id_alumno
    if (restrictedStudentId !== null && restrictedStudentId !== undefined) {
      conditions.push('h.id_alumno = ?');
      params.push(Number(restrictedStudentId));
      summaryConditions.push('h.id_alumno = ?');
      summaryParams.push(Number(restrictedStudentId));
    }

    if (search) {
      if (restrictedStudentId !== null && restrictedStudentId !== undefined) {
        // Un alumno solo puede buscar por nombre de sus propias materias
        conditions.push('(m.nombre_materia LIKE ? OR c.nombre_carrera LIKE ?)');
        const s = `%${search.trim()}%`;
        params.push(s, s);
      } else {
        conditions.push(
          '(a.primer_nombre LIKE ? OR a.primer_apellido LIKE ? OR a.legajo LIKE ? OR CAST(a.numero_documento AS CHAR) LIKE ? OR m.nombre_materia LIKE ?)'
        );
        const s = `%${search.trim()}%`;
        params.push(s, s, s, s, s);
      }
    }
    if (career) {
      conditions.push('(c.nombre_carrera = ? OR c.nombre_carrera LIKE ? OR c.nombre_carrera_corto = ?)');
      params.push(career, `%${career}%`, career);
    }
    if (subjectId) {
      conditions.push('h.id_materia = ?');
      params.push(Number(subjectId));
    }
    if (color) {
      const cUpper = String(color).toUpperCase();
      if (cUpper === 'GREEN') {
        conditions.push("h.validado_examen = 'T'");
      } else if (cUpper === 'ORANGE') {
        conditions.push("(h.validado_regular = 'T' AND (h.validado_examen IS NULL OR h.validado_examen != 'T'))");
      } else if (cUpper === 'RED') {
        conditions.push("((h.validado_regular IS NULL OR h.validado_regular != 'T') AND (h.validado_examen IS NULL OR h.validado_examen != 'T'))");
      }
    }
    if (tipoExamen) {
      const tUpper = String(tipoExamen).toUpperCase();
      if (tUpper === 'X' || tUpper === 'SIN_DEFINIR') {
        conditions.push("(h.tipo_alumno IS NULL OR h.tipo_alumno NOT IN ('P', 'R', 'L', 'E'))");
      } else {
        conditions.push('h.tipo_alumno = ?');
        params.push(tUpper);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const summaryWhereClause = summaryConditions.length > 0 ? `WHERE ${summaryConditions.join(' AND ')}` : '';

    // Contadores reales de la base (restringidos al propio alumno cuando corresponde)
    const summaryRow = await queryOne(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN h.validado_examen = 'T' THEN 1 ELSE 0 END) AS green_count,
        SUM(CASE WHEN h.validado_regular = 'T' AND (h.validado_examen IS NULL OR h.validado_examen != 'T') THEN 1 ELSE 0 END) AS orange_count,
        SUM(CASE WHEN (h.validado_regular IS NULL OR h.validado_regular != 'T') AND (h.validado_examen IS NULL OR h.validado_examen != 'T') THEN 1 ELSE 0 END) AS red_count,
        SUM(CASE WHEN h.tipo_alumno IS NULL OR h.tipo_alumno NOT IN ('P', 'R', 'L', 'E') THEN 1 ELSE 0 END) AS sin_definir_count
      FROM historial_academico h
      JOIN alumnos a ON h.id_alumno = a.id_alumno
      JOIN carreras c ON h.id_carrera = c.id_carrera
      JOIN carrera_materias cm ON h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia
      JOIN materias m ON h.id_materia = m.id_materia
      ${summaryWhereClause}
    `, summaryParams);

    const countRow = await queryOne(`
      SELECT COUNT(*) as total
      FROM historial_academico h
      JOIN alumnos a ON h.id_alumno = a.id_alumno
      JOIN carreras c ON h.id_carrera = c.id_carrera
      JOIN carrera_materias cm ON h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia
      JOIN materias m ON h.id_materia = m.id_materia
      ${whereClause}
    `, params);
    const total = countRow ? Number(countRow.total) : 0;

    const offset = (Number(page) - 1) * Number(limit);
    const rows = await queryAll(`
      SELECT
        h.id_alumno,
        h.id_carrera,
        h.id_materia,
        h.anio_regular,
        h.fecha_aprobacion,
        h.tomo_acta,
        h.folio_acta,
        h.nota,
        h.tipo_alumno,
        h.validado_regular,
        h.validado_examen,
        h.resolucion,
        h.observaciones,
        h.fecha_alta,
        h.fecha_mod,
        a.legajo AS student_file,
        CAST(a.numero_documento AS CHAR) AS student_dni,
        TRIM(CONCAT(a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), ''))) AS student_first_name,
        TRIM(CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''))) AS student_last_name,
        a.email AS student_email,
        CONCAT('MAT-', m.id_materia) AS subject_code,
        m.nombre_materia AS subject_name,
        c.nombre_carrera AS subject_career,
        cm.anio_cursada AS subject_year_level
      FROM historial_academico h
      JOIN alumnos a ON h.id_alumno = a.id_alumno
      JOIN carreras c ON h.id_carrera = c.id_carrera
      JOIN carrera_materias cm ON h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia
      JOIN materias m ON h.id_materia = m.id_materia
      ${whereClause}
      ORDER BY
        CASE
          WHEN (h.validado_regular IS NULL OR h.validado_regular != 'T') AND (h.validado_examen IS NULL OR h.validado_examen != 'T') THEN 1
          WHEN h.validado_regular = 'T' AND (h.validado_examen IS NULL OR h.validado_examen != 'T') THEN 2
          ELSE 3
        END ASC,
        c.nombre_carrera ASC,
        cm.anio_cursada ASC,
        m.nombre_materia ASC,
        a.primer_apellido ASC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const data = rows.map(row => {
      const sem = calcularSemaforoValidacion(row);
      const tipo = normalizarTipoExamen(row.tipo_alumno);
      const compositeId = `${row.id_alumno}-${row.id_carrera}-${row.id_materia}`;
      return {
        id: compositeId,
        id_alumno: row.id_alumno,
        id_carrera: row.id_carrera,
        id_materia: row.id_materia,
        student_id: row.id_alumno,
        subject_id: row.id_materia,
        student_file: row.student_file || 'S/L',
        student_dni: row.student_dni || '',
        student_first_name: row.student_first_name,
        student_last_name: row.student_last_name,
        student_email: row.student_email,
        subject_code: row.subject_code,
        subject_name: row.subject_name,
        subject_career: row.subject_career,
        subject_year_level: row.subject_year_level,
        academic_year: Number(row.anio_regular) > 0 ? Number(row.anio_regular) : null,
        nota: row.nota !== null && row.nota !== undefined && Number(row.nota) > 0 ? Number(row.nota) : null,
        fecha_aprobacion: row.fecha_aprobacion,
        tomo_acta: Number(row.tomo_acta) || 0,
        folio_acta: Number(row.folio_acta) || 0,
        validado_regular: row.validado_regular || 'F',
        validado_examen: row.validado_examen || 'F',
        tipo_examen_codigo: tipo.codigo,
        tipo_examen_label: tipo.label,
        tipo_examen_sin_definir: tipo.sinDefinir,
        observaciones: row.observaciones || '',
        traffic_light_color: sem.color,
        traffic_light_label: sem.label,
        traffic_light_reason: sem.reason,
        cursada_status: sem.status,
        updated_at: row.fecha_mod || row.fecha_alta
      };
    });

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        total: Number(summaryRow?.total || 0),
        green: Number(summaryRow?.green_count || 0),
        orange: Number(summaryRow?.orange_count || 0),
        red: Number(summaryRow?.red_count || 0),
        sinDefinir: Number(summaryRow?.sin_definir_count || 0)
      },
      data
    };
  }

  /**
   * Valida una nota (cambia el estado del semáforo: GREEN / ORANGE / RED)
   * y/o corrige el Tipo de Examen ('P' = Promoción, 'R' = Regular, 'L' = Libre, 'E' = Equivalencia)
   * directamente sobre `historial_academico` en MySQL, dejando registro inmutable en `audit_logs`.
   */
  static async validateGrade(payload, actor) {
    const idAlumno = Number(payload.id_alumno ?? payload.idAlumno);
    const idCarrera = Number(payload.id_carrera ?? payload.idCarrera);
    const idMateria = Number(payload.id_materia ?? payload.idMateria);
    const estadoSemaforo = String(payload.estado_semaforo ?? payload.estadoSemaforo ?? '').toUpperCase();
    const tipoExamen = payload.tipo_examen ?? payload.tipoExamen;
    const notaParam = payload.nota;
    const tomoActa = payload.tomo_acta ?? payload.tomoActa;
    const folioActa = payload.folio_acta ?? payload.folioActa;
    const anioRegular = payload.anio_regular ?? payload.anioRegular;
    const observaciones = payload.observaciones;

    if (!idAlumno || !idCarrera || !idMateria) {
      const err = new Error('Se requieren id_alumno, id_carrera e id_materia para validar el registro.');
      err.statusCode = 400;
      throw err;
    }

    const actual = await queryOne(`
      SELECT h.*,
             CONCAT(a.primer_apellido, ', ', a.primer_nombre) AS alumno_nombre,
             m.nombre_materia,
             c.nombre_carrera
      FROM historial_academico h
      JOIN alumnos a ON h.id_alumno = a.id_alumno
      JOIN materias m ON h.id_materia = m.id_materia
      JOIN carreras c ON h.id_carrera = c.id_carrera
      WHERE h.id_alumno = ? AND h.id_carrera = ? AND h.id_materia = ?
    `, [idAlumno, idCarrera, idMateria]);

    if (!actual) {
      const err = new Error('Registro en historial_academico no encontrado.');
      err.statusCode = 404;
      throw err;
    }

    let nuevoValReg = actual.validado_regular || 'F';
    let nuevoValEx = actual.validado_examen || 'F';
    let nuevaNota = Number(actual.nota || 0);
    let nuevoAnioReg = Number(actual.anio_regular || 0);
    let nuevaFechaAprob = actual.fecha_aprobacion;

    if (notaParam !== undefined && notaParam !== null && notaParam !== '') {
      const n = Number(notaParam);
      if (isNaN(n) || n < 0 || n > 10) {
        const err = new Error('La nota debe estar entre 0 y 10.');
        err.statusCode = 400;
        throw err;
      }
      nuevaNota = Math.round(n);
    }

    if (anioRegular !== undefined && anioRegular !== null && anioRegular !== '') {
      nuevoAnioReg = Number(anioRegular) || 0;
    }

    if (estadoSemaforo) {
      if (!['GREEN', 'ORANGE', 'RED'].includes(estadoSemaforo)) {
        const err = new Error('Estado de semáforo inválido. Valores permitidos: GREEN, ORANGE, RED.');
        err.statusCode = 400;
        throw err;
      }
      if (estadoSemaforo === 'GREEN') {
        nuevoValReg = 'T';
        nuevoValEx = 'T';
        if (nuevaNota < 4) nuevaNota = 4;
        if (!nuevaFechaAprob) nuevaFechaAprob = new Date().toISOString().split('T')[0];
        if (!nuevoAnioReg) nuevoAnioReg = new Date().getFullYear();
      } else if (estadoSemaforo === 'ORANGE') {
        nuevoValReg = 'T';
        nuevoValEx = 'F';
        if (!nuevoAnioReg) nuevoAnioReg = new Date().getFullYear();
      } else if (estadoSemaforo === 'RED') {
        nuevoValReg = 'F';
        nuevoValEx = 'F';
      }
    }

    let nuevoTipoAlumno = actual.tipo_alumno || 'X';
    if (tipoExamen !== undefined && tipoExamen !== null && tipoExamen !== '') {
      const tCode = String(tipoExamen).trim().toUpperCase();
      if (!['P', 'R', 'L', 'E'].includes(tCode)) {
        const err = new Error('Tipo de examen inválido. Permitidos: P (Promoción), R (Regular), L (Libre), E (Equivalencia).');
        err.statusCode = 400;
        throw err;
      }
      nuevoTipoAlumno = tCode;
    }

    const nuevoTomo = tomoActa !== undefined && tomoActa !== '' ? Number(tomoActa) || 0 : Number(actual.tomo_acta || 0);
    const nuevoFolio = folioActa !== undefined && folioActa !== '' ? Number(folioActa) || 0 : Number(actual.folio_acta || 0);
    const nuevasObs = observaciones !== undefined ? String(observaciones).trim() : (actual.observaciones || null);

    const semAnterior = calcularSemaforoValidacion(actual);
    const tipoAnterior = normalizarTipoExamen(actual.tipo_alumno);

    const fechaAprobSql = nuevaFechaAprob
      ? (nuevaFechaAprob instanceof Date ? nuevaFechaAprob.toISOString().split('T')[0] : String(nuevaFechaAprob).slice(0, 10))
      : null;

    await transaction(async () => {
      await run(`
        UPDATE historial_academico
        SET validado_regular = ?,
            validado_examen = ?,
            nota = ?,
            tipo_alumno = ?,
            anio_regular = ?,
            tomo_acta = ?,
            folio_acta = ?,
            fecha_aprobacion = ?,
            observaciones = ?,
            fecha_mod = NOW()
        WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?
      `, [
        nuevoValReg,
        nuevoValEx,
        nuevaNota,
        nuevoTipoAlumno,
        nuevoAnioReg,
        nuevoTomo,
        nuevoFolio,
        fechaAprobSql,
        nuevasObs,
        idAlumno,
        idCarrera,
        idMateria
      ]);

      const semNuevo = calcularSemaforoValidacion({
        validado_regular: nuevoValReg,
        validado_examen: nuevoValEx,
        tipo_alumno: nuevoTipoAlumno,
        nota: nuevaNota,
        anio_regular: nuevoAnioReg
      });
      const tipoNuevo = normalizarTipoExamen(nuevoTipoAlumno);

      // Sincronizar también en student_subject_records si existe
      await run(`
        UPDATE student_subject_records
        SET cursada_status = ?,
            final_exam_grade = ?,
            traffic_light_color = ?,
            traffic_light_label = ?,
            traffic_light_reason = ?,
            updated_at = NOW()
        WHERE student_id = ? AND id_carrera = ? AND id_materia = ?
      `, [
        semNuevo.status,
        nuevaNota > 0 ? nuevaNota : null,
        semNuevo.color,
        semNuevo.label,
        semNuevo.reason,
        idAlumno,
        idCarrera,
        idMateria
      ]);

      const cambioTipo = tipoAnterior.codigo !== tipoNuevo.codigo;
      const actionType = cambioTipo && semAnterior.color === semNuevo.color
        ? 'TIPO_EXAMEN_CORREGIDO'
        : 'GRADE_VALIDATED';

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType,
        entity: 'historial_academico',
        entityId: `${idAlumno}-${idCarrera}-${idMateria}`,
        previousValues: {
          alumno: actual.alumno_nombre,
          materia: actual.nombre_materia,
          semaforo: semAnterior.color,
          validado_regular: actual.validado_regular,
          validado_examen: actual.validado_examen,
          tipo_examen: tipoAnterior.label,
          nota: Number(actual.nota || 0)
        },
        newValues: {
          alumno: actual.alumno_nombre,
          materia: actual.nombre_materia,
          semaforo: semNuevo.color,
          validado_regular: nuevoValReg,
          validado_examen: nuevoValEx,
          tipo_examen: tipoNuevo.label,
          nota: nuevaNota,
          tomo_acta: nuevoTomo,
          folio_acta: nuevoFolio
        },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });
    });

    const updated = await queryOne(`
      SELECT h.*,
             a.legajo AS student_file,
             CAST(a.numero_documento AS CHAR) AS student_dni,
             a.primer_nombre AS student_first_name,
             a.primer_apellido AS student_last_name,
             m.nombre_materia AS subject_name,
             c.nombre_carrera AS subject_career,
             cm.anio_cursada AS subject_year_level
      FROM historial_academico h
      JOIN alumnos a ON h.id_alumno = a.id_alumno
      JOIN carreras c ON h.id_carrera = c.id_carrera
      JOIN carrera_materias cm ON h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia
      JOIN materias m ON h.id_materia = m.id_materia
      WHERE h.id_alumno = ? AND h.id_carrera = ? AND h.id_materia = ?
    `, [idAlumno, idCarrera, idMateria]);

    const semFinal = calcularSemaforoValidacion(updated);
    const tipoFinal = normalizarTipoExamen(updated.tipo_alumno);

    return {
      id: `${idAlumno}-${idCarrera}-${idMateria}`,
      ...updated,
      tipo_examen_codigo: tipoFinal.codigo,
      tipo_examen_label: tipoFinal.label,
      traffic_light_color: semFinal.color,
      traffic_light_label: semFinal.label,
      traffic_light_reason: semFinal.reason
    };
  }

  /**
   * Soporta el contrato oficial PATCH /api/v1/resultados/:id/validacion
   * donde :id tiene el formato "idAlumno-idCarrera-idMateria".
   */
  static async validateGradeById(idParam, body, actor) {
    const parts = String(idParam || '').split('-').map(Number);
    if (parts.length === 3 && parts.every(n => !isNaN(n) && n > 0)) {
      return await this.validateGrade(
        {
          ...body,
          id_alumno: parts[0],
          id_carrera: parts[1],
          id_materia: parts[2]
        },
        actor
      );
    }
    return await this.validateGrade(body, actor);
  }

  /**
   * Obtiene la lista real de materias desde MySQL (`carrera_materias` + `materias` + `carreras`).
   * Si se pasa restrictedStudentId (rol ALUMNO), solo devuelve las materias del propio estudiante.
   */
  static async getSubjects(restrictedStudentId = null) {
    if (restrictedStudentId !== null && restrictedStudentId !== undefined) {
      return await queryAll(`
        SELECT DISTINCT m.id_materia AS id,
               cm.id_carrera,
               CONCAT('MAT-', m.id_materia) AS code,
               m.nombre_materia AS name,
               c.nombre_carrera AS career,
               cm.anio_cursada AS year_level
        FROM historial_academico h
        JOIN carrera_materias cm ON h.id_carrera = cm.id_carrera AND h.id_materia = cm.id_materia
        JOIN materias m ON cm.id_materia = m.id_materia
        JOIN carreras c ON cm.id_carrera = c.id_carrera
        WHERE h.id_alumno = ?
        ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC
      `, [Number(restrictedStudentId)]);
    }
    return await queryAll(`
      SELECT m.id_materia AS id,
             cm.id_carrera,
             CONCAT('MAT-', m.id_materia) AS code,
             m.nombre_materia AS name,
             c.nombre_carrera AS career,
             cm.anio_cursada AS year_level
      FROM carrera_materias cm
      JOIN materias m ON cm.id_materia = m.id_materia
      JOIN carreras c ON cm.id_carrera = c.id_carrera
      ORDER BY c.nombre_carrera ASC, cm.anio_cursada ASC, m.nombre_materia ASC
    `);
  }

  /**
   * Obtiene la lista real de carreras desde MySQL (`carreras`).
   * Si se pasa restrictedStudentId (rol ALUMNO), solo devuelve las carreras cursadas por ese alumno.
   */
  static async getCareers(restrictedStudentId = null) {
    if (restrictedStudentId !== null && restrictedStudentId !== undefined) {
      const rows = await queryAll(`
        SELECT DISTINCT c.nombre_carrera
        FROM historial_academico h
        JOIN carreras c ON h.id_carrera = c.id_carrera
        WHERE h.id_alumno = ?
        ORDER BY c.nombre_carrera ASC
      `, [Number(restrictedStudentId)]);
      return rows.map(r => r.nombre_carrera);
    }
    const rows = await queryAll('SELECT nombre_carrera FROM carreras ORDER BY nombre_carrera ASC');
    return rows.map(r => r.nombre_carrera);
  }

  /**
   * Obtiene la lista real de estudiantes desde MySQL (`alumnos`).
   * Si se pasa restrictedStudentId (rol ALUMNO), solo devuelve su propio registro.
   */
  static async getStudents(restrictedStudentId = null) {
    if (restrictedStudentId !== null && restrictedStudentId !== undefined) {
      return await queryAll(`
        SELECT a.id_alumno AS id,
               a.legajo AS file_number,
               CAST(a.numero_documento AS CHAR) AS document_number,
               TRIM(CONCAT(a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), ''))) AS first_name,
               TRIM(CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''))) AS last_name,
               a.email,
               c.nombre_carrera AS career
        FROM alumnos a
        LEFT JOIN matriculacion mat ON a.id_alumno = mat.id_alumno
        LEFT JOIN carreras c ON mat.id_carrera = c.id_carrera
        WHERE a.id_alumno = ?
      `, [Number(restrictedStudentId)]);
    }
    return await queryAll(`
      SELECT a.id_alumno AS id,
             a.legajo AS file_number,
             CAST(a.numero_documento AS CHAR) AS document_number,
             TRIM(CONCAT(a.primer_nombre, IF(a.otros_nombres IS NOT NULL AND a.otros_nombres != '', CONCAT(' ', a.otros_nombres), ''))) AS first_name,
             TRIM(CONCAT(a.primer_apellido, IF(a.otros_apellidos IS NOT NULL AND a.otros_apellidos != '', CONCAT(' ', a.otros_apellidos), ''))) AS last_name,
             a.email,
             c.nombre_carrera AS career
      FROM alumnos a
      LEFT JOIN matriculacion mat ON a.id_alumno = mat.id_alumno
      LEFT JOIN carreras c ON mat.id_carrera = c.id_carrera
      ORDER BY a.primer_apellido ASC, a.primer_nombre ASC
    `);
  }
}

module.exports = ExamService;
