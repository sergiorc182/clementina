/**
 * Middleware central de manejo de errores
 */
function errorHandler(err, req, res, next) {
  console.error('[Error Handler]:', err.message || err);

  const status = err.status || 500;
  const response = {
    success: false,
    message: err.message || 'Error interno del servidor'
  };

  if (err.codigo) {
    response.codigo = err.codigo;
  }

  if (err.bloqueos) {
    response.bloqueos = err.bloqueos;
  }

  if (err.detalleCarga) {
    response.detalleCarga = err.detalleCarga;
  }

  if (process.env.NODE_ENV === 'development' && status === 500) {
    response.stack = err.stack;
  }

  return res.status(status).json(response);
}

module.exports = errorHandler;
