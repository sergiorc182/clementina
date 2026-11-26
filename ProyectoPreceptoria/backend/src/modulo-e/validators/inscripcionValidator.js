const { body } = require('express-validator');

const validarInscripcion = [
  body('id_alumno')
    .notEmpty().withMessage('El ID de alumno es obligatorio.')
    .isInt({ min: 1 }).withMessage('El ID de alumno debe ser un entero positivo.'),

  body('id_carrera')
    .notEmpty().withMessage('El ID de carrera es obligatorio.')
    .isInt({ min: 1 }).withMessage('El ID de carrera debe ser un entero positivo.'),

  body('id_turno')
    .notEmpty().withMessage('El ID de turno es obligatorio.')
    .isInt({ min: 1 }).withMessage('El ID de turno debe ser un entero positivo.'),

  body('id_sede')
    .notEmpty().withMessage('El ID de sede es obligatorio.')
    .isInt({ min: 1 }).withMessage('El ID de sede debe ser un entero positivo.'),

  body('materias')
    .isArray({ min: 1 }).withMessage('Debe enviar una lista de materias con al menos un elemento.'),

  body('materias.*.id_materia')
    .notEmpty().withMessage('Cada materia debe tener su id_materia.')
    .isInt({ min: 1 }).withMessage('id_materia debe ser un entero positivo.'),

  body('materias.*.tipo_asistencia')
    .optional()
    .isIn(['1', '2', '3', 'Presencial', 'Libre', 'Vocacional'])
    .withMessage('tipo_asistencia inválido (Valores válidos: 1=Presencial, 2=Libre, 3=Vocacional).'),

  body('ciclo_lectivo')
    .optional()
    .isInt({ min: 2000, max: 2100 })
    .withMessage('ciclo_lectivo debe ser un año válido (ej. 2026).')
];

module.exports = {
  validarInscripcion
};
