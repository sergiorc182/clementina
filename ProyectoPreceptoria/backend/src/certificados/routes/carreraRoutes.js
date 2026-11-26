const express = require('express');
const router = express.Router();
const CarreraController = require('../controllers/carreraController');

// GET /api/carreras
router.get('/', CarreraController.listar);

// GET /api/carreras/:id/plan
router.get('/:id/plan', CarreraController.obtenerPlan);

module.exports = router;
