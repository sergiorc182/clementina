const express = require('express');
const router = express.Router();
const CargaHorariaController = require('../controllers/CargaHorariaController');
const { validarCargaHoraria } = require('../validators/cargaHorariaValidator');
const validateRequest = require('../middlewares/validateRequest');

// GET /estudiantes/:id/carga-horaria (Endpoint oficial del Módulo E)
router.get(
  '/:id/carga-horaria',
  validarCargaHoraria,
  validateRequest,
  CargaHorariaController.verificarCarga
);

module.exports = router;
