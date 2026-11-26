/**
 * Middleware para autorización basada en roles y permisos (RBAC).
 * Verifica que el usuario autenticado posea el permiso requerido.
 * @param {string|string[]} requiredPermissions
 */
function checkPermission(requiredPermissions) {
  const permList = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Debe iniciar sesión para realizar esta operación.'
        }
      });
    }

    // Administrador cuenta con bypass total de permisos
    if (req.user.role === 'ADMINISTRADOR') {
      return next();
    }

    const userPerms = req.user.permissions || [];
    const hasPermission = permList.some(p => userPerms.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permisos insuficientes. Requiere: ${permList.join(' o ')}. Su rol actual (${req.user.role}) no tiene autorización para esta acción.`
        }
      });
    }

    next();
  };
}

module.exports = checkPermission;
