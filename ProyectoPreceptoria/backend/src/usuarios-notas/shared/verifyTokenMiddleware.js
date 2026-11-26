/**
 * =========================================================================================
 * ARCHIVO COMPARTIDO PARA LOS OTROS 4 MÓDULOS DEL PROYECTO INSTITUCIONAL
 * =========================================================================================
 * 
 * Instrucciones de uso para los otros equipos/módulos:
 * 
 * 1. Asegúrate de configurar la misma variable de entorno en tu archivo .env:
 *    JWT_SECRET=institucion_educativa_secreto_jwt_compartido_seguro_2026
 * 
 * 2. Instala 'jsonwebtoken' en tu módulo si aún no lo tienes:
 *    npm install jsonwebtoken
 * 
 * 3. Importa y utiliza este middleware en tus rutas Express protegidas:
 * 
 *    const { verifySharedAuth, requirePermission } = require('./verifyTokenMiddleware');
 * 
 *    // Proteger todas las rutas o una en específico:
 *    router.get('/mis-recursos', verifySharedAuth, (req, res) => {
 *        // req.user contiene: { id, email, firstName, lastName, role, permissions }
 *        res.json({ mensaje: `Hola ${req.user.firstName}, tu rol es ${req.user.role}` });
 *    });
 * 
 *    // Requerir un permiso específico:
 *    router.post('/crear', verifySharedAuth, requirePermission('RECURSO_CREATE'), (req, res) => { ... });
 * =========================================================================================
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'institucion_educativa_secreto_jwt_compartido_seguro_2026';

/**
 * Valida el token JWT enviado en el header Authorization: Bearer <token>
 */
function verifySharedAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Acceso no autorizado: Token Bearer ausente o inválido.'
      }
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error.name === 'TokenExpiredError'
          ? 'El token de sesión ha expirado. Inicie sesión nuevamente.'
          : 'Token de sesión inválido o adulterado.'
      }
    });
  }
}

/**
 * Comprueba si el usuario autenticado tiene el permiso requerido
 * @param {string} permissionCode 
 */
function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { message: 'No autenticado.' } });
    }
    if (req.user.role === 'ADMINISTRADOR') {
      return next();
    }
    const perms = req.user.permissions || [];
    if (!perms.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Acceso denegado: Se requiere el permiso ${permissionCode}.`
        }
      });
    }
    next();
  };
}

module.exports = {
  verifySharedAuth,
  requirePermission
};
