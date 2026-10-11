'use strict';

/**
 * 社区（全站共享，不再按账号隔离）
 *   - 帖子 / 点赞 / 评论：存 MySQL，所有登录用户看到同一份内容
 *   - 附件：上传到 server/uploads/community，落盘后返回相对 URL
 *   - 热门话题：从真实帖子的 #话题 聚合，并每天落一份快照到 community_topics
 *   - 每日挑战：全站每天一题，优先用 AI 生成（服务器 .env 的 LLM_* 配置），
 *               未配置则回退到内置题库；生成结果当天缓存，所有人共用同一题
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { pool } = require('../db');

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const TAGS = ['讨论', '笔记', '求助', '经验', '资料', '挑战'];

/* 服务端内容过滤。环境变量可追加学校自己的词表，避免把规则写死在浏览器中。 */
const DEFAULT_BLOCKED_WORDS = [
  '代考', '替考', '枪支', '炸药', '毒品', '冰毒', '海洛因',
  '色情', '裸聊', '约炮', '赌博', '博彩', '恐怖袭击',
  '傻逼', '傻屄', '操你妈', '草泥马', '死全家',
  'fuck', 'shit', 'bitch', 'asshole', 'porn', 'casino', 'gambling'
];
const EXTRA_BLOCKED_WORDS = String(process.env.COMMUNITY_BLOCKED_WORDS || '')
  .split(',').map(function (word) { return word.trim(); }).filter(Boolean);
const BLOCKED_WORDS = Array.from(new Set(DEFAULT_BLOCKED_WORDS.concat(EXTRA_BLOCKED_WORDS)))
  .sort(function (a, b) { return b.length - a.length; });

/* ══════════════ 工具 ══════════════ */
function pad2(n) { return n < 10 ? '0' + n : '' + n; }

function nowStr() {
  const t = new Date();
  return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate()) + ' ' +
    pad2(t.getHours()) + ':' + pad2(t.getMinutes()) + ':' + pad2(t.getSeconds());
}

function todayStr() {
  const t = new Date();
  return t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
}

function ymd(v) {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date) return v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
  return String(v).slice(0, 10);
}

