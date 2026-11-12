/**
 * FULL PROFILE VIEW COMPONENT
 * Implements full-page responsive profile view with user identity,
 * locked Sign-in IDs, editable address, learning progress, and teaching analytics.
 */

import { state } from '../state.js';
import { auth } from '../auth.js';
import { openAuthModal } from './authModal.js';

let navigateCallback = null;

export function initProfileView(onNavigate) {
  navigateCallback = onNavigate;
  renderProfileView();

  // Re-render whenever auth or state changes
  auth.subscribe(() => renderProfileView());
  state.subscribe(() => renderProfileView());
}

export function renderProfileView() {
  const mount = document.getElementById('profile-mount');
  if (!mount) return;

  const isAuth = auth.isAuthenticated();
  const user = auth.user || {};
  const appUser = state.user;

  // If user is guest/logged out, show modern Guest Profile Page with demo login
  if (!isAuth) {
    mount.innerHTML = `
      <div class="profile-guest-hero">
        <div class="profile-guest-card">
          <div class="profile-guest-icon-badge">👤</div>
          <h2>Crditeach Member Profile</h2>
          <p class="profile-guest-desc">
            Sign in to access your personal dashboard, credit wallet ledger, enrolled ad-free masterclasses, and teaching portfolio.
          </p>

          <div class="profile-guest-actions">
            <button class="btn btn-primary btn-glow" id="btn-guest-signin">
              Sign In to Account
            </button>
            <button class="btn btn-outline-nav" id="btn-guest-register">
              Create New Account
            </button>
          </div>

          <div class="profile-guest-divider">
            <span>Or Explore Live With</span>
          </div>

          <button class="btn btn-secondary btn-demo-card-btn" id="btn-guest-demo">
            ⚡ Explore with Demo Account (Maya Patel)
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-guest-signin')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('btn-guest-register')?.addEventListener('click', () => openAuthModal('register'));
    document.getElementById('btn-guest-demo')?.addEventListener('click', async () => {
      await loginAsDemo();
    });
    return;
  }

  // Logged-in full profile view
  const fullName = user.fullName || appUser.name || 'Member';
  const email = user.email || 'user@crditeach.org';
  const phone = user.phone || '+880 1712-345678';
  const address = user.address || '';
  const tier = appUser.tier || 'Apprentice Teacher';
  const credits = appUser.credits ?? 0;
  const cash = (appUser.cash ?? 0).toFixed(2);
  const studentsTaught = appUser.studentsTaught ?? 0;
  const enrolledCourses = state.courses.filter(c => state.enrolledCourseIds.includes(c.id));

  const initials = fullName
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  mount.innerHTML = `
    <div class="full-profile-container">
      
      <!-- 1. Hero Cover Banner -->
      <div class="profile-banner-card">
        <div class="banner-cover-bg"></div>
        <div class="banner-content-row">
          <div class="banner-avatar-wrapper">
            <div class="banner-avatar-ring">
              <span class="banner-initials">${initials}</span>
            </div>
            <span class="online-indicator-pill" title="Account Verified">🟢 Verified</span>
          </div>

          <div class="banner-info-group">
            <div class="banner-title-strip">
              <h1 class="profile-user-fullname">${fullName}</h1>
              <span class="badge-tier-tag">${tier}</span>
            </div>
            <p class="profile-meta-text">
              <span>Member ID: <code>${user.id ? user.id.slice(0, 14) : 'usr_verified'}...</code></span>
              <span class="meta-dot">•</span>
              <span>Peer Knowledge Exchange Network</span>
              <span class="meta-dot">•</span>
              <span>0 In-Video Ads Active</span>
            </p>
          </div>

          <div class="banner-action-buttons">
            <button class="btn btn-secondary-sm" id="profile-goto-studio">
              ⚡ Teacher Studio
            </button>
            <button class="btn btn-danger-sm" id="btn-full-profile-logout">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Overview Metrics Strip -->
      <div class="profile-metrics-grid">
        <div class="metric-card">
          <div class="m-card-header">
            <span class="m-label">Available Learning Credits</span>
            <span class="m-icon credit-m">₢</span>
          </div>
          <div class="m-value">${credits} ₢</div>
          <span class="m-subtext">Redeemable for 100% free courses</span>
        </div>

        <div class="metric-card">
          <div class="m-card-header">
            <span class="m-label">Learner Cash Balance</span>
            <span class="m-icon cash-m">$</span>
          </div>
          <div class="m-value">$${cash}</div>
          <span class="m-subtext">Direct income from pure learners</span>
        </div>

        <div class="metric-card">
          <div class="m-card-header">
            <span class="m-label">Enrolled Masterclasses</span>
            <span class="m-icon course-m">🎓</span>
          </div>
          <div class="m-value">${enrolledCourses.length}</div>
          <span class="m-subtext">Zero advertisement interruptions</span>
        </div>

        <div class="metric-card">
          <div class="m-card-header">
            <span class="m-label">Students Mentored</span>
            <span class="m-icon student-m">👥</span>
          </div>
          <div class="m-value">${studentsTaught}</div>
          <span class="m-subtext">Recognition: ${tier}</span>
        </div>
      </div>

      <!-- 3. Main Profile Content Split Grid -->
      <div class="profile-main-grid">
        
        <!-- LEFT COLUMN: Identity, Locked Credentials & Editable Address -->
        <div class="profile-col-identity">
          <div class="profile-panel-card">
            <div class="panel-card-header">
              <div class="panel-title-with-icon">
                <span class="p-icon">🛡️</span>
                <div>
                  <h3>Account Credentials & Identity</h3>
                  <p>Permanent sign-in identifiers & verifiable address</p>
                </div>
              </div>
            </div>

            <!-- Notification Feedback Box -->
            <div class="auth-alert success-alert" id="full-profile-success-alert" style="display: none;"></div>
            <div class="auth-alert error-alert" id="full-profile-error-alert" style="display: none;"></div>

            <div class="identity-fields-list">
              <!-- Field 1: Name (Locked) -->
              <div class="id-field-item">
                <div class="id-label-strip">
                  <span class="id-label">Full Name</span>
                  <span class="locked-badge">🔒 Locked</span>
                </div>
                <div class="id-val-display">${fullName}</div>
              </div>

              <!-- Field 2: Email (Locked Sign-in ID) -->
              <div class="id-field-item">
                <div class="id-label-strip">
                  <span class="id-label">Sign-in ID (Email Address)</span>
                  <span class="locked-badge">🔒 Locked</span>
                </div>
                <div class="id-val-display">${email}</div>
              </div>

              <!-- Field 3: Mobile (Locked Sign-in ID) -->
              <div class="id-field-item">
                <div class="id-label-strip">
                  <span class="id-label">Sign-in ID (Mobile Number)</span>
                  <span class="locked-badge">🔒 Locked</span>
                </div>
                <div class="id-val-display">${phone}</div>
              </div>

              <!-- Field 4: Address (ONLY EDITABLE FIELD) -->
              <div class="id-field-item address-highlight-box">
                <div class="id-label-strip">
                  <span class="id-label address-title">Delivery / Contact Address</span>
                  <span class="editable-badge">✏️ Editable</span>
                </div>
                <div class="address-input-group">
                  <input 
                    type="text" 
                    id="full-profile-address-input" 
                    class="address-text-input" 
                    placeholder="Enter your address (e.g. House 42, Road 11, Banani, Dhaka)" 
                    value="${address}" 
                  />
                  <button type="button" class="btn btn-emerald btn-save-addr" id="btn-save-full-address">
                    Save Address
                  </button>
                </div>
                <small class="address-security-note">
                  ℹ️ <strong>Security Policy:</strong> Name and Sign-in IDs (Email and Mobile Number) are permanently secured for account protection. Only your Address can be updated.
                </small>
              </div>
            </div>
          </div>

          <!-- Quick Teaching Simulation Card -->
          <div class="profile-panel-card" style="margin-top: 20px;">
            <div class="panel-card-header">
              <div class="panel-title-with-icon">
                <span class="p-icon">⚡</span>
                <div>
                  <h3>Interactive Teaching Engine</h3>
                  <p>Earn +50 Credits instantly by teaching a peer</p>
                </div>
              </div>
            </div>
            <p style="font-size: 0.86rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
              Conduct a quick peer coaching session. Watch your Credits, rank, and teaching record increment live.
            </p>
            <button class="btn btn-emerald btn-glow" id="btn-profile-teach-sim" style="width: 100%;">
              ⚡ Teach a Student Simulation (+50 ₢)
            </button>
          </div>
        </div>

        <!-- RIGHT COLUMN: Enrolled Courses & Learning Progress -->
        <div class="profile-col-activity">
          
          <!-- Enrolled Courses Card -->
          <div class="profile-panel-card">
            <div class="panel-card-header">
              <div class="panel-title-with-icon">
                <span class="p-icon">🎓</span>
                <div>
                  <h3>My Ad-Free Classroom Courses</h3>
                  <p>Pick up right where you left off with zero interruptions</p>
                </div>
              </div>
              <button class="btn btn-secondary-sm" id="btn-browse-marketplace">
                + Browse More
              </button>
            </div>

            <div class="profile-courses-list">
              ${enrolledCourses.length === 0 ? `
                <div class="profile-empty-list">
                  <p>You haven't enrolled in any skill sessions yet.</p>
                  <button class="btn btn-secondary" id="btn-empty-enroll">Browse Marketplace</button>
                </div>
              ` : enrolledCourses.map((c, i) => `
                <div class="profile-course-card" data-course-id="${c.id}">
                  <img src="${c.thumbnail}" alt="${c.title}" class="p-course-thumb" />
                  <div class="p-course-info">
                    <div class="p-course-cat">${c.categoryName} • ${c.format}</div>
                    <h4 class="p-course-title">${c.title}</h4>
                    <div class="p-course-mentor">Instructor: ${c.instructor.name} (${c.instructor.tier})</div>
                    <div class="p-course-progress-bar">
                      <div class="p-progress-fill" style="width: ${i === 0 ? '75%' : '35%'};"></div>
                    </div>
                  </div>
                  <button class="btn btn-primary-sm btn-resume-course" data-cid="${c.id}">
                    ▶ Resume (0 Ads)
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recent Credit Activity Ledger Card -->
          <div class="profile-panel-card" style="margin-top: 20px;">
            <div class="panel-card-header">
              <div class="panel-title-with-icon">
                <span class="p-icon">📜</span>
                <div>
                  <h3>Recent Learning & Credit Activity</h3>
                  <p>Transparent ledger of credits circulated, earned, and redeemed</p>
                </div>
              </div>
            </div>

            <div class="profile-ledger-list">
              ${state.ledger.length === 0 ? `
                <div style="text-align: center; color: var(--text-muted); padding: 20px;">No activity recorded yet.</div>
              ` : state.ledger.slice(0, 5).map(item => `
                <div class="ledger-item ${item.type}">
                  <div class="l-info">
                    <strong>${item.title}</strong>
                    <div style="font-size:0.75rem; color: var(--text-muted);">${item.date}</div>
                  </div>
                  <span class="l-amt">${item.amount}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

      </div>

    </div>
  `;

  // --- Attach Handlers ---

  // 1. Save Address Handler
  const saveBtn = document.getElementById('btn-save-full-address');
  const addrInput = document.getElementById('full-profile-address-input');
  saveBtn?.addEventListener('click', async () => {
    const newAddr = (addrInput?.value || '').trim();
    clearFullProfileAlerts();

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      await auth.updateAddress(newAddr);
      showFullProfileSuccess('✓ Address updated successfully!');

      window.showToast?.('Address Saved', 'Your profile address has been updated.', 'success');
    } catch (err) {
      showFullProfileError(err.message || 'Failed to update address.');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Address';
    }
  });

  // 2. Sign Out Handler
  document.getElementById('btn-full-profile-logout')?.addEventListener('click', async () => {
    await auth.logout();
    window.showToast?.('Signed Out', 'You have been logged out.', 'info');
    renderProfileView();
  });

  // 3. Navigation shortcuts
  document.getElementById('profile-goto-studio')?.addEventListener('click', () => {
    if (navigateCallback) navigateCallback('studio');
  });

  document.getElementById('btn-browse-marketplace')?.addEventListener('click', () => {
    if (navigateCallback) navigateCallback('marketplace');
  });

  document.getElementById('btn-empty-enroll')?.addEventListener('click', () => {
    if (navigateCallback) navigateCallback('marketplace');
  });

  // 4. Resume Course buttons
  document.querySelectorAll('.btn-resume-course').forEach(btn => {
    btn.addEventListener('click', () => {
      const cid = btn.getAttribute('data-cid');
      if (cid) {
        state.activeCourseId = cid;
      }
      if (navigateCallback) navigateCallback('classroom');
    });
  });

  // 5. Teaching simulation shortcut
  document.getElementById('btn-profile-teach-sim')?.addEventListener('click', () => {
    const res = state.teachStudentSimulation('Sarah Connor', 'Distributed Systems & Go');
    window.showToast?.(
      'Teaching Complete!',
      `Taught Sarah Connor. Earned +${res.earnedCredits} Credits!`,
      'success'
    );
    renderProfileView();
  });
}

async function loginAsDemo() {
  try {
    const demoUser = {
      fullName: 'Maya Patel',
      email: 'maya.patel@crditeach.org',
      phone: '+880 1712-345678',
      password: 'demoPassword123',
      address: 'House 42, Road 11, Banani, Dhaka, Bangladesh'
    };

    try {
      await auth.register(demoUser);
    } catch (e) {
      // If already registered, login
      await auth.login({ identifier: demoUser.email, password: demoUser.password });
    }

    window.showToast?.('Demo Sign In', 'Welcome Maya Patel! Exploring with full demo profile.', 'success');
    renderProfileView();
  } catch (err) {
    console.error('Demo login error:', err);
  }
}

function showFullProfileSuccess(msg) {
  const el = document.getElementById('full-profile-success-alert');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function showFullProfileError(msg) {
  const el = document.getElementById('full-profile-error-alert');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
  }
}

function clearFullProfileAlerts() {
  const s = document.getElementById('full-profile-success-alert');
  const e = document.getElementById('full-profile-error-alert');
  if (s) s.style.display = 'none';
  if (e) e.style.display = 'none';
}

