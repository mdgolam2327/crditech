/**
 * MARKETPLACE COMPONENT
 * Explore, filter, search and enroll in skill courses with Credits or Learner Cash
 */

import { state } from '../state.js';

let activeCategory = 'all';
let activePriceFilter = 'all';
let searchQuery = '';
let navigateCallback = null;

export function initMarketplace(onNavigate) {
  navigateCallback = onNavigate;
  const grid = document.getElementById('courses-grid');
  const searchInput = document.getElementById('marketplace-search');
  const clearSearchBtn = document.getElementById('clear-search');
  const catPills = document.querySelectorAll('.cat-pill');
  const filterChips = document.querySelectorAll('.filter-chip');
  const totalCoursesEl = document.getElementById('stats-total-courses');

  // Search input handler
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
    renderCourses();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderCourses();
  });

  // Category filter clicks
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.getAttribute('data-category');
      renderCourses();
    });
  });

  // Price filter clicks
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activePriceFilter = chip.getAttribute('data-price-filter');
      renderCourses();
    });
  });

  function updateQuickStats() {
    const stats = state.getPlatformStats ? state.getPlatformStats() : {
      totalCourses: state.courses.length,
      totalStudents: state.user.studentsTaught,
      totalCreditsCirculated: state.user.totalCreditsEarned,
      adInterruptions: 0
    };

    if (totalCoursesEl) {
      totalCoursesEl.textContent = stats.totalCourses;
    }
    const studentsEl = document.getElementById('stats-students-taught');
    if (studentsEl) {
      studentsEl.textContent = stats.totalStudents.toLocaleString();
    }
    const creditsEl = document.getElementById('stats-credits-circulated');
    if (creditsEl) {
      creditsEl.textContent = `${stats.totalCreditsCirculated.toLocaleString()} ₢`;
    }
  }

  function renderCourses() {
    let filtered = state.courses;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(c => c.category === activeCategory);
    }

    // Filter by pricing model
    if (activePriceFilter === 'credits') {
      filtered = filtered.filter(c => c.pricingModel === 'credit-only' || (c.pricingModel === 'dual' && c.creditPrice > 0));
    } else if (activePriceFilter === 'free') {
      filtered = filtered.filter(c => c.pricingModel === 'free' || c.creditPrice === 0);
    } else if (activePriceFilter === 'paid') {
      filtered = filtered.filter(c => c.cashFee && c.cashFee > 0);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(searchQuery) ||
        c.desc.toLowerCase().includes(searchQuery) ||
        c.instructor.name.toLowerCase().includes(searchQuery) ||
        c.categoryName.toLowerCase().includes(searchQuery)
      );
    }

    // Dynamically update quick-stats strip
    updateQuickStats();

    // DAY 0 GENESIS: If platform has zero courses published yet
    if (state.courses.length === 0) {
      if (totalCoursesEl) totalCoursesEl.textContent = '0';
      grid.innerHTML = `
        <div class="genesis-zero-card">
          <div class="genesis-badge">
            <span class="pulse-dot"></span>
            <span>Platform Genesis • All Things Started At Zero</span>
          </div>
          <h2 class="genesis-title">Be the Founding Teacher on Crditeach</h2>
          <p class="genesis-desc">
            Welcome to the starting point of the peer-to-peer knowledge network. 
            All teachers, classes, and credit balances start clean at zero. 
            Share what you know to earn Credits, build your teacher reputation, and learn from fellow peers with <strong>zero in-video ads</strong>.
          </p>

          <div class="genesis-actions-row">
            <button class="btn btn-primary btn-glow" id="genesis-publish-btn">
              + Publish First Skill Session
            </button>
            <button class="btn btn-emerald" id="genesis-teach-btn">
              ⚡ Teach a Student (+50 ₢)
            </button>
            <button class="btn btn-secondary" id="genesis-seed-btn" title="Populate sample demo courses for preview">
              📦 Load Sample Courses
            </button>
          </div>

          <div class="genesis-perks-row">
            <div class="genesis-perk">
              <span class="gp-icon">🛡️</span>
              <div>
                <strong>0 In-Video Ads</strong>
                <span>100% distraction-free video player</span>
              </div>
            </div>
            <div class="genesis-perk">
              <span class="gp-icon">⚡</span>
              <div>
                <strong>Earn by Teaching</strong>
                <span>+50 ₢ per student mentorship</span>
              </div>
            </div>
            <div class="genesis-perk">
              <span class="gp-icon">🤝</span>
              <div>
                <strong>Peer Fair-Share</strong>
                <span>Unlock courses with earned credits</span>
              </div>
            </div>
          </div>
        </div>
      `;

      const publishBtn = document.getElementById('genesis-publish-btn');
      if (publishBtn) {
        publishBtn.addEventListener('click', () => {
          const modal = document.getElementById('publish-modal');
          if (modal) modal.classList.add('open');
        });
      }

      const teachBtn = document.getElementById('genesis-teach-btn');
      if (teachBtn) {
        teachBtn.addEventListener('click', () => {
          const res = state.teachStudentSimulation('Jordan Lee', 'Fullstack Architecture');
          window.showToast('🎉 Mentorship Complete!', `Taught Jordan Lee. You earned +${res.earnedCredits} Credits!`, 'success');
          renderCourses();
        });
      }

      const seedBtn = document.getElementById('genesis-seed-btn');
      if (seedBtn) {
        seedBtn.addEventListener('click', () => {
          state.loadSampleCourses();
          window.showToast('Sample Courses Loaded', '6 demo courses loaded.', 'info');
          renderCourses();
        });
      }

      return;
    }

    if (totalCoursesEl) {
      totalCoursesEl.textContent = filtered.length;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-glass);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <h3>No matching skill sessions found</h3>
          <p style="color: var(--text-secondary); margin-top: 6px;">Try adjusting your search terms or clearing the pricing filter.</p>
          <button class="btn btn-secondary" style="margin-top: 16px;" id="reset-filters-btn">Reset All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('reset-filters-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          searchInput.value = '';
          searchQuery = '';
          clearSearchBtn.style.display = 'none';
          activeCategory = 'all';
          activePriceFilter = 'all';
          catPills.forEach(p => p.classList.remove('active'));
          catPills[0].classList.add('active');
          filterChips.forEach(c => c.classList.remove('active'));
          filterChips[0].classList.add('active');
          renderCourses();
        });
      }
      return;
    }

    grid.innerHTML = filtered.map(course => {
      const isEnrolled = state.enrolledCourseIds.includes(course.id);
      let priceMarkup = '';

      if (course.pricingModel === 'free') {
        priceMarkup = `
          <div class="credit-price-tag">
            <span>Free Community Gift</span>
          </div>
          <span class="learner-cash-sub">No fee or credits required</span>
        `;
      } else if (course.pricingModel === 'credit-only') {
        priceMarkup = `
          <div class="credit-price-tag">
            <span>₢ ${course.creditPrice}</span>
            <span class="free-sub">Credits Only</span>
          </div>
          <span class="learner-cash-sub">Exclusive peer teacher exchange</span>
        `;
      } else {
        priceMarkup = `
          <div class="credit-price-tag">
            <span>₢ ${course.creditPrice}</span>
            <span class="free-sub">or Free with Teaching</span>
          </div>
          <span class="learner-cash-sub">Learner Fee: $${course.cashFee.toFixed(2)} USD</span>
        `;
      }

      return `
        <div class="course-card" data-course-id="${course.id}">
          <div class="course-thumbnail-wrap">
            <img src="${course.thumbnail}" alt="${course.title}" class="course-thumbnail" loading="lazy" />
            <div class="ad-free-floating-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>100% Ad-Free Video</span>
            </div>
            <span class="format-badge">${course.format}</span>
          </div>

          <div class="course-body">
            <span class="course-category-tag">${course.categoryName}</span>
            <h3 class="course-title">${course.title}</h3>
            <p class="course-desc">${course.desc}</p>

            <div class="course-instructor-row">
              <div class="instructor-meta">
                <img src="${course.instructor.avatar}" alt="${course.instructor.name}" class="instructor-pic" />
                <div>
                  <span class="instructor-name">${course.instructor.name}</span>
                  <span class="instructor-rank">${course.instructor.tier}</span>
                </div>
              </div>
              <span class="students-taught-count" title="Students this mentor has taught">
                🎓 ${course.instructor.studentsTaught} Taught
              </span>
            </div>

            <div class="course-footer">
              <div class="pricing-badges">
                ${priceMarkup}
              </div>
              <button class="btn-enroll ${isEnrolled ? 'enrolled-btn' : ''}" data-enroll-id="${course.id}">
                ${isEnrolled ? '▶ Classroom' : 'Explore Skill'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers
    document.querySelectorAll('.course-card').forEach(card => {
      const courseId = card.getAttribute('data-course-id');
      card.addEventListener('click', (e) => {
        // If clicking on the action button directly
        if (e.target.closest('.enrolled-btn')) {
          state.setActiveCourse(courseId);
          if (navigateCallback) navigateCallback('classroom');
          return;
        }
        openCourseDetailModal(courseId);
      });
    });
  }

  // Subscribe to state changes to update enrollment buttons live
  state.subscribe(() => renderCourses());
  renderCourses();
}

/**
 * Detailed Enrollment Checkout & Course Details Modal
 */
function openCourseDetailModal(courseId) {
  const course = state.courses.find(c => c.id === courseId);
  if (!course) return;

  const modal = document.getElementById('enroll-modal');
  const container = document.getElementById('enroll-modal-content');
  const isEnrolled = state.enrolledCourseIds.includes(courseId);
  const userHasCredits = state.user.credits >= course.creditPrice;
  const userHasCash = course.cashFee !== null && state.user.cash >= course.cashFee;

  let actionButtonsHtml = '';

  if (isEnrolled) {
    actionButtonsHtml = `
      <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; text-align: center;">
        <h4 style="color: var(--credit-green-light); margin-bottom: 4px;">🎉 You own this session!</h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Watch anytime with zero ad interruptions.</p>
        <button class="btn btn-emerald" id="modal-go-classroom-btn" style="margin-top: 12px; width: 100%;">
          ▶ Enter Ad-Free Classroom Now
        </button>
      </div>
    `;
  } else if (course.pricingModel === 'free') {
    actionButtonsHtml = `
      <div style="margin-bottom: 20px;">
        <button class="btn btn-emerald" id="modal-enroll-free-btn" style="width: 100%; font-size: 1rem; padding: 14px;">
          🎁 Enroll Free (Community Gift)
        </button>
      </div>
    `;
  } else if (course.pricingModel === 'credit-only') {
    actionButtonsHtml = `
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
          <h4 style="color: var(--text-pure);">Teacher Credit Exchange</h4>
          <span style="font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: var(--credit-green-light);">
            ₢ ${course.creditPrice} Credits
          </span>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px;">
          This session is exclusively accessible to teachers. You currently have <strong>${state.user.credits} ₢</strong>.
        </p>
        <button class="btn btn-emerald" id="modal-enroll-credits-btn" style="width: 100%;" ${!userHasCredits ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
          ${userHasCredits ? `Redeem with ${course.creditPrice} Credits` : `Insufficient Credits (${state.user.credits} ₢ Available)`}
        </button>
        ${!userHasCredits ? `
          <div style="margin-top: 10px; font-size: 0.78rem; color: var(--gold-amber-light); text-align: center;">
            💡 Need credits? Go to Teacher Studio and teach a student to earn +50 ₢!
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // DUAL PRICING: Credits (Free for teachers) OR Learner Fee ($)
    actionButtonsHtml = `
      <div class="dual-checkout-box" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
        <!-- Option 1: Credits -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1.5px solid rgba(16, 185, 129, 0.4); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <span class="info-pill" style="margin-bottom: 6px; display: inline-block;">Free for Teachers</span>
            <div style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; color: var(--credit-green-light); margin: 6px 0;">
              ₢ ${course.creditPrice} <small style="font-size: 0.75rem; color: var(--text-secondary);">Credits</small>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 12px;">
              Pay zero cash. Redeem the credits you earned by teaching peers! (Balance: <strong>${state.user.credits} ₢</strong>)
            </p>
          </div>
          <button class="btn btn-emerald" id="modal-enroll-credits-btn" style="width: 100%; font-size: 0.85rem;" ${!userHasCredits ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
            ${userHasCredits ? `Redeem ${course.creditPrice} ₢` : `Need ${course.creditPrice - state.user.credits} More ₢`}
          </button>
        </div>

        <!-- Option 2: Cash Learner Fee -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Pure Learner Fee</span>
            <div style="font-family: var(--font-heading); font-size: 1.4rem; font-weight: 800; color: var(--text-pure); margin: 6px 0;">
              $${course.cashFee.toFixed(2)} <small style="font-size: 0.75rem; color: var(--text-muted);">USD</small>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 12px;">
              Direct payment set by the teacher for users who don't teach. (Balance: <strong>$${state.user.cash.toFixed(2)}</strong>)
            </p>
          </div>
          <button class="btn btn-secondary" id="modal-enroll-cash-btn" style="width: 100%; font-size: 0.85rem;">
            Pay $${course.cashFee.toFixed(2)} Fee
          </button>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="modal-header" style="margin-bottom: 18px;">
      <div class="modal-icon-badge">🎓</div>
      <div>
        <span class="course-category-tag">${course.categoryName} • ${course.format}</span>
        <h2 class="modal-title" style="font-size: 1.35rem; margin-top: 4px;">${course.title}</h2>
        <div style="display: flex; gap: 12px; font-size: 0.82rem; color: var(--text-secondary); margin-top: 6px;">
          <span>⭐ ${course.rating} (${course.reviewsCount} reviews)</span>
          <span>⏱ ${course.duration}</span>
          <span style="color: var(--credit-green-light);">🛡️ 100% Ad-Free Video</span>
        </div>
      </div>
    </div>

    <!-- Instructor highlight -->
    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <img src="${course.instructor.avatar}" alt="${course.instructor.name}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-indigo);" />
        <div>
          <h4 style="font-size: 0.95rem; color: var(--text-pure);">${course.instructor.name}</h4>
          <span style="font-size: 0.75rem; color: var(--gold-amber-light);">${course.instructor.tier} • ${course.instructor.role}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 0.85rem; font-weight: 700; color: var(--credit-green-light);">${course.instructor.studentsTaught} Students</span>
        <div style="font-size: 0.72rem; color: var(--text-muted);">Taught on Crditeach</div>
      </div>
    </div>

    <!-- Description -->
    <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px;">
      ${course.desc}
    </p>

    <!-- Syllabus Preview -->
    <div style="margin-bottom: 22px;">
      <h4 style="font-size: 0.95rem; margin-bottom: 10px; color: var(--text-pure);">Included Modules & Lessons</h4>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${course.syllabus.map((s, idx) => `
          <div style="display: flex; justify-content: space-between; padding: 8px 12px; background: rgba(255, 255, 255, 0.02); border-radius: var(--radius-sm); font-size: 0.84rem;">
            <span>${s.title}</span>
            <span style="color: var(--text-muted); font-size: 0.78rem;">${s.duration}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Checkout / Enrollment Action Buttons -->
    ${actionButtonsHtml}
  `;

  // Attach button event listeners
  const goClassroomBtn = document.getElementById('modal-go-classroom-btn');
  if (goClassroomBtn) {
    goClassroomBtn.addEventListener('click', () => {
      modal.classList.remove('open');
      state.setActiveCourse(courseId);
      if (navigateCallback) navigateCallback('classroom');
    });
  }

  const enrollFreeBtn = document.getElementById('modal-enroll-free-btn');
  if (enrollFreeBtn) {
    enrollFreeBtn.addEventListener('click', () => {
      state.enrolledCourseIds.push(courseId);
      state.setActiveCourse(courseId);
      state.saveState();
      modal.classList.remove('open');
      window.showToast('Enrolled!', `🎁 Enrolled in "${course.title}" for free!`, 'success');
      if (navigateCallback) navigateCallback('classroom');
    });
  }

  const enrollCreditsBtn = document.getElementById('modal-enroll-credits-btn');
  if (enrollCreditsBtn && userHasCredits) {
    enrollCreditsBtn.addEventListener('click', () => {
      const res = state.enrollWithCredits(courseId);
      if (res.success) {
        modal.classList.remove('open');
        window.showToast('Credit Enrollment', res.message, 'success');
        if (navigateCallback) navigateCallback('classroom');
      } else {
        window.showToast('Notice', res.message, 'reward');
      }
    });
  }

  const enrollCashBtn = document.getElementById('modal-enroll-cash-btn');
  if (enrollCashBtn) {
    enrollCashBtn.addEventListener('click', () => {
      const res = state.enrollWithCash(courseId);
      if (res.success) {
        modal.classList.remove('open');
        window.showToast('Payment Confirmed', res.message, 'success');
        if (navigateCallback) navigateCallback('classroom');
      } else {
        window.showToast('Payment Failed', res.message, 'reward');
      }
    });
  }

  modal.classList.add('open');
}