function relTime(d) {
  if (!d) return '';
  const t = (d instanceof Date) ? d : new Date(String(d).replace(' ', 'T'));
  if (isNaN(t.getTime())) return '';
  const diff = Math.floor((Date.now() - t.getTime()) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  if (diff < 86400 * 2) return '昨天';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + '天前';
  return (t.getMonth() + 1) + '月' + t.getDate() + '日';
}

function colorOf(userId, name) {
  let h = parseInt(userId, 10) || 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

function normalizedModerationText(value) {
  return String(value == null ? '' : value)
    .toLowerCase()
    .replace(/[\s\u200b\u200c\u200d_\-~!@#$%^&*()+={}\[\]|\\/:;,.，。！？、：；"'`·]/g, '');
}

function findBlockedWord() {
  const text = normalizedModerationText(Array.prototype.slice.call(arguments).join(' '));
  if (!text) return '';
  return BLOCKED_WORDS.find(function (word) {
    return text.includes(normalizedModerationText(word));
  }) || '';
}

function rejectBlockedContent(res) {
  return res.status(422).json({ error: '内容包含不适合教学社区发布的词语，请修改后再提交。' });
}

/** 规范化话题标签：统一以 # 开头，去掉空白与标点 */
function normalizeTopic(raw) {
  let t = String(raw == null ? '' : raw).trim();
  if (!t) return '';
  t = t.replace(/\s+/g, '').replace(/^#+/, '');
  t = t.replace(/[#,，。；;：:、!！?？]/g, '');
  if (!t) return '';
  if (t.length > 30) t = t.slice(0, 30);
  return '#' + t;
}

/** 从正文里找第一个 #话题 */
function extractTopic(text) {
  const m = String(text || '').match(/#([^\s#,，。；;：:、!！?？]{1,30})/);
  return m ? normalizeTopic(m[1]) : '';
}

/* ══════════════ 序列化 ══════════════ */
function serializePost(p, liked, uid, withContent) {
  let atts = [];
  try { atts = p.attachments ? JSON.parse(p.attachments) : []; } catch (e) { atts = []; }
  if (!Array.isArray(atts)) atts = [];
  const content = p.content || '';
  return {
    id: p.id,
    author: p.author,
    avatar: p.avatar || String(p.author || '?').charAt(0),
    color: p.color || colorOf(p.user_id, p.author),
    tag: p.tag || '讨论',
    topic: p.topic || '',
    title: p.title,
    content: withContent ? content : content.slice(0, 180),
    excerpt: content.replace(/\s+/g, ' ').slice(0, 140),
    attachments: atts,
    likes: p.likes || 0,
    comments: p.comment_count || 0,
    shares: p.shares || 0,
    hot: (p.likes || 0) * 3 + (p.comment_count || 0) * 5 + (p.shares || 0) * 2,
    liked: !!liked,
    isMine: !!(uid && p.user_id === uid),
    challengeDate: ymd(p.challenge_date),
    createdAt: p.created_at,
    time: relTime(p.created_at)
  };
}

/* ══════════════ 帖子列表 / 详情 ══════════════ */
async function listPosts(req, res) {
  try {
    const sort = req.query.sort === 'new' ? 'new' : 'hot';
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const topic = normalizeTopic(req.query.topic || '');

    const where = topic ? 'WHERE p.topic = ?' : '';
    const params = topic ? [topic] : [];

    // 热度排序带时间衰减：越新的帖子越容易上榜，避免老帖长期霸榜
    const orderBy = sort === 'new'
      ? 'p.created_at DESC'
      : '((p.likes*3 + p.comment_count*5 + p.shares*2 + 5) / (1 + TIMESTAMPDIFF(HOUR, p.created_at, NOW())/48)) DESC, p.created_at DESC';

    const [rows] = await pool.query(
      'SELECT p.* FROM community_posts p ' + where + ' ORDER BY ' + orderBy + ' LIMIT ? OFFSET ?',
      params.concat([limit, offset])
    );
    const [cntRows] = await pool.query(
      'SELECT COUNT(*) AS c FROM community_posts p ' + where, params
    );

    let likedIds = {};
    if (req.user && rows.length) {
      const ids = rows.map(r => r.id);
      const [ls] = await pool.query(
        'SELECT post_id FROM community_likes WHERE user_id = ? AND post_id IN (?)',
        [req.user.id, ids]
      );
      ls.forEach(r => { likedIds[r.post_id] = true; });
    }
    const uid = req.user ? req.user.id : null;
    return res.json({
      ok: true,
      total: cntRows[0] ? cntRows[0].c : 0,
      posts: rows.map(r => serializePost(r, likedIds[r.id], uid, false))
    });
  } catch (e) {
    console.error('[community] listPosts error:', e);
    return res.status(500).json({ error: '读取帖子失败' });
  }
}

async function getPost(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: '参数错误' });
    const [rows] = await pool.query('SELECT * FROM community_posts WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: '帖子不存在或已被删除' });
    const p = rows[0];

    let liked = false;
    if (req.user) {
      const [ls] = await pool.query(
        'SELECT 1 FROM community_likes WHERE post_id = ? AND user_id = ?', [id, req.user.id]
      );
      liked = ls.length > 0;
    }
    const [cs] = await pool.query(
      'SELECT * FROM community_comments WHERE post_id = ? ORDER BY created_at ASC LIMIT 200', [id]
    );
    // 浏览量不单独建表，看详情顺手 +1 转发计数不合适；这里只返回转发数原始值
    const uid = req.user ? req.user.id : null;
    const post = serializePost(p, liked, uid, true);
    post.commentList = cs.map(c => ({
      id: c.id,
      author: c.author,
      avatar: c.avatar || String(c.author || '?').charAt(0),
      color: c.color || colorOf(c.user_id, c.author),
      text: c.content,
      time: relTime(c.created_at),
      isMine: !!(uid && c.user_id === uid)
    }));
    return res.json({ ok: true, post: post });
  } catch (e) {
    console.error('[community] getPost error:', e);
    return res.status(500).json({ error: '读取帖子失败' });
  }
}

/* ══════════════ 发帖 ══════════════ */
async function createPost(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录或登录已过期' });
  try {
    const body = req.body || {};
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    if (!title) return res.status(400).json({ error: '请填写帖子标题' });
    if (title.length > 120) return res.status(400).json({ error: '标题最多 120 字' });
    if (content.length > 20000) return res.status(400).json({ error: '正文过长（最多 20000 字）' });
    if (findBlockedWord(title, content, body.topic)) return rejectBlockedContent(res);

    let tag = String(body.tag || '讨论').trim();
    if (TAGS.indexOf(tag) < 0) tag = '讨论';

    let topic = normalizeTopic(body.topic || '');
    if (!topic) topic = extractTopic(title + ' ' + content);
    if (!topic) topic = '#' + tag;

    // 附件：最多 6 个，只保留 name/url/size/type
    let atts = Array.isArray(body.attachments) ? body.attachments : [];
    atts = atts.filter(a => a && a.url).slice(0, 6).map(a => ({
      name: String(a.name || '附件').slice(0, 120),
      url: String(a.url).slice(0, 400),
      size: parseInt(a.size, 10) || 0,
      type: String(a.type || '').slice(0, 80)
    }));

    const author = req.user.nickname || req.user.username || '同学';
    const avatar = String(author).charAt(0);
    const color = colorOf(req.user.id, author);
    const challengeDate = body.challengeDate ? String(body.challengeDate).slice(0, 10) : null;
    const t = nowStr();

    const [r] = await pool.query(
      `INSERT INTO community_posts
        (user_id, author, avatar, color, tag, topic, title, content, attachments,
         likes, shares, comment_count, hot_score, challenge_date, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,0,0,0,0,?,?,?)`,
      [req.user.id, author, avatar, color, tag, topic, title, content, JSON.stringify(atts),
        challengeDate && /^\d{4}-\d{2}-\d{2}$/.test(challengeDate) ? challengeDate : null, t, t]
    );

    const [rows] = await pool.query('SELECT * FROM community_posts WHERE id = ?', [r.insertId]);
    ensureDailyStats().catch(() => {});
    return res.json({ ok: true, post: serializePost(rows[0], false, req.user.id, true) });
  } catch (e) {
    console.error('[community] createPost error:', e);
    return res.status(500).json({ error: '发布失败，请稍后重试' });
  }
}

async function deletePost(req, res) {
  if (!req.user) return res.status(401).json({ error: '未登录或登录已过期' });
  const conn = await pool.getConnection();
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: '参数错误' });
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT user_id FROM community_posts WHERE id = ?', [id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: '帖子不存在' }); }
    if (rows[0].user_id !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ error: '只能删除自己发布的帖子' });
    }
    await conn.query('DELETE FROM community_posts WHERE id = ?', [id]);
    await conn.query('DELETE FROM community_comments WHERE post_id = ?', [id]);
    await conn.query('DELETE FROM community_likes WHERE post_id = ?', [id]);
    await conn.commit();
    return res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error('[community] deletePost error:', e);
    return res.status(500).json({ error: '删除失败' });
  } finally {
    conn.release();
  }
}

/* ══════════════ 点赞 / 评论 ══════════════ */
async function toggleLike(req, res) {
  if (!req.user) return res.status(401).json({ error: '登录后才能点赞' });
  const conn = await pool.getConnection();
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: '参数错误' });
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT id FROM community_posts WHERE id = ?', [id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: '帖子不存在' }); }

    const [had] = await conn.query(
      'SELECT 1 FROM community_likes WHERE post_id = ? AND user_id = ?', [id, req.user.id]
    );
    let liked;
    if (had.length) {
      await conn.query('DELETE FROM community_likes WHERE post_id = ? AND user_id = ?', [id, req.user.id]);
      await conn.query('UPDATE community_posts SET likes = GREATEST(likes - 1, 0), updated_at = ? WHERE id = ?', [nowStr(), id]);
      liked = false;
    } else {
      await conn.query('INSERT INTO community_likes (post_id, user_id, created_at) VALUES (?,?,?)', [id, req.user.id, nowStr()]);
      await conn.query('UPDATE community_posts SET likes = likes + 1, updated_at = ? WHERE id = ?', [nowStr(), id]);
      liked = true;
    }
    const [cur] = await conn.query('SELECT likes FROM community_posts WHERE id = ?', [id]);
    await conn.commit();
    return res.json({ ok: true, liked: liked, likes: cur[0] ? cur[0].likes : 0 });
  } catch (e) {
    await conn.rollback();
    console.error('[community] toggleLike error:', e);
    return res.status(500).json({ error: '操作失败' });
  } finally {
    conn.release();
  }
}

