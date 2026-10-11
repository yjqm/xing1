'use strict';

const { pool } = require('../db');

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 取当前用户全部进度：已学知识点、章节最好成绩、已解锁成就。
 * 所有查询都按 req.user.id 过滤，保证账号间内容隔离。
 */
async function getProgress(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  try {
    const uid = req.user.id;

    const [studied] = await pool.query(
      'SELECT course_id, chapter_id, kp_idx FROM user_studied WHERE user_id = ?',
      [uid]
    );
    const [scores] = await pool.query(
      'SELECT course_id, chapter_id, best_score FROM user_scores WHERE user_id = ?',
      [uid]
    );
    const [ach] = await pool.query(
      'SELECT achievement_id, unlocked_at FROM user_achievements WHERE user_id = ?',
      [uid]
    );
    const [statsRows] = await pool.query(
      'SELECT study_seconds, questions_done, points, ai_sessions, last_study_date, streak_days FROM user_stats WHERE user_id = ?',
      [uid]
    );
    const st = statsRows[0] || { study_seconds: 0, questions_done: 0, points: 0, ai_sessions: 0, last_study_date: null, streak_days: 0 };

    // 读取用户数据（收藏/题目收藏/错题本/主题等，存 JSON）
    const [dataRows] = await pool.query(
      'SELECT data_key, data_value FROM user_data WHERE user_id = ?',
      [uid]
    );
    const dataMap = {};
    for (const r of dataRows) {
      try { dataMap[r.data_key] = JSON.parse(r.data_value); } catch (e) { dataMap[r.data_key] = r.data_value; }
    }

    return res.json({
      studied: studied.map(r => ({ course_id: r.course_id, chapter_id: r.chapter_id, kp_idx: r.kp_idx })),
      scores: scores.map(r => ({ course_id: r.course_id, chapter_id: r.chapter_id, best_score: r.best_score })),
      achievements: ach.map(r => ({ achievement_id: r.achievement_id, unlocked_at: r.unlocked_at })),
      stats: {
        studySeconds: st.study_seconds || 0,
        questionsDone: st.questions_done || 0,
        points: st.points || 0,
        aiSessions: st.ai_sessions || 0,
        lastStudyDate: st.last_study_date || null,
        streakDays: st.streak_days || 0
      },
      favorites: dataMap.favorites || [],
      qfavorites: dataMap.qfavorites || [],
      wrongbook: dataMap.wrongbook || [],
      wrongbookStats: dataMap.wrongbookStats || { added: 0, mastered: 0 },
      theme: dataMap.theme || null,
      recent: dataMap.recent || [],
      chat: dataMap.chat || null,
      sidechat: dataMap.sidechat || null,
      // AI 密钥不属于用户进度数据，统一由服务器环境变量管理。
    });
  } catch (e) {
    console.error('[progress] getProgress error:', e);
    return res.status(500).json({ error: '读取进度失败' });
  }
}

/**
 * 批量同步。请求体：
 * {
 *   studied:      [{course_id, chapter_id, kp_idx}],   // 该用户当前全部已学（全量替换）
 *   scores:       [{course_id, chapter_id, best_score}], // 取最大值
 *   achievements: [{achievement_id}]                    // 增量
 *   stats: {                                           // 学习统计（增量累加，可选）
 *     studySeconds: 15,    // 本次新增学习秒数（增量）
 *     questionsDone: 3,    // 本次新增做题数（增量）
 *     points: 120,         // 本次新增积分（增量）
 *     aiSessions: 1,       // 本次新增 AI 辅导次数（增量）
 *     activeToday: true    // 今天有学习活动（用于计算连续天数）
 *   }
 * }
 */
