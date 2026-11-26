import * as finalModel from '../models/finalModel.js';

/**
 * CAPA CONTROLADOR (CONTROLLER) - Exámenes Finales
 */

// Helper para detectar el tipo de usuario desde la cookie si es enviada al backend
const obtenerTipoUsuarioDesdeCookie = (req) => {
  const rawCookie = req.headers?.cookie || '';
  const cookies = {};
  rawCookie.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (k) cookies[k.trim()] = decodeURIComponent(v.join('='));
  });
  const rol = (cookies.tipo_usuario || cookies.tipoUsuario || cookies.rol || req.body?.tipo_usuario || '').toLowerCase();
  return rol === 'alumno' ? 'alumno' : 'preceptor';
};

// POST /api/finales/validar
// Evalúa en tiempo real las condiciones para que el frontend informe el estado antes de enviar
export const validarInscripcion = async (req, res) => {
  try {
    const {
      id_alumno,
      id_carrera,
      id_materia,
      anio_turno,
      turno_instancia,
      modalidad,
      es_excepcion
    } = req.body;

    if (!id_alumno || !id_carrera || !id_materia) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros obligatorios: id_alumno, id_carrera, id_materia'
      });
    }

    const tipoUsuario = obtenerTipoUsuarioDesdeCookie(req);
    const permitirExcepcion = tipoUsuario === 'alumno' ? false : Boolean(es_excepcion);

    const evaluacion = await finalModel.evaluarCondicionesInscripcion({
      id_alumno: Number(id_alumno),
      id_carrera: Number(id_carrera),
      id_materia: Number(id_materia),
      anio_turno: anio_turno ? Number(anio_turno) : new Date().getFullYear(),
      turno_instancia: turno_instancia ? Number(turno_instancia) : null,
      modalidad: modalidad || 'REGULAR',
      es_excepcion: permitirExcepcion
    });

    res.status(200).json({
      success: true,
      data: evaluacion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// POST /api/finales/inscribir
// Registra la inscripción al final (verifica reglas o procesa por excepción)
export const inscribir = async (req, res) => {
  try {
    const {
      id_alumno,
      id_carrera,
      id_materia,
      anio_turno,
      turno_instancia,
      id_llamado,
      modalidad,
      fecha_examen,
      es_excepcion,
      motivo_excepcion
    } = req.body;

    if (!id_alumno || !id_carrera || !id_materia || !anio_turno || !turno_instancia) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios para la inscripción'
      });
    }

    const tipoUsuario = obtenerTipoUsuarioDesdeCookie(req);
    if (tipoUsuario === 'alumno' && es_excepcion) {
      return res.status(403).json({
        success: false,
        message: 'Los usuarios con rol de alumno no están habilitados para inscribirse por excepción'
      });
    }

    const resultado = await finalModel.inscribirAFinal({
      id_alumno: Number(id_alumno),
      id_carrera: Number(id_carrera),
      id_materia: Number(id_materia),
      anio_turno: Number(anio_turno),
      turno_instancia: Number(turno_instancia),
      id_llamado: id_llamado ? Number(id_llamado) : 1,
      modalidad: modalidad || 'REGULAR',
      fecha_examen: fecha_examen || null,
      es_excepcion: tipoUsuario === 'alumno' ? false : Boolean(es_excepcion),
      motivo_excepcion: tipoUsuario === 'alumno' ? null : (motivo_excepcion || null)
    });

    res.status(201).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      evaluacion: error.evaluacion || null
    });
  }
};

// GET /api/finales/alumno/:id_alumno
// Devuelve el historial de intentos/inscripciones de finales de un alumno
export const obtenerHistorialAlumno = async (req, res) => {
  try {
    const { id_alumno } = req.params;
    const { id_materia } = req.query;

    const historial = await finalModel.obtenerRendicionesAlumno(
      Number(id_alumno),
      id_materia ? Number(id_materia) : null
    );

    res.status(200).json({
      success: true,
      total: historial.length,
      data: historial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// PUT /api/finales/calificar/:id_rendicion
// Asienta la nota final o la condición de ausente para un examen
export const calificar = async (req, res) => {
  try {
    const { id_rendicion } = req.params;
    const { nota, es_ausente, fecha_examen } = req.body;

    const resultado = await finalModel.registrarCalificacionFinal(
      Number(id_rendicion),
      { nota, es_ausente, fecha_examen }
    );

    res.status(200).json({
      success: true,
      message: 'Calificación/estado de examen final registrado con éxito',
      data: resultado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/finales/materias/:id_carrera
// Devuelve las materias pertenecientes a una carrera
export const obtenerMaterias = async (req, res) => {
  try {
    const { id_carrera } = req.params;
    const materias = await finalModel.obtenerMateriasPorCarrera(Number(id_carrera));

    res.status(200).json({
      success: true,
      data: materias
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/finales/listado
// Devuelve el listado general de inscripciones y rendiciones de finales de todos los alumnos
export const obtenerListadoGeneral = async (req, res) => {
  try {
    const { anio, turno, llamado, id_carrera, id_materia } = req.query;
    const listado = await finalModel.obtenerTodasLasRendiciones({
      anio,
      turno,
      llamado,
      id_carrera,
      id_materia
    });

    res.status(200).json({
      success: true,
      total: listado.length,
      data: listado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// DELETE /api/finales/:id_rendicion
// Baja lógica de una inscripción (nunca borrado físico) con registro en auditoría (Módulo D)
export const darDeBaja = async (req, res) => {
  try {
    const { id_rendicion } = req.params;
    const modificadoPor = req.body?.modificado_por || 'Preceptoría';
    const resultado = await finalModel.darDeBajaInscripcion(Number(id_rendicion), modificadoPor);

    res.status(200).json({
      success: true,
      message: 'Inscripción dada de baja lógicamente y registrada en auditoría.',
      data: resultado
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
};

// PATCH /api/finales/:id_rendicion/reasignar
// Reasignación de turno, año, llamado o modalidad guardando historial en auditoría (Módulo D)
export const reasignar = async (req, res) => {
  try {
    const { id_rendicion } = req.params;
    const { anio_turno, turno_instancia, id_llamado, modalidad, modificado_por } = req.body;

    const resultado = await finalModel.reasignarInscripcion(
      Number(id_rendicion),
      { anio_turno, turno_instancia, id_llamado, modalidad },
      modificado_por || 'Preceptoría'
    );

    res.status(200).json({
      success: true,
      message: 'Inscripción reasignada correctamente con registro histórico de auditoría.',
      data: resultado
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
};

// GET /api/finales/:id_rendicion/auditoria
// Devuelve el historial completo de auditoría de una inscripción (Módulo D)
export const obtenerAuditoria = async (req, res) => {
  try {
    const { id_rendicion } = req.params;
    const historial = await finalModel.obtenerAuditoriaInscripcion(Number(id_rendicion));

    res.status(200).json({
      success: true,
      total: historial.length,
      data: historial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
