/**
- AD-FREE CLASSROOM & VIDEO WATCH PAGE COMPONENT
- Supports:
  * Real Video Playback & Live Stream Broadcast (Camera, Screen Share, Screen + Circular Facecam)
  * Reliable Live Recording & Auto-Save on End Live
  * Floating Bottom-Right Mini-Player with Close (✕) button
  * YouTube-style Action Bar & Bottom Tabs (Comments & Q&A, Lesson Notes & Code, Course Overview)
 */

import { state, formatINR } from '../state.js';
import { auth } from '../auth.js';
import { openCreatorChannel } from './profileView.js';
import {
  isItemSaved,
  toggleSaveItem,
  downloadMedia,
  openReportModal
} from './videoActions.js';

let navigateCallback = null;
let activeBottomTab = 'comments';

const DISLIKED_VIDEOS_KEY = 'crditeach_disliked_video_ids';
const LIKED_VIDEOS_KEY = 'crditeach_liked_video_ids';
const COMMENTS_STORAGE_KEY = 'crditeach_video_comments_v1';

function getStoredIds(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function setStoredIds(key, ids) {
  localStorage.setItem(key, JSON.stringify(ids));
}

function getCourseComments(courseId) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY) || '{}');
    return Array.isArray(all[courseId]) ? all[courseId] : [];
  } catch {
    return [];
  }
}

function saveCourseComment(courseId, commentObj) {
  try {
    const all = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY) || '{}');
    const existing = Array.isArray(all[courseId]) ? all[courseId] : [];
    all[courseId] = [commentObj, ...existing];
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(all));
    return all[courseId];
  } catch {
    return [commentObj];
  }
}

export function initClassroom(onNavigate) {
  navigateCallback = onNavigate;
  state.subscribe(() => {
    // Avoid interrupting an active live video element unnecessarily
    const liveVid = document.getElementById('classroom-main-video');
    if (liveVid && liveVid.srcObject && document.getElementById('view-classroom')?.classList.contains('active-view')) {
      return;
    }
    renderClassroom();
  });
  renderClassroom();
}

