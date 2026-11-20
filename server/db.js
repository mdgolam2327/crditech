/**
 * CRDITEACH - PERSISTENT SQLITE DATABASE ENGINE
 * Uses Node 24 native node:sqlite for zero-dependency local storage.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../crditeach.db');

export const db = new DatabaseSync(DB_PATH);

// Enable Foreign Keys & Write-Ahead Logging for speed & integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

// Initialize Tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      address TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      skills TEXT DEFAULT '',
      email_verified INTEGER DEFAULT 1,
      phone_verified INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      user_agent TEXT,
      ip_address TEXT
    );

    CREATE TABLE IF NOT EXISTS verifications (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      type TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'teacher',
      credits INTEGER DEFAULT 0,
      cash REAL DEFAULT 0.0,
      tier TEXT DEFAULT 'Apprentice Teacher',
      tier_progress INTEGER DEFAULT 0,
      students_taught INTEGER DEFAULT 0,
      total_credits_earned INTEGER DEFAULT 0,
      total_cash_earned REAL DEFAULT 0.0,
      avatar TEXT,
      enrolled_course_ids TEXT DEFAULT '[]',
      active_course_id TEXT,
      claimed_sponsor_ids TEXT DEFAULT '[]',
      ledger TEXT DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      category_name TEXT NOT NULL,
      desc TEXT NOT NULL,
      format TEXT NOT NULL,
      duration TEXT NOT NULL,
      instructor_json TEXT NOT NULL,
      pricing_model TEXT NOT NULL,
      credit_price INTEGER DEFAULT 0,
      cash_fee REAL,
      rating REAL DEFAULT 5.0,
      reviews_count INTEGER DEFAULT 0,
      video_url TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      syllabus_json TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_comments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      target_title TEXT NOT NULL,
      category TEXT NOT NULL,
      details TEXT NOT NULL,
      reporter_email TEXT DEFAULT '',
      reporter_id TEXT,
      destination_email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS user_saved_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS user_downloads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_title TEXT NOT NULL,
      file_url TEXT NOT NULL,
      file_type TEXT DEFAULT 'video',
      downloaded_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      thumbnail TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS playlist_items (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      added_at TEXT NOT NULL,
      UNIQUE(playlist_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      theme TEXT DEFAULT 'dark',
      email_notifications INTEGER DEFAULT 1,
      course_alerts INTEGER DEFAULT 1,
      activity_privacy INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_target ON verifications(target, type);
    CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_course ON course_comments(course_id);
    CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON user_follows(following_id);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON user_follows(follower_id);
    CREATE INDEX IF NOT EXISTS idx_saved_user ON user_saved_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_downloads_user ON user_downloads(user_id);
    CREATE INDEX IF NOT EXISTS idx_playlists_user ON user_playlists(user_id);
    CREATE INDEX IF NOT EXISTS idx_playlist_items_pl ON playlist_items(playlist_id);
  `);

  const userColumns = [
    "ALTER TABLE users ADD COLUMN address TEXT DEFAULT '';",
    "ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT '';",
    "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';",
    "ALTER TABLE users ADD COLUMN skills TEXT DEFAULT '';"
  ];
  for (const q of userColumns) {
    try {
      db.exec(q);
    } catch (e) { }
  }

  // Add new columns for Smart Search, Ranking & Live Shorts safely
  const newCourseColumns = [
    "ALTER TABLE courses ADD COLUMN tags TEXT DEFAULT '';",
    "ALTER TABLE courses ADD COLUMN views INTEGER DEFAULT 0;",
    "ALTER TABLE courses ADD COLUMN support_count INTEGER DEFAULT 0;",
    "ALTER TABLE courses ADD COLUMN is_live INTEGER DEFAULT 0;"
  ];

  for (const query of newCourseColumns) {
    try {
      db.exec(query);
    } catch (e) {
      // Column already exists, ignore
    }
  }

  console.log('📦 Crditeach SQLite Database initialized at:', DB_PATH);
}
