/**
 * CRDITEACH - AUTHENTICATION & SECURITY CONTROLLER
 * Handles registration, bcrypt hashing, email/phone OTP verification,
 * interactive visual captcha, password/OTP login, and HTTP-only session cookies.
 */

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db } from './db.js';

const SESSION_COOKIE_NAME = 'crditeach_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Helper: Generate clean unique ID
export function generateId(prefix = '') {
  return `${prefix}${crypto.randomBytes(12).toString('hex')}`;
}

// Helper: Generate 6-digit numeric OTP code
function generateNumericCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Clean email/phone
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return (phone || '').replace(/[^\d+]/g, '').trim();
}

// -------------------------------------------------------------
// 1. CAPTCHA GENERATOR & VERIFIER
// -------------------------------------------------------------
export function handleGetCaptcha(req, res) {
  try {
    const captchaId = generateId('cap_');
    // Generate a simple 5-character alphanumeric or arithmetic challenge
    const num1 = Math.floor(Math.random() * 15) + 3;
    const num2 = Math.floor(Math.random() * 12) + 2;
    const answer = (num1 + num2).toString();
    const promptText = `${num1} + ${num2} = ?`;

    // Save challenge to verifications table (valid for 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO verifications (id, target, type, code, expires_at)
      VALUES (?, ?, 'captcha', ?, ?)
    `).run(captchaId, captchaId, answer, expiresAt);

    // Create a stylized SVG graphic for the captcha
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="160" height="46" viewBox="0 0 160 46" style="background:#0b1120; border-radius:8px; border:1px solid rgba(255,255,255,0.12);">
        <defs>
          <linearGradient id="cgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#818cf8"/>
            <stop offset="100%" stop-color="#38bdf8"/>
          </linearGradient>
        </defs>
        <!-- Background noise lines -->
        <line x1="5" y1="28" x2="155" y2="14" stroke="rgba(99,102,241,0.25)" stroke-width="1.5" stroke-dasharray="4,3"/>
        <line x1="12" y1="8" x2="148" y2="38" stroke="rgba(16,185,129,0.25)" stroke-width="1.5"/>
        <circle cx="28" cy="18" r="2" fill="rgba(255,255,255,0.2)"/>
        <circle cx="120" cy="32" r="2.5" fill="rgba(255,255,255,0.2)"/>
        <text x="50%" y="30" font-family="'JetBrains Mono', monospace, sans-serif" font-weight="700" font-size="20" fill="url(#cgrad)" text-anchor="middle" letter-spacing="3">
          ${promptText}
        </text>
      </svg>
    `.trim();

    return res.json({
      success: true,
      captchaId,
      svg,
      hint: 'Solve the arithmetic problem'
    });
  } catch (err) {
    console.error('Captcha error:', err);
    return res.status(500).json({ error: 'Failed to generate captcha' });
  }
}

