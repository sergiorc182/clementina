const express = require('express');
const router = express.Router();
const AlumnoController = require('../controllers/alumnoController');

// GET /api/alumnos?q=termino
router.get('/', AlumnoController.buscar);

// GET /api/alumnos/:id
router.get('/:id', AlumnoController.obtenerPorId);

module.exports = router;
