const UserService = require('../services/userService');

class UserController {
  static async getUsers(req, res, next) {
    try {
      const { page, limit, search, roleId, isActive } = req.query;
      const result = await UserService.getUsers({ page, limit, search, roleId, isActive });
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req, res, next) {
    try {
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const user = await UserService.createUser(req.body, actor);
      return res.status(201).json({
        success: true,
        data: user,
        message: 'Usuario registrado exitosamente.'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const user = await UserService.updateUser(req.params.id, req.body, actor);
      return res.status(200).json({
        success: true,
        data: user,
        message: 'Usuario actualizado exitosamente.'
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      const actor = {
        ...req.user,
        ipAddress: req.ip || req.connection?.remoteAddress || '127.0.0.1'
      };
      const user = await UserService.toggleUserStatus(req.params.id, isActive, actor);
      return res.status(200).json({
        success: true,
        data: user,
        message: `Usuario ${isActive ? 'activado' : 'desactivado'} correctamente.`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
