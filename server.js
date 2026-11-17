/**
 * CRDITEACH - SERVER & API GATEWAY
 * Serves static assets, routes authentication endpoints,
 * manages persistent sessions and database connections.
 */

import multer from 'multer';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

import { initDatabase } from './server/db.js';
import {
  handleGetCaptcha,
  handleSendEmailOtp,
  handleVerifyEmailOtp,
  handleSendPhoneOtp,
  handleVerifyPhoneOtp,
  handleRegister,
  handleLogin,
  handleSendLoginOtp,
  handleLogout,
  handleGetMe,
  handleUpdateAddress,
  requireAuth
} from './server/auth.js';
import {
  handleGetUserData,
  handleSaveUserData,
  handleGetAllCourses,
  handlePublishCourse,
  handleCourseEngage,
  handleEndLiveStream,
  handleGetCourseComments,
  handlePostCourseComment,
  handleUpdateUserProfile,
  handleGetPublicCreatorProfile,
  handleUpdateCourseNotes,
  handleUpdateCourse,
  handleDeleteCourse,
  handleCreateReport
} from './server/userData.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'crditeach_knowledge_secret_2026';

// 1. Initialize SQLite Database
initDatabase();

// 2. Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(SESSION_SECRET));

// 3. Security Headers & Sensitive File Shield
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent direct public access to database files, secrets, or server code
  const p = req.path.toLowerCase();
  if (
    p.endsWith('.db') ||
    p.endsWith('.db-wal') ||
    p.endsWith('.db-shm') ||
    p.includes('.env') ||
    p.startsWith('/server') ||
    p === '/package.json' ||
    p === '/package-lock.json'
  ) {
    return res.status(403).json({ error: 'Access denied: protected resource.' });
  }

  next();
});

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded videos publicly so the video player can stream them
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer storage for video files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

const uploadVideoMiddleware = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // Max 500MB video size
});

// API Endpoint to upload physical video file (Requires Authentication)
app.post('/api/upload-video', requireAuth, uploadVideoMiddleware.single('videoFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded.' });
  }
  const publicVideoUrl = `/uploads/${req.file.filename}`;
  return res.json({ success: true, videoUrl: publicVideoUrl });
});

// -------------------------------------------------------------
// CUSTOM THUMBNAIL IMAGE UPLOAD (POST /api/upload-thumbnail)
// -------------------------------------------------------------
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `thumb-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB image
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) are allowed!'));
    }
  }
});

app.post('/api/upload-thumbnail', requireAuth, imageUpload.single('thumbnailFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No thumbnail image uploaded.' });
    }
    const thumbnailUrl = `/uploads/${req.file.filename}`;
    return res.json({ success: true, thumbnailUrl });
  } catch (err) {
    console.error('Thumbnail upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload thumbnail.' });
  }
});

// Notes & Code Attachment Upload Route (server.js - Requires Authentication)
const notesStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'notes');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const uploadNotesFile = multer({
  storage: notesStorage,
  limits: { fileSize: 50 * 1024 * 1024 } // Max 50MB attachment
});

app.post('/api/upload-notes-file', requireAuth, uploadNotesFile.single('notesFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No notes file uploaded.' });
  }
  const fileUrl = `/uploads/notes/${req.file.filename}`;
  return res.json({
    success: true,
    fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size
  });
});

// =============================================================
// 4. API Endpoints

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Crditeach Platform', timestamp: new Date().toISOString() });
});

// Authentication & Verification
app.get('/api/auth/captcha', handleGetCaptcha);
app.post('/api/auth/send-email-otp', handleSendEmailOtp);
app.post('/api/auth/verify-email-otp', handleVerifyEmailOtp);
app.post('/api/auth/send-phone-otp', handleSendPhoneOtp);
app.post('/api/auth/verify-phone-otp', handleVerifyPhoneOtp);
app.post('/api/auth/register', handleRegister);
app.post('/api/auth/login', handleLogin);
app.post('/api/auth/send-login-otp', handleSendLoginOtp);
app.post('/api/auth/logout', handleLogout);
app.get('/api/auth/me', handleGetMe);
app.post('/api/user/address', requireAuth, handleUpdateAddress);

// User Data Persistence & Courses
app.get('/api/user/data', requireAuth, handleGetUserData);
app.post('/api/user/data', requireAuth, handleSaveUserData);
app.post('/api/courses', requireAuth, handlePublishCourse);
app.get('/api/courses', handleGetAllCourses);
app.post('/api/courses/:id/engage', handleCourseEngage);
app.post('/api/courses/:id/end-live', requireAuth, handleEndLiveStream);
app.get('/api/courses/:id/comments', handleGetCourseComments);
app.post('/api/courses/:id/comments', requireAuth, handlePostCourseComment);
app.post('/api/user/profile', requireAuth, handleUpdateUserProfile);
app.get('/api/creators/:userId', handleGetPublicCreatorProfile);
app.put('/api/courses/:courseId', requireAuth, handleUpdateCourse);
app.delete('/api/courses/:courseId', requireAuth, handleDeleteCourse);
app.patch('/api/courses/:courseId/notes', requireAuth, handleUpdateCourseNotes);
app.post('/api/reports', handleCreateReport);

// 5. Serve Static Frontend Files
app.use(express.static(path.resolve(__dirname, './')));

// Fallback to index.html for root or client navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

// 6. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 7. Start Server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Crditeach Web Platform running at: http://localhost:${PORT}`);
  console.log(`⚡ Zero Video Ads • Peer Knowledge Exchange • Persistent DB`);
  console.log(`==================================================\n`);
});
