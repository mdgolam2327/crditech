/**
 * CRDITEACH - USER DATA PERSISTENCE & COURSES CONTROLLER
 * Ensures each user's activities, wallet, enrollments, and published classes
 * are securely saved and associated exclusively with their unique User ID.
 */

import { db } from './db.js';

// -------------------------------------------------------------
// GET USER'S PERSISTED DATA (GET /api/user/data)
// -------------------------------------------------------------
export function handleGetUserData(req, res) {
  try {
    const userId = req.user.id;
    let row = db.prepare('SELECT * FROM user_data WHERE user_id = ?').get(userId);

    const now = new Date().toISOString();
    if (!row) {
      // Initialize if missing
      db.prepare(`
        INSERT INTO user_data (
          user_id, role, credits, cash, tier, tier_progress, 
          students_taught, total_credits_earned, total_cash_earned, 
          avatar, enrolled_course_ids, active_course_id, claimed_sponsor_ids, ledger, updated_at
        ) VALUES (?, 'teacher', 0, 0.0, 'Apprentice Teacher', 0, 0, 0, 0.0, 
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        '[]', NULL, '[]', '[]', ?)
      `).run(userId, now);
      row = db.prepare('SELECT * FROM user_data WHERE user_id = ?').get(userId);
    }

    // Parse JSON columns safely
    let enrolledCourseIds = [];
    let claimedSponsorIds = [];
    let ledger = [];

    try { enrolledCourseIds = JSON.parse(row.enrolled_course_ids || '[]'); } catch { enrolledCourseIds = []; }
    try { claimedSponsorIds = JSON.parse(row.claimed_sponsor_ids || '[]'); } catch { claimedSponsorIds = []; }
    try { ledger = JSON.parse(row.ledger || '[]'); } catch { ledger = []; }

    // Fetch custom courses published by this user
    const myCustomCourses = db.prepare('SELECT * FROM courses WHERE user_id = ?').all(userId);
    const parsedCustomCourses = myCustomCourses.map(c => ({
      id: c.id,
      title: c.title,
      category: c.category,
      categoryName: c.category_name,
      desc: c.desc,
      format: c.format,
      duration: c.duration,
      instructor: JSON.parse(c.instructor_json),
      pricingModel: c.pricing_model,
      creditPrice: c.credit_price,
      cashFee: c.cash_fee,
      rating: c.rating,
      reviewsCount: c.reviews_count,
      videoUrl: c.video_url,
      thumbnail: c.thumbnail,
      syllabus: JSON.parse(c.syllabus_json),
      notes: c.notes
    }));

    return res.json({
      success: true,
      userData: {
        role: row.role,
        credits: row.credits,
        cash: row.cash,
        tier: row.tier,
        tierProgress: row.tier_progress,
        studentsTaught: row.students_taught,
        totalCreditsEarned: row.total_credits_earned,
        totalCashEarned: row.total_cash_earned,
        avatar: row.avatar,
        enrolledCourseIds,
        activeCourseId: row.active_course_id,
        claimedSponsorIds,
        ledger,
        publishedCourses: parsedCustomCourses,
        updatedAt: row.updated_at
      }
    });
  } catch (err) {
    console.error('Get user data error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user data.' });
  }
}