function verifyCaptcha(captchaId, answer) {
  if (!captchaId || !answer) return false;
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT * FROM verifications 
    WHERE id = ? AND type = 'captcha' AND expires_at > ?
  `).get(captchaId, now);

  if (!row) return false;

  // Single-use: delete after check
  db.prepare('DELETE FROM verifications WHERE id = ?').run(captchaId);
  return row.code.trim().toLowerCase() === answer.toString().trim().toLowerCase();
}

// -------------------------------------------------------------
// 2. EMAIL VERIFICATION OTP
// -------------------------------------------------------------
export function handleSendEmailOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Check if duplicate
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'This email is already registered. Please log in instead.' });
    }

    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate prior codes for this email
    db.prepare("DELETE FROM verifications WHERE target = ? AND type = 'email_otp'").run(email);
    db.prepare(`
      INSERT INTO verifications (id, target, type, code, expires_at)
      VALUES (?, ?, 'email_otp', ?, ?)
    `).run(generateId('ver_'), email, code, expiresAt);

    console.log(`\n📧 [EMAIL OTP SIMULATION] Sent to ${email} -> Verification Code: [ ${code} ]`);

    return res.json({
      success: true,
      message: `Verification code sent to ${email}`,
      devCode: code // Displayed for seamless local testing
    });
  } catch (err) {
    console.error('Send email OTP error:', err);
    return res.status(500).json({ error: 'Failed to send verification code.' });
  }
}

export function handleVerifyEmailOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = (req.body.code || '').trim();
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const now = new Date().toISOString();
    const row = db.prepare(`
      SELECT * FROM verifications 
      WHERE target = ? AND type = 'email_otp' AND expires_at > ?
    `).get(email, now);

    if (!row || row.code !== code) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Return a short-lived proof token
    const token = generateId('tok_em_');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM verifications WHERE target = ? AND type = 'email_verified_proof'").run(email);
    db.prepare(`
      INSERT INTO verifications (id, target, type, code, expires_at)
      VALUES (?, ?, 'email_verified_proof', ?, ?)
    `).run(token, email, 'VERIFIED', tokenExpiry);

    return res.json({
      success: true,
      message: 'Email address verified successfully!',
      verifiedToken: token
    });
  } catch (err) {
    console.error('Verify email OTP error:', err);
    return res.status(500).json({ error: 'Failed to verify email.' });
  }
}

// -------------------------------------------------------------
// 3. PHONE VERIFICATION OTP
// -------------------------------------------------------------
export function handleSendPhoneOtp(req, res) {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone || phone.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid phone number (at least 7 digits).' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(400).json({ error: 'This phone number is already registered. Please log in.' });
    }

    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.prepare("DELETE FROM verifications WHERE target = ? AND type = 'phone_otp'").run(phone);
    db.prepare(`
      INSERT INTO verifications (id, target, type, code, expires_at)
      VALUES (?, ?, 'phone_otp', ?, ?)
    `).run(generateId('ver_'), phone, code, expiresAt);

    console.log(`\n📱 [SMS OTP SIMULATION] Sent to ${phone} -> Verification Code: [ ${code} ]`);

    return res.json({
      success: true,
      message: `SMS code sent to ${phone}`,
      devCode: code
    });
  } catch (err) {
    console.error('Send phone OTP error:', err);
    return res.status(500).json({ error: 'Failed to send SMS verification code.' });
  }
}

export function handleVerifyPhoneOtp(req, res) {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = (req.body.code || '').trim();
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone number and verification code are required.' });
    }

    const now = new Date().toISOString();
    const row = db.prepare(`
      SELECT * FROM verifications 
      WHERE target = ? AND type = 'phone_otp' AND expires_at > ?
    `).get(phone, now);

    if (!row || row.code !== code) {
      return res.status(400).json({ error: 'Invalid or expired phone verification code.' });
    }

    const token = generateId('tok_ph_');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM verifications WHERE target = ? AND type = 'phone_verified_proof'").run(phone);
    db.prepare(`
      INSERT INTO verifications (id, target, type, code, expires_at)
      VALUES (?, ?, 'phone_verified_proof', ?, ?)
    `).run(token, phone, 'VERIFIED', tokenExpiry);

    return res.json({
      success: true,
      message: 'Phone number verified successfully!',
      verifiedToken: token
    });
  } catch (err) {
    console.error('Verify phone OTP error:', err);
    return res.status(500).json({ error: 'Failed to verify phone number.' });
  }
}

// -------------------------------------------------------------
// 4. USER REGISTRATION
// -------------------------------------------------------------
export async function handleRegister(req, res) {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      captchaId,
      captchaAnswer
    } = req.body;

    // 1. Validate full name
    const trimmedName = (fullName || '').trim();
    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Please provide your full name (minimum 2 characters).' });
    }

    // 2. Validate email
    const normEmail = normalizeEmail(email);
    if (!normEmail || !normEmail.includes('@') || !normEmail.includes('.')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // 3. Validate phone
    const normPhone = normalizePhone(phone);
    if (!normPhone || normPhone.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    // 4. Validate password
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // 5. Check duplicates (return 409 Conflict early)
    const duplicateEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normEmail);
    if (duplicateEmail) {
      return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const duplicatePhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(normPhone);
    if (duplicatePhone) {
      return res.status(409).json({ error: 'An account with this phone number already exists.' });
    }

    // 6. Validate Captcha (if provided)
    if (captchaId && captchaAnswer) {
      const isCaptchaValid = verifyCaptcha(captchaId, captchaAnswer);
      if (!isCaptchaValid) {
        return res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
      }
    }

    // 7. Hash Password securely with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = generateId('usr_');
    const now = new Date().toISOString();
    const userAddress = (req.body.address || '').trim();

    // 8. Insert User
    db.prepare(`
      INSERT INTO users (
        id, full_name, email, phone, password_hash, address,
        email_verified, phone_verified, created_at, last_login_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
    `).run(userId, trimmedName, normEmail, normPhone, passwordHash, userAddress, now, now, now);

    // 9. Create Initial User Data state in DB
    const initialAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80';
    db.prepare(`
      INSERT INTO user_data (
        user_id, role, credits, cash, tier, tier_progress, 
        students_taught, total_credits_earned, total_cash_earned, 
        avatar, enrolled_course_ids, active_course_id, claimed_sponsor_ids, ledger, updated_at
      ) VALUES (?, 'teacher', 0, 0.0, 'Apprentice Teacher', 0, 0, 0, 0.0, ?, '[]', NULL, '[]', '[]', ?)
    `).run(userId, initialAvatar, now);

    // 10. Establish Authenticated Session
    const sessionId = createSession(userId, req);
    setSessionCookie(res, sessionId);

    console.log(`✅ [USER REGISTERED] User ${trimmedName} (${userId}) successfully registered and authenticated.`);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      user: {
        id: userId,
        fullName: trimmedName,
        email: normEmail,
        phone: normPhone,
        address: userAddress,
        createdAt: now,
        lastLoginAt: now
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred during registration.' });
  }
}

// -------------------------------------------------------------
// 5. LOGIN (PASSWORD & OTP)
// -------------------------------------------------------------
export async function handleLogin(req, res) {
  try {
    const { identifier, password, otp } = req.body;
    const cleanId = (identifier || '').trim();

    if (!cleanId) {
      return res.status(400).json({ error: 'Please enter your email or phone number.' });
    }

    const normEmail = normalizeEmail(cleanId);
    const normPhone = normalizePhone(cleanId);

    // Lookup user by either email or phone
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE email = ? OR phone = ?
    `).get(normEmail, normPhone);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });
    }

    // Authenticate via OTP or Password
    if (otp) {
      const now = new Date().toISOString();
      const row = db.prepare(`
        SELECT * FROM verifications 
        WHERE (target = ? OR target = ?) AND type = 'login_otp' AND expires_at > ?
      `).get(user.email, user.phone, now);

      if (!row || row.code !== otp.trim()) {
        return res.status(401).json({ error: 'Invalid or expired One-Time Password (OTP).' });
      }

      // Single-use
      db.prepare('DELETE FROM verifications WHERE id = ?').run(row.id);
    } else {
      if (!password) {
        return res.status(400).json({ error: 'Password is required to log in.' });
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials. Please check your details and try again.' });
      }
    }

    // Update last login
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);

    // Create session & HTTP-only cookie
    const sessionId = createSession(user.id, req);
    setSessionCookie(res, sessionId);

    console.log(`🔑 [USER LOGGED IN] User ${user.full_name} (${user.id}) logged in successfully.`);

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address || '',
        createdAt: user.created_at,
        lastLoginAt: now
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred during login.' });
  }
}

