const AuthService = require('../services/authService');
const LegacySessionService = require('../services/legacySessionService');

class AuthController {
  static async login(req, res, next) {
    try {
      const { identifier, email, password } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const result = await AuthService.login(identifier ?? email, password, ipAddress);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async legacySession(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const result = await LegacySessionService.establish(req, ipAddress);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      const result = await AuthService.logout(req.user, ipAddress);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endpoint público de verificación para los otros 4 módulos del sistema.
   */
  static async verifyTokenEndpoint(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.query.token;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: { code: 'TOKEN_REQUIRED', message: 'Debe proveer un token para verificar.' }
        });
      }

      const decoded = await AuthService.verifyToken(token);
      return res.status(200).json({
        success: true,
        data: {
          valid: true,
          user: decoded
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
