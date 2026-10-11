'use strict';

const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/aiController');

router.post('/chat', requireAuth, controller.chat);

module.exports = router;
