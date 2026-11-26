const express = require('express');
const router = express.Router();
const CatalogoController = require('../controllers/CatalogoController');

router.get('/carreras', CatalogoController.listarCarreras);
router.post('/carreras', CatalogoController.guardarCarrera);
router.delete('/carreras/:idCarrera', CatalogoController.eliminarCarrera);

router.get('/alumnos', CatalogoController.listarAlumnos);
router.get('/alumnos/:idAlumno', CatalogoController.obtenerAlumnoPorId);

router.get('/carreras/:idCarrera/materias', CatalogoController.materiasCarrera);
router.post('/carreras/:idCarrera/materias', CatalogoController.guardarMateria);
router.delete('/carreras/:idCarrera/materias/:idMateria', CatalogoController.eliminarMateria);

// Gestión de horarios (Preceptoría)
router.post('/horarios', CatalogoController.guardarHorario);
router.delete('/horarios/:idHorario', CatalogoController.eliminarHorario);

module.exports = router;
