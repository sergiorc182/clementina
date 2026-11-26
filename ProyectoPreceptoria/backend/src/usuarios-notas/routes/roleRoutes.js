const express = require('express');
const router = express.Router();
const RoleController = require('../controllers/roleController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/checkPermission');

router.use(authMiddleware);

router.get('/', checkPermission('ROLES_VIEW'), RoleController.getRoles);
router.get('/permissions', checkPermission('ROLES_VIEW'), RoleController.getPermissions);
router.put('/:id/permissions', checkPermission('ROLES_MANAGE'), RoleController.updateRolePermissions);

module.exports = router;
