'use strict';

const { pool } = require('../db');
const { VALID_ROLES, setUserRole } = require('../services/roles');

async function listStudents(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT u.id,u.username,u.nickname,u.email,u.last_login," +
      "(SELECT COUNT(*) FROM user_studied s WHERE s.user_id=u.id) AS studied_kps," +
      "COALESCE((SELECT questions_done FROM user_stats st WHERE st.user_id=u.id),0) AS questions_done," +
      "COALESCE((SELECT study_seconds FROM user_stats st WHERE st.user_id=u.id),0) AS total_seconds," +
      "(SELECT COUNT(*) FROM learning_events e WHERE e.user_id=u.id AND e.event_type='add_wrong') AS wrong_count," +
      "(SELECT MAX(created_at) FROM learning_events e WHERE e.user_id=u.id) AS last_event " +
      "FROM users u LEFT JOIN user_roles r ON r.user_id=u.id " +
      "WHERE COALESCE(r.role,'student')='student' ORDER BY u.id"
    );
    return res.json({ students: rows.map(function (row) {
      return Object.assign({}, row, { last_active: row.last_event || row.last_login || null });
    }) });
  } catch (e) {
    console.error('[teacher] list students error:', e);
    return res.status(500).json({ error: '获取学生列表失败' });
  }
}

async function studentDetail(req, res) {
  try {
    const sid = parseInt(req.params.id, 10);
    if (!sid) return res.status(400).json({ error: '学生编号无效' });
    const [users] = await pool.query(
      "SELECT u.id,u.username,u.nickname,u.email,COALESCE(r.role,'student') AS role " +
      'FROM users u LEFT JOIN user_roles r ON r.user_id=u.id WHERE u.id=? LIMIT 1', [sid]
    );
    if (!users.length || users[0].role !== 'student') return res.status(404).json({ error: '学生不存在' });
    const [events] = await pool.query(
      'SELECT id,event_type,course_id,chapter_num,kp_idx,kp_name,duration_seconds,detail,created_at ' +
      'FROM learning_events WHERE user_id=? ORDER BY id DESC LIMIT 100', [sid]
    );
    const [studied] = await pool.query(
      'SELECT course_id,chapter_id,kp_idx,updated_at FROM user_studied WHERE user_id=? ORDER BY updated_at DESC LIMIT 200', [sid]
    );
    return res.json({ student: users[0], events, studied });
  } catch (e) {
    console.error('[teacher] student detail error:', e);
    return res.status(500).json({ error: '获取学生详情失败' });
  }
}

async function stats(req, res) {
  try {
    const [totalRows] = await pool.query(
      "SELECT COUNT(*) AS c FROM users u LEFT JOIN user_roles r ON r.user_id=u.id WHERE COALESCE(r.role,'student')='student'"
    );
    const [activeRows] = await pool.query(
      'SELECT COUNT(DISTINCT user_id) AS c FROM learning_events WHERE created_at >= CURDATE()'
    );
    const [hotRows] = await pool.query(
      "SELECT kp_name,COUNT(*) AS view_count FROM learning_events " +
      "WHERE event_type='view_kp' AND kp_name IS NOT NULL AND kp_name<>'' " +
      'GROUP BY kp_name ORDER BY view_count DESC LIMIT 6'
    );
    return res.json({
      total_students: totalRows[0].c || 0,
      active_today: activeRows[0].c || 0,
      hot_kps: hotRows
    });
  } catch (e) {
    console.error('[teacher] stats error:', e);
    return res.status(500).json({ error: '获取教学统计失败' });
  }
}

async function listUsers(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT u.id,u.username,u.nickname,u.email,u.created_at,COALESCE(r.role,'student') AS role " +
      'FROM users u LEFT JOIN user_roles r ON r.user_id=u.id ORDER BY u.id'
    );
    return res.json({ users: rows });
  } catch (e) {
    console.error('[admin] list users error:', e);
    return res.status(500).json({ error: '获取用户列表失败' });
  }
}

async function changeRole(req, res) {
  try {
    const role = String((req.body || {}).role || '');
    if (VALID_ROLES.indexOf(role) < 0) return res.status(400).json({ error: '无效角色' });
    let targetId = parseInt((req.body || {}).user_id || (req.body || {}).userId, 10);
    let rows;
    if (targetId) {
      [rows] = await pool.query('SELECT id,username FROM users WHERE id=? LIMIT 1', [targetId]);
    } else {
      const username = String((req.body || {}).username || '').trim();
      [rows] = await pool.query('SELECT id,username FROM users WHERE username=? LIMIT 1', [username]);
    }
    if (!rows.length) return res.status(404).json({ error: '用户不存在' });
    targetId = rows[0].id;
    if (targetId === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: '不能在当前会话中移除自己的管理员权限' });
    }
    await setUserRole(targetId, role);
    return res.json({ ok: true, user: { id: targetId, username: rows[0].username, role } });
  } catch (e) {
    console.error('[admin] change role error:', e);
    return res.status(500).json({ error: '修改角色失败' });
  }
}

module.exports = { listStudents, studentDetail, stats, listUsers, changeRole };
