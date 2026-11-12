/**
 * CRDITEACH - SERVER & API GATEWAY
 * Serves static assets, routes authentication endpoints,
 * manages persistent sessions and database connections.
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
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
  handlePublishCourse,
  handleGetAllCourses
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

// 3. Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

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