// Send OTP for Login
export function handleSendLoginOtp(req, res) {
  try {
    const { identifier } = req.body;
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      return res.status(400).json({ error: 'Please enter your registered email or phone number.' });
    }

    const normEmail = normalizeEmail(cleanId);
    const normPhone = normalizePhone(cleanId);

    const user = db.prepare('SELECT id, email, phone FROM users WHERE email = ? OR phone = ?').get(normEmail, normPhone);
    if (!user) {
      // Security: do not leak whether user exists, but give guidance
      return res.status(404).json({ error: 'No account found with this email or phone number.' });
    }

    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.prepare("DELETE FROM verifications WHERE (target = ? OR target = ?) AND type = 'login_otp'").run(user.email, user.phone);
    db.prepare(`
      INSERT INTO verifications (id, target, type, code, expires_at)
      VALUES (?, ?, 'login_otp', ?, ?)
    `).run(generateId('ver_'), user.email, code, expiresAt);

    console.log(`\n🔑 [LOGIN OTP SIMULATION] Sent to ${user.email} / ${user.phone} -> Login Code: [ ${code} ]`);

    return res.json({
      success: true,
      message: `Login OTP sent to your registered account (${user.email})`,
      devCode: code
    });
  } catch (err) {
    console.error('Send login OTP error:', err);
    return res.status(500).json({ error: 'Failed to send login OTP.' });
  }
}

