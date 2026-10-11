'use strict';

const router = require('express').Router();
const { requireRole } = require('../middleware/roles');
const controller = require('../controllers/teachingController');

router.use(requireRole('teacher', 'admin'));
router.get('/students', controller.listStudents);
router.get('/students/:id', controller.studentDetail);
router.get('/stats', controller.stats);

module.exports = router;
