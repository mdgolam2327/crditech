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

    if (!c.title || !c.category || !c.desc) {
      return res.status(400).json({ error: 'Title, category, and description are required.' });
    }

    const courseId = c.id || `course-${Date.now()}`;
    const now = new Date().toISOString();

    const instructorJson = JSON.stringify(c.instructor || {
      name: req.user.fullName,
      role: 'Apprentice Teacher',
      studentsTaught: 0,
      tier: 'Apprentice Teacher',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
    });

    const syllabusJson = JSON.stringify(Array.isArray(c.syllabus) ? c.syllabus : [
      { id: 'l-1', title: '01. Foundational Overview', duration: '20:00', active: true }
    ]);

    db.prepare(`
      INSERT INTO courses (
        id, user_id, title, category, category_name, desc,
        format, duration, instructor_json, pricing_model,
        credit_price, cash_fee, rating, reviews_count,
        video_url, thumbnail, syllabus_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      courseId,
      userId,
      c.title,
      c.category,
      c.categoryName || 'Technology',
      c.desc,
      c.format || 'Masterclass',
      c.duration || '45 mins',
      instructorJson,
      c.pricingModel || 'dual',
      parseInt(c.creditPrice) || 0,
      c.pricingModel === 'credit-only' ? null : (parseFloat(c.cashFee) || 0),
      5.0,
      1,
      c.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      c.thumbnail || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
      syllabusJson,
      c.notes || '',
      now
    );

    return res.status(201).json({
      success: true,
      message: 'Course published to community database!',
      courseId
    });
  } catch (err) {
    console.error('Publish course error:', err);
    return res.status(500).json({ error: 'Failed to publish course to database.' });
  }
}

// -------------------------------------------------------------
// GET ALL COURSES (GET /api/courses)
// -------------------------------------------------------------
export function handleGetAllCourses(req, res) {
  try {
    const rows = db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all();
    const courses = rows.map(c => ({
      id: c.id,
      userId: c.user_id,
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
      notes: c.notes,
      createdAt: c.created_at
    }));

    return res.json({ success: true, courses });
  } catch (err) {
    console.error('Get all courses error:', err);
    return res.status(500).json({ error: 'Failed to fetch courses.' });
  }
}
