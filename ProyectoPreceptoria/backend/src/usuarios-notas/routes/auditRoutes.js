const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/checkPermission');

router.use(authMiddleware);

// Historial inmutable: Solo lectura protegida por permisos
router.get('/', checkPermission('AUDIT_VIEW'), AuditController.getLogs);

module.exports = router;
