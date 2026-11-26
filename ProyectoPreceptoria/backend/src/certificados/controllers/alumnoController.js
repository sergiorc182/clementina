const AlumnoModel = require('../models/alumnoModel');

class AlumnoController {
  /**
   * GET /api/alumnos?q=termino
   */
  static async buscar(req, res, next) {
    try {
      const termino = req.query.q || '';
      const alumnos = await AlumnoModel.buscar(termino);
      res.json({
        total: alumnos.length,
        alumnos
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/alumnos/:id
   */
  static async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const alumno = await AlumnoModel.obtenerPorId(id);

      if (!alumno) {
        return res.status(404).json({ error: 'Alumno no encontrado' });
      }

      const carreras = await AlumnoModel.obtenerCarrerasMatriculadas(id);

      res.json({
        alumno,
        carreras
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AlumnoController;
