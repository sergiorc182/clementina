const express = require('express');
const router = express.Router();
const DocumentoController = require('../controllers/DocumentoController');

// GET /documentos/formulario-matriculacion/:idAlumno/:idCarrera
router.get(
  '/formulario-matriculacion/:idAlumno/:idCarrera',
  DocumentoController.descargarFormularioMatriculacion
);

// GET /documentos/planilla-asistencia/:idCarrera/:idMateria
router.get(
  '/planilla-asistencia/:idCarrera/:idMateria',
  DocumentoController.descargarPlanillaAsistencia
);

module.exports = router;
