const CargaHorariaService = require('../services/CargaHorariaService');

class CargaHorariaController {
  /**
   * GET /api/estudiantes/:id/carga-horaria
   * Verifica la carga horaria disponible y proyectada para un estudiante
   */
  static async verificarCarga(req, res, next) {
    try {
      const idAlumno = Number(req.params.id);
      const idCarrera = req.query.idCarrera ? Number(req.query.idCarrera) : null;

      // Si se pasan materias para simular en el query string: ?materias=10,12,14
      let nuevasMateriasIds = [];
      if (req.query.materias) {
        nuevasMateriasIds = String(req.query.materias)
          .split(',')
          .map(id => Number(id.trim()))
          .filter(id => !isNaN(id) && id > 0);
      }

      const resultado = await CargaHorariaService.verificarCargaHoraria(
        idAlumno,
        idCarrera,
        nuevasMateriasIds
      );

      return res.json({
        success: true,
        data: resultado
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CargaHorariaController;
