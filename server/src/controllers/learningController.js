'use strict';

const { pool } = require('../db');

const VALID_EVENTS = [
  'view_kp', 'view_chapter', 'submit_question', 'quiz_submit',
  'add_wrong', 'favorite', 'study_duration'
];

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function safeInt(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

async function addEvent(req, res) {
  try {
    const body = req.body || {};
    const eventType = String(body.event_type || body.eventType || '').trim();
    if (VALID_EVENTS.indexOf(eventType) < 0) return res.status(400).json({ error: '未知的学习事件类型' });
    const courseId = String(body.course_id || body.courseId || '').slice(0, 30);
    const chapterNum = safeInt(body.chapter_num !== undefined ? body.chapter_num : body.chapterNum, 0, 10000);
    const kpIdx = safeInt(body.kp_idx !== undefined ? body.kp_idx : body.kpIdx, 0, 100000);
    const detail = body.detail && typeof body.detail === 'object' ? body.detail : {};
    const kpName = detail.kp_name ? String(detail.kp_name).slice(0, 160) : null;
    const duration = eventType === 'study_duration' ? (safeInt(detail.seconds, 0, 86400) || 0) : 0;
    const detailText = JSON.stringify(detail).slice(0, 20000);
    const [result] = await pool.query(
      'INSERT INTO learning_events (user_id,event_type,course_id,chapter_num,kp_idx,kp_name,duration_seconds,detail,created_at) ' +
      'VALUES (?,?,?,?,?,?,?,?,?)',
      [req.user.id, eventType, courseId, chapterNum, kpIdx, kpName, duration, detailText, nowStr()]
    );
    return res.json({ ok: true, event_id: result.insertId });
  } catch (e) {
    console.error('[learning] add event error:', e);
    return res.status(500).json({ error: '记录学习事件失败' });
  }
}

async function me(req, res) {
  try {
    const uid = req.user.id;
    const [statsRows] = await pool.query(
      'SELECT study_seconds,questions_done FROM user_stats WHERE user_id = ? LIMIT 1', [uid]
    );
    const stats = statsRows[0] || { study_seconds: 0, questions_done: 0 };
    const [studiedRows] = await pool.query('SELECT COUNT(*) AS c FROM user_studied WHERE user_id = ?', [uid]);
    const [wrongRows] = await pool.query(
      "SELECT COUNT(*) AS c FROM learning_events WHERE user_id = ? AND event_type = 'add_wrong'", [uid]
    );
    const [recentRows] = await pool.query(
      'SELECT id,event_type,course_id,chapter_num,kp_idx,kp_name,duration_seconds,detail,created_at ' +
      'FROM learning_events WHERE user_id = ? ORDER BY id DESC LIMIT 20', [uid]
    );
    return res.json({
      studied_kps: studiedRows[0].c || 0,
      questions_done: stats.questions_done || 0,
      wrong_count: wrongRows[0].c || 0,
      total_seconds: stats.study_seconds || 0,
      recent_events: recentRows
    });
  } catch (e) {
    console.error('[learning] me error:', e);
    return res.status(500).json({ error: '获取学习数据失败' });
  }
}

module.exports = { addEvent, me };
