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

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_target ON verifications(target, type);
    CREATE INDEX IF NOT EXISTS idx_courses_user ON courses(user_id);
  `);

  try {
    db.exec("ALTER TABLE users ADD COLUMN address TEXT DEFAULT '';");
  } catch (e) {
    // Column already exists
  }

  console.log('📦 Crditeach SQLite Database initialized at:', DB_PATH);
}
