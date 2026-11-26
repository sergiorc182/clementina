const { queryAll, queryOne, run, transaction } = require('../database/db');
const { logAction } = require('./auditService');

class RoleService {
  /**
   * Obtiene todos los roles con sus permisos asignados desde MySQL.
   */
  static async getRoles() {
    const roles = await queryAll('SELECT * FROM roles ORDER BY id ASC');

    const enriched = await Promise.all(
      roles.map(async (role) => {
        const perms = await queryAll(`
          SELECT p.id, p.code, p.name, p.description, p.module
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = ?
          ORDER BY p.module, p.code
        `, [role.id]);

        return {
          ...role,
          permissions: perms
        };
      })
    );

    return enriched;
  }

  /**
   * Obtiene todos los permisos disponibles agrupados por módulo.
   */
  static async getAllPermissions() {
    return await queryAll('SELECT * FROM permissions ORDER BY module ASC, code ASC');
  }

  /**
   * Asigna permisos a un rol y audita el cambio.
   */
  static async updateRolePermissions(roleId, permissionIds = [], actor) {
    const role = await queryOne('SELECT * FROM roles WHERE id = ?', [roleId]);
    if (!role) {
      const err = new Error('Rol no encontrado.');
      err.statusCode = 404;
      throw err;
    }

    if (role.name === 'ADMINISTRADOR' && permissionIds.length === 0) {
      const err = new Error('No es posible despojar de todos los permisos al rol Administrador.');
      err.statusCode = 400;
      throw err;
    }

    const prevPermissions = await queryAll(`
      SELECT p.id, p.code FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
    `, [roleId]);

    await transaction(async () => {
      await run('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);

      for (const pId of permissionIds) {
        await run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, pId]);
      }

      await logAction({
        userId: actor.id,
        userEmail: actor.email,
        userName: `${actor.firstName || ''} ${actor.lastName || ''}`.trim(),
        actionType: 'ROLE_PERMISSIONS_UPDATED',
        entity: 'roles',
        entityId: String(roleId),
        previousValues: { role: role.name, permissions: prevPermissions.map(p => p.code) },
        newValues: { role: role.name, permissionIds },
        ipAddress: actor.ipAddress || '127.0.0.1'
      });
    });

    const roles = await this.getRoles();
    return roles.find(r => Number(r.id) === Number(roleId));
  }
}

module.exports = RoleService;
