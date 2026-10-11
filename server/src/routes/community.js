'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/communityController');

const router = express.Router();

// 发帖 / 评论 / 上传做一层限流，防刷
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '操作过于频繁，请稍后再试' }
});

// 帖子
router.get('/posts', ctrl.listPosts);
router.post('/posts', writeLimiter, ctrl.createPost);
router.get('/posts/:id', ctrl.getPost);
router.delete('/posts/:id', ctrl.deletePost);
router.post('/posts/:id/like', writeLimiter, ctrl.toggleLike);
router.post('/posts/:id/comments', writeLimiter, ctrl.addComment);

// 附件上传（base64 JSON，避免额外依赖）
router.post('/upload', writeLimiter, ctrl.uploadAttachment);

// 侧栏
router.get('/topics', ctrl.listTopics);
router.get('/active-users', ctrl.activeUsers);

// 每日挑战
router.get('/daily-challenge', ctrl.getDailyChallenge);
router.post('/daily-challenge/regenerate', writeLimiter, ctrl.regenerateDailyChallenge);

module.exports = router;