async function addComment(req, res) {
  if (!req.user) return res.status(401).json({ error: '登录后才能评论' });
  try {
    const id = parseInt(req.params.id, 10);
    const text = String((req.body || {}).content || '').trim();
    if (!id) return res.status(400).json({ error: '参数错误' });
    if (!text) return res.status(400).json({ error: '评论内容不能为空' });
    if (text.length > 1000) return res.status(400).json({ error: '评论最多 1000 字' });
    if (findBlockedWord(text)) return rejectBlockedContent(res);

    const [rows] = await pool.query('SELECT id FROM community_posts WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: '帖子不存在' });

    const author = req.user.nickname || req.user.username || '同学';
    const t = nowStr();
    const [r] = await pool.query(
      'INSERT INTO community_comments (post_id, user_id, author, avatar, color, content, created_at) VALUES (?,?,?,?,?,?,?)',
      [id, req.user.id, author, String(author).charAt(0), colorOf(req.user.id, author), text, t]
    );
    await pool.query('UPDATE community_posts SET comment_count = comment_count + 1, updated_at = ? WHERE id = ?', [t, id]);

    return res.json({
      ok: true,
      comment: { id: r.insertId, author: author, avatar: String(author).charAt(0), color: colorOf(req.user.id, author), text: text, time: '刚刚', isMine: true }
    });
  } catch (e) {
    console.error('[community] addComment error:', e);
    return res.status(500).json({ error: '评论失败' });
  }
}

/* ══════════════ 附件上传（base64，免额外依赖） ══════════════ */
const EXT_WHITELIST = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.txt', '.md', '.pdf',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.c', '.h', '.cpp', '.py', '.js', '.java', '.cs', '.go', '.rs', '.sql', '.json', '.csv'];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function uploadDirForCommunity() {
  const dir = path.join(config.uploadDir, 'community');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function uploadAttachment(req, res) {
  if (!req.user) return res.status(401).json({ error: '登录后才能上传附件' });
  try {
    const body = req.body || {};
    const name = String(body.name || 'attachment').slice(0, 120);
    let data = String(body.data || '');
    if (!data) return res.status(400).json({ error: '没有收到文件内容' });
    if (findBlockedWord(name)) return rejectBlockedContent(res);
    const m = data.match(/^data:[^;]*;base64,(.*)$/);
    if (m) data = m[1];

    let buf;
    try { buf = Buffer.from(data, 'base64'); } catch (e) { return res.status(400).json({ error: '文件内容解析失败' }); }
    if (!buf || !buf.length) return res.status(400).json({ error: '文件内容为空' });
    if (buf.length > MAX_UPLOAD_BYTES) return res.status(413).json({ error: '单个附件不能超过 8MB' });

    let ext = path.extname(name).toLowerCase();
    if (EXT_WHITELIST.indexOf(ext) < 0) ext = '.bin';
    const base = name.replace(/\.[^.]*$/, '').replace(/[^\w\u4e00-\u9fa5-]/g, '').slice(0, 40) || 'file';
    const fname = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + base + ext;

    fs.writeFileSync(path.join(uploadDirForCommunity(), fname), buf);

    return res.json({
      ok: true,
      file: {
        name: name,
        url: '/uploads/community/' + encodeURIComponent(fname),
        size: buf.length,
        type: String(body.type || '')
      }
    });
  } catch (e) {
    console.error('[community] upload error:', e);
    return res.status(500).json({ error: '上传失败' });
  }
}

/* ══════════════ 热门话题（每天落快照） ══════════════ */
let _lastRollupDate = '';

async function ensureDailyStats() {
  const today = todayStr();
  if (_lastRollupDate === today) return;
  // 1) 重算每条帖子的热度（点赞*3 + 评论*5 + 转发*2）
  await pool.query('UPDATE community_posts SET hot_score = likes*3 + comment_count*5 + shares*2');
  // 2) 聚合近 30 天真实话题
  const [rows] = await pool.query(
    "SELECT topic, COUNT(*) AS c, SUM(hot_score) AS h FROM community_posts " +
    "WHERE topic <> '' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) " +
    'GROUP BY topic ORDER BY h DESC LIMIT 30'
  );
  // 3) 写入当天快照（先清当天再写，保证同一天重复执行结果一致）
  await pool.query('DELETE FROM community_topics WHERE stat_date = ?', [today]);
  for (const r of rows) {
    await pool.query(
      'INSERT INTO community_topics (stat_date, topic, post_count, hot_score, updated_at) VALUES (?,?,?,?,?)',
      [today, r.topic, parseInt(r.c, 10) || 0, parseInt(r.h, 10) || 0, nowStr()]
    );
  }
  _lastRollupDate = today;
}

async function listTopics(req, res) {
  try {
    await ensureDailyStats();
    const today = todayStr();
    const [rows] = await pool.query(
      'SELECT topic, post_count, hot_score FROM community_topics WHERE stat_date = ? ORDER BY hot_score DESC, post_count DESC LIMIT 10',
      [today]
    );
    // 当天还没数据时，直接实时聚合兜底（页面不至于空着）
    if (!rows.length) {
      const [live] = await pool.query(
        "SELECT topic, COUNT(*) AS c, SUM(likes*3 + comment_count*5 + shares*2) AS h FROM community_posts " +
        "WHERE topic <> '' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY topic ORDER BY h DESC LIMIT 10"
      );
      return res.json({
        ok: true, date: today,
        topics: live.map(r => ({ topic: r.topic, count: parseInt(r.c, 10) || 0, hot: parseInt(r.h, 10) || 0 }))
      });
    }
    return res.json({
      ok: true, date: today,
      topics: rows.map(r => ({ topic: r.topic, count: r.post_count || 0, hot: r.hot_score || 0 }))
    });
  } catch (e) {
    console.error('[community] listTopics error:', e);
    return res.status(500).json({ error: '读取热门话题失败' });
  }
}

/* ══════════════ 活跃用户（真实统计） ══════════════ */
async function activeUsers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT p.user_id, p.author, p.avatar, p.color, COUNT(*) AS c, SUM(p.likes) AS l FROM community_posts p ' +
      'GROUP BY p.user_id, p.author, p.avatar, p.color ORDER BY (COUNT(*)*3 + SUM(p.likes)) DESC LIMIT 6'
    );
    return res.json({
      ok: true,
      users: rows.map(r => ({
        name: r.author,
        avatar: r.avatar || String(r.author || '?').charAt(0),
        color: r.color || colorOf(r.user_id, r.author),
        posts: parseInt(r.c, 10) || 0,
        likes: parseInt(r.l, 10) || 0
      }))
    });
  } catch (e) {
    console.error('[community] activeUsers error:', e);
    return res.status(500).json({ error: '读取活跃用户失败' });
  }
}

