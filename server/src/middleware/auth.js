'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 从 httpOnly Cookie 中解析 JWT，注入 req.user = { id, username, nickname }。
 * 失败时不抛错，仅令 req.user 为 null，由具体接口决定是否要求登录。
 */
function attachUser(req, res, next) {
  const token = req.cookies && req.cookies[config.cookieName];
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      req.user = { id: payload.sub, username: payload.username, nickname: payload.nickname, role: payload.role || 'student' };
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/**
 * 保护接口：未登录返回 401。
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '未登录或登录已过期' });
  }
  next();
}

module.exports = { attachUser, requireAuth };
