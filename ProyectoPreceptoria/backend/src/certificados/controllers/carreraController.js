const CarreraModel = require('../models/carreraModel');

class CarreraController {
  /**
   * GET /api/carreras
   */
  static async listar(req, res, next) {
    try {
      const carreras = await CarreraModel.listarTodas();
      res.json(carreras);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/carreras/:id/plan
   */
  static async obtenerPlan(req, res, next) {
    try {
      const { id } = req.params;
      const carrera = await CarreraModel.obtenerPorId(id);
      if (!carrera) {
        return res.status(404).json({ error: 'Carrera no encontrada' });
      }

      const materias = await CarreraModel.obtenerPlanMaterias(id);
      res.json({
        carrera,
        totalMaterias: materias.length,
        materias
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CarreraController;
