const { queryAll, queryOne, run } = require('../database/db');
const { logAction } = require('./auditService');

/**
 * Motor de Cálculo del Semáforo Académico conectado a MySQL (clementina).
 * Se ejecuta automáticamente en el backend ante cualquier alta o modificación de notas
 * y sincroniza el estado en historial_academico.
 */
class GradingEngineService {
  static evaluateAcademicStatus(subject, exams = []) {
    const promotionMin = Number(subject?.promotion_min_grade || 7.0);
    const regularMin = Number(subject?.regular_min_grade || 4.0);

    if (!exams || exams.length === 0) {
      return {
        color: 'GRAY',
        label: 'Pendiente de Evaluación',
        status: 'EN_CURSO',
        reason: 'Aún no se han registrado evaluaciones para esta cursada.',
        cursadaGrade: null,
        finalGrade: null
      };
    }

    const finalExams = exams.filter(e => e.evaluation_type === 'FINAL');
    const lastFinal = finalExams.length > 0 ? finalExams[finalExams.length - 1] : null;

    const p1 = exams.find(e => e.evaluation_type === 'PARCIAL_1');
    const p2 = exams.find(e => e.evaluation_type === 'PARCIAL_2');
    const rec1 = exams.find(e => e.evaluation_type === 'RECUPERATORIO_1');
    const rec2 = exams.find(e => e.evaluation_type === 'RECUPERATORIO_2');

    // Calcular promedio de cursada si existen parciales
    let cursadaAvgForFinal = null;
    if (p1 && p2) {
      const g1 = (rec1 && !rec1.is_absent && rec1.grade !== null) ? Number(rec1.grade) : (p1.is_absent ? null : Number(p1.grade));
      const g2 = (rec2 && !rec2.is_absent && rec2.grade !== null) ? Number(rec2.grade) : (p2.is_absent ? null : Number(p2.grade));
      if (g1 !== null && g2 !== null) {
        cursadaAvgForFinal = Number(((g1 + g2) / 2).toFixed(2));
      }
    }

    // 1. Si rindió examen final
    if (lastFinal) {
      if (lastFinal.is_absent) {
        return {
          color: 'ORANGE',
          label: 'Cursada Regularizada (Final Ausente)',
          status: 'REGULAR',
          reason: 'El estudiante estuvo ausente en la mesa de Examen Final. Conserva la regularidad pendiente de nuevo llamado.',
          cursadaGrade: cursadaAvgForFinal,
          finalGrade: null
        };
      }

      const finalGrade = Number(lastFinal.grade);
      if (finalGrade >= regularMin) {
        return {
          color: 'GREEN',
          label: 'Aprobada por Examen Final',
          status: 'APROBADA_FINAL',
          reason: `Examen Final rendido y aprobado con calificación ${finalGrade.toFixed(1)} (>= ${regularMin.toFixed(1)}). Materia acreditada formalmente.`,
          cursadaGrade: cursadaAvgForFinal,
          finalGrade
        };
      } else {
        return {
          color: 'RED',
          label: 'Examen Final Desaprobado',
          status: 'DESAPROBADA_FINAL',
          reason: `Examen Final desaprobado con calificación ${finalGrade.toFixed(1)} (< ${regularMin.toFixed(1)}). Requiere presentarse a una nueva mesa de examen.`,
          cursadaGrade: cursadaAvgForFinal,
          finalGrade
        };
      }
    }

    // 2. Evaluamos la cursada regular (Parciales)
    if (!p1) {
      return {
        color: 'GRAY',
        label: 'Pendiente de Validación',
        status: 'EN_CURSO',
        reason: 'Cursada en desarrollo. No se ha registrado aún el Primer Parcial.',
        cursadaGrade: null,
        finalGrade: null
      };
    }

    let p1Grade = p1.is_absent ? null : Number(p1.grade);
    let p1UsedRecuperatorio = false;
    if (rec1 && !rec1.is_absent && rec1.grade !== null) {
      p1Grade = Number(rec1.grade);
      p1UsedRecuperatorio = true;
    }

    if (!p2) {
      return {
        color: 'GRAY',
        label: 'Pendiente de Validación',
        status: 'EN_CURSO',
        reason: `Primer parcial registrado (${p1Grade !== null ? p1Grade.toFixed(1) : 'Ausente'}). Pendiente de carga del Segundo Parcial.`,
        cursadaGrade: p1Grade,
        finalGrade: null
      };
    }

    let p2Grade = p2.is_absent ? null : Number(p2.grade);
    let p2UsedRecuperatorio = false;
    if (rec2 && !rec2.is_absent && rec2.grade !== null) {
      p2Grade = Number(rec2.grade);
      p2UsedRecuperatorio = true;
    }

    const p1Failed = p1Grade === null || p1Grade < regularMin;
    const p2Failed = p2Grade === null || p2Grade < regularMin;

    if (p1Failed && !rec1) {
      return {
        color: 'GRAY',
        label: 'Pendiente de Recuperatorio',
        status: 'EN_CURSO',
        reason: `Primer parcial no aprobado (${p1Grade !== null ? p1Grade.toFixed(1) : 'Ausente'}). Pendiente de rendir Recuperatorio 1.`,
        cursadaGrade: null,
        finalGrade: null
      };
    }

    if (p2Failed && !rec2) {
      return {
        color: 'GRAY',
        label: 'Pendiente de Recuperatorio',
        status: 'EN_CURSO',
        reason: `Segundo parcial no aprobado (${p2Grade !== null ? p2Grade.toFixed(1) : 'Ausente'}). Pendiente de rendir Recuperatorio 2.`,
        cursadaGrade: null,
        finalGrade: null
      };
    }

    if (p1Failed || p2Failed) {
      const avg = ((p1Grade || 0) + (p2Grade || 0)) / 2;
      return {
        color: 'RED',
        label: 'Cursada Desaprobada',
        status: 'DESAPROBADA',
        reason: `No alcanzó la nota mínima de regularidad (${regularMin.toFixed(1)}) en todas las instancias de evaluación de la cursada.`,
        cursadaGrade: Number(avg.toFixed(2)),
        finalGrade: null
      };
    }

    const average = (p1Grade + p2Grade) / 2;
    const cursadaAvg = Number(average.toFixed(2));
    const canPromote = !p1UsedRecuperatorio && !p2UsedRecuperatorio && p1Grade >= promotionMin && p2Grade >= promotionMin && cursadaAvg >= promotionMin;

    if (canPromote) {
      return {
        color: 'GREEN',
        label: 'Aprobada por Promoción',
        status: 'APROBADA_PROMOCION',
        reason: `Parciales aprobados con calificaciones excelentes (${p1Grade.toFixed(1)} y ${p2Grade.toFixed(1)}). Promedio: ${cursadaAvg.toFixed(1)} >= ${promotionMin.toFixed(1)}. Promoción directa alcanzada.`,
        cursadaGrade: cursadaAvg,
        finalGrade: null
      };
    }

    return {
      color: 'ORANGE',
      label: 'Cursada Regularizada (Pendiente Final)',
      status: 'REGULAR',
      reason: `Cursada aprobada con promedio ${cursadaAvg.toFixed(1)}. Debe presentarse a mesa de Examen Final para acreditar la materia.`,
      cursadaGrade: cursadaAvg,
      finalGrade: null
    };
  }

