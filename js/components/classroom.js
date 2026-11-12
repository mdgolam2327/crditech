/**
 * AD-FREE CLASSROOM COMPONENT
 * 100% distraction-free video player, syllabus navigation, code snippets & notes
 */

import { state } from '../state.js';

let activeTab = 'notes';
let navigateCallback = null;

export function initClassroom(onNavigate) {
  navigateCallback = onNavigate;
  const mount = document.getElementById('classroom-mount');

  function renderClassroom() {
    const enrolledCourses = state.courses.filter(c => state.enrolledCourseIds.includes(c.id));
    const activeCourse = state.courses.find(c => c.id === state.activeCourseId) || enrolledCourses[0] || state.courses[0];

    if (!activeCourse) {
      mount.innerHTML = `
        <div class="classroom-empty-container">
          <div class="classroom-empty-card">
            <div class="empty-icon-ring">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
            <div class="empty-badge-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>100% Verified Ad-Free • Zero In-Video Ads</span>
            </div>
            <h2>Ad-Free Classroom is Ready</h2>
            <p class="empty-desc">
              All accounts on Crditeach start at zero. You haven't enrolled in any skill sessions yet. 
              Once you enroll in a peer lesson or publish your own course, high-resolution videos, lesson notes, and peer Q&A will appear here—100% free of advertising interruptions.
            </p>

            <div class="empty-steps-grid">
              <div class="empty-step-box">
                <div class="step-badge">Explore Skills</div>
                <h4>Marketplace</h4>
                <p>Browse available peer sessions and unlock lessons with Credits (₢) or free community gifts.</p>
                <button class="btn btn-secondary" id="empty-go-marketplace" style="margin-top: 14px; width: 100%;">
                  🔍 Go to Marketplace
                </button>
              </div>

              <div class="empty-step-box highlight-step">
                <div class="step-badge credit-badge">Earn ₢ Credits</div>
                <h4>Teacher Studio</h4>
                <p>Simulate teaching a peer (+50 ₢), or publish your own skill session to start teaching others.</p>
                <button class="btn btn-emerald btn-glow" id="empty-go-studio" style="margin-top: 14px; width: 100%;">
                  ⚡ Go to Teacher Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      const goMarketplace = document.getElementById('empty-go-marketplace');
      const goStudio = document.getElementById('empty-go-studio');
      if (goMarketplace && navigateCallback) {
        goMarketplace.addEventListener('click', () => navigateCallback('marketplace'));
      }
      if (goStudio && navigateCallback) {
        goStudio.addEventListener('click', () => navigateCallback('studio'));
      }
      return;
    }

    const isEnrolled = state.enrolledCourseIds.includes(activeCourse.id);

    mount.innerHTML = `
      <div class="classroom-layout">
        <!-- Main Video & Content Column -->
        <div class="classroom-main">
          <!-- Video Container -->
          <div class="video-player-container">
            <video 
              id="active-video-player" 
              class="video-element" 
              src="${activeCourse.videoUrl}" 
              poster="${activeCourse.thumbnail}"
              controls 
              playsinline
            >
              Your browser does not support HTML5 video.
            </video>
            <div class="ad-free-guarantee-banner">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Verified Ad-Free • Zero Video Interruptions</span>
            </div>
          </div>

          <!-- Video Metadata & Actions -->
          <div class="classroom-video-meta">
            <div class="video-title-row">
              <div>
                <span class="course-category-tag">${activeCourse.categoryName} • ${activeCourse.format}</span>
                <h1 class="video-heading">${activeCourse.title}</h1>
              </div>
              <div class="video-controls-quick">
                <button class="action-icon-btn" id="btn-toggle-speed" title="Playback speed (1x / 1.25x / 1.5x)">
                  <span id="speed-label" style="font-size:0.78rem; font-weight:700;">1x</span>
                </button>
                <button class="action-icon-btn" id="btn-bookmark" title="Bookmark lesson">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content Tabs -->
            <div class="classroom-tabs">
              <button class="cr-tab-btn ${activeTab === 'notes' ? 'active' : ''}" data-cr-tab="notes">
                📝 Lesson Notes & Code
              </button>
              <button class="cr-tab-btn ${activeTab === 'qa' ? 'active' : ''}" data-cr-tab="qa">
                💬 Peer Discussion (8)
              </button>
              <button class="cr-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-cr-tab="overview">
                ℹ️ Course Overview
              </button>
            </div>

            <!-- Tab Content -->
            <div class="cr-tab-content">
              ${activeTab === 'notes' ? renderNotesTab(activeCourse) : ''}
              ${activeTab === 'qa' ? renderQATab(activeCourse) : ''}
              ${activeTab === 'overview' ? renderOverviewTab(activeCourse) : ''}
            </div>
          </div>
        </div>

        <!-- Sidebar Column -->
        <aside class="classroom-sidebar">
          
          <!-- Enrolled Selector (if user owns multiple) -->
          ${enrolledCourses.length > 1 ? `
            <div class="syllabus-card" style="padding: 14px 18px;">
              <label style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase;">Switch Enrolled Skill:</label>
              <select id="switch-enrolled-select" style="width: 100%; margin-top: 6px; padding: 8px 12px;">
                ${enrolledCourses.map(c => `
                  <option value="${c.id}" ${c.id === activeCourse.id ? 'selected' : ''}>${c.title}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <!-- Syllabus Card -->
          <div class="syllabus-card">
            <h3 class="sidebar-card-title">
              <span>Course Syllabus</span>
              <span style="font-size: 0.78rem; color: var(--credit-green-light); font-weight: 600;">${activeCourse.syllabus.length} Lessons</span>
            </h3>
            <div class="lesson-list">
              ${activeCourse.syllabus.map((lesson, idx) => `
                <div class="lesson-item ${lesson.active ? 'active-lesson' : ''}" data-lesson-idx="${idx}">
                  <div class="lesson-left">
                    <span class="lesson-play-icon">${lesson.active ? '▶' : '✓'}</span>
                    <span class="lesson-name">${lesson.title}</span>
                  </div>
                  <span class="lesson-duration">${lesson.duration}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Instructor Callout & Credit Flywheel Banner -->
          <div class="mentor-callout-card">
            <div class="mentor-info-box">
              <img src="${activeCourse.instructor.avatar}" alt="${activeCourse.instructor.name}" class="mentor-avatar-lg" />
              <div>
                <h4 style="font-size: 1rem; color: var(--text-pure);">${activeCourse.instructor.name}</h4>
                <span style="font-size: 0.78rem; color: var(--gold-amber-light); font-weight: 600;">${activeCourse.instructor.tier}</span>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${activeCourse.instructor.studentsTaught} students taught</div>
              </div>
            </div>

            <div class="teach-reward-box">
              <h5>⚡ The Crditeach Virtuous Cycle</h5>
              <p>This teacher is sharing their knowledge and earning Credits. You can do the same! Teach any topic in the Teacher Studio to earn Credits and learn from others completely free.</p>
              <button class="btn btn-emerald" id="sidebar-teach-btn" style="width: 100%; margin-top: 10px; font-size: 0.82rem; padding: 8px 14px;">
                🚀 Teach a Skill & Earn ₢
              </button>
            </div>
          </div>

        </aside>
      </div>
    `;

    // Attach listeners
    attachClassroomListeners(activeCourse);
  }

  function attachClassroomListeners(activeCourse) {
    // Video speed toggle
    const speedBtn = document.getElementById('btn-toggle-speed');
    const speedLabel = document.getElementById('speed-label');
    const video = document.getElementById('active-video-player');
    const speeds = [1, 1.25, 1.5, 2];
    let speedIdx = 0;

    if (speedBtn && video) {
      speedBtn.addEventListener('click', () => {
        speedIdx = (speedIdx + 1) % speeds.length;
        video.playbackRate = speeds[speedIdx];
        speedLabel.textContent = speeds[speedIdx] + 'x';
        window.showToast('Playback Speed', `Video speed set to ${speeds[speedIdx]}x`, 'info');
      });
    }

    // Tabs clicks
    document.querySelectorAll('.cr-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-cr-tab');
        renderClassroom();
      });
    });

    // Enrolled switch
    const switchSelect = document.getElementById('switch-enrolled-select');
    if (switchSelect) {
      switchSelect.addEventListener('change', (e) => {
        state.setActiveCourse(e.target.value);
        renderClassroom();
      });
    }

    // Sidebar teach button -> go to Teacher Studio
    const teachBtn = document.getElementById('sidebar-teach-btn');
    if (teachBtn && navigateCallback) {
      teachBtn.addEventListener('click', () => {
        navigateCallback('studio');
      });
    }

    // Syllabus lesson clicks
    document.querySelectorAll('.lesson-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = Number(item.getAttribute('data-lesson-idx'));
        activeCourse.syllabus.forEach((s, i) => s.active = (i === idx));
        window.showToast('Loaded Lesson', activeCourse.syllabus[idx].title, 'info');
        renderClassroom();
      });
    });

    // Copy code snippet
    const copyBtn = document.getElementById('copy-notes-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(activeCourse.notes || '');
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 2000);
      });
    }

    // Post Q&A comment simulation
    const qaForm = document.getElementById('qa-form');
    if (qaForm) {
      qaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('qa-input');
        if (!input.value.trim()) return;
        window.showToast('Question Posted', `Your question was posted to the teacher & peer community!`, 'success');
        input.value = '';
      });
    }
  }

  function renderNotesTab(course) {
    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="font-size: 0.95rem; color: var(--text-pure);">Teacher's Code & Key Architecture Notes</h4>
          <button class="btn btn-secondary" id="copy-notes-code" style="padding: 4px 12px; font-size: 0.78rem;">
            Copy Code
          </button>
        </div>
        <pre style="background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 18px; font-family: var(--font-mono); font-size: 0.88rem; color: #a5f3fc; overflow-x: auto; line-height: 1.6;"><code>${escapeHtml(course.notes || '// No code snippets attached to this lesson.')}</code></pre>
      </div>
    `;
  }

  function renderQATab(course) {
    return `
      <div>
        <form id="qa-form" style="display: flex; gap: 10px; margin-bottom: 20px;">
          <input type="text" id="qa-input" placeholder="Ask ${course.instructor.name} or peer students a question..." style="flex:1;" required />
          <button type="submit" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">Post</button>
        </form>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <strong style="font-size: 0.88rem; color: var(--text-pure);">Marcus Cole (Peer Student)</strong>
              <span style="font-size: 0.75rem; color: var(--text-muted);">3 hours ago</span>
            </div>
            <p style="font-size: 0.84rem; color: var(--text-secondary);">How does this design handle network disconnects during high-throughput streaming?</p>
            <div style="margin-top: 10px; padding: 10px 14px; background: rgba(99, 102, 241, 0.08); border-left: 3px solid var(--primary-indigo); border-radius: var(--radius-sm);">
              <strong style="font-size: 0.82rem; color: var(--primary-cyan);">${course.instructor.name} (Instructor):</strong>
              <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">Great question! We implement exponential backoff with jitter and persistent buffer queues in module 4.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderOverviewTab(course) {
    return `
      <div style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.6;">
        <h4 style="color: var(--text-pure); margin-bottom: 8px;">About this Masterclass</h4>
        <p style="margin-bottom: 14px;">${course.desc}</p>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: rgba(255, 255, 255, 0.03); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">FORMAT</span>
            <div style="font-weight: 700; color: var(--text-pure);">${course.format}</div>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">DURATION</span>
            <div style="font-weight: 700; color: var(--text-pure);">${course.duration}</div>
          </div>
          <div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">AD POLICY</span>
            <div style="font-weight: 700; color: var(--credit-green-light);">0 Video Ads</div>
          </div>
        </div>
      </div>
    `;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Subscribe to state changes
  state.subscribe(renderClassroom);
  renderClassroom();
}