// -------------------------------------------------------------
// SAVE USER'S PERSISTED DATA (POST /api/user/data)
// -------------------------------------------------------------
export function handleSaveUserData(req, res) {
  try {
    const userId = req.user.id; // STRICT: Always use session user ID, never client body
    const payload = req.body || {};

    const role = payload.role === 'learner' ? 'learner' : 'teacher';
    const credits = Math.max(0, parseInt(payload.credits) || 0);
    const cash = Math.max(0, parseFloat(payload.cash) || 0.0);
    const tier = (payload.tier || 'Apprentice Teacher').trim();
    const tierProgress = Math.min(100, Math.max(0, parseInt(payload.tierProgress) || 0));
    const studentsTaught = Math.max(0, parseInt(payload.studentsTaught) || 0);
    const totalCreditsEarned = Math.max(0, parseInt(payload.totalCreditsEarned) || 0);
    const totalCashEarned = Math.max(0, parseFloat(payload.totalCashEarned) || 0.0);
    const avatar = payload.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';
    const enrolledCourseIds = JSON.stringify(Array.isArray(payload.enrolledCourseIds) ? payload.enrolledCourseIds : []);
    const activeCourseId = payload.activeCourseId || null;
    const claimedSponsorIds = JSON.stringify(Array.isArray(payload.claimedSponsorIds) ? payload.claimedSponsorIds : []);
    const ledger = JSON.stringify(Array.isArray(payload.ledger) ? payload.ledger.slice(0, 100) : []);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_data (
        user_id, role, credits, cash, tier, tier_progress,
        students_taught, total_credits_earned, total_cash_earned,
        avatar, enrolled_course_ids, active_course_id, claimed_sponsor_ids, ledger, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        role = excluded.role,
        credits = excluded.credits,
        cash = excluded.cash,
        tier = excluded.tier,
        tier_progress = excluded.tier_progress,
        students_taught = excluded.students_taught,
        total_credits_earned = excluded.total_credits_earned,
        total_cash_earned = excluded.total_cash_earned,
        avatar = excluded.avatar,
        enrolled_course_ids = excluded.enrolled_course_ids,
        active_course_id = excluded.active_course_id,
        claimed_sponsor_ids = excluded.claimed_sponsor_ids,
        ledger = excluded.ledger,
        updated_at = excluded.updated_at
    `).run(
      userId, role, credits, cash, tier, tierProgress,
      studentsTaught, totalCreditsEarned, totalCashEarned,
      avatar, enrolledCourseIds, activeCourseId, claimedSponsorIds, ledger, now
    );

    return res.json({
      success: true,
      message: 'User data synced successfully',
      updatedAt: now
    });
  } catch (err) {
    console.error('Save user data error:', err);
    return res.status(500).json({ error: 'Failed to save user data.' });
  }
}

// -------------------------------------------------------------
// PUBLISH COURSE TO DATABASE (POST /api/courses)
// -------------------------------------------------------------
export function handlePublishCourse(req, res) {
  try {
    const userId = req.user.id;
    const c = req.body;

    if (!c.title || !c.category) {
      return res.status(400).json({ error: 'Title and category are required.' });
    }

    // Fetch creator's real profile from DB so instructor info always matches their actual profile
    const dbUser = db.prepare('SELECT full_name, avatar FROM users WHERE id = ?').get(userId);
    const realName = (dbUser?.full_name || req.user.fullName || 'Creator').trim();
    const realAvatar = (
      dbUser?.avatar ||
      c.instructor?.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(realName)}`
    ).trim();

    const courseId = c.id || `course-${Date.now()}`;
    const now = new Date().toISOString();

    const instructorJson = JSON.stringify({
      name: realName,
      avatar: realAvatar
    });

    const syllabusJson = JSON.stringify(
      Array.isArray(req.body?.syllabus) && req.body.syllabus.length > 0 ? req.body.syllabus : []
    );

    const cleanTags = (c.tags || '').toLowerCase().trim();
    const cleanDesc = (c.desc || '').trim();
    const cleanNotes = (c.notes || '').trim();
    const isLive = c.isLive ? 1 : 0;

    db.prepare(`
      INSERT INTO courses (
        id, user_id, title, category, category_name, desc,
        format, duration, instructor_json, pricing_model,
        credit_price, cash_fee, rating, reviews_count,
        video_url, thumbnail, syllabus_json, notes,
        tags, views, support_count, is_live, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      courseId,
      userId,
      c.title.trim(),
      c.category,
      c.categoryName || '',
      cleanDesc,
      c.format || (isLive ? 'LIVE' : 'Video'),
      c.duration || '',
      instructorJson,
      c.pricingModel || 'free',
      parseInt(c.creditPrice) || 0,
      c.pricingModel === 'credit-only' ? null : (parseFloat(c.cashFee) || 0),
      0, // initial rating (no fake 5.0)
      0, // initial reviews_count (no fake 1 review)
      c.videoUrl || '',
      c.thumbnail || '',
      syllabusJson,
      cleanNotes,
      cleanTags,
      0, // initial views
      0, // initial support_count
      isLive,
      now
    );

    return res.status(201).json({
      success: true,
      message: isLive ? 'Live stream started!' : 'Video published to main feed!',
      courseId
    });
  } catch (err) {
    console.error('Publish course error:', err);
    return res.status(500).json({ error: 'Failed to publish course to database.' });
  }
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// -------------------------------------------------------------
// GET ALL COURSES WITH SMART SEARCH & BEST RANKING (GET /api/courses)
// -------------------------------------------------------------
export function handleGetAllCourses(req, res) {
  try {
    const searchQuery = (req.query.q || '').trim().toLowerCase();
    const rows = db.prepare('SELECT * FROM courses').all();

    let courses = rows.map(c => ({
      id: c.id,
      userId: c.user_id,
      title: c.title,
      category: c.category,
      categoryName: c.category_name,
      desc: c.desc,
      format: c.format,
      duration: c.duration,
      instructor: safeJsonParse(c.instructor_json, { name: 'Creator', avatar: '' }),
      pricingModel: c.pricing_model,
      creditPrice: c.credit_price,
      cashFee: c.cash_fee,
      rating: c.rating || 5.0,
      reviewsCount: c.reviews_count || 0,
      videoUrl: c.video_url,
      thumbnail: c.thumbnail,
      syllabus: safeJsonParse(c.syllabus_json, []),
      notes: c.notes,
      tags: c.tags || '',
      views: c.views || 0,
      supportCount: c.support_count || 0,
      isLive: Boolean(c.is_live),
      createdAt: c.created_at
    }));

    // 1. Smart Tag & Keyword Filtering
    if (searchQuery) {
      const keywords = searchQuery.split(/\s+/); // Split by spaces
      courses = courses.filter(course => {
        const instructorName = course.instructor?.name || 'Creator';
        const searchableText = `${course.title} ${course.tags} ${course.categoryName} ${course.desc} ${instructorName}`.toLowerCase();
        // Match if ANY keyword matches tags, title, or category
        return keywords.some(kw => searchableText.includes(kw));
      });
    }

    // 2. Best Ranking Algorithm: (Views * 1) + (Support * 5) + (Rating * 10)
    courses.sort((a, b) => {
      const scoreA = (a.views * 1) + (a.supportCount * 5) + (a.rating * 10);
      const scoreB = (b.views * 1) + (b.supportCount * 5) + (b.rating * 10);
      return scoreB - scoreA;
    });

    return res.json({ success: true, courses });
  } catch (err) {
    console.error('Get all courses error:', err);
    return res.status(500).json({ error: 'Failed to fetch courses.' });
  }
}

// -------------------------------------------------------------
// END LIVE STREAM & MOVE TO MAIN FEED (POST /api/courses/:id/end-live)
// -------------------------------------------------------------
export function handleEndLiveStream(req, res) {
  try {
    const { id } = req.params;
    const { recordedVideoUrl, duration } = req.body || {};

    const userId = req.user?.id || req.userId || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to end this live stream.' });
    }

    const tableInfo = db.prepare(`PRAGMA table_info(courses)`).all();
    const colNames = tableInfo.map(c => c.name);

    const videoCol = colNames.includes('video_url')
      ? 'video_url'
      : (colNames.includes('videoUrl') ? 'videoUrl' : null);

    if (!videoCol) {
      db.exec(`ALTER TABLE courses ADD COLUMN video_url TEXT`);
    }
    const targetVideoCol = videoCol || 'video_url';

    const userCol = colNames.includes('user_id') ? 'user_id' : 'userId';
    const liveCol = colNames.includes('is_live') ? 'is_live' : 'isLive';

    const existingCourse = db.prepare(`SELECT id, ${userCol} AS ownerId FROM courses WHERE id = ?`).get(id);

    // If the old stream ID was wiped from DB during a clean reset, gracefully succeed so UI clears it
    if (!existingCourse) {
      return res.json({ success: true, message: 'Stream session closed.' });
    }

    if (existingCourse.ownerId && String(existingCourse.ownerId) !== String(userId)) {
      return res.status(403).json({ error: 'Not authorized to end this stream.' });
    }

    if (recordedVideoUrl) {
      db.prepare(`
        UPDATE courses 
        SET ${liveCol} = 0, format = 'Recorded Live', duration = ?, ${targetVideoCol} = ?
        WHERE id = ?
      `).run(duration || 'Recorded Stream', recordedVideoUrl, id);
    } else {
      db.prepare(`
        UPDATE courses 
        SET ${liveCol} = 0, format = 'Recorded Live', duration = 'Recorded Stream'
        WHERE id = ?
      `).run(id);
    }

    return res.json({ success: true, message: 'Live ended and published to main feed!' });
  } catch (err) {
    console.error('End live stream error:', err);
    return res.status(500).json({ error: err.message || 'Failed to end live stream.' });
  }
}

// -------------------------------------------------------------
// INCREMENT VIEW OR SUPPORT COUNT (POST /api/courses/:id/engage)
// -------------------------------------------------------------
export function handleCourseEngage(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'view' or 'support'

    if (action === 'view') {
      db.prepare('UPDATE courses SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(id);
    } else if (action === 'support') {
      db.prepare('UPDATE courses SET support_count = COALESCE(support_count, 0) + 1 WHERE id = ?').run(id);
    }

    const updated = db.prepare('SELECT views, support_count FROM courses WHERE id = ?').get(id);
    return res.json({ success: true, views: updated?.views || 0, supportCount: updated?.support_count || 0 });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update engagement' });
  }
}

// -------------------------------------------------------------
// LIVE CHAT & COURSE COMMENTS (SQLite Persistent Storage)
// -------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS course_comments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

// GET /api/courses/:id/comments
export function handleGetCourseComments(req, res) {
  try {
    const { id } = req.params;
    const comments = db.prepare(`
      SELECT id, course_id AS courseId, user_id AS userId, user_name AS userName, message, created_at AS createdAt
      FROM course_comments
      WHERE course_id = ?
      ORDER BY created_at ASC
    `).all(id);

    return res.json({ success: true, comments });
  } catch (err) {
    console.error('Get comments error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments.' });
  }
}

// POST /api/courses/:id/comments
export function handlePostCourseComment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please sign in first.' });
    }

    const userRow = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
    const userName = req.user?.fullName || userRow?.full_name || 'Learner';
    const message = (req.body?.message || '').trim();

    if (!message) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const commentId = 'cmt-' + Date.now() + '-' + Math.round(Math.random() * 1000);
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO course_comments (id, course_id, user_id, user_name, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(commentId, id, userId, userName, message, createdAt);

    return res.json({
      success: true,
      comment: { id: commentId, courseId: id, userId, userName, message, createdAt }
    });
  } catch (err) {
    console.error('Post comment error:', err);
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
}

// -------------------------------------------------------------
// USER PROFILE & CHANNEL CUSTOMIZATION (POST /api/user/profile)
// -------------------------------------------------------------
function ensureUserProfileColumns() {
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!tableExists) return;

    const cols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
    if (!cols.includes('avatar')) {
      db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);
    }
    if (!cols.includes('bio')) {
      db.exec(`ALTER TABLE users ADD COLUMN bio TEXT`);
    }
    if (!cols.includes('skills')) {
      db.exec(`ALTER TABLE users ADD COLUMN skills TEXT`);
    }
  } catch (e) {
    // Gracefully ignore if already migrated or table initializing
  }
}
ensureUserProfileColumns();

export function handleUpdateUserProfile(req, res) {
  try {
    const userId = req.user?.id || req.userId || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please sign in first.' });
    }

    const existingUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const fullName = (req.body?.fullName || existingUser.full_name || 'Learner').trim();
    const bio = (req.body?.bio !== undefined ? req.body.bio : (existingUser.bio || '')).trim();
    const skills = (req.body?.skills !== undefined ? req.body.skills : (existingUser.skills || '')).trim();
    const avatar = (req.body?.avatar || existingUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`).trim();

    // 1. Update users table
    db.prepare(`
      UPDATE users 
      SET full_name = ?, avatar = ?, bio = ?, skills = ?
      WHERE id = ?
    `).run(fullName, avatar, bio, skills, userId);

    // Sync avatar to user_data table as well
    db.prepare(`UPDATE user_data SET avatar = ? WHERE user_id = ?`).run(avatar, userId);

    // 2. Sync updated name & avatar across all courses published by this creator
    const userCourses = db.prepare('SELECT id, instructor_json FROM courses WHERE user_id = ?').all(userId);
    const updateCourseStmt = db.prepare('UPDATE courses SET instructor_json = ? WHERE id = ?');

    for (const c of userCourses) {
      try {
        const inst = JSON.parse(c.instructor_json || '{}');
        inst.name = fullName;
        inst.avatar = avatar;
        updateCourseStmt.run(JSON.stringify(inst), c.id);
      } catch (e) { }
    }

    const userDataRow = db.prepare('SELECT credits FROM user_data WHERE user_id = ?').get(userId);
    const currentCredits = userDataRow?.credits ?? 0;

    return res.json({
      success: true,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        fullName,
        avatar,
        bio,
        skills,
        credits: currentCredits
      }
    });
  } catch (err) {
    console.error('Update user profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

// -------------------------------------------------------------
// GET PUBLIC CREATOR CHANNEL INFO (GET /api/creators/:userId)
// -------------------------------------------------------------
export function handleGetPublicCreatorProfile(req, res) {
  try {
    const { userId } = req.params;
    const creator = db.prepare(
      'SELECT id, full_name, avatar, bio FROM users WHERE id = ?'
    ).get(userId);

    if (!creator) {
      return res.status(404).json({ error: 'Creator profile not found.' });
    }

    return res.json({
      success: true,
      creator: {
        id: creator.id,
        fullName: creator.full_name,
        avatar: creator.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creator.full_name || 'Creator')}`,
        bio: creator.bio || ''
      }
    });
  } catch (err) {
    console.error('Get public creator error:', err);
    return res.status(500).json({ error: 'Failed to load creator channel.' });
  }
}

// -------------------------------------------------------------
// UPDATE / EDIT USER'S OWN COURSE (PUT /api/courses/:courseId)
// -------------------------------------------------------------
export function handleUpdateCourse(req, res) {
  try {
    const userId = req.user?.id || req.userId || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please sign in first.' });
    }

    const { courseId } = req.params;
    const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!existing) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (String(existing.user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own videos.' });
    }

    const c = req.body || {};
    const title = (c.title !== undefined ? c.title : existing.title).trim();
    if (!title) {
      return res.status(400).json({ error: 'Video title cannot be empty.' });
    }

    const category = (c.category !== undefined ? c.category : existing.category).trim();
    const categoryName = (c.categoryName !== undefined ? c.categoryName : existing.category_name).trim();
    const desc = (c.desc !== undefined ? c.desc : (existing.desc || '')).trim();
    const notes = (c.notes !== undefined ? c.notes : (existing.notes || '')).trim();
    const thumbnail = (c.thumbnail !== undefined ? c.thumbnail : (existing.thumbnail || '')).trim();
    const tags = (c.tags !== undefined ? c.tags : (existing.tags || '')).toLowerCase().trim();
    const pricingModel = c.pricingModel !== undefined ? c.pricingModel : existing.pricing_model;
    const creditPrice = c.creditPrice !== undefined ? (parseInt(c.creditPrice, 10) || 0) : existing.credit_price;
    const cashFee = pricingModel === 'credit-only'
      ? null
      : (c.cashFee !== undefined ? (parseFloat(c.cashFee) || 0) : existing.cash_fee);

    db.prepare(`
      UPDATE courses
      SET title = ?, category = ?, category_name = ?, desc = ?, notes = ?,
          thumbnail = ?, tags = ?, pricing_model = ?, credit_price = ?, cash_fee = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title, category, categoryName, desc, notes,
      thumbnail, tags, pricingModel, creditPrice, cashFee,
      courseId, userId
    );

    return res.json({
      success: true,
      message: 'Video updated successfully!'
    });
  } catch (err) {
    console.error('Update course error:', err);
    return res.status(500).json({ error: 'Failed to update video.' });
  }
}

// -------------------------------------------------------------
// DELETE USER'S OWN COURSE (DELETE /api/courses/:courseId)
// -------------------------------------------------------------
export function handleDeleteCourse(req, res) {
  try {
    const userId = req.user?.id || req.userId || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Please sign in first.' });
    }

    const { courseId } = req.params;
    const existing = db.prepare('SELECT id, user_id FROM courses WHERE id = ?').get(courseId);
    if (!existing) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    if (String(existing.user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own videos.' });
    }

    // Remove associated comments and the course record
    db.prepare('DELETE FROM course_comments WHERE course_id = ?').run(courseId);
    db.prepare('DELETE FROM courses WHERE id = ? AND user_id = ?').run(courseId, userId);

    return res.json({
      success: true,
      message: 'Video deleted permanently.'
    });
  } catch (err) {
    console.error('Delete course error:', err);
    return res.status(500).json({ error: 'Failed to delete video.' });
  }
}

// UPDATE LESSON NOTES & ATTACHMENTS (WORKS DURING LIVE STREAMING TOO)
export function handleUpdateCourseNotes(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { courseId } = req.params;
    const { notes } = req.body || {};

    const existing = db.prepare('SELECT id, user_id FROM courses WHERE id = ?').get(courseId);
    if (!existing) return res.status(404).json({ error: 'Session not found' });
    if (String(existing.user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Only the stream owner can update notes.' });
    }

    db.prepare('UPDATE courses SET notes = ? WHERE id = ? AND user_id = ?').run(
      String(notes || '').trim(),
      courseId,
      userId
    );

    return res.json({ success: true, notes: String(notes || '').trim() });
  } catch (err) {
    console.error('Update notes error:', err);
    return res.status(500).json({ error: 'Failed to update lesson notes.' });
  }
}

// -------------------------------------------------------------
// SUBMIT REPORT FOR A VIDEO OR PROFILED CREATOR (POST /api/reports)
// -------------------------------------------------------------
export function handleCreateReport(req, res) {
  try {
    const {
      targetType, // 'video' or 'profile'
      targetId,
      targetTitle,
      category,
      details,
      reporterEmail
    } = req.body || {};

    if (!targetType || !targetId || !category || !details || !details.trim()) {
      return res.status(400).json({ error: 'Target, category, and report details are required.' });
    }

    const reportId = 'rep-' + Date.now() + '-' + Math.round(Math.random() * 10000);
    const destinationEmail = process.env.REPORT_NOTIFICATION_EMAIL || 'reports@crditeach.com';
    const reporterUserId = req.user?.id || req.userId || null;
    const finalReporterEmail = (reporterEmail || req.user?.email || '').trim();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reports (
        id, target_type, target_id, target_title, category, details,
        reporter_email, reporter_id, destination_email, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      reportId,
      String(targetType).toLowerCase(),
      String(targetId),
      String(targetTitle || 'Untitled'),
      String(category),
      String(details).trim(),
      finalReporterEmail,
      reporterUserId,
      destinationEmail,
      now
    );

    console.log(`\n======================================================`);
    console.log(`🚨 [REPORT DISPATCHED DIRECTLY TO: ${destinationEmail}]`);
    console.log(`Report ID:    ${reportId}`);
    console.log(`Target Type:  ${String(targetType).toUpperCase()}`);
    console.log(`Target:       "${targetTitle || 'Untitled'}" (${targetId})`);
    console.log(`Category:     ${category}`);
    console.log(`Details:      ${details.trim()}`);
    console.log(`Reporter:     ${finalReporterEmail || 'Anonymous'} ${reporterUserId ? `(User ID: ${reporterUserId})` : ''}`);
    console.log(`Sent At:      ${now}`);
    console.log(`======================================================\n`);

    return res.status(201).json({
      success: true,
      message: `Report successfully dispatched to moderation team at ${destinationEmail}.`,
      reportId,
      destinationEmail
    });
  } catch (err) {
    console.error('Report submission error:', err);
    return res.status(500).json({ error: 'Failed to process report.' });
  }
}