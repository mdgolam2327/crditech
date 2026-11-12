/**
 * TEACHER STUDIO COMPONENT
 * Teacher analytics, credit accumulation, course creation, and live teaching simulation
 */

import { state } from '../state.js';

let navigateCallback = null;

const STUDENT_NAMES = [
  'Liam Zhang', 'Zara Morales', 'Carlos Mendoza', 'Aoi Tanaka',
  'Chloe Dubois', 'David Okafor', 'Elena Rossi', 'Kavita Sharma'
];

const SKILL_TOPICS = [
  'Next.js 15 Server Actions', 'Rust Concurrency', 'Production K8s',
  'Tailwind to Vanilla CSS Architecture', 'LangChain RAG Pipeline', 'Figma Design Tokens'
];

export function initTeacherStudio(onNavigate) {
  navigateCallback = onNavigate;
  const mount = document.getElementById('studio-mount');

  function renderStudio() {
    const user = state.user;
    const myCourses = state.courses.filter(c => c.instructor.name === user.name);

    mount.innerHTML = `
      <div class="studio-container">
        <!-- Studio Header -->
        <div class="studio-header">
          <div class="studio-title-group">
            <h2>Teacher Studio & Economics Engine</h2>
            <p>Teach peers to earn Credits, gain platform recognition, and learn anything on Crditeach for free.</p>
          </div>
          <div class="studio-actions">
            <button class="btn btn-primary btn-glow" id="btn-open-publish-modal">
              + Publish New Skill Session
            </button>
          </div>
        </div>

        <!-- Interactive Teaching Simulation Hero Banner -->
        <div class="simulation-hero-banner">
          <div class="sim-text">
            <h3>⚡ Test the Economic Flywheel: Teach a Student</h3>
            <p>Click below to simulate conducting a 45-minute live mentorship or code review session. Watch your <strong>Credits</strong>, <strong>teaching rank</strong>, and <strong>cash revenue</strong> increase immediately!</p>
          </div>
          <button class="btn btn-emerald btn-glow" id="btn-simulate-teach" style="padding: 14px 24px; font-size: 0.95rem; white-space: nowrap;">
            ⚡ Simulate Teaching a Student (+50 ₢)
          </button>
        </div>

        <!-- Key Metrics Cards -->
        <div class="studio-stats-grid">
          <!-- Stat 1: Students Taught -->
          <div class="studio-stat-card">
            <div class="stat-card-top">
              <span class="s-label">Students Taught</span>
              <div class="stat-icon green-icon">🎓</div>
            </div>
            <div class="s-value" id="studio-stat-students">${user.studentsTaught}</div>
            <div class="s-change up">↑ Teaching peers actively</div>
          </div>

          <!-- Stat 2: Current Credits -->
          <div class="studio-stat-card">
            <div class="stat-card-top">
              <span class="s-label">Available Credits</span>
              <div class="stat-icon green-icon">₢</div>
            </div>
            <div class="s-value" id="studio-stat-credits">${user.credits}</div>
            <div class="s-change up">Redeemable for free courses</div>
          </div>

          <!-- Stat 3: Learner Cash Revenue -->
          <div class="studio-stat-card">
            <div class="stat-card-top">
              <span class="s-label">Learner Fee Earnings</span>
              <div class="stat-icon blue-icon">$</div>
            </div>
            <div class="s-value" id="studio-stat-cash">$${user.totalCashEarned.toFixed(2)}</div>
            <div class="s-change up">From pure non-teaching learners</div>
          </div>

          <!-- Stat 4: Teacher Reputation Rank -->
          <div class="studio-stat-card">
            <div class="stat-card-top">
              <span class="s-label">Teacher Recognition</span>
              <div class="stat-icon gold-icon">👑</div>
            </div>
            <div class="s-value" style="font-size: 1.35rem;" id="studio-stat-tier">${user.tier}</div>
            <div class="s-change" style="color: var(--gold-amber-light);">Platform Verified Mentor</div>
          </div>
        </div>

        <!-- Teacher Level & Recognition Progress Card -->
        <div class="tier-progress-card">
          <div class="tier-header">
            <div>
              <h3 style="font-size: 1.15rem; color: var(--text-pure); margin-bottom: 2px;">
                Teaching Honor Tier: <span style="color: var(--gold-amber-light);">${user.tier}</span>
              </h3>
              <span style="font-size: 0.82rem; color: var(--text-secondary);">
                ${user.studentsTaught < 5
        ? `Teach ${5 - user.studentsTaught} more peer${5 - user.studentsTaught > 1 ? 's' : ''} to unlock <strong>Senior Mentor</strong> honor rank`
        : user.studentsTaught < 10
          ? `Teach ${10 - user.studentsTaught} more peer${10 - user.studentsTaught > 1 ? 's' : ''} to unlock <strong>Master Mentor</strong> honor rank`
          : user.studentsTaught < 15
            ? `Teach ${15 - user.studentsTaught} more peer${15 - user.studentsTaught > 1 ? 's' : ''} to unlock <strong>Knowledge Titan</strong> rank`
            : 'Highest prestige tier unlocked! You are a Crditeach Titan.'}
              </span>
            </div>
            <span style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700; color: var(--credit-green-light);">
              ${user.tierProgress}%
            </span>
          </div>

          <div class="tier-progress-track">
            <div class="tier-progress-fill" style="width: ${user.tierProgress}%;"></div>
          </div>

          <div class="tier-perks-row">
            <div class="tier-perk-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>100% Free Platform Access</span>
            </div>
            <div class="tier-perk-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Priority Peer Matching</span>
            </div>
            <div class="tier-perk-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Custom Fee Setting</span>
            </div>
            <div class="tier-perk-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Verified Creator Badge</span>
            </div>
          </div>
        </div>

        <!-- My Published Sessions Section -->
        <div class="my-sessions-section">
          <div class="section-title-row">
            <div>
              <h3 style="font-size: 1.2rem; color: var(--text-pure);">Your Published Teaching Sessions</h3>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">Manage pricing models, student enrollments, and syllabus content.</p>
            </div>
            <span class="info-pill">${myCourses.length} Active Classes</span>
          </div>

          ${myCourses.length === 0 ? `
            <div style="text-align: center; padding: 42px 24px; background: rgba(255, 255, 255, 0.02); border-radius: var(--radius-md); border: 1px dashed var(--border-glass);">
              <div style="font-size: 2rem; margin-bottom: 8px;">🎓</div>
              <h4 style="color: var(--text-pure); margin-bottom: 4px;">Zero Published Classes</h4>
              <p style="color: var(--text-secondary); font-size: 0.86rem; max-width: 480px; margin: 0 auto 16px;">
                You haven't published any skill sessions yet. Share your expertise to start earning Credits and Learner Fees!
              </p>
              <button class="btn btn-primary btn-glow" id="btn-empty-publish-trigger">
                + Publish Your First Skill Session
              </button>
            </div>
          ` : `
            <div style="overflow-x: auto;">
              <table class="sessions-table">
                <thead>
                  <tr>
                    <th>Skill Title</th>
                    <th>Topic</th>
                    <th>Pricing Model</th>
                    <th>Fee for Learners</th>
                    <th>Credits for Peers</th>
                    <th>Students Taught</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${myCourses.map(course => `
                    <tr>
                      <td style="font-weight: 600; color: var(--text-pure);">${course.title}</td>
                      <td><span class="cat-pill" style="padding: 4px 10px; font-size: 0.72rem;">${course.categoryName}</span></td>
                      <td style="text-transform: capitalize;">${course.pricingModel}</td>
                      <td>${course.cashFee ? '$' + course.cashFee.toFixed(2) : 'Free / N/A'}</td>
                      <td style="color: var(--credit-green-light); font-weight: 700;">₢ ${course.creditPrice}</td>
                      <td><strong>${course.instructor.studentsTaught}</strong> students</td>
                      <td><span style="color: var(--credit-green-light); font-size: 0.78rem; font-weight: 700;">● Active</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    // Attach listeners
    attachStudioListeners();
  }

  function attachStudioListeners() {
    // Open Publish Modal
    const openPublishBtn = document.getElementById('btn-open-publish-modal');
    const emptyPublishBtn = document.getElementById('btn-empty-publish-trigger');
    const publishModal = document.getElementById('publish-modal');
    if (publishModal) {
      if (openPublishBtn) {
        openPublishBtn.addEventListener('click', () => publishModal.classList.add('open'));
      }
      if (emptyPublishBtn) {
        emptyPublishBtn.addEventListener('click', () => publishModal.classList.add('open'));
      }
    }

    // Simulate Teaching a Student
    const simTeachBtn = document.getElementById('btn-simulate-teach');
    if (simTeachBtn) {
      simTeachBtn.addEventListener('click', () => {
        const randomStudent = STUDENT_NAMES[Math.floor(Math.random() * STUDENT_NAMES.length)];
        const randomSkill = SKILL_TOPICS[Math.floor(Math.random() * SKILL_TOPICS.length)];

        const result = state.teachStudentSimulation(randomStudent, randomSkill);

        // Celebratory Toast Notification
        window.showToast(
          '🎉 Student Taught!',
          `You taught ${result.studentName} "${randomSkill}". You earned +${result.earnedCredits} Credits & +$${result.earnedCash.toFixed(2)} USD!`,
          'success'
        );

        renderStudio();
      });
    }
  }

  // Handle Publish Form submission (setup once)
  setupPublishForm();

  // Subscribe to state changes
  state.subscribe(renderStudio);
  renderStudio();
}

function setupPublishForm() {
  const form = document.getElementById('publish-form');
  const modal = document.getElementById('publish-modal');
  const cancelBtn = document.getElementById('cancel-publish-btn');
  const closeBtn = document.getElementById('close-publish-modal');
  const pricingCards = document.querySelectorAll('.pricing-card');
  const ratesWrapper = document.getElementById('rates-inputs-wrapper');
  const cashFeeInput = document.getElementById('new-course-fee');
  const creditPriceInput = document.getElementById('new-course-credits');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => modal.classList.remove('open'));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
  }

  // Pricing model radio cards
  pricingCards.forEach(card => {
    card.addEventListener('click', () => {
      pricingCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;

      const type = card.getAttribute('data-pricing-type');
      if (type === 'free') {
        ratesWrapper.style.display = 'none';
        cashFeeInput.value = '0';
        creditPriceInput.value = '0';
      } else if (type === 'credit-only') {
        ratesWrapper.style.display = 'grid';
        cashFeeInput.closest('.form-group').style.display = 'none';
        creditPriceInput.closest('.form-group').style.display = 'flex';
      } else {
        ratesWrapper.style.display = 'grid';
        cashFeeInput.closest('.form-group').style.display = 'flex';
        creditPriceInput.closest('.form-group').style.display = 'flex';
      }
    });
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const title = document.getElementById('new-course-title').value.trim();
      const category = document.getElementById('new-course-category').value;
      const desc = document.getElementById('new-course-desc').value.trim();
      const format = document.getElementById('new-course-format').value;
      const duration = document.getElementById('new-course-duration').value.trim();
      const pricingModel = document.querySelector('input[name="pricing-model"]:checked')?.value || 'dual';
      const cashFee = parseFloat(cashFeeInput.value) || 0;
      const creditPrice = parseInt(creditPriceInput.value, 10) || 0;
      const videoUrl = document.getElementById('new-course-video').value.trim();

      const newCourse = state.publishCourse({
        title,
        category,
        desc,
        format,
        duration,
        pricingModel,
        cashFee,
        creditPrice,
        videoUrl
      });

      modal.classList.remove('open');
      form.reset();

      window.showToast(
        '🚀 Class Published!',
        `"${newCourse.title}" is now live in the marketplace with 0 in-video ads!`,
        'success'
      );
    });
  }
}
