const { query } = require('express-validator');

const validarReporte = [
  query('carrera')
    .optional()
    .isInt({ min: 1 }).withMessage('El parámetro carrera debe ser un ID numérico.'),

  query('anio')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('El parámetro anio de cursada debe estar entre 1 y 5.'),

  query('ciclo_lectivo')
    .optional()
    .isInt({ min: 2000, max: 2100 }).withMessage('ciclo_lectivo debe ser un año válido.'),

  query('situacion')
    .optional()
    .isIn(['libre', 'regular', 'recursante', 'atraso', 'Libre', 'Regular', 'Recursante', 'Atraso'])
    .withMessage('situacion debe ser: regular, libre, recursante o atraso.')
];

module.exports = {
  validarReporte
};
