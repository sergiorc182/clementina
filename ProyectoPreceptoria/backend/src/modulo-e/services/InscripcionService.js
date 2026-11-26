const { getConnection } = require('../config/db');
const AlumnoModel = require('../models/AlumnoModel');
const CarreraModel = require('../models/CarreraModel');
const MatriculacionModel = require('../models/MatriculacionModel');
const ParametrosModel = require('../models/ParametrosModel');
const CorrelatividadService = require('./CorrelatividadService');
const CargaHorariaService = require('./CargaHorariaService');

class InscripcionService {
  /**
   * Procesa la inscripción a materias (cursadas)
   * Valida correlatividades, carga horaria, alcance de 2º y 3º año, y persiste en matriculacion + matriculacion_detalle
   * 
   * @param {Object} payload
   * @param {number} payload.id_alumno
   * @param {number} payload.id_carrera
   * @param {number} payload.id_turno
   * @param {number} payload.id_sede
   * @param {Array<{ id_materia: number, tipo_asistencia?: string }>} payload.materias
   * @param {number} [payload.ciclo_lectivo]
   */
  static async inscribirMaterias(payload) {
    const { id_alumno, id_carrera, id_turno, id_sede, materias, ciclo_lectivo } = payload;

    // 1. Validar existencia del alumno
    const alumno = await AlumnoModel.findById(id_alumno);
    if (!alumno) {
      const err = new Error(`El alumno con ID ${id_alumno} no existe en el sistema.`);
      err.status = 404;
      throw err;
    }

    // 2. Validar existencia de la carrera
    const carrera = await CarreraModel.findById(id_carrera);
    if (!carrera) {
      const err = new Error(`La carrera con ID ${id_carrera} no existe.`);
      err.status = 404;
      throw err;
    }

    if (!Array.isArray(materias) || materias.length === 0) {
      const err = new Error('Debe seleccionar al menos una materia para la inscripción.');
      err.status = 400;
      throw err;
    }

    // 3. Determinar ciclo lectivo
    const parametros = await ParametrosModel.getGenerales();
    const anioMatriculacion = ciclo_lectivo || parametros.ciclo_lectivo || new Date().getFullYear();

    const idsMaterias = materias.map(m => Number(m.id_materia));

    // 4. Validación de Correlatividades y año de cursada (Bloqueo si no cumple)
    const validacionCorrelativas = await CorrelatividadService.validarCorrelativas(
      id_alumno,
      id_carrera,
      idsMaterias
    );

    if (!validacionCorrelativas.valido) {
      const err = new Error('Inscripción bloqueada por correlatividades no cumplidas o materias fuera de alcance.');
      err.status = 422;
      err.codigo = 'CORRELATIVAS_BLOQUEADAS';
      err.bloqueos = validacionCorrelativas.bloqueos;
      throw err;
    }

    // 5. Validación de Carga Horaria (Bloqueo si se excede el límite semanal)
    const validacionCarga = await CargaHorariaService.verificarCargaHoraria(
      id_alumno,
      id_carrera,
      idsMaterias
    );

    if (validacionCarga.excedido) {
      const err = new Error(validacionCarga.mensaje);
      err.status = 422;
      err.codigo = 'CARGA_HORARIA_EXCEDIDA';
      err.detalleCarga = validacionCarga;
      throw err;
    }

    // 5b. Validación de Superposición de Horarios de Cursada
    const horarios = await CarreraModel.getHorarios(id_carrera);
    if (horarios && horarios.length > 0) {
      const horariosSeleccionadas = horarios.filter(h => idsMaterias.includes(Number(h.id_materia)));
      for (let i = 0; i < horariosSeleccionadas.length; i++) {
        for (let j = i + 1; j < horariosSeleccionadas.length; j++) {
          const h1 = horariosSeleccionadas[i];
          const h2 = horariosSeleccionadas[j];
          if (h1.id_materia === h2.id_materia) continue;

          if (h1.dia_semana && h2.dia_semana && h1.dia_semana.toLowerCase().trim() === h2.dia_semana.toLowerCase().trim()) {
            const toMin = (t) => {
              const [hh, mm] = (t || '00:00').split(':').map(Number);
              return (hh || 0) * 60 + (mm || 0);
            };
            const ini1 = toMin(h1.hora_inicio);
            const fin1 = toMin(h1.hora_fin);
            const ini2 = toMin(h2.hora_inicio);
            const fin2 = toMin(h2.hora_fin);

            if (ini1 < fin2 && fin1 > ini2) {
              const err = new Error(`Superposición de horarios detectada el día ${h1.dia_semana} entre materias (${h1.hora_inicio}-${h1.hora_fin} y ${h2.hora_inicio}-${h2.hora_fin}).`);
              err.status = 422;
              err.codigo = 'SUPERPOSICION_HORARIA';
              err.detalleConflicto = {
                id_materia_1: h1.id_materia,
                id_materia_2: h2.id_materia,
                dia: h1.dia_semana,
                franja_1: `${h1.hora_inicio}-${h1.hora_fin}`,
                franja_2: `${h2.hora_inicio}-${h2.hora_fin}`
              };
              throw err;
            }
          }
        }
      }
    }

    // 6. Transacción ACID para persistir en MySQL (matriculacion y matriculacion_detalle)
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      // Guardar cabecera en matriculacion
      await MatriculacionModel.upsertMatriculacion(conn, {
        id_alumno,
        id_carrera,
        anio_inscripcion: anioMatriculacion,
        id_turno,
        id_sede
      });

      // Guardar materias en matriculacion_detalle
      await MatriculacionModel.guardarDetalle(
        conn,
        id_alumno,
        id_carrera,
        anioMatriculacion,
        materias
      );

      await conn.commit();
    } catch (dbError) {
      await conn.rollback();
      console.error('[InscripcionService] Error en transacción:', dbError);
      throw dbError;
    } finally {
      conn.release();
    }

    // 7. Retornar el detalle de la inscripción confirmada
    const detalleInscripto = await MatriculacionModel.getDetalle(id_alumno, id_carrera, anioMatriculacion);

    return {
      mensaje: 'Inscripción a cursada registrada exitosamente.',
      matricula: {
        id_alumno,
        alumno_nombre: `${alumno.primer_apellido} ${alumno.primer_nombre}`,
        legajo: alumno.legajo,
        documento: alumno.numero_documento,
        id_carrera,
        carrera_nombre: carrera.nombre_carrera,
        id_turno,
        id_sede,
        ciclo_lectivo: anioMatriculacion,
        fecha_registro: new Date().toISOString()
      },
      carga_horaria: validacionCarga,
      materias_inscriptas: detalleInscripto
    };
  }
}

module.exports = InscripcionService;
