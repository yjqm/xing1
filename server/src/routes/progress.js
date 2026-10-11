'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/progressController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.getProgress);
router.post('/sync', requireAuth, ctrl.syncProgress);

module.exports = router;
