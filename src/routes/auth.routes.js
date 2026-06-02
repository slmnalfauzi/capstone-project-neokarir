const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { validateBody } = require('../middlewares/validation.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { rateLimit } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.post('/register', rateLimit({ windowMs: 60_000, max: 30 }), validateBody(['email', 'password']), AuthController.register);
router.post('/login', rateLimit({ windowMs: 60_000, max: 60 }), validateBody(['email', 'password']), AuthController.login);
router.post('/forgot-password', rateLimit({ windowMs: 60_000, max: 10 }), validateBody(['email']), AuthController.forgotPassword);
router.post('/change-password', requireAuth, validateBody(['currentPassword', 'newPassword']), AuthController.changePassword);
router.delete('/me', requireAuth, validateBody(['password']), AuthController.deleteAccount);
router.get('/me', requireAuth, AuthController.me);

module.exports = router;
