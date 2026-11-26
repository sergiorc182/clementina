const SheetService = require('../services/sheetService');

class SheetController {
  static async getCareers(req, res, next) {
    try {
      const careers = await SheetService.getOfficialCareers();
      return res.status(200).json({
        success: true,
        data: careers
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubjects(req, res, next) {
    try {
      const { carrera } = req.query;
      const subjects = await SheetService.getSubjectsByCareer(carrera);
      return res.status(200).json({
        success: true,
        data: subjects
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSheets(req, res, next) {
    try {
      const { sheetType, carrera, estado, search, onlyMine } = req.query;
      const actor = req.user;
      const sheets = await SheetService.getSheets({
        actor,
        sheetType,
        carrera,
        estado,
        search,
        onlyMine: onlyMine === 'true' || onlyMine === true
      });
      return res.status(200).json({
        success: true,
        data: sheets
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSheetById(req, res, next) {
    try {
      const { id } = req.params;
      const actor = req.user;
      const sheet = await SheetService.getSheetById(id, actor);
      return res.status(200).json({
        success: true,
        data: sheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSheet(req, res, next) {
    try {
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const sheet = await SheetService.createSheet(req.body, actor);
      return res.status(201).json({
        success: true,
        data: sheet
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSheet(req, res, next) {
    try {
      const { id } = req.params;
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const updated = await SheetService.updateSheet(id, req.body, actor);
      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const updated = await SheetService.updateStatus(id, req.body, actor);
      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSheet(req, res, next) {
    try {
      const { id } = req.params;
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const result = await SheetService.deleteSheet(id, actor);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SheetController;
