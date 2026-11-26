const express = require('express');
const router = express.Router();
const PersonalController = require('../controllers/personalController');

// GET /api/personal
router.get('/', PersonalController.listar);

// GET /api/personal/preceptores
router.get('/preceptores', PersonalController.listarPreceptores);

module.exports = router;
