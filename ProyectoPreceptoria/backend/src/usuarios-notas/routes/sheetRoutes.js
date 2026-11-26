const express = require('express');
const router = express.Router();
const SheetController = require('../controllers/sheetController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Carreras y materias oficiales
router.get('/careers', SheetController.getCareers);
router.get('/subjects', SheetController.getSubjects);

// Listado y consulta por ID
router.get('/', SheetController.getSheets);
router.get('/:id', SheetController.getSheetById);

// Creación y edición (con RLS en el servicio)
router.post('/', SheetController.createSheet);
router.put('/:id', SheetController.updateSheet);

// Cambio de estado del semáforo (Solo Administrador)
router.patch('/:id/status', SheetController.updateStatus);

// Eliminación
router.delete('/:id', SheetController.deleteSheet);

module.exports = router;

