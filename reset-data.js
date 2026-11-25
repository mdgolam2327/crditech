/**
 * CRDITEACH - COMPLETE DATABASE & MEDIA RESET SCRIPT
 *
 * 1. Creates an automatic backup before clearing (saved in backups/).
 * 2. Clears all user accounts, sessions, wallets, courses, playlists, comments, and reports.
 * 3. Clears uploaded physical media (videos, thumbnails, notes).
 * 4. Clears Supabase tables as well if Supabase credentials are configured in .env.
 */

import fs from 'fs';
import path from 'path';
import { db } from './server/db.js';
import { isSupabaseConfigured, supabaseAdmin } from './server/supabase.js';

console.log('================================================================');
console.log('⚠️  CRDITEACH COMPLETE DATABASE RESET');
console.log('================================================================\n');

// 1. Create a safe backup before wiping
const DB_PATH = path.resolve(process.cwd(), 'crditeach.db');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
if (fs.existsSync(DB_PATH)) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `pre_wipe_backup_${timestamp}.db`);
  fs.copyFileSync(DB_PATH, backupFile);
  console.log(`📦 Safety backup created at: ${backupFile}`);
}

// 2. Clear all SQLite tables
const tablesToWipe = [
  'playlist_items',
  'user_playlists',
  'user_saved_items',
  'user_downloads',
  'user_follows',
  'credit_transactions',
  'course_comments',
  'courses',
  'reports',
  'verifications',
  'user_sessions',
  'user_preferences',
  'user_data',
  'users'
];

db.exec('PRAGMA foreign_keys = OFF;');

let totalDeleted = 0;
for (const table of tablesToWipe) {
  try {
    const res = db.prepare(`DELETE FROM ${table}`).run();
    console.log(`🗑️  Cleared table '${table}' (${res.changes} rows deleted)`);
    totalDeleted += res.changes;
  } catch (err) {
    // table might not exist
  }
}

db.exec('PRAGMA foreign_keys = ON;');
db.exec('VACUUM;');

console.log(`\n✅ Local SQLite database wiped completely (${totalDeleted} total rows removed).`);

// 3. Clear physical uploaded files
const uploadDir = path.join(process.cwd(), 'uploads');
if (fs.existsSync(uploadDir)) {
  let fileCount = 0;
  for (const item of fs.readdirSync(uploadDir)) {
    const itemPath = path.join(uploadDir, item);
    fs.rmSync(itemPath, { recursive: true, force: true });
    fileCount++;
  }
  console.log(`🗑️  Cleared uploads directory (${fileCount} files/folders removed).`);
}

// 4. Wipe Supabase tables if configured
if (isSupabaseConfigured() && supabaseAdmin) {
  console.log('\n☁️  Clearing Supabase Cloud tables...');
  const supabaseTables = [
    'playlist_items',
    'user_playlists',
    'user_saved_items',
    'user_downloads',
    'user_follows',
    'credit_transactions',
    'course_comments',
    'courses',
    'reports',
    'user_preferences',
    'user_data',
    'profiles'
  ];

  for (const st of supabaseTables) {
    try {
      const { error } = await supabaseAdmin.from(st).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.warn(`   Supabase wipe on '${st}':`, error.message);
      } else {
        console.log(`   Cleared Supabase table '${st}'`);
      }
    } catch (e) {
      // ignore
    }
  }
}

console.log('\n🎉 ALL WEBSITE DATA HAS BEEN COMPLETELY REMOVED!');
console.log('   The database is now a fresh, blank canvas.');
