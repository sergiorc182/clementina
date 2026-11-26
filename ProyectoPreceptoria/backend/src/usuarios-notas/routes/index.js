const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const roleRoutes = require('./roleRoutes');
const auditRoutes = require('./auditRoutes');
const academicRoutes = require('./academicRoutes');
const AcademicController = require('../controllers/academicController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/checkPermission');

// Montar recursos bajo /api/v1 (Módulo C — Usuarios y Validación de Notas)
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/usuarios', userRoutes); // Alias según contrato de REQUERIMIENTOS_MODULOS.txt
router.use('/roles', roleRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/academic', academicRoutes);

// Contrato directo de REQUERIMIENTOS_MODULOS.txt: PATCH /api/v1/resultados/:id/validacion
router.patch(
  '/resultados/:id/validacion',
  authMiddleware,
  checkPermission(['GRADES_RECALCULATE', 'EXAMS_EDIT', 'USERS_EDIT']),
  AcademicController.validateGrade
);

// Endpoint de salud del módulo
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Modulo C - Usuarios y Validacion de Notas (MySQL clementina)',
    version: '2.0.0'
  });
});

module.exports = router;
