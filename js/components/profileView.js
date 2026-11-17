/**
- PUBLIC CREATOR CHANNEL & OWNER PROFILE CUSTOMIZATION VIEW
- Clicking any teacher's avatar or name opens their Public Creator Channel
- Shows "⚙️ Profile Customization" ONLY when viewing your own channel
- Includes universal 3-dot video menu (Playlist, Share/Copy Link, Download, Interest, Report + Owner Edit/Delete)
- Never displays backend discovery/skill tags on the public profile
 */

import { state } from '../state.js';
import { auth } from '../auth.js';
import {
  renderVideoThreeDotMenu,
  bindVideoThreeDotListeners,
  openReportModal
} from './videoActions.js';

let navigateCallback = null;
let selectedAvatarFile = null;
let isCustomizationPageOpen = false;
let viewedCreatorOverride = null; // null = current logged-in user's own profile

export function initProfileView(onNavigate) {
  navigateCallback = onNavigate;
  isCustomizationPageOpen = false;
  viewedCreatorOverride = null;
  renderProfileView();
}

// Open any creator's public channel from Marketplace / Classroom
export async function openCreatorChannel(creatorInfo) {
  isCustomizationPageOpen = false;

  // Check if the user clicked on their own channel
  const isSelf =
    auth.isAuthenticated() &&
    auth.user &&
    ((creatorInfo.id && String(creatorInfo.id) === String(auth.user.id)) ||
      (!creatorInfo.id && creatorInfo.fullName === auth.user.fullName));

  if (isSelf) {
    viewedCreatorOverride = null;
    if (navigateCallback) navigateCallback('profile');
    else renderProfileView();
    return;
  }

  // Set initial data immediately so navigation feels instant
  viewedCreatorOverride = {
    id: creatorInfo.id || null,
    fullName: creatorInfo.fullName || 'Creator',
    avatar:
      creatorInfo.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creatorInfo.fullName || 'Creator')}`,
    bio: ''
  };

  if (navigateCallback) navigateCallback('profile');
  else renderProfileView();

  // Fetch latest Bio & Avatar from backend if creator ID is available
  if (creatorInfo.id) {
    try {
      const res = await fetch(`/api/creators/${encodeURIComponent(creatorInfo.id)}`);
      const data = await res.json();
      if (res.ok && data.success && data.creator) {
        viewedCreatorOverride = data.creator;
        renderProfileView();
      }
    } catch (err) {
      console.warn('Could not load extended creator bio:', err);
    }
  }
}

// Reset override when user clicks their own profile icon in Navbar
export function openOwnProfile() {
  viewedCreatorOverride = null;
  isCustomizationPageOpen = false;
  if (navigateCallback) navigateCallback('profile');
  else renderProfileView();
}

export function renderProfileView() {
  const mount = document.getElementById('view-profile');
  if (!mount) return;

  // If viewing another creator's public channel, allow access even if not signed in
  if (viewedCreatorOverride) {
    renderChannelPage(mount, viewedCreatorOverride, false);
    return;
  }

  // Otherwise, viewing own profile -> require authentication
  if (!auth.isAuthenticated() || !auth.user) {
    mount.innerHTML = `
      <div style="max-width: 540px; margin: 60px auto; text-align: center; padding: 40px 24px; background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 16px;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">👤</div>
        <h2 style="color: var(--text-pure); margin-bottom: 8px;">Sign In to View Your Profile</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
          View your creator channel, published sessions, and customize your profile details.
        </p>
        <button type="button" id="btn-profile-logout" class="btn btn-secondary" style="border-color: rgba(239, 68, 68, 0.45); color: #fca5a5;">
          🚪 Log Out
        </button>
        <button class="btn btn-primary" onclick="document.getElementById('btn-header-login')?.click()">
          Sign In / Create Account
        </button>
      </div>
    `;
    return;
  }

  if (isCustomizationPageOpen) {
    renderCustomizationPage(mount);
  } else {
    renderChannelPage(mount, auth.user, true);
  }

  document.getElementById('btn-profile-logout')?.addEventListener('click', async () => {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (err) {
    console.warn('Logout request error:', err);
  }
  localStorage.removeItem('crditeach_token');
  localStorage.removeItem('crditeach_user');
  if (auth && typeof auth.logout === 'function') {
    await auth.logout();
  }
  window.showToast?.('Logged Out', 'You have been signed out safely.', 'info');
  window.location.reload();
  });
}

// =====================================================================
// VIEW 1: CREATOR CHANNEL PAGE (Public for Visitors, Editable for Owner)
// =====================================================================
function renderChannelPage(mount, profileUser, isOwner) {
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileUser.fullName || 'Creator')}`;
  const currentAvatar = profileUser.avatar || fallbackAvatar;
  const currentBio = profileUser.bio || '';

  const channelVideos = state.courses.filter(c => {
    if (profileUser.id && c.userId) {
      return String(c.userId) === String(profileUser.id);
    }
    return c.instructor?.name === profileUser.fullName;
  });

  const totalViews = channelVideos.reduce((sum, v) => sum + (v.views || 0), 0);

  mount.innerHTML = `
    <div style="max-width: 1020px; margin: 0 auto; padding: 24px 16px 60px;">
      <!-- Channel Banner & Header Card -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 18px; overflow: hidden; margin-bottom: 28px;">
        <div style="height: 120px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(16, 185, 129, 0.25)); border-bottom: 1px solid var(--border-glass);"></div>
        
        <div style="padding: 0 24px 24px; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: -46px;">
          <!-- Left: Avatar + Channel Name + Public Stats -->
          <div style="display: flex; align-items: flex-end; gap: 18px; flex-wrap: wrap;">
            <img 
              src="${currentAvatar}" 
              onerror="this.onerror=null; this.src='${fallbackAvatar}';"
              alt="${escapeHtml(profileUser.fullName)}" 
              style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 4px solid #0f172a; background: #1e293b;"
            />
            <div style="padding-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-pure); margin: 0;">
                  ${escapeHtml(profileUser.fullName)}
                </h1>
                <span style="font-size: 0.72rem; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 9px; border-radius: 999px;">
                  ✓ Creator
                </span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 5px 0 0;">
                <strong>${channelVideos.length}</strong> Videos • <strong>${totalViews}</strong> Total Views
                ${isOwner ? ` • <strong>₢ ${state.user?.credits ?? profileUser.credits ?? 50}</strong> Credits` : ''}
              </p>
            </div>
          </div>

          <!-- Right Action Buttons: Show Customization ONLY to Channel Owner -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            ${isOwner ? `
              <button class="btn btn-primary" id="btn-open-profile-customization" style="font-size: 0.84rem; padding: 9px 16px; display: inline-flex; align-items: center; gap: 6px;">
                ⚙️ Profile Customization
              </button>
            ` : `
              <button class="btn btn-secondary" id="btn-report-creator-profile" style="font-size: 0.84rem; padding: 9px 16px; color: #f87171; border-color: rgba(239, 68, 68, 0.35); display: inline-flex; align-items: center; gap: 6px;">
                <span>🚩</span> Report Channel
              </button>
            `}
            <button class="btn btn-secondary" id="btn-back-to-feed" style="font-size: 0.84rem; padding: 9px 16px;">
              ← Back to Feed
            </button>
          </div>
        </div>

        <!-- Bio Section (Clean, NO tags displayed) -->
        ${currentBio ? `
          <div style="padding: 14px 24px 20px; border-top: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">
              About
            </div>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.55;">
              ${escapeHtml(currentBio)}
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Published Videos Grid (3 per row YouTube Style) -->
      <div>
        <h3 style="font-size: 1.1rem; color: var(--text-pure); margin-bottom: 16px;">
          🎬 Videos (${channelVideos.length})
        </h3>
        ${channelVideos.length === 0 ? `
          <div style="text-align: center; padding: 42px 20px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 14px; color: var(--text-secondary); font-size: 0.88rem;">
            ${isOwner
        ? 'No videos published on your channel yet. Click <strong>+ Create</strong> in the top bar to upload a video or start a live session!'
        : 'This creator has not published any videos yet.'}
          </div>
        ` : `
          <div class="courses-grid" id="profile-channel-videos-grid">
            ${channelVideos.map(video => `
              <div class="yt-video-card" data-channel-video-id="${video.id}">
                <div class="yt-thumb-wrapper" style="background: #0f172a;">
                  ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${escapeHtml(video.title)}" />` : ''}
                  <span class="yt-duration-badge ${video.isLive ? 'is-live' : ''}">
                    ${video.isLive ? '● LIVE' : (video.duration || 'Video')}
                  </span>
                </div>
                <div class="yt-meta-row" style="align-items: flex-start;">
                  <img 
                    src="${currentAvatar}" 
                    onerror="this.onerror=null; this.src='${fallbackAvatar}';"
                    alt="${escapeHtml(profileUser.fullName)}" 
                    class="yt-channel-avatar" 
                    style="width: 36px; height: 36px; min-width: 36px; border-radius: 50%; object-fit: cover;"
                  />
                  <div class="yt-meta-text" style="flex: 1; min-width: 0;">
                    <h4 class="yt-video-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</h4>
                    <div class="yt-channel-name">
                      <span>${escapeHtml(profileUser.fullName)}</span>
                      <span style="color: #38bdf8; font-size: 0.72rem;">✓</span>
                    </div>
                    <div class="yt-stats-line">
                      ${video.views || 0} views • ${escapeHtml(video.categoryName || '')}
                    </div>
                  </div>

                  <!-- 3-Dot Action Menu (Playlist, Share/Copy Link, Download, Interest, Report + Owner Edit/Delete) -->
                  ${renderVideoThreeDotMenu(video)}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  // Bind 3-dot action menu on channel video cards
  const channelGrid = document.getElementById('profile-channel-videos-grid');
  if (channelGrid) {
    bindVideoThreeDotListeners(channelGrid, () => renderProfileView());
  }

  // Event Listeners
  document.getElementById('btn-back-to-feed')?.addEventListener('click', () => {
    viewedCreatorOverride = null;
    if (navigateCallback) navigateCallback('marketplace');
  });

  if (isOwner) {
    document.getElementById('btn-open-profile-customization')?.addEventListener('click', () => {
      isCustomizationPageOpen = true;
      renderProfileView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } else {
    document.getElementById('btn-report-creator-profile')?.addEventListener('click', () => {
      openReportModal({
        type: 'profile',
        id: profileUser.id || 'creator',
        title: profileUser.fullName || 'Creator Profile'
      });
    });
  }

  document.querySelectorAll('[data-channel-video-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-channel-video-id');
      state.activeCourseId = id;
      state.recordCourseView(id);
      if (navigateCallback) navigateCallback('classroom');
    });
  });
}

