const PersonalModel = require('../models/personalModel');

class PersonalController {
  /**
   * GET /api/personal
   */
  static async listar(req, res, next) {
    try {
      const personal = await PersonalModel.listarTodos();
      res.json(personal);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/personal/preceptores
   */
  static async listarPreceptores(req, res, next) {
    try {
      const preceptores = await PersonalModel.listarPreceptores();
      res.json(preceptores);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PersonalController;
