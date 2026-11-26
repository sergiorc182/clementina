const CarreraModel = require('../models/CarreraModel');
const AlumnoModel = require('../models/AlumnoModel');
const CorrelatividadModel = require('../models/CorrelatividadModel');
const HistorialAcademicoModel = require('../models/HistorialAcademicoModel');
const CorrelatividadService = require('../services/CorrelatividadService');

class CatalogoController {
  /**
   * GET /api/catalogos/carreras
   */
  static async listarCarreras(req, res, next) {
    try {
      const carreras = await CarreraModel.findAll();
      return res.json({ success: true, data: carreras });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/catalogos/alumnos
   */
  static async listarAlumnos(req, res, next) {
    try {
      const alumnos = await AlumnoModel.findAll();
      return res.json({ success: true, data: alumnos });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/catalogos/alumnos/:idAlumno
   */
  static async obtenerAlumnoPorId(req, res, next) {
    try {
      const idAlumno = Number(req.params.idAlumno);
      const alumno = await AlumnoModel.findById(idAlumno);
      if (!alumno) {
        return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
      }
      return res.json({ success: true, data: alumno });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/catalogos/carreras/:idCarrera/materias
   * Devuelve las materias con sus correlatividades y, si se provee ?idAlumno,
   * evalúa si el alumno cumple las correlativas para cada materia.
   */
  static async materiasCarrera(req, res, next) {
    try {
      const idCarrera = Number(req.params.idCarrera);
      const idAlumno = req.query.idAlumno ? Number(req.query.idAlumno) : null;

      const materias = await CarreraModel.getMaterias(idCarrera);
      const correlativas = await CorrelatividadModel.getCorrelativasPorCarrera(idCarrera);
      let horarios = [];
      try {
        horarios = await CarreraModel.getHorarios(idCarrera);
      } catch (e) {
        horarios = [];
      }

      let mapaHistorial = new Map();
      if (idAlumno) {
        const historial = await HistorialAcademicoModel.getByAlumnoYCarrera(idAlumno, idCarrera);
        for (const h of historial) {
          const reg = CorrelatividadService.esVerdadero(h.validado_regular);
          const apr = CorrelatividadService.esVerdadero(h.validado_examen) || !!h.fecha_aprobacion;
          mapaHistorial.set(h.id_materia, {
            ...h,
            regularizada: reg,
            aprobada: apr,
            cumple: reg || apr
          });
        }
      }

      // Asociar correlativas a cada materia y calcular habilitación
      const materiasConEstado = materias.map(m => {
        const corrs = correlativas
          .filter(c => c.id_materia === m.id_materia)
          .map(c => {
            const h = mapaHistorial.get(c.id_materia_correlativa);
            return {
              id_materia_correlativa: c.id_materia_correlativa,
              nombre_materia_correlativa: c.nombre_materia_correlativa,
              cumplida: h ? h.cumple : false,
              estado: h ? (h.aprobada ? 'Aprobada' : (h.regularizada ? 'Regular' : 'Pendiente')) : 'No cursada'
            };
          });

        const correlativasCumplidas = corrs.every(c => c.cumplida);
        const estaDentroAlcance = m.anio_cursada >= 2; // Alcance: 2º y 3º año

        let motivoBloqueo = null;
        if (!estaDentroAlcance) {
          motivoBloqueo = 'Materia de 1º año fuera de alcance en esta etapa.';
        } else if (!correlativasCumplidas && idAlumno) {
          const faltantes = corrs.filter(c => !c.cumplida).map(c => c.nombre_materia_correlativa);
          motivoBloqueo = `Correlativas adeudadas: ${faltantes.join(', ')}`;
        }

        const horariosMateria = horarios.filter(h => h.id_materia === m.id_materia);
        return {
          ...m,
          horas: m.carga_horaria_semanal || 4,
          horarios: horariosMateria,
          correlativas: corrs,
          habilitada: estaDentroAlcance && (idAlumno ? correlativasCumplidas : true),
          motivo_bloqueo: motivoBloqueo,
          estado_historial: mapaHistorial.get(m.id_materia) || null
        };
      });

      const sedesYTurnos = await CarreraModel.getSedesYTurnos(idCarrera);

      return res.json({
        success: true,
        data: {
          materias: materiasConEstado,
          sedes_turnos: sedesYTurnos
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/catalogos/horarios
   * Asigna o modifica un horario de cursada
   */
  static async guardarHorario(req, res, next) {
    try {
      const { id_carrera, id_materia, dia_semana, hora_inicio, hora_fin, aula, comision, id_horario } = req.body;
      const horario = await CarreraModel.saveHorario({ id_horario, id_carrera, id_materia, dia_semana, hora_inicio, hora_fin, aula, comision });
      return res.json({ success: true, data: horario });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/catalogos/horarios/:idHorario
   * Elimina un horario de cursada
   */
  static async eliminarHorario(req, res, next) {
    try {
      const idHorario = Number(req.params.idHorario);
      await CarreraModel.deleteHorario(idHorario);
      return res.json({ success: true, message: 'Horario eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async guardarCarrera(req, res, next) {
    try {
      const saved = await CarreraModel.saveCarrera(req.body);
      return res.json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }

  static async eliminarCarrera(req, res, next) {
    try {
      await CarreraModel.deleteCarrera(Number(req.params.idCarrera));
      return res.json({ success: true, message: 'Carrera eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  static async guardarMateria(req, res, next) {
    try {
      const saved = await CarreraModel.saveMateria(Number(req.params.idCarrera), req.body);
      return res.json({ success: true, data: saved });
    } catch (error) {
      next(error);
    }
  }

  static async eliminarMateria(req, res, next) {
    try {
      await CarreraModel.deleteMateria(Number(req.params.idCarrera), Number(req.params.idMateria));
      return res.json({ success: true, message: 'Materia eliminada correctamente' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CatalogoController;
