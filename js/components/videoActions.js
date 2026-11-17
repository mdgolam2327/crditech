/**
 * UNIVERSAL 3-DOT VIDEO MENU (YouTube-style)
 * - Everyone sees: Save to Playlist, Share (Copy Link), Download, Interested / Not Interested, Report
 * - Video Owner ONLY also sees: Edit Video, Delete Video
 */

import { auth } from '../auth.js';
import { state } from '../state.js';
import { removeFloatingMiniPlayer } from './classroom.js';

const PLAYLIST_STORAGE_KEY = 'crditeach_saved_playlist_ids';
const HIDDEN_VIDEOS_KEY = 'crditeach_not_interested_ids';

export function getSavedPlaylistIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLAYLIST_STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function toggleSaveToPlaylist(courseId) {
  const list = getSavedPlaylistIds();
  const exists = list.includes(courseId);
  const updated = exists ? list.filter(id => id !== courseId) : [...list, courseId];
  localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(updated));
  return !exists;
}

export function getNotInterestedIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(HIDDEN_VIDEOS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function markNotInterested(courseId) {
  const list = getNotInterestedIds();
  if (!list.includes(courseId)) {
    localStorage.setItem(HIDDEN_VIDEOS_KEY, JSON.stringify([...list, courseId]));
  }
}

export function isVideoOwner(course) {
  if (!auth.isAuthenticated() || !auth.user || !course) return false;
  if (course.userId && String(course.userId) === String(auth.user.id)) return true;
  if (!course.userId && course.instructor?.name === auth.user.fullName) return true;
  return false;
}

export function renderVideoThreeDotMenu(course) {
  if (!course) return '';
  const owner = isVideoOwner(course);
  const isSaved = getSavedPlaylistIds().includes(course.id);

  return `
    <div class="yt-video-menu-wrapper" style="position: relative; flex-shrink: 0; margin-left: auto;">
      <button 
        type="button"
        class="js-video-dots-btn" 
        data-course-id="${course.id}"
        title="More options"
        aria-label="More options"
        style="background: transparent; border: none; color: #cbd5e1; font-size: 1.15rem; line-height: 1; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s;"
      >
        ⋮
      </button>

      <div 
        class="js-video-dots-dropdown" 
        data-dropdown-for="${course.id}"
        style="display: none; position: absolute; right: 0; bottom: 32px; min-width: 195px; background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 12px; box-shadow: 0 14px 32px rgba(0, 0, 0, 0.72); padding: 6px; z-index: 999;"
      >
        <!-- Save to Playlist -->
        <button type="button" class="js-menu-save-playlist" data-course-id="${course.id}" style="${menuItemStyle('#f8fafc')}">
          <span>${isSaved ? '✅' : '🔖'}</span>
          <span>${isSaved ? 'Saved in Playlist' : 'Save to Playlist'}</span>
        </button>

        <!-- Share & Copy Link -->
        <button type="button" class="js-menu-share-video" data-course-id="${course.id}" style="${menuItemStyle('#f8fafc')}">
          <span>🔗</span>
          <span>Share & Copy Link</span>
        </button>

        <!-- Download -->
        <button type="button" class="js-menu-download-video" data-course-id="${course.id}" style="${menuItemStyle('#f8fafc')}">
          <span>⬇️</span>
          <span>Download</span>
        </button>

        <!-- Interested -->
        <button type="button" class="js-menu-interested-video" data-course-id="${course.id}" style="${menuItemStyle('#f8fafc')}">
          <span>👍</span>
          <span>Interested</span>
        </button>

        <!-- Not Interested -->
        <button type="button" class="js-menu-not-interested" data-course-id="${course.id}" style="${menuItemStyle('#f8fafc')}">
          <span>🚫</span>
          <span>Not Interested</span>
        </button>

        <!-- Report -->
        <button type="button" class="js-menu-report-video" data-course-id="${course.id}" style="${menuItemStyle('#cbd5e1')}">
          <span>🚩</span>
          <span>Report</span>
        </button>

        ${owner ? `
          <div style="height: 1px; background: rgba(255,255,255,0.12); margin: 5px 4px;"></div>

          <!-- Owner Only: Edit -->
          <button type="button" class="js-edit-video-opt" data-course-id="${course.id}" style="${menuItemStyle('#38bdf8')}">
            <span>✏️</span>
            <span>Edit Video</span>
          </button>

          <!-- Owner Only: Delete -->
          <button type="button" class="js-delete-video-opt" data-course-id="${course.id}" style="${menuItemStyle('#fca5a5')}">
            <span>🗑️</span>
            <span>Delete Video</span>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function menuItemStyle(color) {
  return `width: 100%; text-align: left; background: transparent; border: none; color: ${color}; padding: 8px 10px; border-radius: 8px; font-size: 0.82rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 9px;`;
}

export function bindVideoThreeDotListeners(containerEl = document, onAfterChange = null) {
  const closeAllDropdowns = () => {
    document.querySelectorAll('.js-video-dots-dropdown').forEach(d => {
      d.style.display = 'none';
    });
  };

  // Toggle 3-dot dropdown
  containerEl.querySelectorAll('.js-video-dots-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-course-id');
      const target = containerEl.querySelector(`.js-video-dots-dropdown[data-dropdown-for="${id}"]`);
      if (!target) return;

      const isOpen = target.style.display === 'block';
      closeAllDropdowns();
      target.style.display = isOpen ? 'none' : 'block';
    });
  });

  // Prevent clicks inside dropdown from opening the video card
  containerEl.querySelectorAll('.js-video-dots-dropdown').forEach(drop => {
    drop.addEventListener('click', (e) => e.stopPropagation());
  });

  // 1. Save to Playlist
  containerEl.querySelectorAll('.js-menu-save-playlist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.getAttribute('data-course-id');
      const nowSaved = toggleSaveToPlaylist(courseId);
      closeAllDropdowns();
      if (typeof onAfterChange === 'function') onAfterChange();
      window.showToast?.(
        nowSaved ? '🔖 Saved to Playlist' : 'Removed from Playlist',
        nowSaved ? 'You can easily find this video in your Saved Playlist filter.' : 'Video removed from your saved playlist.',
        'success'
      );
    });
  });

  // 2. Share & Copy Link
  containerEl.querySelectorAll('.js-menu-share-video').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const courseId = btn.getAttribute('data-course-id');
      const course = state.courses.find(c => c.id === courseId);
      closeAllDropdowns();

      const shareUrl = `${window.location.origin}/?video=${encodeURIComponent(courseId)}`;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareUrl);
        }
        if (navigator.share && course) {
          navigator.share({ title: course.title, url: shareUrl }).catch(() => {});
        }
        window.showToast?.('🔗 Link Copied!', 'Video link copied to clipboard.', 'success');
      } catch {
        window.prompt('Copy this video link:', shareUrl);
      }
    });
  });

  // 3. Download Video
  containerEl.querySelectorAll('.js-menu-download-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.getAttribute('data-course-id');
      const course = state.courses.find(c => c.id === courseId);
      closeAllDropdowns();

      if (!course || !course.videoUrl) {
        window.showToast?.('Unavailable', 'No downloadable video file found for this item.', 'error');
        return;
      }

      const a = document.createElement('a');
      a.href = course.videoUrl;
      a.download = `${(course.title || 'video').replace(/[^a-z0-9_-]/gi, '_')}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.showToast?.('⬇️ Download Started', `Downloading "${course.title}"...`, 'info');
    });
  });

  // 4. Interested
  containerEl.querySelectorAll('.js-menu-interested-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      window.showToast?.('👍 Preference Saved', 'We will show more videos like this in your feed.', 'success');
    });
  });

  // 5. Not Interested
  containerEl.querySelectorAll('.js-menu-not-interested').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.getAttribute('data-course-id');
      markNotInterested(courseId);
      closeAllDropdowns();
      if (typeof onAfterChange === 'function') onAfterChange();
      window.showToast?.('🚫 Video Hidden', 'We will show fewer videos like this.', 'info');
    });
  });

  // 6. Report Video
  containerEl.querySelectorAll('.js-menu-report-video').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const courseId = btn.getAttribute('data-course-id');
      const course = state.courses.find(c => c.id === courseId);
      closeAllDropdowns();
      if (!course) return;
      openReportVideoModal(course);
    });
  });

  // 7. Owner Only: Edit Video
  containerEl.querySelectorAll('.js-edit-video-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      const courseId = btn.getAttribute('data-course-id');
      const course = state.courses.find(c => c.id === courseId);
      if (course && isVideoOwner(course)) {
        openEditVideoModal(course, onAfterChange);
      }
    });
  });

  // 8. Owner Only: Delete Video
  containerEl.querySelectorAll('.js-delete-video-opt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      const courseId = btn.getAttribute('data-course-id');
      const course = state.courses.find(c => c.id === courseId);
      if (!course || !isVideoOwner(course)) return;

      const confirmed = window.confirm(`Are you sure you want to permanently delete "${course.title}"?`);
      if (!confirmed) return;

      try {
        const headers = {};
        if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

        const res = await fetch(`/api/courses/${courseId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Could not delete video.');
        }

        if (state.activeCourseId === courseId) {
          removeFloatingMiniPlayer(true);
          state.activeCourseId = null;
        }

        await state.loadCoursesFromDB();
        if (typeof onAfterChange === 'function') onAfterChange();
        window.showToast?.('🗑️ Deleted', 'Video permanently deleted.', 'success');
      } catch (err) {
        window.showToast?.('Error', err.message || 'Failed to delete video.', 'error');
      }
    });
  });
}

