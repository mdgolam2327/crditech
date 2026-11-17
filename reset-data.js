import fs from 'fs';
import path from 'path';
import { db } from './server/db.js'; // Directly uses your server's exact SQLite database!

// 1. Delete all physical files inside uploads/
const uploadDir = path.join(process.cwd(), 'uploads');
if (fs.existsSync(uploadDir)) {
  for (const file of fs.readdirSync(uploadDir)) {
    fs.rmSync(path.join(uploadDir, file), { recursive: true, force: true });
  }
  console.log('🗑️ Cleared all files in uploads/ folder.');
}

// 2. Delete all courses & comments from the active SQLite database
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

if (tables.includes('courses')) {
  const info = db.prepare('DELETE FROM courses').run();
  console.log(`✅ Deleted ${info.changes} courses/videos from database.`);
}

if (tables.includes('course_comments')) {
  const cmtInfo = db.prepare('DELETE FROM course_comments').run();
  console.log(`✅ Deleted ${cmtInfo.changes} comments from database.`);
}

// 3. Safely clean any enrolled/active course columns inside user_data (if present)
if (tables.includes('user_data')) {
  const userCols = db.prepare(`PRAGMA table_info(user_data)`).all().map(c => c.name);
  if (userCols.includes('enrolled_course_ids')) {
    db.prepare(`UPDATE user_data SET enrolled_course_ids = '[]'`).run();
  }
  if (userCols.includes('active_course_id')) {
    db.prepare(`UPDATE user_data SET active_course_id = NULL`).run();
  }
  console.log('✅ Cleaned user_data course references.');
}

console.log('🎉 100% Reset Complete! All old & demo videos are permanently gone.');