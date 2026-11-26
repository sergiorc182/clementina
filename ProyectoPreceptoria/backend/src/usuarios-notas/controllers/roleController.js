const RoleService = require('../services/roleService');

class RoleController {
  static async getRoles(req, res, next) {
    try {
      const roles = await RoleService.getRoles();
      return res.status(200).json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPermissions(req, res, next) {
    try {
      const perms = await RoleService.getAllPermissions();
      return res.status(200).json({
        success: true,
        data: perms
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRolePermissions(req, res, next) {
    try {
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const { permissionIds } = req.body;
      const updated = await RoleService.updateRolePermissions(req.params.id, permissionIds, actor);
      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Permisos del rol actualizados exitosamente.'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoleController;
