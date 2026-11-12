# 🎓 Crditeach — Peer Skill-Sharing & Knowledge Exchange Platform

> **Teach to Learn • Zero In-Video Ads • Earn Credits**

Crditeach is a **community-driven learning platform** where students, developers, and creators learn from each other, teach their skills, earn credits (₢), and unlock new learning opportunities — all without annoying video ads.

---

## ✨ Features

### 🛒 Marketplace
- Browse all community-published courses
- Filter by category, pricing model, and rating
- Enroll with **Credits (₢)** or **Cash (₹)**

### 📺 Ad-Free Classroom
- Watch enrolled courses with **zero in-video ads**
- Track your enrolled course count with a live badge
- Structured syllabus per course

### 🎙️ Teacher Studio
- Publish your own courses to the community
- Set pricing: **Credit-only**, **Cash**, or **Dual** model
- Earn credits when students enroll in your courses
- Track your **teacher tier** and progress

### 💼 Sponsor Lounge
- Claim one-time sponsor rewards
- Exclusive deals for active community teachers

### 👤 Profile & Wallet
- View your credit balance, cash, and transaction ledger
- Teacher tier system: Apprentice → Expert → Master
- Track students taught and total earnings

---

## 🏗️ Tech Stack

| Layer       | Technology                                        |
|-------------|---------------------------------------------------|
| **Frontend**| Vanilla HTML5, CSS3, ES Modules (JavaScript)      |
| **Backend** | Node.js 24+, Express.js (ESM)                     |
| **Database**| SQLite via Node 24 native `node:sqlite`           |
| **Auth**    | bcryptjs (password hashing), HTTP-only session cookies |
| **Security**| CAPTCHA, Email OTP, Phone OTP, CORS, CSP headers  |
| **Fonts**   | Inter, Outfit, JetBrains Mono (Google Fonts)      |

---

## 📁 Project Structure

```
Crditeach/
├── index.html              # Single-page app shell
├── server.js               # Express server & API gateway
├── package.json
├── .env                    # Environment variables (local only)
├── .env.example            # Environment variable template
├── crditeach.db            # SQLite database (auto-created)
│
├── CSS/
│   └── style.css           # Global dark-theme stylesheet
│
├── js/
│   ├── app.js              # App bootstrap, router & toast system
│   ├── auth.js             # Client-side auth state management
│   ├── state.js            # Global reactive state store
│   └── components/
│       ├── authModal.js    # Login / Register modal
│       ├── marketplace.js  # Course marketplace view
│       ├── classroom.js    # Ad-free video classroom view
│       ├── teacherStudio.js# Course publishing studio
│       ├── sponsorLounge.js# Sponsor rewards view
│       ├── navbar.js       # Top navigation bar
│       └── profileView.js  # User profile & wallet view
│
└── server/
    ├── auth.js             # Auth controller (register, login, OTP, sessions)
    ├── db.js               # SQLite schema & database initialization
    └── userData.js         # User data & course persistence controller
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js v24+** (required for native `node:sqlite`)
- npm

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd Crditeach

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env as needed
```

### Environment Variables

```env
PORT=3000
SESSION_SECRET=your_super_secret_key_here
NODE_ENV=development
OTP_DEV_MODE=true
```

### Running the App

```bash
# Production
npm start

# Development (with auto-restart on file changes)
npm run dev
```

Then open your browser at: **[http://localhost:3000](http://localhost:3000)**

> [!NOTE]
> The SQLite database (`crditeach.db`) is automatically created and initialized on first run. No separate database setup is needed.

---

## 🔐 Authentication System

Crditeach implements a **multi-layer security** flow:

| Step | Method | Details |
|------|--------|---------|
| 1 | **CAPTCHA** | Server-generated SVG arithmetic challenge (10-min expiry) |
| 2 | **Email OTP** | 6-digit code, 5-min expiry, single-use |
| 3 | **Phone OTP** | 6-digit code, 5-min expiry, single-use |
| 4 | **Password** | bcrypt-hashed (10 rounds) |
| 5 | **Session** | HTTP-only signed cookie, 7-day sliding window |

### Login Options
- **Password login** — email/phone + password
- **OTP login** — passwordless, 6-digit one-time code

> [!TIP]
> In development mode (`OTP_DEV_MODE=true`), OTP codes are printed to the server console for easy testing. No email/SMS service is required locally.

---

## 🌐 API Reference

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/captcha` | No | Generate CAPTCHA challenge |
| `POST` | `/api/auth/send-email-otp` | No | Send email verification OTP |
| `POST` | `/api/auth/verify-email-otp` | No | Verify email OTP, get proof token |
| `POST` | `/api/auth/send-phone-otp` | No | Send phone verification OTP |
| `POST` | `/api/auth/verify-phone-otp` | No | Verify phone OTP, get proof token |
| `POST` | `/api/auth/register` | No | Register new user account |
| `POST` | `/api/auth/login` | No | Login with password or OTP |
| `POST` | `/api/auth/send-login-otp` | No | Send OTP for passwordless login |
| `POST` | `/api/auth/logout` | No | Destroy session & clear cookie |
| `GET` | `/api/auth/me` | Cookie | Get current authenticated user |

### User Data

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/user/data` | ✅ Required | Get user's wallet, enrollments & courses |
| `POST` | `/api/user/data` | ✅ Required | Save/sync user state |
| `POST` | `/api/user/address` | ✅ Required | Update user's address |

### Courses

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/courses` | No | Fetch all community courses |
| `POST` | `/api/courses` | ✅ Required | Publish a new course |

---

## 🗄️ Database Schema

```
users           — Account credentials & profile
user_sessions   — Active HTTP-only session tokens (7-day TTL)
verifications   — OTP & CAPTCHA challenges (5–15 min TTL)
user_data       — Wallet, credits, tier, enrollments, ledger
courses         — All community-published courses
```

> [!NOTE]
> The database uses **WAL (Write-Ahead Logging)** mode and **foreign key constraints** for data integrity and concurrent read performance.

---

## 🔒 Security Highlights

- Passwords hashed with **bcrypt** (10 salt rounds)
- Sessions use **signed HTTP-only cookies** (not accessible via JavaScript)
- All OTPs and CAPTCHAs are **single-use and time-limited**
- Security headers on every response: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- User ID is **always taken from the server session**, never from request body
- JSON body size limit: **10 MB**

---

## 💡 Credit Economy (₢)

Crditeach runs on a **credit-based economy**:

- **Earn ₢** — Publish courses; earn credits when students enroll
- **Spend ₢** — Enroll in other teachers' credit-priced courses
- **Tier Up** — Accumulate credits to advance your teacher tier
  - 🌱 Apprentice Teacher → 🔥 Rising Teacher → ⭐ Expert Teacher → 👑 Master Teacher

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you'd like to change.

---

## 📄 License

This project is for educational and community use.

---

<div align="center">
  <strong>Crditeach</strong> — <em>Teach to Learn • 0 In-Video Ads</em>
</div>