export function renderClassroom() {
  const mount = document.getElementById('classroom-mount') || document.getElementById('view-classroom');
  if (!mount) return;

  // Resolve active course accurately (including newly created live sessions)
  const activeCourse =
    state.courses.find(c => String(c.id) === String(state.activeCourseId)) ||
    state.courses.find(c => c.isLive) ||
    state.courses[0] ||
    null;

  if (!activeCourse) {
    mount.innerHTML = `
      <div style="max-width: 640px; margin: 60px auto; text-align: center; padding: 48px 24px; background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 18px;">
        <div style="font-size: 2.6rem; margin-bottom: 12px;">🎬</div>
        <h2 style="color: var(--text-pure); margin-bottom: 8px;">No Video Selected</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
          Select any video or live class from the Marketplace feed to start watching ad-free.
        </p>
        <button class="btn btn-primary" id="btn-classroom-go-market">
          Browse Videos
        </button>
      </div>
    `;
    document.getElementById('btn-classroom-go-market')?.addEventListener('click', () => {
      if (navigateCallback) navigateCallback('marketplace');
    });
    return;
  }

  const creatorName = activeCourse.instructor?.name || 'Creator';
  const isCurrentUserVideo =
    auth.isAuthenticated() &&
    auth.user &&
    ((activeCourse.userId && String(activeCourse.userId) === String(auth.user.id)) ||
      creatorName === auth.user.fullName);

  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creatorName)}`;
  const resolvedAvatar =
    (isCurrentUserVideo && auth.user.avatar) ||
    activeCourse.instructor?.avatar ||
    fallbackAvatar;

  const likedIds = getStoredIds(LIKED_VIDEOS_KEY);
  const dislikedIds = getStoredIds(DISLIKED_VIDEOS_KEY);
  const savedIds = getSavedPlaylistIds();

  const isLiked = likedIds.includes(activeCourse.id);
  const isDisliked = dislikedIds.includes(activeCourse.id);
  const isSaved = isItemSaved(activeCourse.id);
  const likeCount = activeCourse.supportCount || 0;
  const comments = getCourseComments(activeCourse.id);

  const rawSyllabus = Array.isArray(activeCourse.syllabus) ? activeCourse.syllabus : [];
  const syllabusList = rawSyllabus.filter(item => {
    if (!item || !item.title) return false;
    const t = item.title.trim().toLowerCase();
    const isDefaultDummy =
      t === '01. foundational overview' ||
      t === '01. introduction & foundational concepts' ||
      (rawSyllabus.length === 1 && t === (activeCourse.title || '').trim().toLowerCase());
    return !isDefaultDummy;
  });

  const cleanDesc = (activeCourse.desc || '').trim();
  const cleanNotes = (activeCourse.notes || '').trim();
  const isDummyNotes = cleanNotes.startsWith('// Taught on Crditeach by ');
  const realNotes = isDummyNotes ? '' : cleanNotes;

  const hasLiveStream = Boolean(activeCourse.isLive && window.activeLocalLiveStream);
  const hasRecordedFile = Boolean(activeCourse.videoUrl && activeCourse.videoUrl.trim());
  const canRenderVideoElement = hasLiveStream || hasRecordedFile || (activeCourse.isLive && isCurrentUserVideo);

  mount.innerHTML = `
    <div style="max-width: 1120px; margin: 0 auto; padding: 20px 16px 70px;">
      <!-- Top Back Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary" id="btn-classroom-back" style="font-size: 0.84rem; padding: 7px 14px;">
          ← Back to Feed
        </button>
        ${activeCourse.categoryName ? `
          <span style="font-size: 0.76rem; font-weight: 600; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 4px 12px; border-radius: 999px;">
            ${escapeHtml(activeCourse.categoryName)}
          </span>
        ` : ''}
      </div>

      <div style="display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px;">
        <!-- Main Video / Live Broadcast Player Container -->
        <div id="classroom-player-box" style="width: 100%; background: #020617; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-glass); aspect-ratio: 16 / 9; position: relative;">
          ${canRenderVideoElement ? `
            <video 
              id="classroom-main-video"
              ${hasRecordedFile && !activeCourse.isLive ? `src="${activeCourse.videoUrl}"` : ''}
              poster="${activeCourse.thumbnail || ''}"
              ${activeCourse.isLive ? 'autoplay muted playsinline' : 'controls playsinline'}
              style="width: 100%; height: 100%; object-fit: contain; background: #000; display: block;"
            ></video>

            ${activeCourse.isLive && isCurrentUserVideo ? `
              <!-- Top-Left LIVE Indicator -->
              <div style="position: absolute; top: 14px; left: 14px; display: inline-flex; align-items: center; gap: 6px; background: rgba(220, 38, 38, 0.92); color: #fff; font-size: 0.76rem; font-weight: 800; padding: 5px 12px; border-radius: 999px; letter-spacing: 0.5px; z-index: 15;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: #fff; display: inline-block;"></span>
                LIVE BROADCASTING
              </div>

              <!-- Bottom Overlay Controls: Camera | Share Screen | Screen + Facecam | End Live -->
              <div style="position: absolute; bottom: 14px; left: 14px; right: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(8px); padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.14); z-index: 15;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <button type="button" id="btn-live-switch-camera" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;">
                    📷 Camera
                  </button>
                  <button type="button" id="btn-live-switch-screen" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.78rem;">
                    🖥️ Share Screen
                  </button>
                  <button type="button" id="btn-live-switch-combo" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.78rem;">
                    🧑‍💻 Screen + Facecam
                  </button>
                </div>

                <button type="button" id="btn-classroom-end-live" style="background: #dc2626; color: #fff; border: none; border-radius: 9px; padding: 8px 16px; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                  ⏹ End Live Stream
                </button>
              </div>
            ` : ''}
          ` : `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; gap: 10px; padding: 20px; text-align: center;">
              <div style="font-size: 2.2rem;">🎥</div>
              <div style="font-size: 0.95rem; color: #e2e8f0; font-weight: 600;">${escapeHtml(activeCourse.title)}</div>
              <div style="font-size: 0.82rem;">
                ${activeCourse.isLive ? 'Live stream is currently broadcasting.' : 'No video file attached to this session yet.'}
              </div>
            </div>
          `}
        </div>

        <!-- Video Title, Creator Info & YouTube-Style Action Bar -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 16px; padding: 18px 20px;">
          <h1 style="font-size: 1.32rem; font-weight: 700; color: var(--text-pure); margin: 0 0 14px; line-height: 1.35;">
            ${escapeHtml(activeCourse.title)}
          </h1>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
              <div 
                class="js-watch-open-creator"
                style="display: flex; align-items: center; gap: 12px; cursor: pointer;"
                title="Visit ${escapeHtml(creatorName)}'s channel"
              >
                <img 
                  src="${resolvedAvatar}" 
                  onerror="this.onerror=null; this.src='${fallbackAvatar}';"
                  alt="${escapeHtml(creatorName)}" 
                  style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(56, 189, 248, 0.45); background: #1e293b;"
                />
                <div>
                  <div style="font-weight: 700; font-size: 0.96rem; color: var(--text-pure); display: flex; align-items: center; gap: 5px;">
                    <span>${escapeHtml(creatorName)}</span>
                    <span style="color: #38bdf8; font-size: 0.78rem;">✓</span>
                  </div>
                  <div style="font-size: 0.78rem; color: var(--text-secondary);" id="watch-channel-stats">
                    <span id="watch-follower-count-badge">0</span> followers • ${activeCourse.views || 0} views
                  </div>
                </div>
              </div>

              ${!isCurrentUserVideo && activeCourse.userId ? `
                <button 
                  type="button" 
                  id="btn-watch-follow"
                  style="border-radius: 999px; padding: 7px 16px; font-size: 0.8rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.2s;"
                  class="btn btn-primary"
                >
                  <span id="watch-follow-symbol">+</span>
                  <span id="watch-follow-text">Follow</span>
                </button>
              ` : ''}
            </div>

            <!-- YouTube-Style Action Pills -->
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <div style="display: inline-flex; align-items: center; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; overflow: hidden;">
                <button 
                  type="button" 
                  id="btn-watch-like"
                  title="Like this video"
                  style="background: ${isLiked ? 'rgba(56, 189, 248, 0.22)' : 'transparent'}; color: ${isLiked ? '#38bdf8' : '#f8fafc'}; border: none; padding: 8px 14px; font-size: 0.84rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;"
                >
                  <span>👍</span>
                  <span id="watch-like-count">${likeCount}</span>
                </button>
                <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.14);"></div>
                <button 
                  type="button" 
                  id="btn-watch-dislike"
                  title="Dislike this video"
                  style="background: ${isDisliked ? 'rgba(248, 113, 113, 0.22)' : 'transparent'}; color: ${isDisliked ? '#fca5a5' : '#cbd5e1'}; border: none; padding: 8px 13px; font-size: 0.84rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center;"
                >
                  <span>👎</span>
                </button>
              </div>

              <button type="button" id="btn-watch-share" style="${actionPillStyle('#f8fafc')}">
                <span>🔗</span>
                <span>Share</span>
              </button>

              <button 
                type="button" 
                id="btn-watch-save"
                style="${actionPillStyle(isSaved ? '#38bdf8' : '#f8fafc', isSaved ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255,255,255,0.07)')}"
              >
                <span>${isSaved ? '✅' : '🔖'}</span>
                <span>${isSaved ? 'Saved' : 'Save'}</span>
              </button>

              <button type="button" id="btn-watch-download" style="${actionPillStyle('#f8fafc')}">
                <span>⬇️</span>
                <span>Download</span>
              </button>

              <button type="button" id="btn-watch-report" style="${actionPillStyle('#cbd5e1')}">
                <span>🚩</span>
                <span>Report</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Tabs Card: 💬 Comments & Q&A | 📝 Lesson Notes & Code | ℹ️ Course Overview -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 16px; overflow: hidden;">
          <div style="display: flex; align-items: center; gap: 6px; padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); overflow-x: auto; background: rgba(255,255,255,0.02);">
            <button type="button" class="js-watch-bottom-tab" data-tab="comments" style="${bottomTabStyle(activeBottomTab === 'comments')}">
              💬 Comments & Q&A (${comments.length})
            </button>
            <button type="button" class="js-watch-bottom-tab" data-tab="notes" style="${bottomTabStyle(activeBottomTab === 'notes')}">
              📝 Lesson Notes & Code
            </button>
            <button type="button" class="js-watch-bottom-tab" data-tab="overview" style="${bottomTabStyle(activeBottomTab === 'overview')}">
              ℹ️ Course Overview
            </button>
          </div>

          <div style="padding: 18px 20px;">
            ${activeBottomTab === 'comments' ? renderCommentsTab(comments) : ''}
            ${activeBottomTab === 'notes' ? renderNotesTab(realNotes, activeCourse, isCurrentUserVideo) : ''}
            ${activeBottomTab === 'overview' ? renderOverviewTab(activeCourse, cleanDesc) : ''}
          </div>
        </div>

        <!-- Session Details Box (Blank inside unless creator explicitly added modules) -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 16px; padding: 18px 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: ${syllabusList.length > 0 ? '12px' : '0'};">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-pure); margin: 0;">
              Session Details
            </h3>
            ${syllabusList.length > 0 ? `
              <span style="font-size: 0.78rem; color: var(--text-secondary);">
                ${syllabusList.length} ${syllabusList.length === 1 ? 'Module' : 'Modules'}
              </span>
            ` : ''}
          </div>

          ${syllabusList.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${syllabusList.map(mod => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px;">
                  <span style="font-size: 0.88rem; color: var(--text-pure); font-weight: 500;">${escapeHtml(mod.title)}</span>
                  ${mod.duration ? `<span style="font-size: 0.78rem; color: var(--text-secondary);">${escapeHtml(mod.duration)}</span>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  attachClassroomListeners(activeCourse, creatorName, resolvedAvatar, isCurrentUserVideo);
}

function bottomTabStyle(isActive) {
  return `
    background: ${isActive ? 'rgba(56, 189, 248, 0.16)' : 'transparent'};
    color: ${isActive ? '#38bdf8' : '#cbd5e1'};
    border: 1px solid ${isActive ? 'rgba(56, 189, 248, 0.4)' : 'transparent'};
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s;
  `;
}

function renderCommentsTab(comments) {
  return `
    <div>
      <form id="watch-comment-form" style="display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap;">
        <input 
          type="text" 
          id="watch-comment-input" 
          placeholder="Ask a question or share feedback about this session..." 
          required
          style="flex: 1; min-width: 240px;"
        />
        <button type="submit" class="btn btn-primary" style="padding: 9px 18px; font-size: 0.84rem; font-weight: 600;">
          Post Comment
        </button>
      </form>

      ${comments.length === 0 ? `
        <div style="text-align: center; padding: 28px 16px; color: var(--text-secondary); font-size: 0.88rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
          No comments or questions yet. Be the first to start the discussion!
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${comments.map(c => {
            const cAvatar = c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.author || 'Member')}`;
            return `
              <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px;">
                <img src="${cAvatar}" alt="${escapeHtml(c.author)}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <strong style="font-size: 0.86rem; color: var(--text-pure);">${escapeHtml(c.author)}</strong>
                    <span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(c.createdAt || 'Just now')}</span>
                  </div>
                  <p style="margin: 0; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; white-space: pre-line;">
                    ${escapeHtml(c.text)}
                  </p>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

function renderNotesTab(realNotes, course, isOwner) {
  const attachmentRegex = /📎 Attached File:\s*(.+?)\s*\((https?:\/\/[^\s)]+|\/uploads\/[^\s)]+)\)/g;
  const attachments = [];
  let m;
  while ((m = attachmentRegex.exec(realNotes || '')) !== null) {
    attachments.push({ name: m[1], url: m[2] });
  }
  const textOnly = (realNotes || '').replace(attachmentRegex, '').trim();

  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      ${isOwner ? `
        <form id="live-classroom-notes-form" style="padding: 14px; background: rgba(56, 189, 248, 0.06); border: 1px dashed rgba(56, 189, 248, 0.4); border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">
          <div style="font-size: 0.84rem; font-weight: 700; color: #38bdf8;">
            ➕ Share / Update Lesson Notes or Upload File ${course.isLive ? '(Live Session)' : ''}
          </div>
          <textarea 
            id="classroom-live-notes-text" 
            rows="3" 
            placeholder="Write or update notes / code snippets for viewers..."
            style="width: 100%; font-family: monospace; font-size: 0.83rem;"
          >${escapeHtml(textOnly)}</textarea>
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <input 
              type="file" 
              id="classroom-live-notes-file" 
              accept=".pdf,.txt,.md,.doc,.docx,.js,.ts,.py,.java,.cpp,.c,.html,.css,.json,.csv,.zip,image/*"
              style="font-size: 0.8rem; color: #cbd5e1;"
            />
            <button type="submit" id="btn-save-classroom-notes" class="btn btn-primary" style="padding: 7px 16px; font-size: 0.82rem;">
              📤 Publish Notes / File
            </button>
          </div>
        </form>
      ` : ''}

      ${attachments.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${attachments.map(att => `
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 11px 14px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px;">
              <span style="font-size: 0.86rem; font-weight: 600; color: #f8fafc;">📎 ${escapeHtml(att.name)}</span>
              <a href="${escapeHtml(att.url)}" download="${escapeHtml(att.name)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.78rem; text-decoration: none;">
                ⬇️ Download
              </a>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${textOnly ? `
        <pre style="margin: 0; padding: 14px; background: #020617; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #e2e8f0; font-size: 0.85rem; overflow-x: auto; white-space: pre-wrap;">${escapeHtml(textOnly)}</pre>
      ` : (!attachments.length ? `
        <div style="text-align: center; padding: 24px 16px; color: var(--text-secondary); font-size: 0.86rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
          No lesson notes or code files shared yet.
        </div>
      ` : '')}
    </div>
  `;
}

function renderOverviewTab(course, cleanDesc) {
  return `
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${course.categoryName ? `
          <span style="font-size: 0.78rem; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #e2e8f0;">
            Category: <strong>${escapeHtml(course.categoryName)}</strong>
          </span>
        ` : ''}
        ${course.duration ? `
          <span style="font-size: 0.78rem; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #e2e8f0;">
            Duration: <strong>${escapeHtml(course.duration)}</strong>
          </span>
        ` : ''}
        <span style="font-size: 0.78rem; padding: 4px 10px; border-radius: 8px; background: rgba(255,255,255,0.06); color: #e2e8f0;">
          Access: <strong>${course.pricingModel === 'free' || course.creditPrice === 0 ? 'Free • Ad-Free' : (course.cashFee ? formatINR(course.cashFee) : `₢ ${course.creditPrice}`)}</strong>
        </span>
      </div>

      ${cleanDesc ? `
        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; white-space: pre-line;">
          ${escapeHtml(cleanDesc)}
        </p>
      ` : `
        <p style="margin: 0; font-size: 0.86rem; color: var(--text-muted);">
          No description provided for this session.
        </p>
      `}
    </div>
  `;
}

function actionPillStyle(color = '#f8fafc', bg = 'rgba(255,255,255,0.07)') {
  return `background: ${bg}; border: 1px solid rgba(255,255,255,0.12); color: ${color}; border-radius: 999px; padding: 8px 14px; font-size: 0.84rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: background 0.15s;`;
}

function stopLiveCanvasMixer() {
  if (window.activeLiveMixerTimer) {
    clearInterval(window.activeLiveMixerTimer);
    window.activeLiveMixerTimer = null;
  }
  if (Array.isArray(window.activeLiveExtraStreams)) {
    window.activeLiveExtraStreams.forEach(s => s.getTracks().forEach(t => t.stop()));
    window.activeLiveExtraStreams = [];
  }
}

function attachClassroomListeners(course, creatorName, resolvedAvatar, isOwner) {
  const mainVideoEl = document.getElementById('classroom-main-video');

  // Attach active Camera or Screen Share stream immediately when Live
  if (course.isLive && mainVideoEl) {
    if (window.activeLocalLiveStream) {
      mainVideoEl.srcObject = window.activeLocalLiveStream;
      mainVideoEl.muted = true;
      mainVideoEl.play().catch(err => console.warn('Live play retry:', err));
    } else if (isOwner) {
      // Auto-start camera if owner opened their live room without an active stream
      switchLiveBroadcastSource('camera');
    }
  }

  // Switch between: 'camera' | 'screen' | 'combo' (Screen + Circular Facecam Overlay)
  async function switchLiveBroadcastSource(mode) {
    try {
      let finalOutputStream = null;
      const newExtraStreams = [];

      if (mode === 'combo') {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        newExtraStreams.push(screenStream, camStream);

        const screenVid = document.createElement('video');
        screenVid.srcObject = screenStream;
        screenVid.muted = true;
        screenVid.playsInline = true;
        await screenVid.play();

        const camVid = document.createElement('video');
        camVid.srcObject = camStream;
        camVid.muted = true;
        camVid.playsInline = true;
        await camVid.play();

        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');

        stopLiveCanvasMixer();
        window.activeLiveExtraStreams = newExtraStreams;

        window.activeLiveMixerTimer = setInterval(() => {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(screenVid, 0, 0, canvas.width, canvas.height);

          const radius = 92;
          const cx = canvas.width - radius - 28;
          const cy = canvas.height - radius - 28;

          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          const vw = camVid.videoWidth || 640;
          const vh = camVid.videoHeight || 480;
          const size = Math.min(vw, vh);
          const sx = (vw - size) / 2;
          const sy = (vh - size) / 2;
          ctx.drawImage(camVid, sx, sy, size, size, cx - radius, cy - radius, radius * 2, radius * 2);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();
        }, 33);

        const mixedStream = canvas.captureStream(30);
        camStream.getAudioTracks().forEach(track => mixedStream.addTrack(track));
        finalOutputStream = mixedStream;
      } else {
        const singleStream = mode === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        stopLiveCanvasMixer();
        finalOutputStream = singleStream;
      }

      if (window.activeLocalLiveStream) {
        window.activeLocalLiveStream.getTracks().forEach(t => t.stop());
      }
      window.activeLocalLiveStream = finalOutputStream;

      const vid = document.getElementById('classroom-main-video');
      if (vid) {
        vid.srcObject = finalOutputStream;
        vid.muted = true;
        await vid.play().catch(() => {});
      }

      // Preserve existing recorded chunks and record new source cleanly
      window.liveRecordedChunks = window.liveRecordedChunks || [];
      if (window.activeLiveRecorder && window.activeLiveRecorder.state !== 'inactive') {
        try { window.activeLiveRecorder.stop(); } catch {}
      }
      try {
        const rec = new MediaRecorder(finalOutputStream, { mimeType: 'video/webm' });
        rec.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            window.liveRecordedChunks.push(ev.data);
          }
        };
        rec.start(500);
        window.activeLiveRecorder = rec;
      } catch {}

      const toastLabels = {
        camera: ['📷 Camera Active', 'Switched to camera mode.'],
        screen: ['🖥️ Sharing Screen', 'Your full screen is now live!'],
        combo: ['🧑‍💻 Screen + Facecam Active', 'Sharing screen with your facecam in the corner!']
      };
      window.showToast?.(toastLabels[mode][0], toastLabels[mode][1], 'success');
    } catch {
      window.showToast?.('Permission Denied', 'Please allow screen/camera permission in your browser.', 'error');
    }
  }

  document.getElementById('btn-live-switch-camera')?.addEventListener('click', () => switchLiveBroadcastSource('camera'));
  document.getElementById('btn-live-switch-screen')?.addEventListener('click', () => switchLiveBroadcastSource('screen'));
  document.getElementById('btn-live-switch-combo')?.addEventListener('click', () => switchLiveBroadcastSource('combo'));

  // End Live Stream & Save Recorded Video permanently
  document.getElementById('btn-classroom-end-live')?.addEventListener('click', async () => {
    const endBtn = document.getElementById('btn-classroom-end-live');
    if (endBtn) {
      endBtn.disabled = true;
      endBtn.textContent = '⏳ Saving Recording...';
    }

    try {
      // 1. Flush & stop MediaRecorder reliably so all chunks are captured
      if (window.activeLiveRecorder && window.activeLiveRecorder.state !== 'inactive') {
        try { window.activeLiveRecorder.requestData(); } catch {}
        await new Promise((resolve) => {
          window.activeLiveRecorder.onstop = resolve;
          window.activeLiveRecorder.stop();
          setTimeout(resolve, 800);
        });
      }

      // 2. Stop all Camera / Screen / Mixer tracks
      stopLiveCanvasMixer();
      if (window.activeLocalLiveStream) {
        window.activeLocalLiveStream.getTracks().forEach(t => t.stop());
        window.activeLocalLiveStream = null;
      }

      // 3. Upload recorded video blob to /api/upload-video
      let recordedVideoUrl = course.videoUrl || '';
      if (Array.isArray(window.liveRecordedChunks) && window.liveRecordedChunks.length > 0) {
        const blob = new Blob(window.liveRecordedChunks, { type: 'video/webm' });
        window.liveRecordedChunks = [];

        if (blob.size > 0) {
          const fd = new FormData();
          fd.append('videoFile', blob, `live-recording-${Date.now()}.webm`);
          const headers = {};
          if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

          const upRes = await fetch('/api/upload-video', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: fd
          });
          const upData = await upRes.json();
          if (upRes.ok && upData.success && upData.videoUrl) {
            recordedVideoUrl = upData.videoUrl;
          }
        }
      }

      // 4. Update course record in backend with recordedVideoUrl and isLive = false
      const headers = { 'Content-Type': 'application/json' };
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

      await fetch(`/api/courses/${course.id}/end-live`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          recordedVideoUrl: recordedVideoUrl,
          duration: 'Recorded Stream'
        })
      });

      // Also ensure course metadata is preserved
      await fetch(`/api/courses/${course.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          title: course.title,
          category: course.category,
          categoryName: course.categoryName,
          desc: course.desc || '',
          notes: course.notes || '',
          thumbnail: course.thumbnail || '',
          isLive: false,
          format: 'Recorded Live',
          duration: 'Recorded Stream',
          videoUrl: recordedVideoUrl
        })
      });

      course.isLive = false;
      course.videoUrl = recordedVideoUrl;
      await state.loadCoursesFromDB();

      window.showToast?.('⏹ Live Ended & Saved', 'Your recorded live session is now playable on the feed!', 'success');
      renderClassroom();
    } catch (err) {
      console.error('End live error:', err);
      window.showToast?.('Error', 'Could not finalize live stream.', 'error');
      if (endBtn) {
        endBtn.disabled = false;
        endBtn.textContent = '⏹ End Live Stream';
      }
    }
  });

  // Back to Feed
  document.getElementById('btn-classroom-back')?.addEventListener('click', () => {
    if (navigateCallback) navigateCallback('marketplace');
  });

  // Open Creator Public Channel
  document.querySelector('.js-watch-open-creator')?.addEventListener('click', () => {
    openCreatorChannel({
      id: course.userId || null,
      fullName: creatorName,
      avatar: resolvedAvatar
    });
  });

  // Switch Bottom Tabs
  document.querySelectorAll('.js-watch-bottom-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeBottomTab = btn.getAttribute('data-tab') || 'comments';
      renderClassroom();
    });
  });

  // Owner: Upload file or update notes right from the Lesson Notes & Code tab (even while live!)
  document.getElementById('live-classroom-notes-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-classroom-notes');
    const newText = document.getElementById('classroom-live-notes-text')?.value.trim() || '';
    const fileInput = document.getElementById('classroom-live-notes-file');
    const file = fileInput?.files?.[0];

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Uploading...';
      }

      const headers = {};
      if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

      let newAttachmentLine = '';
      if (file) {
        const fd = new FormData();
        fd.append('notesFile', file);
        const upRes = await fetch('/api/upload-notes-file', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: fd
        });
        const upData = await upRes.json();
        if (!upRes.ok || !upData.success) throw new Error(upData.error || 'File upload failed');
        newAttachmentLine = `📎 Attached File: ${upData.fileName} (${window.location.origin}${upData.fileUrl})`;
      }

      const existingAttachments = (course.notes || '').match(/📎 Attached File:[^\n]+/g) || [];
      if (newAttachmentLine) existingAttachments.push(newAttachmentLine);

      const combinedNotes = [newText, ...existingAttachments].filter(Boolean).join('\n\n');

      const patchRes = await fetch(`/api/courses/${course.id}/notes`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: combinedNotes })
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok || !patchData.success) throw new Error(patchData.error || 'Could not save notes');

      course.notes = combinedNotes;
      window.showToast?.('✅ Updated!', 'Lesson notes & files updated for viewers.', 'success');
      renderClassroom();
    } catch (err) {
      window.showToast?.('Error', err.message || 'Failed to update notes.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '📤 Publish Notes / File';
      }
    }
  });

  // Post New Comment
  document.getElementById('watch-comment-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('watch-comment-input');
    const text = input?.value.trim();
    if (!text) return;

    const authorName = auth.isAuthenticated() && auth.user?.fullName ? auth.user.fullName : (state.user?.name || 'Guest Learner');
    const authorAvatar = (auth.isAuthenticated() && auth.user?.avatar) || state.user?.avatar || '';

    saveCourseComment(course.id, {
      id: 'cmt-' + Date.now(),
      author: authorName,
      avatar: authorAvatar,
      text,
      createdAt: 'Just now'
    });

    window.showToast?.('💬 Comment Posted', 'Your comment has been added.', 'success');
    renderClassroom();
  });

  // Follow / Unfollow Creator from Watch View
  if (!isCurrentUserVideo && course.userId) {
    const followBtn = document.getElementById('btn-watch-follow');
    const followSymbol = document.getElementById('watch-follow-symbol');
    const followText = document.getElementById('watch-follow-text');
    const badge = document.getElementById('watch-follower-count-badge');

    // Fetch initial follow status & follower count
    fetch(`/api/users/${encodeURIComponent(course.userId)}/follow-status`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (badge) badge.textContent = d.followerCount;
          if (d.isFollowing) {
            followBtn?.classList.remove('btn-primary');
            followBtn?.classList.add('btn-secondary');
            if (followBtn) {
              followBtn.style.color = '#38bdf8';
              followBtn.style.borderColor = 'rgba(56, 189, 248, 0.4)';
              followBtn.style.background = 'rgba(56, 189, 248, 0.14)';
            }
            if (followSymbol) followSymbol.textContent = '✓';
            if (followText) followText.textContent = 'Following';
          }
        }
      })
      .catch(() => {});

    followBtn?.addEventListener('click', async () => {
      if (!auth.isAuthenticated()) {
        window.showToast?.('Sign In Required', 'Please log in to follow creators.', 'info');
        document.getElementById('btn-header-login')?.click();
        return;
      }

      followBtn.disabled = true;
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(course.userId)}/follow`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (badge) badge.textContent = data.followerCount;
          if (data.isFollowing) {
            followBtn.classList.remove('btn-primary');
            followBtn.classList.add('btn-secondary');
            followBtn.style.color = '#38bdf8';
            followBtn.style.borderColor = 'rgba(56, 189, 248, 0.4)';
            followBtn.style.background = 'rgba(56, 189, 248, 0.14)';
            if (followSymbol) followSymbol.textContent = '✓';
            if (followText) followText.textContent = 'Following';
          } else {
            followBtn.classList.remove('btn-secondary');
            followBtn.classList.add('btn-primary');
            followBtn.style.color = '#020617';
            followBtn.style.borderColor = '';
            followBtn.style.background = '#38bdf8';
            if (followSymbol) followSymbol.textContent = '+';
            if (followText) followText.textContent = 'Follow';
          }
          window.showToast?.('Following Updated', data.message, 'success');
        } else {
          window.showToast?.('Notice', data.error || 'Could not update follow status.', 'error');
        }
      } catch (err) {
        window.showToast?.('Error', 'Network error following creator.', 'error');
      } finally {
        followBtn.disabled = false;
      }
    });
  }

  // Like Button
  document.getElementById('btn-watch-like')?.addEventListener('click', () => {
    const liked = getStoredIds(LIKED_VIDEOS_KEY);
    const disliked = getStoredIds(DISLIKED_VIDEOS_KEY);
    const alreadyLiked = liked.includes(course.id);

    if (alreadyLiked) {
      setStoredIds(LIKED_VIDEOS_KEY, liked.filter(id => id !== course.id));
      course.supportCount = Math.max(0, (course.supportCount || 1) - 1);
    } else {
      setStoredIds(LIKED_VIDEOS_KEY, [...liked, course.id]);
      if (disliked.includes(course.id)) {
        setStoredIds(DISLIKED_VIDEOS_KEY, disliked.filter(id => id !== course.id));
      }
      state.supportCourse(course.id);
      window.showToast?.('👍 Liked!', 'Added to your liked videos.', 'success');
    }
    renderClassroom();
  });

  // Dislike Button
  document.getElementById('btn-watch-dislike')?.addEventListener('click', () => {
    const disliked = getStoredIds(DISLIKED_VIDEOS_KEY);
    const liked = getStoredIds(LIKED_VIDEOS_KEY);
    const alreadyDisliked = disliked.includes(course.id);

    if (alreadyDisliked) {
      setStoredIds(DISLIKED_VIDEOS_KEY, disliked.filter(id => id !== course.id));
    } else {
      setStoredIds(DISLIKED_VIDEOS_KEY, [...disliked, course.id]);
      if (liked.includes(course.id)) {
        setStoredIds(LIKED_VIDEOS_KEY, liked.filter(id => id !== course.id));
        course.supportCount = Math.max(0, (course.supportCount || 1) - 1);
      }
      window.showToast?.('👎 Feedback Recorded', 'You disliked this video.', 'info');
    }
    renderClassroom();
  });

  // Share & Copy Link
  document.getElementById('btn-watch-share')?.addEventListener('click', async () => {
    const shareUrl = `${window.location.origin}/?video=${encodeURIComponent(course.id)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      if (navigator.share) {
        navigator.share({ title: course.title, url: shareUrl }).catch(() => {});
      }
      window.showToast?.('🔗 Link Copied!', 'Video link copied to clipboard.', 'success');
    } catch {
      window.prompt('Copy this video link:', shareUrl);
    }
  });

  // Save / Bookmark
  document.getElementById('btn-watch-save')?.addEventListener('click', async () => {
    await toggleSaveItem(course.id, () => renderClassroom());
  });

  // Download Video
  document.getElementById('btn-watch-download')?.addEventListener('click', () => {
    downloadMedia(course);
  });

  // Report Video
  document.getElementById('btn-watch-report')?.addEventListener('click', () => {
    openReportModal({
      type: 'video',
      id: course.id,
      title: course.title
    });
  });
}