/* ══════════════ 每日挑战：AI 生成 + 题库兜底 ══════════════ */
const CHALLENGE_BANK = [
  { topic: '#分部积分', question: '求不定积分 $\\int x\\cdot e^{x}\\,dx$，并说明你选择 u 与 dv 的依据。', hint: '反对幂三指：反三角、对数、幂函数、三角、指数，靠前者优先做 u。' },
  { topic: '#洛必达法则', question: '求 $\\lim\\limits_{x\\to 0}\\dfrac{e^{x}-1-x}{x^{2}}$，并说明每一步使用洛必达法则的条件是否满足。', hint: '先判断是否为 0/0 型，再考虑用泰勒展开互相验证。' },
  { topic: '#泰勒展开', question: '把 $f(x)=\\ln(1+x)$ 在 $x=0$ 处展开到 $x^{4}$ 项，并写出拉格朗日余项。', hint: '逐项求导找规律，注意收敛区间。' },
  { topic: '#定积分换元', question: '计算 $\\int_{0}^{1}\\dfrac{1}{1+x^{2}}\\,dx$，并说明所用换元的几何意义。', hint: '想到反三角函数，也可以从单位圆面积角度理解。' },
  { topic: '#二重积分', question: '把 $\\iint_{D}(x^{2}+y^{2})\\,d\\sigma$（$D$ 为单位圆盘）化为极坐标并计算结果。', hint: '面积元素换成 $r\\,dr\\,d\\theta$，别忘了多出来的那个 r。' },
  { topic: '#微分方程', question: '解一阶线性微分方程 $y\'+2y=e^{-x}$，并求出满足 $y(0)=1$ 的特解。', hint: '用积分因子 $e^{\\int P(x)dx}$。' },
  { topic: '#夹逼定理', question: '证明 $\\lim\\limits_{n\\to\\infty}\\dfrac{\\sin n}{n}=0$，并指出夹逼定理用在了哪一步。', hint: '用 $-1\\le \\sin n\\le 1$ 放缩。' },
  { topic: '#中值定理', question: '用拉格朗日中值定理证明：当 $x>0$ 时，$\\dfrac{x}{1+x}<\\ln(1+x)<x$。', hint: '对 $\\ln(1+x)$ 在 $[0,x]$ 上用中值定理。' },
  { topic: '#级数收敛', question: '判断级数 $\\sum\\limits_{n=1}^{\\infty}\\dfrac{n}{2^{n}}$ 是否收敛，若收敛求其和。', hint: '比值审敛 + 错位相减。' },
  { topic: '#时间复杂度', question: '分析下面这段代码的时间与空间复杂度，并说明为什么可以用 O(1) 空间完成：\n\n给定一个整数数组，判断是否存在重复元素。', hint: '排序法 O(n log n)/O(1)，哈希法 O(n)/O(n)，权衡说清楚。' },
  { topic: '#链表', question: '如何只用一次遍历找到单链表的中间结点？写出思路与关键代码片段，并说明边界情况。', hint: '快慢指针，快指针每次走两步。' },
  { topic: '#二分查找', question: '在一个旋转过的有序数组中查找目标值，要求时间复杂度 O(log n)。说明你的判断分支依据。', hint: '每次至少有一半是有序的，先判断哪半有序。' },
  { topic: '#栈与队列', question: '如何用两个栈实现一个队列？分析入队与出队操作的均摊时间复杂度。', hint: '一个负责入，一个负责出；均摊 O(1)。' },
  { topic: '#二叉树', question: '给出一棵二叉树的先序和中序遍历序列，说明如何唯一重建这棵树，并写出递归思路。', hint: '先序第一个是根，用它把中序切成左右子树。' },
  { topic: '#动态规划', question: '写出「最长公共子序列」的状态定义、转移方程与边界条件，并分析复杂度。', hint: 'dp[i][j] 表示前缀 i 与前缀 j 的 LCS 长度。' },
  { topic: '#指针', question: 'C 语言中 `char s[]="hello";` 与 `char *p="hello";` 有什么区别？分别说明能否修改内容及原因。', hint: '一个在栈上可写，一个指向只读字面量。' },
  { topic: '#内存管理', question: '`malloc` 与 `calloc`、`realloc` 的区别是什么？使用后忘记 `free` 会带来什么后果？', hint: '初始化行为、扩容行为、内存泄漏。' },
  { topic: '#位运算', question: '不借助临时变量交换两个整数有哪几种写法？说明异或写法的原理与潜在问题。', hint: '异或自反；注意自己和自己交换会归零。' },
  { topic: '#排序算法', question: '快速排序的平均与最坏时间复杂度分别是多少？最坏情况在什么输入下出现，如何缓解？', hint: '已排序数组 + 固定取首元素做枢轴；随机化枢轴。' },
  { topic: '#哈希表', question: '哈希冲突有哪些常见解决方式？开放定址法中为什么删除元素要打「墓碑」标记？', hint: '线性探测的查找链会断。' },
  { topic: '#TCP', question: 'TCP 三次握手为什么不能改成两次？请从「防止历史连接请求造成资源浪费」的角度说明。', hint: '两次无法让服务端确认客户端的接收能力。' },
  { topic: '#HTTP缓存', question: 'HTTP 缓存中 `Cache-Control` 与 `ETag` 分别解决什么问题？强缓存与协商缓存如何配合？', hint: '强缓存不请求，协商缓存会发一次条件请求拿 304。' },
  { topic: '#进程与线程', question: '进程与线程的本质区别是什么？为什么线程切换开销更小？谈谈共享内存带来的风险。', hint: '地址空间与资源分配单位；数据竞争与锁。' },
  { topic: '#递归与迭代', question: '把斐波那契数列的朴素递归改写为 O(n) 迭代写法，并说明朴素递归为什么是指数复杂度。', hint: '画出递归树，重复子问题数量爆炸。' }
];

