'use strict';

const config = require('../config');
const { pool } = require('../db');

const VALID_ROLES = ['student', 'teacher', 'admin'];

function bootstrapRole(username) {
  return config.adminUsernames.indexOf(String(username || '')) >= 0 ? 'admin' : 'student';
}

async function getUserRole(userId, username) {
  if (bootstrapRole(username) === 'admin') {
    await pool.query(
      'INSERT INTO user_roles (user_id, role, updated_at) VALUES (?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE role = VALUES(role), updated_at = VALUES(updated_at)',
      [userId, 'admin', new Date().toISOString().slice(0, 19).replace('T', ' ')]
    );
    return 'admin';
  }
  const [rows] = await pool.query('SELECT role FROM user_roles WHERE user_id = ? LIMIT 1', [userId]);
  if (rows.length && VALID_ROLES.indexOf(rows[0].role) >= 0) return rows[0].role;
  const role = bootstrapRole(username);
  await pool.query(
    'INSERT INTO user_roles (user_id, role, updated_at) VALUES (?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE role = role',
    [userId, role, new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
  return role;
}

async function setUserRole(userId, role) {
  if (VALID_ROLES.indexOf(role) < 0) throw new Error('无效角色');
  await pool.query(
    'INSERT INTO user_roles (user_id, role, updated_at) VALUES (?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE role = VALUES(role), updated_at = VALUES(updated_at)',
    [userId, role, new Date().toISOString().slice(0, 19).replace('T', ' ')]
  );
}

module.exports = { VALID_ROLES, getUserRole, setUserRole };