// =====================================================================
// FLOATING BOTTOM-RIGHT MINI-PLAYER WITH CLOSE (✕) BUTTON
// =====================================================================
export function dockVideoToMiniPlayer() {
  const mainVideo = document.getElementById('classroom-main-video');
  if (!mainVideo || mainVideo.paused || mainVideo.ended) return;

  const activeCourse = state.courses.find(c => String(c.id) === String(state.activeCourseId));
  if (!activeCourse || !activeCourse.videoUrl) return;

  const currentTime = mainVideo.currentTime || 0;
  mainVideo.pause();

  removeFloatingMiniPlayer(false);

  const mini = document.createElement('div');
  mini.id = 'floating-mini-player';
  mini.style.cssText = `
    position: fixed; right: 20px; bottom: 20px; width: 310px; background: #0f172a;
    border: 1px solid rgba(56, 189, 248, 0.45); border-radius: 14px; overflow: hidden;
    box-shadow: 0 18px 40px rgba(0,0,0,0.75); z-index: 9999;
  `;

  mini.innerHTML = `
    <div style="position: relative; background: #000; aspect-ratio: 16 / 9;">
      <video id="mini-player-video" src="${activeCourse.videoUrl}" controls playsinline style="width: 100%; height: 100%; object-fit: contain; display: block;"></video>
      <button 
        type="button" 
        id="btn-close-mini-player" 
        title="Close mini-player"
        style="position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: rgba(15, 23, 42, 0.88); color: #f8fafc; border: 1px solid rgba(255,255,255,0.2); font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;"
      >
        ✕
      </button>
    </div>
    <div id="mini-player-expand" style="padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
      <span style="font-size: 0.8rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">
        ${escapeHtml(activeCourse.title)}
      </span>
      <span style="font-size: 0.72rem; color: #38bdf8; font-weight: 600;">Expand ↗</span>
    </div>
  `;

  document.body.appendChild(mini);

  const miniVid = document.getElementById('mini-player-video');
  if (miniVid) {
    miniVid.currentTime = currentTime;
    miniVid.play().catch(() => {});
  }

  document.getElementById('btn-close-mini-player')?.addEventListener('click', (e) => {
    e.stopPropagation();
    removeFloatingMiniPlayer(true);
  });

  document.getElementById('mini-player-expand')?.addEventListener('click', () => {
    if (navigateCallback) navigateCallback('classroom');
  });
}

export function removeFloatingMiniPlayer(stopPlayback = false) {
  const mini = document.getElementById('floating-mini-player');
  if (!mini) return;

  const miniVid = document.getElementById('mini-player-video');
  const mainVid = document.getElementById('classroom-main-video');

  if (miniVid && mainVid && !stopPlayback) {
    const resumeTime = miniVid.currentTime || 0;
    const wasPlaying = !miniVid.paused;
    mainVid.currentTime = resumeTime;
    if (wasPlaying) mainVid.play().catch(() => {});
  }

  miniVid?.pause();
  mini.remove();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}