// =====================================================================
// VIEW 2: DEDICATED PROFILE CUSTOMIZATION PAGE (Owner Only)
// =====================================================================
function renderCustomizationPage(mount) {
  const user = auth.user;
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || 'User')}`;
  const currentAvatar = user.avatar || fallbackAvatar;
  const currentBio = user.bio || '';
  const currentSkills = user.skills || '';

  mount.innerHTML = `
    <div style="max-width: 720px; margin: 0 auto; padding: 24px 16px 60px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h1 style="font-size: 1.35rem; font-weight: 700; color: var(--text-pure); margin: 0;">
            ⚙️ Profile Customization
          </h1>
          <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 4px 0 0;">
            Customize your public channel appearance and hidden backend discovery tags.
          </p>
        </div>

        <button class="btn btn-secondary" id="btn-back-to-profile" style="font-size: 0.84rem; padding: 8px 16px;">
          ← Back to Profile
        </button>
      </div>

      <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 18px; padding: 24px;">
        <form id="profile-customization-form" style="display: flex; flex-direction: column; gap: 18px;">
          
          <!-- Profile Picture Upload -->
          <div style="display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 16px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-glass); border-radius: 12px;">
            <img 
              id="edit-avatar-preview" 
              src="${currentAvatar}" 
              onerror="this.onerror=null; this.src='${fallbackAvatar}';"
              alt="Avatar Preview" 
              style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-indigo);"
            />
            <div style="flex: 1; min-width: 220px;">
              <label for="profile-avatar-input" style="display: block; font-weight: 600; font-size: 0.9rem; color: var(--text-pure); margin-bottom: 6px;">
                📸 Profile / Channel Picture
              </label>
              <input 
                type="file" 
                id="profile-avatar-input" 
                accept="image/png, image/jpeg, image/webp" 
                style="font-size: 0.82rem; color: var(--text-secondary);"
              />
              <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px;">
                Square JPG, PNG or WebP recommended (Max 10MB)
              </div>
            </div>
          </div>

          <!-- Display / Channel Name -->
          <div>
            <label for="profile-fullname-input" style="display: block; font-weight: 600; font-size: 0.88rem; color: var(--text-pure); margin-bottom: 6px;">
              Channel / Display Name
            </label>
            <input 
              type="text" 
              id="profile-fullname-input" 
              value="${escapeHtml(user.fullName || '')}" 
              placeholder="Enter your name or channel name" 
              required 
              style="width: 100%;"
            />
          </div>

          <!-- Bio -->
          <div>
            <label for="profile-bio-input" style="display: block; font-weight: 600; font-size: 0.88rem; color: var(--text-pure); margin-bottom: 6px;">
              Bio / About Channel
            </label>
            <textarea 
              id="profile-bio-input" 
              rows="3" 
              placeholder="Write a short introduction about yourself and what you teach..."
              style="width: 100%; resize: vertical;"
            >${escapeHtml(currentBio)}</textarea>
          </div>

          <!-- Hidden Backend Skill Tags -->
          <div>
            <label for="profile-skills-input" style="display: block; font-weight: 600; font-size: 0.88rem; color: var(--text-pure); margin-bottom: 6px;">
              Skill & Discovery Tags <span style="font-size: 0.75rem; font-weight: 500; color: var(--text-muted);">(Saved in backend only • Hidden on public profile)</span>
            </label>
            <input 
              type="text" 
              id="profile-skills-input" 
              value="${escapeHtml(currentSkills)}" 
              placeholder="e.g. javascript, react, python, design, english" 
              style="width: 100%;"
            />
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 14px; border-top: 1px solid var(--border-glass);">
            <button type="button" id="btn-cancel-customization" class="btn btn-secondary" style="padding: 10px 18px;">
              Cancel
            </button>
            <button type="submit" id="btn-save-profile" class="btn btn-primary" style="padding: 10px 24px; font-weight: 600;">
              💾 Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  attachCustomizationListeners();
}

