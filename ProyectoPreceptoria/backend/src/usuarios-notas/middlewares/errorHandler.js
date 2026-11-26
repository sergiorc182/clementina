const config = require('../config/env');

/**
 * Middleware centralizado de manejo de errores de la API REST.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor.';

  if (statusCode === 500) {
    console.error('--- ERROR NO CONTROLADO EN EL SERVIDOR ---');
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR'),
      message: message,
      ...(config.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {})
    }
  });
}

module.exports = errorHandler;
