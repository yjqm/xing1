'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', ctrl.me);
router.put('/profile', requireAuth, ctrl.updateProfile);
router.post('/password', requireAuth, ctrl.changePassword);
router.post('/password/verify', requireAuth, ctrl.verifyPassword);
router.post('/account/delete', requireAuth, ctrl.deleteAccount);

module.exports = router;