function bankPick(dateStr, excludeTopic) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i += 1) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  let item = CHALLENGE_BANK[h % CHALLENGE_BANK.length];
  if (excludeTopic && item.topic === excludeTopic) {
    item = CHALLENGE_BANK[(h + 1) % CHALLENGE_BANK.length];
  }
  return { topic: item.topic, question: item.question, hint: item.hint, source: 'bank' };
}

function parseChallengeJSON(text) {
  let s = String(text || '').trim();
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  let obj;
  try { obj = JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
  const question = String(obj.question || '').trim();
  if (!question) return null;
  return {
    topic: normalizeTopic(obj.topic || '') || extractTopic(question) || '#每日挑战',
    question: question.slice(0, 600),
    hint: String(obj.hint || '').trim().slice(0, 200),
    source: 'ai'
  };
}

/** 取本次可用于出题的 LLM 配置：只允许服务器环境变量。 */
async function resolveLLMConfig(req) {
  const l = config.llm;
  if (l.apiKey && l.baseUrl && l.model) return { key: l.apiKey, baseUrl: l.baseUrl, model: l.model };
  return null;
}

async function generateWithLLM(cfg) {
  let url = String(cfg.baseUrl).trim();
  if (!/\/chat\/completions$/.test(url)) url = url.replace(/\/+$/, '') + '/chat/completions';
  const subjects = ['高等数学', '数据结构', 'C 语言程序设计', '计算机网络', '算法与编程'];
  const subj = subjects[Math.floor(Math.random() * subjects.length)];
  const sys = '你是高校课程出题助手。只输出一个 JSON 对象，不要输出任何解释文字，不要使用 Markdown 代码块。';
  const user = '请为大学生生成今天的「每日挑战」题，学科方向：' + subj + '。\n' +
    '要求：\n1. 一道需要动脑的中等难度题，学生可以直接作答；\n' +
    '2. 题干简洁，数学公式用 LaTeX（行内 $...$）；\n' +
    '3. 话题标签取自题目核心知识点，以 # 开头，不要带空格。\n' +
    '严格按 {"topic":"#话题标签","question":"题干","hint":"一句话提示"} 返回。';

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
        temperature: 0.9,
        max_tokens: 700,
        stream: false
      })
    });
    if (!r.ok) throw new Error('LLM HTTP ' + r.status);
    const data = await r.json();
    const txt = (((data.choices || [])[0] || {}).message || {}).content || '';
    const parsed = parseChallengeJSON(txt);
    if (!parsed) throw new Error('LLM 返回内容无法解析');
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

