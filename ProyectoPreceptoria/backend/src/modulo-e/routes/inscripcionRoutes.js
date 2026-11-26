const express = require('express');
const router = express.Router();
const InscripcionController = require('../controllers/InscripcionController');
const { validarInscripcion } = require('../validators/inscripcionValidator');
const validateRequest = require('../middlewares/validateRequest');

// POST /inscripciones-materias (Endpoint oficial del Módulo E)
router.post(
  '/',
  validarInscripcion,
  validateRequest,
  InscripcionController.inscribir
);

// Consulta auxiliar de estado de matrícula de un alumno
router.get(
  '/alumno/:idAlumno/carrera/:idCarrera',
  InscripcionController.consultarInscripcion
);

module.exports = router;
