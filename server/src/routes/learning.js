'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/learningController');

router.post('/event', requireAuth, controller.addEvent);
router.get('/me', requireAuth, controller.me);

module.exports = router;
