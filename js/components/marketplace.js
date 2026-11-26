/**
- MARKETPLACE & MAIN FEED COMPONENT (YOUTUBE HOME GRID STYLE)
- Exact 3 videos per row on desktop
- Compact 175px thumbnail height + YouTube-style Avatar, Title, Channel Name, Views & Time
- Includes universal 3-dot video menu (Playlist, Share/Copy Link, Download, Interest, Report, and Owner-only Edit/Delete)
 */

import { state, formatINR } from '../state.js';
import { auth } from '../auth.js';
import { openCreatorChannel } from './profileView.js';
import { stopHostBroadcast } from '../liveStream.js';
import {
  renderVideoThreeDotMenu,
  bindVideoThreeDotListeners,
  getSavedPlaylistIds,
  getNotInterestedIds,
  isItemSaved
} from './videoActions.js';

let navigateCallback = null;

function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function initMarketplace(onNavigate) {
  navigateCallback = onNavigate;

  const coursesGrid = document.getElementById('courses-grid');
  const liveShortsMount = document.getElementById('live-shorts-mount');
  const searchInput = document.getElementById('marketplace-search');
  const clearSearchBtn = document.getElementById('clear-search');
  const categoryChipsContainer = document.getElementById('category-chips');

  let currentCategory = 'all';
  let currentPriceFilter = 'all';
  let currentSearch = '';
  let searchDebounceTimer = null;

  // Automatically add "Saved Playlist" pill to category bar if not already present
  if (categoryChipsContainer && !categoryChipsContainer.querySelector('[data-category="saved-playlist"]')) {
    const playlistPill = document.createElement('button');
    playlistPill.type = 'button';
    playlistPill.className = 'cat-pill';
    playlistPill.setAttribute('data-category', 'saved-playlist');
    playlistPill.textContent = '🔖 Saved Playlist';
    categoryChipsContainer.appendChild(playlistPill);
  }

  function renderMarketplace() {
    // 1. Update Live Stats Bar in index.html
    const totalCoursesEl = document.getElementById('stats-total-courses');
    if (totalCoursesEl) totalCoursesEl.textContent = state.courses.length;

    // 2. Render YouTube Shorts-Style "Live Now" Bar (ONLY active live streams)
    if (liveShortsMount) {
      const activeLiveItems = state.courses.filter(c => Boolean(c.isLive));
      if (activeLiveItems.length > 0) {
        liveShortsMount.innerHTML = `
          <div class="live-shorts-section">
            <div class="live-shorts-header">
              <div class="live-shorts-title">
                <span style="color: #ef4444; font-size: 1.4rem;">⚡</span>
                <span>Live Now (${activeLiveItems.length})</span>
              </div>
              <span style="font-size: 0.8rem; color: var(--text-secondary);">
                Happening right now • Click to join live class
              </span>
            </div>
            <div class="live-shorts-row">
              ${activeLiveItems.map(item => {
                const isMyLive = auth.isAuthenticated() && (String(item.userId) === String(auth.user?.id) || item.instructor?.name === auth.user?.fullName);
                const isPaused = item.liveStatus === 'PAUSED';
                return `
                  <div class="short-live-card is-streaming" data-short-id="${item.id}" data-stream-id="${item.streamId || item.id}" style="position: relative;">
                    <img src="${item.thumbnail}" alt="${item.title}" class="short-live-thumb" />
                    <div class="short-live-overlay">
                      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span class="short-badge-live" style="${isPaused ? 'background: rgba(217, 119, 6, 0.95);' : ''}">
                          ${isPaused ? '⏸ PAUSED' : '● LIVE NOW'}
                        </span>
                        ${isMyLive ? `
                          <button 
                            class="btn-quick-end-live" 
                            data-end-id="${item.id}"
                            title="End this live stream"
                            style="background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 3px 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; z-index: 5;"
                          >
                            ⏹ End
                          </button>
                        ` : ''}
                      </div>
                      <div class="short-live-info">
                        <h4>${item.title}</h4>
                        <div class="short-live-meta">
                          <span>${item.instructor.name}</span>
                          <span>👁️ ${item.views || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else {
        liveShortsMount.innerHTML = '';
      }
    }

    // 3. Filter Main Feed Grid (3 videos per row YouTube Home style)
    if (!coursesGrid) return;

    const hiddenIds = getNotInterestedIds();
    const savedIds = getSavedPlaylistIds();

    const filteredCourses = state.courses.filter(course => {
      if (course.isLive) return false;
      if (hiddenIds.includes(course.id)) return false;

      if (currentCategory === 'saved-playlist') {
        return savedIds.includes(course.id);
      }

      const catMatch = currentCategory === 'all' || course.category === currentCategory;

      let priceMatch = true;
      if (currentPriceFilter === 'free') {
        priceMatch = course.pricingModel === 'free' || course.creditPrice === 0;
      } else if (currentPriceFilter === 'credits') {
        priceMatch = course.creditPrice > 0;
      } else if (currentPriceFilter === 'paid') {
        priceMatch = course.cashFee > 0;
      }

      return catMatch && priceMatch;
    });

    if (filteredCourses.length === 0) {
      const emptyMsg = currentCategory === 'saved-playlist'
        ? 'No videos saved in your playlist yet. Click the ⋮ icon on any video to save it!'
        : `No videos available yet ${currentSearch ? `for "${currentSearch}"` : ''}`;

      coursesGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-glass);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">${currentCategory === 'saved-playlist' ? '🔖' : '📺'}</div>
          <h3 style="font-size: 1.1rem; color: var(--text-pure);">${emptyMsg}</h3>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 6px;">
            ${currentCategory === 'saved-playlist'
              ? 'Saved videos appear here for quick access anytime.'
              : 'Click <strong>+ Create</strong> in the top bar to upload a video or start a live session!'}
          </p>
        </div>
      `;
    } else {
      coursesGrid.innerHTML = filteredCourses.map(course => {
        const isEnrolled = (state.user?.enrolledCourseIds || []).includes(course.id);
        const isFree = course.pricingModel === 'free' || course.creditPrice === 0;
        const timeAgo = formatTimeAgo(course.createdAt);

        // Resolve the freshest avatar for each video card
        const isCurrentUserVideo =
          auth.isAuthenticated() &&
          auth.user &&
          ((course.userId && String(course.userId) === String(auth.user.id)) ||
            course.instructor?.name === auth.user.fullName);

        const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          course.instructor?.name || 'Creator'
        )}`;

        const resolvedAvatar =
          (isCurrentUserVideo && auth.user.avatar) ||
          course.instructor?.avatar ||
          fallbackAvatar;

        return `
          <div class="yt-video-card" data-watch-id="${course.id}">
            <!-- Compact 175px Thumbnail Box -->
            <div class="yt-thumb-wrapper">
              <img src="${course.thumbnail}" alt="${course.title}" />
              <span class="yt-price-pill">
                ${isFree || isEnrolled ? 'FREE • AD-FREE' : (course.cashFee ? formatINR(course.cashFee) : `₢ ${course.creditPrice}`)}
              </span>
              <span class="yt-duration-badge">${course.duration || 'Video'}</span>
            </div>

            <!-- YouTube Style Metadata Row -->
            <div class="yt-meta-row" style="align-items: flex-start;">
              <img 
                src="${resolvedAvatar}" 
                onerror="this.onerror=null; this.src='${fallbackAvatar}';"
                alt="${course.instructor?.name || 'Creator'}" 
                class="yt-channel-avatar js-open-creator"
                data-creator-id="${course.userId || ''}"
                data-creator-name="${course.instructor?.name || 'Creator'}"
                data-creator-avatar="${resolvedAvatar}"
                title="Visit ${course.instructor?.name || 'Creator'}'s channel"
                style="width: 36px; height: 36px; min-width: 36px; border-radius: 50%; object-fit: cover; cursor: pointer; display: block; background: #1e293b;"
              />

              <div class="yt-meta-text" style="flex: 1; min-width: 0;">
                <h3 class="yt-video-title" title="${course.title}">${course.title}</h3>
                
                <div 
                  class="yt-channel-name js-open-creator"
                  data-creator-id="${course.userId || ''}"
                  data-creator-name="${course.instructor?.name || 'Creator'}"
                  data-creator-avatar="${resolvedAvatar}"
                  title="Visit ${course.instructor?.name || 'Creator'}'s channel"
                  style="cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"
                >
                  <span>${course.instructor?.name || 'Creator'}</span>
                  <span style="color: #38bdf8; font-size: 0.72rem;" title="Verified Instructor">✓</span>
                  <span style="color: #64748b;">• ${course.categoryName}</span>
                </div>

                <div class="yt-stats-line" style="margin-top: 3px;">
                  <span>
                    ${course.views || 0} views • ${timeAgo}
                  </span>
                </div>
              </div>

              <!-- Quick Save / Bookmark Button -->
              <button 
                type="button" 
                class="js-quick-save-btn" 
                data-course-id="${course.id}"
                title="${isItemSaved(course.id) ? 'Saved to bookmarks' : 'Save / Bookmark'}"
                style="background: ${isItemSaved(course.id) ? 'rgba(56, 189, 248, 0.2)' : 'transparent'}; border: none; color: ${isItemSaved(course.id) ? '#38bdf8' : '#94a3b8'}; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 0.95rem; margin-top: 2px; transition: all 0.15s;"
              >
                ${isItemSaved(course.id) ? '🔖' : '📑'}
              </button>

              <!-- 3-Dot Action Menu (Playlist, Share/Copy Link, Download, Interest, Report + Owner Edit/Delete) -->
              ${renderVideoThreeDotMenu(course)}
            </div>
          </div>
        `;
      }).join('');

      // Bind 3-dot menu listeners right after rendering video cards
      bindVideoThreeDotListeners(coursesGrid, () => renderMarketplace());
    }

    attachDynamicListeners();
  }

  function attachDynamicListeners() {
    // Click Creator Avatar or Channel Name -> Open Public Creator Channel
    document.querySelectorAll('.js-open-creator').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const creatorId = el.getAttribute('data-creator-id');
        const creatorName = el.getAttribute('data-creator-name');
        const creatorAvatar = el.getAttribute('data-creator-avatar');

        openCreatorChannel({
          id: creatorId || null,
          fullName: creatorName,
          avatar: creatorAvatar
        });
      });
    });

    // Shorts Live Cards
    document.querySelectorAll('.short-live-card').forEach(card => {
      card.addEventListener('click', () => {
        openVideoInClassroom(card.getAttribute('data-short-id'));
      });
    });

    // Whole YouTube Video Card click -> Open in Classroom
    document.querySelectorAll('.yt-video-card').forEach(card => {
      card.addEventListener('click', () => {
        openVideoInClassroom(card.getAttribute('data-watch-id'));
      });
    });

    // Support / Like Pill Button
    document.querySelectorAll('.btn-support-video').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-support-id');
        state.supportCourse(id);
        window.showToast('Liked!', 'Your support boosted this video in the rankings!', 'success');
      });
    });

    // Quick End Live button on Marketplace Live Now cards (with confirmation!)
    document.querySelectorAll('.btn-quick-end-live').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = window.confirm('Are you sure you want to permanently end this live stream?');
        if (!confirmed) return;

        const streamId = btn.getAttribute('data-end-id');
        btn.disabled = true;
        btn.textContent = '...';

        try {
          if (window.activeLiveRecorder && window.activeLiveRecorder.state !== 'inactive') {
            window.activeLiveRecorder.stop();
          }
          stopHostBroadcast();
          if (window.activeLocalLiveStream) {
            window.activeLocalLiveStream.getTracks().forEach(t => t.stop());
            window.activeLocalLiveStream = null;
          }

          const headers = { 'Content-Type': 'application/json', ...auth.getAuthHeaders() };

          const res = await fetch(`/api/courses/${streamId}/end-live`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ duration: 'Recorded Live' })
          });

          if (res.ok) {
            await state.loadCoursesFromDB();
            window.showToast('Live Ended', 'Stream moved to the main video feed!', 'success');
          }
        } catch (err) {
          window.showToast('Error', 'Could not end live stream.', 'error');
          btn.disabled = false;
          btn.textContent = '⏹ End';
        }
      });
    });
  }

  function openVideoInClassroom(courseId) {
    const course = state.courses.find(c => String(c.id) === String(courseId) || String(c.streamId) === String(courseId));
    const resolvedId = course ? course.id : courseId;
    const isFree = !course || course.pricingModel === 'free' || course.creditPrice === 0 || course.isLive;
    const isEnrolled = (state.enrolledCourseIds || []).includes(resolvedId);

    if (isFree || isEnrolled) {
      state.activeCourseId = resolvedId;
      state.saveState(false);
      state.recordCourseView(resolvedId);
      if (navigateCallback) navigateCallback('classroom');
    } else {
      const res = state.enrollWithCredits(resolvedId);
      if (res.success) {
        state.recordCourseView(resolvedId);
        window.showToast('Unlocked!', res.message, 'success');
        if (navigateCallback) navigateCallback('classroom');
      } else {
        window.showToast('Insufficient Credits', res.message, 'error');
      }
    }
  }

  // Bind Category Pills from index.html (including dynamically added Saved Playlist pill)
  document.querySelectorAll('#category-chips .cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#category-chips .cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.getAttribute('data-category');
      renderMarketplace();
    });
  });

  // Bind Pricing Filter Chips from index.html
  document.querySelectorAll('.pricing-filter-group .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.pricing-filter-group .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentPriceFilter = chip.getAttribute('data-price-filter');
      renderMarketplace();
    });
  });

  // Bind Search Input (#marketplace-search in index.html)
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      if (clearSearchBtn) clearSearchBtn.style.display = currentSearch ? 'block' : 'none';
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        state.loadCoursesFromDB(currentSearch);
      }, 250);
    });
  }

  if (clearSearchBtn && searchInput) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentSearch = '';
      clearSearchBtn.style.display = 'none';
      state.loadCoursesFromDB('');
    });
  }

  state.subscribe(renderMarketplace);
  renderMarketplace();
  state.loadCoursesFromDB();
}