if (typeof window !== 'undefined' && !window.__ytDotsOutsideBound) {
  window.__ytDotsOutsideBound = true;
  document.addEventListener('click', () => {
    document.querySelectorAll('.js-video-dots-dropdown').forEach(d => {
      d.style.display = 'none';
    });
  });
}

export function openReportModal({ type = 'video', id, title = '' }) {
  document.getElementById('report-submission-modal')?.remove();

  const isVideo = type === 'video';
  const modal = document.createElement('div');
  modal.id = 'report-submission-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.82); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 16px;
  `;

  modal.innerHTML = `
    <div style="width: 100%; max-width: 480px; background: #0f172a; border: 1px solid rgba(255,255,255,0.16); border-radius: 18px; padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.8); max-height: 90vh; overflow-y: auto;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 1.12rem; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
          <span>🚩</span>
          <span>${isVideo ? 'Report Video' : 'Report Creator Profile'}</span>
        </h3>
        <button type="button" id="close-report-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 4px;">✕</button>
      </div>

      <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.22); border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.82rem; color: #cbd5e1; line-height: 1.45;">
        <div style="font-weight: 600; color: #38bdf8; margin-bottom: 2px;">Direct Moderation Dispatch</div>
        Reports are sent directly to our moderation desk at <strong>reports@crditeach.com</strong> for swift review.
      </div>

      <p style="font-size: 0.85rem; color: #94a3b8; margin: 0 0 14px; line-height: 1.4;">
        Reporting target: <strong style="color: #f1f5f9;">${escapeHtml(title || (isVideo ? 'Selected Video' : 'Creator Channel'))}</strong>
      </p>

      <form id="active-report-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label for="report-reason-select" style="display: block; font-size: 0.82rem; font-weight: 600; color: #e2e8f0; margin-bottom: 6px;">
            Violation Category *
          </label>
          <select id="report-reason-select" required style="width: 100%; border-radius: 8px; padding: 9px 12px; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; font-size: 0.85rem;">
            <option value="" disabled selected>-- Select reason for reporting --</option>
            <option value="Spam, scam, or misleading content">🚫 Spam, scam, or misleading content</option>
            <option value="Copyright infringement or stolen work">©️ Copyright infringement or stolen work</option>
            <option value="Harassment, bullying, or hate speech">😡 Harassment, bullying, or hate speech</option>
            <option value="Sexually explicit or inappropriate content">🔞 Sexually explicit or inappropriate content</option>
            <option value="Violence, dangerous acts, or self-harm">⚠️ Violence, dangerous acts, or self-harm</option>
            <option value="Misinformation or fraudulent claims">📰 Misinformation or fraudulent claims</option>
            <option value="Privacy violation or leaked personal data">🔒 Privacy violation or personal data leak</option>
            <option value="Impersonation or fake account identity">🎭 Impersonation or fake identity</option>
            <option value="Child safety or exploitation concern">🛡️ Child safety or exploitation concern</option>
            <option value="Other violation or abusive behavior">📝 Other issue / violation</option>
          </select>
        </div>

        <div>
          <label for="report-details-input" style="display: block; font-size: 0.82rem; font-weight: 600; color: #e2e8f0; margin-bottom: 6px;">
            Detailed Explanation & Context *
          </label>
          <textarea 
            id="report-details-input" 
            rows="4" 
            required
            placeholder="Please type in details explaining why you are reporting this (e.g. specific timestamps, offensive quotes, or context)..." 
            style="width: 100%; border-radius: 8px; padding: 10px 12px; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; font-size: 0.85rem; resize: vertical; line-height: 1.45; box-sizing: border-box;"
          ></textarea>
        </div>

        <div>
          <label for="report-contact-email" style="display: block; font-size: 0.82rem; font-weight: 600; color: #e2e8f0; margin-bottom: 6px;">
            Your Email (Optional • For status updates)
          </label>
          <input 
            type="email" 
            id="report-contact-email" 
            value="${escapeHtml(auth.user?.email || '')}" 
            placeholder="your.email@example.com" 
            style="width: 100%; border-radius: 8px; padding: 9px 12px; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; font-size: 0.85rem; box-sizing: border-box;" 
          />
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
          <button type="button" id="cancel-report-btn" class="btn btn-secondary" style="padding: 9px 16px; font-size: 0.85rem;">Cancel</button>
          <button type="submit" id="btn-submit-report" class="btn btn-primary" style="padding: 9px 20px; font-size: 0.85rem; background: #ef4444; border-color: #ef4444;">
            🚩 Submit Report
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => modal.remove();

  document.getElementById('close-report-modal')?.addEventListener('click', close);
  document.getElementById('cancel-report-btn')?.addEventListener('click', close);

  const form = document.getElementById('active-report-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-report');
      const category = document.getElementById('report-reason-select')?.value;
      const details = document.getElementById('report-details-input')?.value?.trim();
      const reporterEmail = document.getElementById('report-contact-email')?.value?.trim();

      if (!category || !details) return;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '⏳ Dispatching...';
        }

        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            targetType: type,
            targetId: id,
            targetTitle: title,
            category,
            details,
            reporterEmail
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          close();
          window.showToast?.(
            '🚩 Report Dispatched',
            `Your report was sent directly to our moderation team (${data.destinationEmail || 'reports@crditeach.com'}). Thank you for keeping Crditeach safe!`,
            'success'
          );
        } else {
          throw new Error(data.error || 'Failed to submit report.');
        }
      } catch (err) {
        window.showToast?.('Error', err.message || 'Could not send report. Please try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = '🚩 Submit Report';
        }
      }
    });
  }
}