function attachCustomizationListeners() {
  selectedAvatarFile = null;

  const goBackToProfile = () => {
    isCustomizationPageOpen = false;
    renderProfileView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  document.getElementById('btn-back-to-profile')?.addEventListener('click', goBackToProfile);
  document.getElementById('btn-cancel-customization')?.addEventListener('click', goBackToProfile);

  const avatarInput = document.getElementById('profile-avatar-input');
  const avatarPreview = document.getElementById('edit-avatar-preview');
  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        selectedAvatarFile = file;
        avatarPreview.src = URL.createObjectURL(file);
      }
    });
  }

  const form = document.getElementById('profile-customization-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('btn-save-profile');
      const fullName = document.getElementById('profile-fullname-input').value.trim();
      const bio = document.getElementById('profile-bio-input').value.trim();
      const skills = document.getElementById('profile-skills-input').value.trim();

      if (!fullName) return;

      try {
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = '⏳ Saving...';
        }

        let uploadedAvatarUrl = auth.user?.avatar || null;

        if (selectedAvatarFile) {
          const formData = new FormData();
          formData.append('thumbnailFile', selectedAvatarFile);

          const headers = {};
          if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

          const uploadRes = await fetch('/api/upload-thumbnail', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || !uploadData.success) {
            throw new Error(uploadData.error || 'Avatar upload failed.');
          }
          uploadedAvatarUrl = uploadData.thumbnailUrl;
        }

        const headers = { 'Content-Type': 'application/json' };
        if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

        const res = await fetch('/api/user/profile', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            fullName,
            bio,
            skills,
            avatar: uploadedAvatarUrl
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          auth.user = { ...auth.user, ...data.user };
          if (state.user) {
            state.user.name = data.user.fullName;
            state.user.avatar = data.user.avatar;
          }

          await state.loadCoursesFromDB();
          window.showToast('Profile Updated!', 'Your changes have been saved.', 'success');

          isCustomizationPageOpen = false;
          renderProfileView();
        } else {
          throw new Error(data.error || 'Could not update profile.');
        }
      } catch (err) {
        console.error('Profile save error:', err);
        window.showToast('Error', err.message || 'Failed to save profile changes.', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Save Changes';
        }
      }
    });
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}