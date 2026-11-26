const { validationResult } = require('express-validator');

/**
 * Middleware para capturar y responder ante errores de validación de express-validator
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación en los parámetros de la solicitud.',
      errors: errors.array().map(err => ({
        campo: err.path || err.param,
        mensaje: err.msg,
        valor_recibido: err.value
      }))
    });
  }
  next();
}

module.exports = validateRequest;
