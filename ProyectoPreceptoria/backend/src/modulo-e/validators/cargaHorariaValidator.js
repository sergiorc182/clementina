const { param, query } = require('express-validator');

const validarCargaHoraria = [
  param('id')
    .notEmpty().withMessage('El ID de estudiante es obligatorio.')
    .isInt({ min: 1 }).withMessage('El ID de estudiante debe ser un entero positivo.'),

  query('idCarrera')
    .optional()
    .isInt({ min: 1 }).withMessage('idCarrera debe ser un entero positivo si se especifica.')
];

module.exports = {
  validarCargaHoraria
};