async function getDailyChallenge(req, res) {
  try {
    const today = todayStr();
    let [rows] = await pool.query('SELECT * FROM daily_challenges WHERE challenge_date = ?', [today]);
    let row = rows[0];

    if (!row) {
      let gen = null;
      const llmCfg = await resolveLLMConfig(req);
      if (llmCfg) {
        try { gen = await generateWithLLM(llmCfg); } catch (e) {
          console.warn('[community] AI 出题失败，回退题库:', e.message);
        }
      }
      if (!gen) gen = bankPick(today);
      // 只缓存 AI 生成结果；题库结果按日期确定性生成，不占表
      if (gen.source === 'ai') {
        await pool.query(
          'INSERT IGNORE INTO daily_challenges (challenge_date, topic, question, hint, source, created_at) VALUES (?,?,?,?,?,?)',
          [today, gen.topic, gen.question, gen.hint || '', gen.source, nowStr()]
        );
        [rows] = await pool.query('SELECT * FROM daily_challenges WHERE challenge_date = ?', [today]);
        row = rows[0] || {
          challenge_date: new Date(), topic: gen.topic, question: gen.question, hint: gen.hint, source: gen.source
        };
      } else {
        row = { challenge_date: new Date(), topic: gen.topic, question: gen.question, hint: gen.hint, source: 'bank' };
      }
    }

    const [cnt] = await pool.query('SELECT COUNT(*) AS c FROM community_posts WHERE challenge_date = ?', [today]);
    let mine = 0;
    if (req.user) {
      const [mm] = await pool.query(
        'SELECT COUNT(*) AS c FROM community_posts WHERE challenge_date = ? AND user_id = ?', [today, req.user.id]
      );
      mine = mm[0] ? mm[0].c : 0;
    }
    return res.json({
      ok: true,
      date: today,
      topic: row.topic,
      question: row.question,
      hint: row.hint || '',
      source: row.source || 'bank',
      postCount: cnt[0] ? cnt[0].c : 0,
      myPosted: mine > 0
    });
  } catch (e) {
    console.error('[community] getDailyChallenge error:', e);
    return res.status(500).json({ error: '读取每日挑战失败' });
  }
}