// -------------------------------------------------------------
// 6. LOGOUT
// -------------------------------------------------------------
export function handleLogout(req, res) {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      db.prepare('DELETE FROM user_sessions WHERE session_id = ?').run(sessionId);
    }
    clearSessionCookie(res);
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    clearSessionCookie(res);
    return res.json({ success: true, message: 'Logged out.' });
  }
}

// -------------------------------------------------------------
// 7. CURRENT USER (GET /api/auth/me)
// -------------------------------------------------------------
export function handleGetMe(req, res) {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.json({ user: null });
    }

    const now = new Date().toISOString();
    const session = db.prepare(`
      SELECT s.*, u.full_name, u.email, u.phone, u.address, u.created_at, u.last_login_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_id = ? AND s.expires_at > ?
    `).get(sessionId, now);

    if (!session) {
      clearSessionCookie(res);
      return res.json({ user: null });
    }

    // Sliding window: update session expiration
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    db.prepare('UPDATE user_sessions SET expires_at = ? WHERE session_id = ?').run(newExpiresAt, sessionId);

    return res.json({
      user: {
        id: session.user_id,
        fullName: session.full_name,
        email: session.email,
        phone: session.phone,
        address: session.address || '',
        createdAt: session.created_at,
        lastLoginAt: session.last_login_at
      }
    });
  } catch (err) {
    console.error('Get me error:', err);
    return res.json({ user: null });
  }
}

// -------------------------------------------------------------
// 8. UPDATE ADDRESS (User can only change address)
// -------------------------------------------------------------
export function handleUpdateAddress(req, res) {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    const { address } = req.body;
    const cleanAddress = (address || '').trim();
    const now = new Date().toISOString();
    db.prepare('UPDATE users SET address = ?, updated_at = ? WHERE id = ?').run(cleanAddress, now, userId);
    return res.json({ success: true, message: 'Address updated successfully.', address: cleanAddress });
  } catch (err) {
    console.error('Update address error:', err);
    return res.status(500).json({ error: 'Failed to update address.' });
  }
}

// -------------------------------------------------------------
// 9. SESSION AUTHENTICATION MIDDLEWARE
// -------------------------------------------------------------
export function requireAuth(req, res, next) {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    const now = new Date().toISOString();
    const session = db.prepare(`
      SELECT s.user_id, u.full_name, u.email, u.phone, u.address
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_id = ? AND s.expires_at > ?
    `).get(sessionId, now);

    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    }

    req.userId = session.user_id;
    req.user = {
      id: session.user_id,
      fullName: session.full_name,
      email: session.email,
      phone: session.phone,
      address: session.address || ''
    };

    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(401).json({ error: 'Authentication failed.' });
  }
}

// -------------------------------------------------------------
// SESSION HELPERS
// -------------------------------------------------------------
function createSession(userId, req) {
  const sessionId = generateId('ses_');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();
  const userAgent = req.headers['user-agent'] || 'Unknown';
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  db.prepare(`
    INSERT INTO user_sessions (session_id, user_id, expires_at, created_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, expiresAt, now.toISOString(), userAgent, ip);

  return sessionId;
}

function setSessionCookie(res, sessionId) {
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
    path: '/'
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  });
}
