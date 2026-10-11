'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { pool } = require('../db');
const { getUserRole, setUserRole } = require('../services/roles');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, nickname: user.nickname || user.username, role: user.role || 'student' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function setTokenCookie(res, token) {
  const opts = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure, // 由 .env COOKIE_SECURE 控制（HTTPS 部署时设 1）
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  };
  res.cookie(config.cookieName, token, opts);
}

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  try {
    const { username, email, password, nickname } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱、密码均为必填' });
    }
    if (!/^[A-Za-z0-9_一-龥]{2,40}$/.test(username)) {
      return res.status(400).json({ error: '用户名需为 2-40 位字母/数字/下划线/中文' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: '密码至少 6 位' });
    }

    const [exist] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );
    if (exist.length > 0) {
      return res.status(409).json({ error: '用户名或邮箱已被注册' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, nickname, created_at, last_login) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, hash, nickname || username, nowStr(), nowStr()]
    );
    const userId = result.insertId;

    const role = config.adminUsernames.indexOf(username) >= 0 ? 'admin' : 'student';
    await setUserRole(userId, role);
    const user = { id: userId, username, nickname: nickname || username, role };
    const token = signToken(user);
    setTokenCookie(res, token);
    return res.json({ user: { id: userId, username, nickname: nickname || username, email, role } });
  } catch (e) {
    console.error('[auth] register error:', e);
    return res.status(500).json({ error: '注册失败，请稍后重试' });
  }
}

async function login(req, res) {
  try {
    const { account, password } = req.body || {};
    if (!account || !password) {
      return res.status(400).json({ error: '请输入账号（用户名或邮箱）与密码' });
    }
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
      [account, account]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: '账号或密码错误' });
    }
    await pool.query('UPDATE users SET last_login = ? WHERE id = ?', [nowStr(), user.id]);

    user.role = await getUserRole(user.id, user.username);
    const token = signToken(user);
    setTokenCookie(res, token);
    return res.json({
      user: { id: user.id, username: user.username, nickname: user.nickname || user.username, email: user.email, role: user.role }
    });
  } catch (e) {
    console.error('[auth] login error:', e);
    return res.status(500).json({ error: '登录失败，请稍后重试' });
  }
}

function logout(req, res) {
  res.clearCookie(config.cookieName, { path: '/', secure: config.cookieSecure });
  return res.json({ ok: true });
}

async function me(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, nickname FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(401).json({ error: '用户不存在' });
    const u = rows[0];
    u.role = await getUserRole(u.id, u.username);
    return res.json({ user: { id: u.id, username: u.username, nickname: u.nickname || u.username, email: u.email, role: u.role } });
  } catch (e) {
    console.error('[auth] me error:', e);
    return res.status(500).json({ error: '获取用户信息失败' });
  }
}

async function updateProfile(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  try {
    const { nickname, email } = req.body || {};
    const sets = [];
    const params = [];
    if (nickname !== undefined) {
      if (!/^.{1,60}$/.test(nickname)) return res.status(400).json({ error: '昵称长度 1-60' });
      sets.push('nickname = ?');
      params.push(nickname);
    }
    if (email !== undefined) {
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: '邮箱格式不正确' });
      sets.push('email = ?');
      params.push(email);
    }
    if (sets.length === 0) return res.status(400).json({ error: '没有需要更新的字段' });

    // 检查邮箱是否与他人冲突
    if (email !== undefined) {
      const [dup] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, req.user.id]);
      if (dup.length > 0) return res.status(409).json({ error: '该邮箱已被其他账号使用' });
    }

    params.push(req.user.id);
    await pool.query('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', params);

    const [rows] = await pool.query('SELECT id, username, email, nickname FROM users WHERE id = ?', [req.user.id]);
    const u = rows[0];
    u.role = await getUserRole(u.id, u.username);
    // 重新签发 token 以同步 nickname
    const token = signToken(u);
    setTokenCookie(res, token);
    return res.json({ user: { id: u.id, username: u.username, nickname: u.nickname || u.username, email: u.email, role: u.role } });
  } catch (e) {
    console.error('[auth] updateProfile error:', e);
    return res.status(500).json({ error: '更新失败' });
  }
}

async function changePassword(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: '请填写原密码与新密码' });
    if (String(newPassword).length < 6) return res.status(400).json({ error: '新密码至少 6 位' });

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(401).json({ error: '用户不存在' });
    const ok = await bcrypt.compare(String(oldPassword), rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: '原密码错误' });

    const hash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[auth] changePassword error:', e);
    return res.status(500).json({ error: '修改密码失败' });
  }
}

// 校验当前密码（用于改密码第一步，不修改数据库）
async function verifyPassword(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: '请输入当前密码' });
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(401).json({ error: '用户不存在' });
    const ok = await bcrypt.compare(String(password), rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: '密码错误' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[auth] verifyPassword error:', e);
    return res.status(500).json({ error: '校验失败' });
  }
}

async function deleteAccount(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  try {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: '请输入密码确认注销' });
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: '用户不存在' });
    const ok = await bcrypt.compare(String(password), rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: '密码错误' });
    // 先删关联数据，再删用户（避免外键/残留）
    await pool.query('DELETE FROM user_achievements WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM user_scores WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM user_studied WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM user_stats WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM user_data WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM learning_events WHERE user_id = ?', [req.user.id]);
    await pool.query('DELETE FROM user_roles WHERE user_id = ?', [req.user.id]);

    // 社区：先清理本人帖子（连同其评论/点赞），再清理本人在他人帖子下的评论与点赞，
    // 同时把他人帖子上的点赞数、评论数扣回，避免出现「幽灵计数」
    const [myPosts] = await pool.query('SELECT id FROM community_posts WHERE user_id = ?', [req.user.id]);
    const myPostIds = myPosts.map(function (r) { return r.id; });
    if (myPostIds.length) {
      await pool.query('DELETE FROM community_comments WHERE post_id IN (?)', [myPostIds]);
      await pool.query('DELETE FROM community_likes WHERE post_id IN (?)', [myPostIds]);
      await pool.query('DELETE FROM community_posts WHERE id IN (?)', [myPostIds]);
    }
    await pool.query(
      'UPDATE community_posts p JOIN community_likes l ON l.post_id = p.id ' +
      'SET p.likes = GREATEST(p.likes - 1, 0) WHERE l.user_id = ?', [req.user.id]
    );
    await pool.query('DELETE FROM community_likes WHERE user_id = ?', [req.user.id]);
    await pool.query(
      'UPDATE community_posts p JOIN (SELECT post_id, COUNT(*) AS c FROM community_comments WHERE user_id = ? GROUP BY post_id) t ' +
      'ON t.post_id = p.id SET p.comment_count = GREATEST(p.comment_count - t.c, 0)', [req.user.id]
    );
    await pool.query('DELETE FROM community_comments WHERE user_id = ?', [req.user.id]);

    await pool.query('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.clearCookie(config.cookieName, { path: '/', secure: config.cookieSecure });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[auth] deleteAccount error:', e);
    return res.status(500).json({ error: '注销失败，请稍后重试' });
  }
}

module.exports = { register, login, logout, me, updateProfile, changePassword, verifyPassword, deleteAccount };
