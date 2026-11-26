const express = require('express');
const router = express.Router();
const AcademicController = require('../controllers/academicController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/checkPermission');

router.use(authMiddleware);

// Consulta de calificaciones y semáforo oficial de validación desde historial_academico (MySQL)
router.get('/records', checkPermission('GRADES_VIEW'), AcademicController.getAcademicRecords);
router.get('/careers', checkPermission('GRADES_VIEW'), AcademicController.getCareers);
router.get('/subjects', checkPermission('GRADES_VIEW'), AcademicController.getSubjects);
router.get('/students', checkPermission('GRADES_VIEW'), AcademicController.getStudents);

// Validación de nota (Semáforo Verde / Naranja / Rojo) y corrección de Tipo de Examen (Promoción / Regular / Libre / Equivalencia)
router.patch('/validacion', checkPermission(['GRADES_RECALCULATE', 'EXAMS_EDIT', 'USERS_EDIT']), AcademicController.validateGrade);
router.patch('/resultados/:id/validacion', checkPermission(['GRADES_RECALCULATE', 'EXAMS_EDIT', 'USERS_EDIT']), AcademicController.validateGrade);

module.exports = router;
