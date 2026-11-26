const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rutas Públicas
router.post('/login', AuthController.login);
router.post('/legacy-session', AuthController.legacySession);
router.get('/verify-token', AuthController.verifyTokenEndpoint);

// Rutas Autenticadas
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.getMe);

module.exports = router;
