const AuthService = require('../services/authService');

/**
 * Middleware para validar el token JWT y adjuntar la sesión del usuario en req.user.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Encabezado de autorización ausente o con formato incorrecto (se espera Bearer <token>).'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = await AuthService.verifyToken(token);

    // Adjuntar usuario autenticado a la petición
    req.user = decoded;
    req.ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error.message || 'Token de acceso no válido o expirado.'
      }
    });
  }
}

module.exports = authMiddleware;
