const express = require('express');
const router = express.Router();

const inscripcionRoutes = require('./inscripcionRoutes');
const estudianteRoutes = require('./estudianteRoutes');
const reporteRoutes = require('./reporteRoutes');
const documentoRoutes = require('./documentoRoutes');
const catalogoRoutes = require('./catalogoRoutes');

// Rutas agrupadas bajo /api
router.use('/inscripciones-materias', inscripcionRoutes);
router.use('/estudiantes', estudianteRoutes);
router.use('/reportes', reporteRoutes);
router.use('/documentos', documentoRoutes);
router.use('/catalogos', catalogoRoutes);

module.exports = router;
