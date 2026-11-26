const express = require('express');
const router = express.Router();
const ReporteController = require('../controllers/ReporteController');
const { validarReporte } = require('../validators/reporteValidator');
const validateRequest = require('../middlewares/validateRequest');

// GET /reportes/inscripciones (Endpoint oficial del Módulo E)
router.get(
  '/inscripciones',
  validarReporte,
  validateRequest,
  ReporteController.obtenerReporte
);

module.exports = router;
