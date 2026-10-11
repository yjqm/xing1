'use strict';

const mysql = require('mysql2/promise');
const config = require('./config');

/**
 * MySQL 连接池。mysql2 的 createPool 不会立即建立连接，
 * 第一次查询时才连，因此即使数据库暂未就绪，服务也能正常启动监听。
 */
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  charset: config.db.charset,
  connectionLimit: config.db.connectionLimit,
  waitForConnections: config.db.waitForConnections,
  timezone: config.db.timezone,
  // 支持旧版 MySQL 认证（5.5/5.6）
  supportBigNumbers: true,
  bigNumberStrings: false
});

/**
 * 建库 + 建表（幂等）。MySQL 5.5 兼容写法：
 * - 使用 utf8mb4
 * - 时间字段用 DATETIME，由应用层写入，避免 5.5 对多 TIMESTAMP 默认值的限制
 */
const SCHEMA_SQL = `
CREATE DATABASE IF NOT EXISTS \`${config.db.database}\`
  DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_general_ci;

USE \`${config.db.database}\`;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(40) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  nickname VARCHAR(60) DEFAULT NULL,
  created_at DATETIME NOT NULL,
  last_login DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_username (username),
  UNIQUE KEY uq_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INT UNSIGNED NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id),
  KEY idx_ur_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS learning_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  course_id VARCHAR(30) NOT NULL DEFAULT '',
  chapter_num INT DEFAULT NULL,
  kp_idx INT DEFAULT NULL,
  kp_name VARCHAR(160) DEFAULT NULL,
  duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  detail LONGTEXT,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_le_user_created (user_id, created_at),
  KEY idx_le_type_created (event_type, created_at),
  KEY idx_le_kp_name (kp_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_studied (
  user_id INT UNSIGNED NOT NULL,
  course_id VARCHAR(30) NOT NULL,
  chapter_id VARCHAR(30) NOT NULL,
  kp_idx INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, course_id, chapter_id, kp_idx),
  KEY idx_us_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_scores (
  user_id INT UNSIGNED NOT NULL,
  course_id VARCHAR(30) NOT NULL,
  chapter_id VARCHAR(30) NOT NULL,
  best_score INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, course_id, chapter_id),
  KEY idx_us_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INT UNSIGNED NOT NULL,
  achievement_id VARCHAR(60) NOT NULL,
  unlocked_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, achievement_id),
  KEY idx_ua_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_stats (
  user_id INT UNSIGNED NOT NULL,
  study_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  questions_done INT UNSIGNED NOT NULL DEFAULT 0,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  ai_sessions INT UNSIGNED NOT NULL DEFAULT 0,
  last_study_date DATE DEFAULT NULL,
  streak_days INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_data (
  user_id INT UNSIGNED NOT NULL,
  data_key VARCHAR(60) NOT NULL,
  data_value LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (user_id, data_key),
  KEY idx_ud_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS community_posts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  author VARCHAR(60) NOT NULL,
  avatar VARCHAR(8) DEFAULT NULL,
  color VARCHAR(16) DEFAULT NULL,
  tag VARCHAR(20) NOT NULL DEFAULT '讨论',
  topic VARCHAR(80) NOT NULL DEFAULT '',
  title VARCHAR(200) NOT NULL,
  content LONGTEXT,
  attachments LONGTEXT,
  likes INT UNSIGNED NOT NULL DEFAULT 0,
  shares INT UNSIGNED NOT NULL DEFAULT 0,
  comment_count INT UNSIGNED NOT NULL DEFAULT 0,
  hot_score INT UNSIGNED NOT NULL DEFAULT 0,
  challenge_date DATE DEFAULT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_cp_created (created_at),
  KEY idx_cp_hot (hot_score),
  KEY idx_cp_topic (topic),
  KEY idx_cp_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS community_likes (
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (post_id, user_id),
  KEY idx_cl_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS community_comments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  author VARCHAR(60) NOT NULL,
  avatar VARCHAR(8) DEFAULT NULL,
  color VARCHAR(16) DEFAULT NULL,
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_cc_post (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS community_topics (
  stat_date DATE NOT NULL,
  topic VARCHAR(80) NOT NULL,
  post_count INT UNSIGNED NOT NULL DEFAULT 0,
  hot_score INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (stat_date, topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS daily_challenges (
  challenge_date DATE NOT NULL,
  topic VARCHAR(80) NOT NULL,
  question TEXT NOT NULL,
  hint VARCHAR(255) DEFAULT NULL,
  source VARCHAR(16) NOT NULL DEFAULT 'bank',
  created_at DATETIME NOT NULL,
  PRIMARY KEY (challenge_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DELETE FROM user_data WHERE data_key = 'community';
DELETE FROM user_data WHERE data_key = 'apiconfig';
`;

async function initSchema() {
  // 先确保数据库存在（不指定 database 连接后建库）
  const root = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    charset: config.db.charset,
    connectionLimit: 1
  });
  try {
    // 逐条执行，避免多语句需要额外配置
    const statements = SCHEMA_SQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await root.query(stmt);
    }
    console.log('[db] 数据库与数据表已就绪 (' + config.db.database + ')');
  } finally {
    await root.end();
  }
}

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    return true;
  } finally {
    conn.release();
  }
}

module.exports = { pool, initSchema, testConnection };
