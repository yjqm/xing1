'use strict';

const router = require('express').Router();
const { requireRole } = require('../middleware/roles');
const controller = require('../controllers/teachingController');

router.use(requireRole('admin'));
router.get('/users', controller.listUsers);
router.get('/stats', controller.stats);
router.get('/students', controller.listStudents);
router.post('/set-role', controller.changeRole);

module.exports = router;