  /**
   * Recalcula y actualiza en MySQL el semáforo y sincroniza historial_academico.
   */
  static async recalculateRecord(studentSubjectId, actor = null) {
    const record = await queryOne(`
      SELECT ss.*, m.nombre_materia as subject_name,
             CONCAT(a.primer_nombre, ' ', a.primer_apellido) as student_name,
             h.validado_regular, h.nota as historial_nota
      FROM student_subject_records ss
      JOIN materias m ON ss.id_materia = m.id_materia
      JOIN alumnos a ON ss.student_id = a.id_alumno
      LEFT JOIN historial_academico h
        ON h.id_alumno = ss.student_id AND h.id_carrera = ss.id_carrera AND h.id_materia = ss.id_materia
      WHERE ss.id = ?
    `, [studentSubjectId]);

    if (!record) {
      const err = new Error(`Registro académico ID ${studentSubjectId} no encontrado.`);
      err.statusCode = 404;
      throw err;
    }

    const exams = await queryAll(`
      SELECT * FROM exam_results
      WHERE student_subject_id = ?
      ORDER BY exam_date ASC, id ASC
    `, [studentSubjectId]);

    let evaluation;
    if (exams.length === 0 && record.validado_regular === 'T') {
      // Preservar regularidad validada en historial_academico cuando no hay parciales individuales cargados
      if (Number(record.historial_nota || 0) >= 4) {
        evaluation = {
          color: 'GREEN',
          label: 'Aprobada por Examen Final',
          status: 'APROBADA_FINAL',
          reason: `Acreditada en historial académico oficial con calificación ${record.historial_nota}.`,
          cursadaGrade: record.cursada_grade,
          finalGrade: Number(record.historial_nota)
        };
      } else {
        evaluation = {
          color: 'ORANGE',
          label: 'Cursada Regularizada (Pendiente Final)',
          status: 'REGULAR',
          reason: `Cursada regularizada (año ${record.academic_year}) según historial académico oficial. Habilitado para rendir Examen Final.`,
          cursadaGrade: record.cursada_grade,
          finalGrade: null
        };
      }
    } else {
      evaluation = this.evaluateAcademicStatus({ promotion_min_grade: 7.0, regular_min_grade: 4.0 }, exams);
    }

    const prevValues = {
      cursada_status: record.cursada_status,
      cursada_grade: record.cursada_grade,
      final_exam_grade: record.final_exam_grade,
      traffic_light_color: record.traffic_light_color,
      traffic_light_label: record.traffic_light_label
    };

    const newValues = {
      cursada_status: evaluation.status,
      cursada_grade: evaluation.cursadaGrade,
      final_exam_grade: evaluation.finalGrade,
      traffic_light_color: evaluation.color,
      traffic_light_label: evaluation.label,
      traffic_light_reason: evaluation.reason
    };

    await run(`
      UPDATE student_subject_records
      SET cursada_status = ?,
          cursada_grade = ?,
          final_exam_grade = ?,
          traffic_light_color = ?,
          traffic_light_label = ?,
          traffic_light_reason = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [
      evaluation.status,
      evaluation.cursadaGrade,
      evaluation.finalGrade,
      evaluation.color,
      evaluation.label,
      evaluation.reason,
      studentSubjectId
    ]);

    // Sincronizar bidireccionalmente con la tabla oficial historial_academico
    if (evaluation.status === 'APROBADA_FINAL' || evaluation.status === 'APROBADA_PROMOCION') {
      const notaFinalEntera = Math.round(Number(evaluation.finalGrade ?? evaluation.cursadaGrade ?? 4));
      await run(`
        UPDATE historial_academico
        SET validado_regular = 'T',
            validado_examen = 'T',
            nota = ?,
            fecha_aprobacion = COALESCE(fecha_aprobacion, CURDATE()),
            fecha_mod = NOW()
        WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?
      `, [notaFinalEntera, record.student_id, record.id_carrera, record.id_materia]);
    } else if (evaluation.status === 'REGULAR') {
      await run(`
        UPDATE historial_academico
        SET validado_regular = 'T',
            anio_regular = IF(anio_regular > 0, anio_regular, ?),
            fecha_mod = NOW()
        WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?
      `, [record.academic_year, record.student_id, record.id_carrera, record.id_materia]);
    } else if (evaluation.status === 'DESAPROBADA') {
      await run(`
        UPDATE historial_academico
        SET validado_regular = 'F',
            fecha_mod = NOW()
        WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?
      `, [record.student_id, record.id_carrera, record.id_materia]);
    }

    const hasChanged = prevValues.traffic_light_color !== newValues.traffic_light_color ||
                       prevValues.cursada_status !== newValues.cursada_status;

    if (hasChanged && actor) {
      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: actor.name || `${actor.firstName || actor.first_name || ''} ${actor.lastName || actor.last_name || ''}`.trim(),
        actionType: 'GRADE_RECALCULATED',
        entity: 'student_subject_records',
        entityId: String(studentSubjectId),
        previousValues: prevValues,
        newValues: newValues,
        ipAddress: actor.ipAddress || '127.0.0.1'
      });
    }

    return {
      id: studentSubjectId,
      ...newValues
    };
  }
}

module.exports = GradingEngineService;
