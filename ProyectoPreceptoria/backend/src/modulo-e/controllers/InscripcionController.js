const InscripcionService = require('../services/InscripcionService');
const MatriculacionModel = require('../models/MatriculacionModel');
const ParametrosModel = require('../models/ParametrosModel');

class InscripcionController {
  /**
   * POST /api/inscripciones-materias
   * Registra la inscripción de materias a cursada con validación de carga horaria y correlatividades
   */
  static async inscribir(req, res, next) {
    try {
      const resultado = await InscripcionService.inscribirMaterias(req.body);
      return res.status(201).json({
        success: true,
        message: resultado.mensaje,
        data: resultado
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/inscripciones-materias/alumno/:idAlumno/carrera/:idCarrera
   * Consulta las materias inscriptas para el ciclo activo
   */
  static async consultarInscripcion(req, res, next) {
    try {
      const { idAlumno, idCarrera } = req.params;
      const ciclo = req.query.ciclo || (await ParametrosModel.getGenerales()).ciclo_lectivo;

      const matricula = await MatriculacionModel.findByAlumnoYCarrera(Number(idAlumno), Number(idCarrera));
      const materias = await MatriculacionModel.getDetalle(Number(idAlumno), Number(idCarrera), Number(ciclo));

      return res.json({
        success: true,
        data: {
          matricula,
          ciclo_lectivo: Number(ciclo),
          materias
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InscripcionController;
