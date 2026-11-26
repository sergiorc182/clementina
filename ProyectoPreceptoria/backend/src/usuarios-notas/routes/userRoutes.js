const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/checkPermission');

router.use(authMiddleware);

router.get('/', checkPermission('USERS_VIEW'), UserController.getUsers);
router.get('/:id', checkPermission('USERS_VIEW'), UserController.getUserById);
router.post('/', checkPermission('USERS_CREATE'), UserController.createUser);
router.put('/:id', checkPermission('USERS_EDIT'), UserController.updateUser);
router.patch('/:id/status', checkPermission('USERS_DEACTIVATE'), UserController.toggleStatus);

module.exports = router;
