const { getAuditLogs } = require('../services/auditService');

class AuditController {
  static async getLogs(req, res, next) {
    try {
      const { page, limit, userId, actionType, entity, startDate, endDate } = req.query;
      const logs = await getAuditLogs({ page, limit, userId, actionType, entity, startDate, endDate });

      return res.status(200).json({
        success: true,
        data: logs
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuditController;
