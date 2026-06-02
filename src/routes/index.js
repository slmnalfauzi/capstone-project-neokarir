const express = require('express');

const authRoutes = require('./auth.routes');
const chatRoutes = require('./chat.routes');
const cvRoutes = require('./cv.routes');
const jobmatchRoutes = require('./jobmatch.routes');
const marketRoutes = require('./market.routes');
const profileRoutes = require('./profile.routes');
const recommendationRoutes = require('./recommendation.routes');
const skillgapRoutes = require('./skillgap.routes');
const supportRoutes = require('./support.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/cv', cvRoutes);
router.use('/recommendation', recommendationRoutes);
router.use('/jobmatch', jobmatchRoutes);
router.use('/skillgap', skillgapRoutes);
router.use('/chat', chatRoutes);
router.use('/market', marketRoutes);
router.use('/support', supportRoutes);

module.exports = router;