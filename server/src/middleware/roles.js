'use strict';

const { getUserRole } = require('../services/roles');

function requireRole() {
  const allowed = Array.prototype.slice.call(arguments);
  return async function roleGuard(req, res, next) {
    if (!req.user) return res.status(401).json({ error: '未登录或登录已过期' });
    try {
      const role = await getUserRole(req.user.id, req.user.username);
      if (allowed.indexOf(role) < 0) return res.status(403).json({ error: '没有访问权限' });
      req.user.role = role;
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { requireRole };