/** 换一题：AI 可用则重新生成，否则从题库换一题（当天全站同步更新） */
async function regenerateDailyChallenge(req, res) {
  if (!req.user) return res.status(401).json({ error: '请先登录' });
  try {
    const today = todayStr();
    const [old] = await pool.query('SELECT * FROM daily_challenges WHERE challenge_date = ?', [today]);
    const oldTopic = old[0] ? old[0].topic : '';

    let gen = null;
    const llmCfg = await resolveLLMConfig(req);
    if (llmCfg) {
      try { gen = await generateWithLLM(llmCfg); } catch (e) {
        console.warn('[community] 换题 AI 失败，回退题库:', e.message);
      }
    }
    if (!gen) gen = bankPick(today + '#' + Date.now(), oldTopic);

    await pool.query(
      `INSERT INTO daily_challenges (challenge_date, topic, question, hint, source, created_at)
       VALUES (?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE topic = VALUES(topic), question = VALUES(question),
         hint = VALUES(hint), source = VALUES(source), created_at = VALUES(created_at)`,
      [today, gen.topic, gen.question, gen.hint || '', gen.source, nowStr()]
    );
    return res.json({ ok: true, date: today, topic: gen.topic, question: gen.question, hint: gen.hint || '', source: gen.source });
  } catch (e) {
    console.error('[community] regenerateDailyChallenge error:', e);
    return res.status(500).json({ error: '换题失败' });
  }
}

module.exports = {
  listPosts, getPost, createPost, deletePost,
  toggleLike, addComment, uploadAttachment,
  listTopics, activeUsers,
  getDailyChallenge, regenerateDailyChallenge,
  ensureDailyStats
};
