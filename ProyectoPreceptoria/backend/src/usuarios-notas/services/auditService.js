const { queryAll, queryOne, run } = require('../database/db');

function parseJsonField(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Servicio de Auditoría Inmutable sobre MySQL (clementina).
 * Registra cada acción relevante de forma no modificable.
 */
class AuditService {
  static async logAction({
    userId = null,
    userEmail = null,
    userName = null,
    actionType,
    entity,
    entityId = null,
    previousValues = null,
    newValues = null,
    ipAddress = '127.0.0.1'
  }) {
    try {
      const prevStr = previousValues ? JSON.stringify(previousValues) : null;
      const newStr = newValues ? JSON.stringify(newValues) : null;

      await run(`
        INSERT INTO audit_logs (
          user_id, user_email, user_name, action_type, entity, entity_id,
          previous_values, new_values, ip_address
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        userEmail,
        userName,
        actionType,
        entity,
        entityId ? String(entityId) : null,
        prevStr,
        newStr,
        ipAddress
      ]);
    } catch (err) {
      console.error('Error al registrar auditoría:', err.message);
    }
  }

  static async getAuditLogs(filters = {}) {
    const {
      page = 1,
      limit = 50,
      userId,
      actionType,
      entity,
      startDate,
      endDate
    } = filters;

    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (actionType) {
      conditions.push('action_type = ?');
      params.push(actionType);
    }
    if (entity) {
      conditions.push('entity = ?');
      params.push(entity);
    }
    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await queryOne(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params);
    const total = countRow ? Number(countRow.total) : 0;

    const offset = (Number(page) - 1) * Number(limit);
    const logs = await queryAll(`
      SELECT id, user_id, user_email, user_name, action_type, entity, entity_id,
             previous_values, new_values, ip_address, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const formattedLogs = logs.map(log => ({
      ...log,
      previous_values: parseJsonField(log.previous_values),
      new_values: parseJsonField(log.new_values)
    }));

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      data: formattedLogs
    };
  }
}

module.exports = {
  AuditService,
  logAction: AuditService.logAction.bind(AuditService),
  getAuditLogs: AuditService.getAuditLogs.bind(AuditService)
};
