const ReporteService = require('../services/ReporteService');

class ReporteController {
  /**
   * GET /api/reportes/inscripciones
   * Genera el reporte filtrable por carrera, año, ciclo lectivo y situación académica
   */
  static async obtenerReporte(req, res, next) {
    try {
      const { carrera, anio, ciclo_lectivo, situacion } = req.query;

      const filtros = {
        idCarrera: carrera ? Number(carrera) : undefined,
        anioCursada: anio ? Number(anio) : undefined,
        cicloLectivo: ciclo_lectivo ? Number(ciclo_lectivo) : undefined,
        situacion: situacion || undefined
      };

      const reporte = await ReporteService.generarReporte(filtros);

      return res.json({
        success: true,
        data: reporte
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReporteController;
