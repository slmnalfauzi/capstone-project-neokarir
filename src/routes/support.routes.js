const express = require('express');
const SupportController = require('../controllers/support.controller');
const { validateBody } = require('../middlewares/validation.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post(
  '/contact',
  requireAuth,
  validateBody(['name', 'email', 'category', 'message']),
  SupportController.contactSupport
);

module.exports = router;