export function openReportVideoModal(course) {
  if (!course) return;
  openReportModal({
    type: 'video',
    id: course.id,
    title: course.title
  });
}

function openEditVideoModal(course, onAfterChange) {
  document.getElementById('owner-edit-video-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'owner-edit-video-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.78); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 16px;
  `;

  modal.innerHTML = `
    <div style="width: 100%; max-width: 500px; background: #0f172a; border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 22px; box-shadow: 0 24px 50px rgba(0,0,0,0.7);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 1.1rem; color: #f8fafc;">✏️ Edit Video Details</h3>
        <button type="button" id="close-edit-video-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer;">✕</button>
      </div>

      <form id="owner-edit-video-form" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px;">Title</label>
          <input type="text" id="edit-vid-title" value="${escapeAttr(course.title)}" required style="width: 100%;" />
        </div>

        <div>
          <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px;">Category</label>
          <input type="text" id="edit-vid-category" value="${escapeAttr(course.categoryName || '')}" required style="width: 100%;" />
        </div>

        <div>
          <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px;">Description</label>
          <textarea id="edit-vid-desc" rows="3" style="width: 100%;">${escapeHtml(course.desc || '')}</textarea>
        </div>

        <div>
          <label style="display: block; font-size: 0.8rem; color: #cbd5e1; margin-bottom: 4px;">Lesson Notes & Code</label>
          <textarea id="edit-vid-notes" rows="3" style="width: 100%; font-family: monospace;">${escapeHtml(course.notes || '')}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
          <button type="button" id="cancel-edit-video-btn" class="btn btn-secondary">Cancel</button>
          <button type="submit" id="save-edit-video-btn" class="btn btn-primary">💾 Save Changes</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => modal.remove();
  document.getElementById('close-edit-video-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-edit-video-btn')?.addEventListener('click', closeModal);

  document.getElementById('owner-edit-video-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-edit-video-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
    }

    const catSelect = document.getElementById('edit-vid-category');
    const category = catSelect.value;
    const categoryName = catSelect.options[catSelect.selectedIndex]?.text || course.categoryName;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

      const res = await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          title: document.getElementById('edit-vid-title').value.trim(),
          category,
          categoryName,
          desc: document.getElementById('edit-vid-desc').value.trim(),
          notes: document.getElementById('edit-vid-notes').value.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update video.');
      }

      await state.loadCoursesFromDB();
      if (typeof onAfterChange === 'function') onAfterChange();
      closeModal();
      window.showToast?.('Updated!', 'Video details saved successfully.', 'success');
    } catch (err) {
      window.showToast?.('Error', err.message || 'Could not update video.', 'error');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Changes';
      }
    }
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}