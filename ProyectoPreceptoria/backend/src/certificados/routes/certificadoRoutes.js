const express = require('express');
const router = express.Router();
const CertificadoController = require('../controllers/certificadoController');

// GET /api/certificados/porcentaje/:alumnoId/:carreraId
router.get('/porcentaje/:alumnoId/:carreraId', CertificadoController.obtenerPorcentajeAprobadas);

// GET /api/certificados/constancia/:alumnoId/:carreraId
router.get('/constancia/:alumnoId/:carreraId', CertificadoController.generarConstancia);

// PUT /api/certificados/historial/:alumnoId/:carreraId/:materiaId (actualizar tipo de examen y equivalencia)
router.put('/historial/:alumnoId/:carreraId/:materiaId', CertificadoController.actualizarCondicionMateria);

// POST /api/certificados/historial (registrar aprobación de materia)
router.post('/historial', CertificadoController.registrarAprobacionMateria);

module.exports = router;