async function syncProgress(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  const uid = req.user.id;
  const body = req.body || {};
  const studied = Array.isArray(body.studied) ? body.studied : [];
  const scores = Array.isArray(body.scores) ? body.scores : [];
  const achievements = Array.isArray(body.achievements) ? body.achievements : [];
  const stats = body.stats || {};

  const t = nowStr();
  const today = new Date();
  const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 已学：全量替换（先删后插），保证取消已学也能同步
    if (studied.length >= 0) {
      await conn.query('DELETE FROM user_studied WHERE user_id = ?', [uid]);
      for (const it of studied) {
        if (!it || !it.course_id || !it.chapter_id) continue;
        const kp = parseInt(it.kp_idx, 10);
        await conn.query(
          'INSERT INTO user_studied (user_id, course_id, chapter_id, kp_idx, updated_at) VALUES (?, ?, ?, ?, ?)',
          [uid, String(it.course_id), String(it.chapter_id), isNaN(kp) ? 0 : kp, t]
        );
      }
    }

    // 成绩：取最大值 upsert
    for (const it of scores) {
      if (!it || !it.course_id || !it.chapter_id) continue;
      const score = parseInt(it.best_score, 10) || 0;
      await conn.query(
        `INSERT INTO user_scores (user_id, course_id, chapter_id, best_score, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE best_score = GREATEST(best_score, VALUES(best_score)), updated_at = VALUES(updated_at)`,
        [uid, String(it.course_id), String(it.chapter_id), score, t]
      );
    }

    // 成就：增量插入（已存在则忽略）
    for (const it of achievements) {
      const aid = it && (it.achievement_id || it.id);
      if (!aid) continue;
      await conn.query(
        'INSERT IGNORE INTO user_achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)',
        [uid, String(aid), t]
      );
    }

    // 学习统计：增量累加
    const studySeconds = Math.max(0, parseInt(stats.studySeconds, 10) || 0);
    const questionsDone = Math.max(0, parseInt(stats.questionsDone, 10) || 0);
    const points = Math.max(0, parseInt(stats.points, 10) || 0);
    const aiSessions = Math.max(0, parseInt(stats.aiSessions, 10) || 0);
    const activeToday = !!stats.activeToday;

    if (studySeconds || questionsDone || points || aiSessions || activeToday) {
      // 读取现有统计，用于计算连续天数
      const [sRows] = await conn.query('SELECT * FROM user_stats WHERE user_id = ?', [uid]);
      const prev = sRows[0] || null;
      let streakDays = prev ? prev.streak_days : 0;
      const prevDate = prev ? prev.last_study_date : null;

      if (activeToday) {
        if (prevDate === todayStr) {
          // 今天已计入，连续天数不变
        } else if (prevDate) {
          // 判断是否与昨天连续
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
          streakDays = (prevDate === yStr) ? streakDays + 1 : 1;
        } else {
          streakDays = 1;
        }
      }

      await conn.query(
        `INSERT INTO user_stats
           (user_id, study_seconds, questions_done, points, ai_sessions, last_study_date, streak_days, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           study_seconds = study_seconds + VALUES(study_seconds),
           questions_done = questions_done + VALUES(questions_done),
           points = points + VALUES(points),
           ai_sessions = ai_sessions + VALUES(ai_sessions),
           last_study_date = IF(VALUES(last_study_date) IS NOT NULL, VALUES(last_study_date), last_study_date),
           streak_days = VALUES(streak_days),
           updated_at = VALUES(updated_at)`,
        [uid, studySeconds, questionsDone, points, aiSessions, activeToday ? todayStr : null, streakDays, t]
      );
    }

    // 用户数据：收藏 / 题目收藏 / 错题本 / 主题 / AI 聊天记录（全量替换，仅当字段存在时同步）
    const dataFields = [
      ['favorites', body.favorites, Array.isArray],
      ['qfavorites', body.qfavorites, Array.isArray],
      ['wrongbook', body.wrongbook, Array.isArray],
      ['wrongbookStats', body.wrongbookStats, function (v) { return v && typeof v === 'object' && !Array.isArray(v); }],
      ['theme', body.theme, function (v) { return v == null || typeof v === 'string'; }],
      ['recent', body.recent, Array.isArray],
      ['chat', body.chat, function (v) { return v && typeof v === 'object' && !Array.isArray(v); }],
      ['sidechat', body.sidechat, function (v) { return v && typeof v === 'object' && !Array.isArray(v); }],
    ];
    for (const [key, value, validator] of dataFields) {
      if (value === undefined) continue;
      if (!validator(value)) continue;
      const json = JSON.stringify(value);
      await conn.query(
        `INSERT INTO user_data (user_id, data_key, data_value, updated_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE data_value = VALUES(data_value), updated_at = VALUES(updated_at)`,
        [uid, key, json, t]
      );
    }

    await conn.commit();
    return res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error('[progress] syncProgress error:', e);
    return res.status(500).json({ error: '同步失败' });
  } finally {
    conn.release();
  }
}

module.exports = { getProgress, syncProgress };
