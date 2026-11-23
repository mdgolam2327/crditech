/**
 * CRDITEACH - CREATOR CHANNEL, PROFILE SECTIONS & COMPREHENSIVE SETTINGS
 * Includes:
 * 1. Overview (Public & Owner Channel)
 * 2. Saved Items (Persistent Bookmarks)
 * 3. Downloads (Download History & Re-download)
 * 4. My Playlists (Create, Rename, Delete, Browse & Manage Playlist Items)
 * 5. Full Settings Page (Account, Profile, Privacy, Notifications, Theme, Help & Sign Out)
 */

import { state, formatINR } from '../state.js';
import { auth } from '../auth.js';
import {
  renderVideoThreeDotMenu,
  bindVideoThreeDotListeners,
  openReportModal,
  toggleSaveItem,
  downloadMedia
} from './videoActions.js';

let navigateCallback = null;
let selectedAvatarFile = null;
let viewedCreatorOverride = null; // null = current logged-in user
let activeProfileTab = 'overview'; // 'overview' | 'saved' | 'downloads' | 'playlists' | 'settings'
let activeSettingsSection = 'account'; // 'account' | 'profile' | 'privacy' | 'notifications' | 'saved' | 'downloads' | 'playlists' | 'appearance' | 'help' | 'signout'
let activeBrowsingPlaylistId = null;

export function initProfileView(onNavigate) {
  navigateCallback = onNavigate;
  activeProfileTab = 'overview';
  viewedCreatorOverride = null;
  activeBrowsingPlaylistId = null;
  renderProfileView();
}

export async function openCreatorChannel(creatorInfo) {
  activeProfileTab = 'overview';
  activeBrowsingPlaylistId = null;

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

  if (creatorInfo.id) {
    try {
      const res = await fetch(`/api/creators/${encodeURIComponent(creatorInfo.id)}`);
      const data = await res.json();
      if (res.ok && data.success && data.creator) {
        viewedCreatorOverride = data.creator;
        renderProfileView();
      }
    } catch (err) {
      console.warn('Could not load creator channel info:', err);
    }
  }
}

export async function openOwnProfile() {
  viewedCreatorOverride = null;
  activeProfileTab = 'overview';
  activeBrowsingPlaylistId = null;
  if (auth.isAuthenticated() && auth.user?.id) {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(auth.user.id)}/follow-status`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        auth.user.followerCount = data.followerCount;
        auth.user.followingCount = data.followingCount;
      }
    } catch {}
  }
  if (navigateCallback) navigateCallback('profile');
  else renderProfileView();
}

export function openSettingsPage(section = 'account') {
  viewedCreatorOverride = null;
  activeProfileTab = 'settings';
  activeSettingsSection = section;
  if (navigateCallback) navigateCallback('profile');
  else renderProfileView();
}

export function renderProfileView() {
  const mount = document.getElementById('view-profile');
  if (!mount) return;

  if (viewedCreatorOverride) {
    renderPublicChannelPage(mount, viewedCreatorOverride);
    return;
  }

  if (!auth.isAuthenticated() || !auth.user) {
    mount.innerHTML = `
      <div style="max-width: 540px; margin: 60px auto; text-align: center; padding: 40px 24px; background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 16px;">
        <div style="font-size: 2.8rem; margin-bottom: 12px;">👤</div>
        <h2 style="color: var(--text-pure); margin-bottom: 8px;">Sign In to View Your Profile</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 24px;">
          Access your personal channel, saved items, download history, playlists, and settings.
        </p>
        <button class="btn btn-primary" onclick="document.getElementById('btn-header-login')?.click()" style="padding: 10px 24px;">
          Sign In / Create Account
        </button>
      </div>
    `;
    return;
  }

  renderOwnerProfilePage(mount, auth.user);
}

// =====================================================================
// 1. PUBLIC CREATOR CHANNEL (When viewing another creator)
// =====================================================================
function renderPublicChannelPage(mount, creator) {
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creator.fullName || 'Creator')}`;
  const currentAvatar = creator.avatar || fallbackAvatar;
  const currentBio = creator.bio || '';

  const channelVideos = state.courses.filter(c => {
    if (creator.id && c.userId) return String(c.userId) === String(creator.id);
    return c.instructor?.name === creator.fullName;
  });

  const totalViews = channelVideos.reduce((sum, v) => sum + (v.views || 0), 0);

  mount.innerHTML = `
    <div style="max-width: 1060px; margin: 0 auto; padding: 24px 16px 60px;">
      <!-- Channel Banner & Header Card -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 18px; overflow: hidden; margin-bottom: 24px;">
        <div style="height: 120px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(16, 185, 129, 0.25)); border-bottom: 1px solid var(--border-glass);"></div>
        
        <div style="padding: 0 24px 24px; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: -46px;">
          <div style="display: flex; align-items: flex-end; gap: 18px; flex-wrap: wrap;">
            <img 
              src="${currentAvatar}" 
              onerror="this.onerror=null; this.src='${fallbackAvatar}';"
              alt="${escapeHtml(creator.fullName)}" 
              style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 4px solid #0f172a; background: #1e293b;"
            />
            <div style="padding-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-pure); margin: 0;">
                  ${escapeHtml(creator.fullName)}
                </h1>
                <span style="font-size: 0.72rem; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 9px; border-radius: 999px;">
                  ✓ Verified Creator
                </span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 5px 0 0;">
                <strong id="channel-followers-count">${creator.followerCount ?? 0}</strong> Followers • <strong>${channelVideos.length}</strong> Videos • <strong>${totalViews}</strong> Total Views
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button class="btn ${creator.isFollowing ? 'btn-secondary' : 'btn-primary'}" id="btn-profile-follow" style="font-size: 0.84rem; padding: 9px 18px; border-radius: 999px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; ${creator.isFollowing ? 'border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;' : ''}">
              <span>${creator.isFollowing ? '✓' : '+'}</span>
              <span>${creator.isFollowing ? 'Following' : 'Follow'}</span>
            </button>
            <button class="btn btn-secondary" id="btn-report-creator-profile" style="font-size: 0.84rem; padding: 9px 16px; color: #f87171; border-color: rgba(239, 68, 68, 0.35); display: inline-flex; align-items: center; gap: 6px;">
              <span>🚩</span> Report Channel
            </button>
            <button class="btn btn-secondary" id="btn-back-to-feed" style="font-size: 0.84rem; padding: 9px 16px;">
              ← Back to Feed
            </button>
          </div>
        </div>

        ${currentBio ? `
          <div style="padding: 14px 24px 20px; border-top: 1px solid rgba(255,255,255,0.06);">
            <div style="font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 4px;">
              About Channel
            </div>
            <p style="font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.55;">
              ${escapeHtml(currentBio)}
            </p>
          </div>
        ` : ''}
      </div>

      <!-- Published Videos Grid -->
      <div>
        <h3 style="font-size: 1.15rem; color: var(--text-pure); margin-bottom: 16px;">
          🎬 Published Lessons (${channelVideos.length})
        </h3>
        ${channelVideos.length === 0 ? `
          <div style="text-align: center; padding: 48px 20px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 14px; color: var(--text-secondary); font-size: 0.88rem;">
            This creator has not published any videos yet.
          </div>
        ` : `
          <div class="courses-grid" id="profile-channel-videos-grid">
            ${channelVideos.map(video => renderChannelVideoCard(video, creator, currentAvatar, fallbackAvatar)).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  const channelGrid = document.getElementById('profile-channel-videos-grid');
  if (channelGrid) {
    bindVideoThreeDotListeners(channelGrid, () => renderProfileView());
  }

  document.getElementById('btn-back-to-feed')?.addEventListener('click', () => {
    viewedCreatorOverride = null;
    if (navigateCallback) navigateCallback('marketplace');
  });

  document.getElementById('btn-profile-follow')?.addEventListener('click', async () => {
    if (!auth.isAuthenticated()) {
      window.showToast?.('Sign In Required', 'Please log in to follow creators.', 'info');
      document.getElementById('btn-header-login')?.click();
      return;
    }
    const targetId = creator.id;
    if (!targetId) return;

    const followBtn = document.getElementById('btn-profile-follow');
    if (followBtn) followBtn.disabled = true;

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(targetId)}/follow`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        creator.isFollowing = data.isFollowing;
        creator.followerCount = data.followerCount;
        window.showToast?.('Following Updated', data.message, 'success');
        renderProfileView();
      }
    } catch {
      window.showToast?.('Error', 'Network error following creator.', 'error');
    } finally {
      if (followBtn) followBtn.disabled = false;
    }
  });

  document.getElementById('btn-report-creator-profile')?.addEventListener('click', () => {
    openReportModal({
      type: 'profile',
      id: creator.id || 'creator',
      title: creator.fullName || 'Creator Profile'
    });
  });

  mount.querySelectorAll('[data-channel-video-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-channel-video-id');
      state.activeCourseId = id;
      state.recordCourseView(id);
      if (navigateCallback) navigateCallback('classroom');
    });
  });
}

// =====================================================================
// 2. OWNER PROFILE PAGE WITH STRUCTURED TABS (Requirement 7)
// =====================================================================
function renderOwnerProfilePage(mount, user) {
  const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || 'User')}`;
  const currentAvatar = user.avatar || fallbackAvatar;
  const currentBio = user.bio || '';

  const myVideos = state.courses.filter(c => {
    if (user.id && c.userId) return String(c.userId) === String(user.id);
    return c.instructor?.name === user.fullName;
  });

  const totalViews = myVideos.reduce((sum, v) => sum + (v.views || 0), 0);

  mount.innerHTML = `
    <div style="max-width: 1060px; margin: 0 auto; padding: 24px 16px 70px;">
      <!-- Profile Header Banner -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 18px; overflow: hidden; margin-bottom: 22px;">
        <div style="height: 125px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(16, 185, 129, 0.3)); border-bottom: 1px solid var(--border-glass);"></div>
        
        <div style="padding: 0 24px 22px; display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: -48px;">
          <div style="display: flex; align-items: flex-end; gap: 18px; flex-wrap: wrap;">
            <img 
              src="${currentAvatar}" 
              onerror="this.onerror=null; this.src='${fallbackAvatar}';"
              alt="${escapeHtml(user.fullName)}" 
              style="width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 4px solid #0f172a; background: #1e293b;"
            />
            <div style="padding-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <h1 style="font-size: 1.55rem; font-weight: 700; color: var(--text-pure); margin: 0;">
                  ${escapeHtml(user.fullName)}
                </h1>
                <span style="font-size: 0.72rem; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 2px 9px; border-radius: 999px;">
                  ✓ Your Account
                </span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 5px 0 0;">
                <strong id="channel-followers-count">${user.followerCount ?? 0}</strong> Followers • <strong>${myVideos.length}</strong> Videos • <strong>${totalViews}</strong> Total Views • <strong>₢ ${state.user?.credits ?? user.credits ?? 0}</strong> Credits
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" id="btn-quick-settings" style="font-size: 0.84rem; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px;">
              ⚙️ Settings
            </button>
            <button class="btn btn-secondary" id="btn-back-to-feed-owner" style="font-size: 0.84rem; padding: 8px 16px;">
              ← Back to Feed
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs (Requirement 7: Overview, Saved Items, Downloads, My Playlists, Settings) -->
      <div style="display: flex; gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 24px; overflow-x: auto; padding-bottom: 2px;">
        <button type="button" class="profile-nav-tab-btn ${activeProfileTab === 'overview' ? 'active-profile-tab' : ''}" data-profile-tab="overview" style="${tabButtonStyle(activeProfileTab === 'overview')}">
          <span>👤 Overview</span>
        </button>
        <button type="button" class="profile-nav-tab-btn ${activeProfileTab === 'saved' ? 'active-profile-tab' : ''}" data-profile-tab="saved" style="${tabButtonStyle(activeProfileTab === 'saved')}">
          <span>🔖 Saved Items</span>
        </button>
        <button type="button" class="profile-nav-tab-btn ${activeProfileTab === 'downloads' ? 'active-profile-tab' : ''}" data-profile-tab="downloads" style="${tabButtonStyle(activeProfileTab === 'downloads')}">
          <span>⬇️ Downloads</span>
        </button>
        <button type="button" class="profile-nav-tab-btn ${activeProfileTab === 'playlists' ? 'active-profile-tab' : ''}" data-profile-tab="playlists" style="${tabButtonStyle(activeProfileTab === 'playlists')}">
          <span>📑 My Playlists</span>
        </button>
        <button type="button" class="profile-nav-tab-btn ${activeProfileTab === 'settings' ? 'active-profile-tab' : ''}" data-profile-tab="settings" style="${tabButtonStyle(activeProfileTab === 'settings')}">
          <span>⚙️ Settings</span>
        </button>
      </div>

      <!-- Active Tab Content Area -->
      <div id="profile-tab-content-mount"></div>
    </div>
  `;

  // Bind tab buttons
  mount.querySelectorAll('.profile-nav-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-profile-tab');
      activeProfileTab = targetTab;
      activeBrowsingPlaylistId = null;
      renderOwnerProfilePage(mount, user);
    });
  });

  document.getElementById('btn-quick-settings')?.addEventListener('click', () => {
    activeProfileTab = 'settings';
    renderOwnerProfilePage(mount, user);
  });

  document.getElementById('btn-back-to-feed-owner')?.addEventListener('click', () => {
    if (navigateCallback) navigateCallback('marketplace');
  });

  // Render the specific active tab inside the mount
  const contentMount = document.getElementById('profile-tab-content-mount');
  if (!contentMount) return;

  if (activeProfileTab === 'overview') {
    renderTabOverview(contentMount, user, myVideos, currentAvatar, fallbackAvatar);
  } else if (activeProfileTab === 'saved') {
    renderTabSavedItems(contentMount);
  } else if (activeProfileTab === 'downloads') {
    renderTabDownloads(contentMount);
  } else if (activeProfileTab === 'playlists') {
    renderTabPlaylists(contentMount);
  } else if (activeProfileTab === 'settings') {
    renderTabSettings(contentMount, user);
  }
}

function tabButtonStyle(isActive) {
  return `background: ${isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent'}; border: none; border-bottom: 2px solid ${isActive ? '#38bdf8' : 'transparent'}; color: ${isActive ? '#38bdf8' : '#94a3b8'}; padding: 10px 18px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; border-radius: 8px 8px 0 0; transition: all 0.15s;`;
}

// -------------------------------------------------------------
// TAB 1: OVERVIEW
// -------------------------------------------------------------
function renderTabOverview(mount, user, myVideos, currentAvatar, fallbackAvatar) {
  const currentBio = user.bio || '';

  mount.innerHTML = `
    <div>
      ${currentBio ? `
        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 14px; padding: 18px 22px; margin-bottom: 24px;">
          <div style="font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 700; margin-bottom: 6px;">
            About You & Your Teaching
          </div>
          <p style="font-size: 0.92rem; color: var(--text-secondary); margin: 0; line-height: 1.6;">
            ${escapeHtml(currentBio)}
          </p>
        </div>
      ` : ''}

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <h3 style="font-size: 1.15rem; color: var(--text-pure); margin: 0;">
          🎬 Your Published Videos (${myVideos.length})
        </h3>
        <button class="btn btn-primary" onclick="document.getElementById('btn-upload-video')?.click()" style="font-size: 0.82rem; padding: 7px 14px;">
          + Upload New Video
        </button>
      </div>

      ${myVideos.length === 0 ? `
        <div style="text-align: center; padding: 50px 20px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 14px; color: var(--text-secondary); font-size: 0.9rem;">
          <div style="font-size: 2.2rem; margin-bottom: 10px;">🎥</div>
          <div style="font-weight: 600; color: #f8fafc; margin-bottom: 6px;">No published lessons yet</div>
          <p style="margin: 0 0 16px; color: #94a3b8; font-size: 0.84rem;">Share your knowledge with peers to earn credits and build your teaching reputation.</p>
          <button class="btn btn-primary" onclick="document.getElementById('btn-upload-video')?.click()">
            Upload First Lesson
          </button>
        </div>
      ` : `
        <div class="courses-grid" id="owner-videos-grid">
          ${myVideos.map(video => renderChannelVideoCard(video, user, currentAvatar, fallbackAvatar)).join('')}
        </div>
      `}
    </div>
  `;

  const grid = document.getElementById('owner-videos-grid');
  if (grid) {
    bindVideoThreeDotListeners(grid, () => renderProfileView());
  }

  mount.querySelectorAll('[data-channel-video-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-channel-video-id');
      state.activeCourseId = id;
      state.recordCourseView(id);
      if (navigateCallback) navigateCallback('classroom');
    });
  });
}

function renderChannelVideoCard(video, creator, currentAvatar, fallbackAvatar) {
  return `
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
          alt="${escapeHtml(creator.fullName)}" 
          class="yt-channel-avatar" 
          style="width: 36px; height: 36px; min-width: 36px; border-radius: 50%; object-fit: cover;"
        />
        <div class="yt-meta-text" style="flex: 1; min-width: 0;">
          <h4 class="yt-video-title" title="${escapeHtml(video.title)}">${escapeHtml(video.title)}</h4>
          <div class="yt-channel-name">
            <span>${escapeHtml(creator.fullName)}</span>
            <span style="color: #38bdf8; font-size: 0.72rem;">✓</span>
          </div>
          <div class="yt-stats-line">
            ${video.views || 0} views • ${escapeHtml(video.categoryName || '')}
          </div>
        </div>

        ${renderVideoThreeDotMenu(video)}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// TAB 2: SAVED ITEMS (Requirement 4: Save Content Feature)
// -------------------------------------------------------------
async function renderTabSavedItems(mount) {
  mount.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #94a3b8;">
      ⏳ Loading your bookmarked items...
    </div>
  `;

  try {
    const res = await fetch('/api/user/saved-items', { credentials: 'include' });
    const data = await res.json();
    const savedItems = (res.ok && data.success && Array.isArray(data.savedItems)) ? data.savedItems : [];

    if (savedItems.length === 0) {
      mount.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 16px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔖</div>
          <h3 style="color: #f8fafc; margin: 0 0 8px;">No Saved Items Yet</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; max-width: 440px; margin: 0 auto 20px;">
            Click the bookmark icon or "Save Item" on any video, tutorial, or post across Crditeach to save it here.
          </p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Explore Marketplace
          </button>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;">
          <h3 style="font-size: 1.15rem; color: var(--text-pure); margin: 0;">
            🔖 Your Bookmarked Content (${savedItems.length})
          </h3>
          <span style="font-size: 0.8rem; color: #94a3b8;">Permanently saved to your account</span>
        </div>

        <div class="courses-grid" id="saved-items-grid">
          ${savedItems.map(item => `
            <div class="yt-video-card" style="position: relative;">
              <div class="yt-thumb-wrapper js-open-saved-video" data-course-id="${item.id}" style="cursor: pointer;">
                <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}" alt="${escapeHtml(item.title)}" />
                <span class="yt-duration-badge">${item.duration || 'Video'}</span>
              </div>
              <div class="yt-meta-row" style="align-items: flex-start;">
                <div class="yt-meta-text" style="flex: 1; min-width: 0;">
                  <h4 class="yt-video-title js-open-saved-video" data-course-id="${item.id}" style="cursor: pointer;" title="${escapeHtml(item.title)}">
                    ${escapeHtml(item.title)}
                  </h4>
                  <div class="yt-channel-name">
                    <span>${escapeHtml(item.instructor?.name || 'Instructor')}</span>
                  </div>
                  <div class="yt-stats-line">
                    ${item.views || 0} views • ${escapeHtml(item.categoryName || 'Lesson')}
                  </div>
                </div>

                <button 
                  type="button" 
                  class="btn-remove-saved" 
                  data-course-id="${item.id}"
                  title="Remove from saved items"
                  style="background: transparent; border: none; color: #f87171; font-size: 1rem; cursor: pointer; padding: 4px; border-radius: 6px;"
                >
                  ✕
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    mount.querySelectorAll('.js-open-saved-video').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-course-id');
        state.activeCourseId = id;
        state.recordCourseView(id);
        if (navigateCallback) navigateCallback('classroom');
      });
    });

    mount.querySelectorAll('.btn-remove-saved').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-course-id');
        await toggleSaveItem(id);
        renderTabSavedItems(mount);
      });
    });
  } catch (err) {
    mount.innerHTML = `<div style="text-align: center; color: #fca5a5; padding: 30px;">Failed to load saved items.</div>`;
  }
}

// -------------------------------------------------------------
// TAB 3: DOWNLOADS (Requirement 5: Download Feature)
// -------------------------------------------------------------
async function renderTabDownloads(mount) {
  mount.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #94a3b8;">
      ⏳ Loading your download history...
    </div>
  `;

  try {
    const res = await fetch('/api/user/downloads', { credentials: 'include' });
    const data = await res.json();
    const downloads = (res.ok && data.success && Array.isArray(data.downloads)) ? data.downloads : [];

    if (downloads.length === 0) {
      mount.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 16px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">⬇️</div>
          <h3 style="color: #f8fafc; margin: 0 0 8px;">No Download History</h3>
          <p style="color: #94a3b8; font-size: 0.88rem; max-width: 440px; margin: 0 auto 20px;">
            Use the "Download" option from any video's action menu to save offline lessons directly to your device.
          </p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            Browse Content
          </button>
        </div>
      `;
      return;
    }

    mount.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 1.15rem; color: var(--text-pure); margin: 0;">
              ⬇️ Downloaded Files & History (${downloads.length})
            </h3>
            <span style="font-size: 0.8rem; color: #94a3b8;">Direct device downloads recorded on your account</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${downloads.map(dl => {
            const dateStr = dl.downloadedAt ? new Date(dl.downloadedAt).toLocaleDateString() : 'Recent';
            return `
              <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 14px; min-width: 0;">
                  <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(56, 189, 248, 0.12); color: #38bdf8; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                    📹
                  </div>
                  <div style="min-width: 0;">
                    <div style="font-size: 0.95rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${escapeHtml(dl.title)}
                    </div>
                    <div style="font-size: 0.76rem; color: #94a3b8; margin-top: 2px;">
                      Format: <span style="text-transform: uppercase; color: #cbd5e1;">${dl.fileType || 'MP4'}</span> • Downloaded on ${dateStr}
                    </div>
                  </div>
                </div>

                <a 
                  href="${dl.fileUrl}" 
                  download="${escapeAttr(dl.title)}.mp4" 
                  target="_blank"
                  class="btn btn-secondary" 
                  style="font-size: 0.82rem; padding: 7px 16px; display: inline-flex; align-items: center; gap: 6px; text-decoration: none;"
                >
                  <span>⬇️</span> Re-download
                </a>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    mount.innerHTML = `<div style="text-align: center; color: #fca5a5; padding: 30px;">Failed to load download history.</div>`;
  }
}

// -------------------------------------------------------------
// TAB 4: MY PLAYLISTS (Requirement 6: Playlist Management)
// -------------------------------------------------------------
async function renderTabPlaylists(mount) {
  if (activeBrowsingPlaylistId) {
    renderSinglePlaylistView(mount, activeBrowsingPlaylistId);
    return;
  }

  mount.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #94a3b8;">
      ⏳ Loading your playlists...
    </div>
  `;

  try {
    const res = await fetch('/api/user/playlists', { credentials: 'include' });
    const data = await res.json();
    const playlists = (res.ok && data.success && Array.isArray(data.playlists)) ? data.playlists : [];

    mount.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 1.15rem; color: var(--text-pure); margin: 0;">
              📑 Custom Playlists (${playlists.length})
            </h3>
            <span style="font-size: 0.8rem; color: #94a3b8;">Organize courses and tutorials into structured collections</span>
          </div>

          <button class="btn btn-primary" id="btn-create-playlist-trigger" style="font-size: 0.84rem; padding: 8px 18px; display: inline-flex; align-items: center; gap: 6px;">
            <span>+</span> Create New Playlist
          </button>
        </div>

        ${playlists.length === 0 ? `
          <div style="text-align: center; padding: 50px 20px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 16px;">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">📁</div>
            <h3 style="color: #f8fafc; margin: 0 0 8px;">No Playlists Created Yet</h3>
            <p style="color: #94a3b8; font-size: 0.88rem; max-width: 440px; margin: 0 auto 20px;">
              Create curated playlists to group your favorite tutorials, masterclasses, and code sessions.
            </p>
            <button class="btn btn-primary" id="btn-empty-create-playlist">
              + Create First Playlist
            </button>
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px;">
            ${playlists.map(pl => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;">
                <div style="position: relative; height: 140px; background: #020617; display: flex; align-items: center; justify-content: center; cursor: pointer;" class="js-open-playlist-card" data-playlist-id="${pl.id}">
                  ${pl.thumbnail ? `
                    <img src="${pl.thumbnail}" alt="${escapeHtml(pl.title)}" style="width: 100%; height: 100%; object-fit: cover;" />
                  ` : `
                    <div style="font-size: 2.8rem; opacity: 0.6;">📁</div>
                  `}
                  <div style="position: absolute; right: 10px; bottom: 10px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(4px); padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; color: #38bdf8;">
                    ${pl.itemCount} Videos
                  </div>
                </div>

                <div style="padding: 14px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                  <div>
                    <h4 style="margin: 0 0 6px; font-size: 0.98rem; font-weight: 700; color: #f8fafc;">
                      ${escapeHtml(pl.title)}
                    </h4>
                    <p style="margin: 0; font-size: 0.8rem; color: #94a3b8; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      ${escapeHtml(pl.description || 'No description provided.')}
                    </p>
                  </div>

                  <div style="margin-top: 14px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
                    <button type="button" class="btn btn-secondary js-open-playlist-card" data-playlist-id="${pl.id}" style="font-size: 0.78rem; padding: 5px 12px;">
                      Open Playlist
                    </button>
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="btn-rename-playlist" data-playlist-id="${pl.id}" data-current-title="${escapeAttr(pl.title)}" title="Rename" style="background: transparent; border: 1px solid rgba(255,255,255,0.12); color: #cbd5e1; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 0.76rem;">
                        ✏️
                      </button>
                      <button type="button" class="btn-delete-playlist" data-playlist-id="${pl.id}" data-title="${escapeAttr(pl.title)}" title="Delete" style="background: transparent; border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 0.76rem;">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    const openCreateDialog = () => {
      const title = window.prompt('Enter title for your new playlist:');
      if (!title || !title.trim()) return;
      const desc = window.prompt('Enter optional description:') || '';

      fetch('/api/user/playlists', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: desc.trim() })
      }).then(r => r.json()).then(d => {
        if (d.success) {
          window.showToast?.('Playlist Created!', `"${title.trim()}" is ready.`, 'success');
          renderTabPlaylists(mount);
        }
      });
    };

    document.getElementById('btn-create-playlist-trigger')?.addEventListener('click', openCreateDialog);
    document.getElementById('btn-empty-create-playlist')?.addEventListener('click', openCreateDialog);

    mount.querySelectorAll('.js-open-playlist-card').forEach(el => {
      el.addEventListener('click', () => {
        activeBrowsingPlaylistId = el.getAttribute('data-playlist-id');
        renderSinglePlaylistView(mount, activeBrowsingPlaylistId);
      });
    });

    mount.querySelectorAll('.btn-rename-playlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-playlist-id');
        const current = btn.getAttribute('data-current-title');
        const newTitle = window.prompt('Rename playlist:', current);
        if (!newTitle || !newTitle.trim() || newTitle === current) return;

        fetch(`/api/user/playlists/${encodeURIComponent(id)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle.trim() })
        }).then(r => r.json()).then(d => {
          if (d.success) {
            window.showToast?.('Renamed', 'Playlist title updated.', 'success');
            renderTabPlaylists(mount);
          }
        });
      });
    });

    mount.querySelectorAll('.btn-delete-playlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-playlist-id');
        const title = btn.getAttribute('data-title');
        const confirmed = window.confirm(`Are you sure you want to delete the playlist "${title}"? Videos will not be deleted.`);
        if (!confirmed) return;

        fetch(`/api/user/playlists/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include'
        }).then(r => r.json()).then(d => {
          if (d.success) {
            window.showToast?.('Deleted', 'Playlist removed.', 'info');
            renderTabPlaylists(mount);
          }
        });
      });
    });
  } catch (err) {
    mount.innerHTML = `<div style="text-align: center; color: #fca5a5; padding: 30px;">Failed to load playlists.</div>`;
  }
}

async function renderSinglePlaylistView(mount, playlistId) {
  mount.innerHTML = `
    <div style="text-align: center; padding: 40px; color: #94a3b8;">
      ⏳ Loading playlist contents...
    </div>
  `;

  try {
    const res = await fetch(`/api/user/playlists/${encodeURIComponent(playlistId)}`, { credentials: 'include' });
    const data = await res.json();
    if (!res.ok || !data.success || !data.playlist) throw new Error('Playlist not found');

    const pl = data.playlist;
    const items = pl.items || [];

    mount.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
          <button type="button" class="btn btn-secondary" id="btn-back-to-playlists" style="font-size: 0.82rem; padding: 7px 14px;">
            ← Back to All Playlists
          </button>
          <span style="font-size: 0.82rem; color: #94a3b8;">${items.length} Videos in Playlist</span>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 16px; padding: 20px; margin-bottom: 22px;">
          <h2 style="font-size: 1.35rem; color: var(--text-pure); margin: 0 0 6px;">
            📑 ${escapeHtml(pl.title)}
          </h2>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0;">
            ${escapeHtml(pl.description || 'No description provided.')}
          </p>
        </div>

        ${items.length === 0 ? `
          <div style="text-align: center; padding: 42px 20px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 14px; color: var(--text-secondary); font-size: 0.88rem;">
            This playlist is currently empty. Click "Add to Playlist" on any video to add it here.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${items.map((item, index) => `
              <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
                  <span style="font-size: 0.85rem; font-weight: 700; color: #94a3b8; width: 22px;">${index + 1}</span>
                  <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600'}" alt="${escapeHtml(item.title)}" style="width: 72px; height: 44px; object-fit: cover; border-radius: 6px; background: #000;" />
                  <div style="min-width: 0; flex: 1;">
                    <div style="font-size: 0.92rem; font-weight: 600; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${escapeHtml(item.title)}
                    </div>
                    <div style="font-size: 0.74rem; color: #94a3b8;">
                      ${escapeHtml(item.instructor?.name || 'Instructor')} • ${item.duration || 'Video'}
                    </div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <button type="button" class="btn btn-primary js-play-playlist-item" data-course-id="${item.id}" style="font-size: 0.78rem; padding: 6px 14px;">
                    ▶ Play
                  </button>
                  <button type="button" class="btn btn-secondary js-remove-playlist-item" data-course-id="${item.id}" title="Remove from playlist" style="font-size: 0.78rem; padding: 6px 10px; color: #f87171;">
                    ✕
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    document.getElementById('btn-back-to-playlists')?.addEventListener('click', () => {
      activeBrowsingPlaylistId = null;
      renderTabPlaylists(mount);
    });

    mount.querySelectorAll('.js-play-playlist-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-course-id');
        state.activeCourseId = id;
        state.recordCourseView(id);
        if (navigateCallback) navigateCallback('classroom');
      });
    });

    mount.querySelectorAll('.js-remove-playlist-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-course-id');
        await fetch(`/api/user/playlists/${encodeURIComponent(playlistId)}/items/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        window.showToast?.('Removed', 'Video removed from playlist.', 'info');
        renderSinglePlaylistView(mount, playlistId);
      });
    });
  } catch {
    mount.innerHTML = `<div style="text-align: center; color: #fca5a5; padding: 30px;">Could not load playlist items.</div>`;
  }
}

// -------------------------------------------------------------
// TAB 5: COMPREHENSIVE SETTINGS (Requirement 1: Settings Page)
// -------------------------------------------------------------
async function renderTabSettings(mount, user) {
  let userPrefs = { theme: 'dark', emailNotifications: true, courseAlerts: true, activityPrivacy: false };
  try {
    const pRes = await fetch('/api/user/preferences', { credentials: 'include' });
    const pData = await pRes.json();
    if (pRes.ok && pData.success && pData.preferences) {
      userPrefs = pData.preferences;
    }
  } catch {}

  mount.innerHTML = `
    <div style="background: var(--bg-card); border: 1px solid var(--border-glass); border-radius: 18px; overflow: hidden; display: flex; flex-direction: column;">
      <!-- Top Settings Header Bar -->
      <div style="padding: 18px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #f8fafc; margin: 0;">
            ⚙️ Account & Application Settings
          </h2>
          <span style="font-size: 0.8rem; color: #94a3b8;">Manage your preferences, security, downloads, and themes</span>
        </div>
      </div>

      <!-- Settings 2-Column Responsive Layout -->
      <div style="display: grid; grid-template-columns: minmax(210px, 260px) minmax(0, 1fr); min-height: 480px;" id="settings-split-grid">
        <!-- Left Navigation Sidebar -->
        <div style="border-right: 1px solid rgba(255,255,255,0.08); padding: 14px 10px; background: rgba(0,0,0,0.18); display: flex; flex-direction: column; gap: 4px;">
          ${renderSettingsNavButton('account', '👤 Account Settings')}
          ${renderSettingsNavButton('profile', '✏️ Profile Settings')}
          ${renderSettingsNavButton('privacy', '🔒 Privacy & Security')}
          ${renderSettingsNavButton('notifications', '🔔 Notification Preferences')}
          ${renderSettingsNavButton('saved', '🔖 Saved Content')}
          ${renderSettingsNavButton('downloads', '⬇️ Downloads')}
          ${renderSettingsNavButton('playlists', '📑 Playlist Management')}
          ${renderSettingsNavButton('appearance', '🎨 Appearance & Theme')}
          ${renderSettingsNavButton('help', '❓ Help & Support')}
          <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 6px 8px;"></div>
          ${renderSettingsNavButton('signout', '🚪 Account Sign Out', true)}
        </div>

        <!-- Right Content Section -->
        <div style="padding: 24px 28px;" id="settings-section-content">
          ${renderSettingsSectionContent(activeSettingsSection, user, userPrefs)}
        </div>
      </div>
    </div>
  `;

  // Attach Settings Navigation Click Listeners
  mount.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSettingsSection = btn.getAttribute('data-section');
      renderTabSettings(mount, user);
    });
  });

  // Attach Sub-section Event Handlers
  attachSettingsSectionListeners(activeSettingsSection, mount, user, userPrefs);
}

function renderSettingsNavButton(key, label, isDanger = false) {
  const isActive = activeSettingsSection === key;
  const color = isDanger ? (isActive ? '#ef4444' : '#fca5a5') : (isActive ? '#38bdf8' : '#cbd5e1');
  const bg = isActive ? (isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.12)') : 'transparent';
  return `
    <button type="button" class="settings-nav-btn" data-section="${key}" style="width: 100%; text-align: left; background: ${bg}; border: none; color: ${color}; padding: 10px 14px; border-radius: 9px; font-size: 0.85rem; font-weight: ${isActive ? '700' : '500'}; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: all 0.15s;">
      ${label}
    </button>
  `;
}

function renderSettingsSectionContent(section, user, userPrefs) {
  if (section === 'account') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 16px;">👤 Account Settings</h3>
        <form id="form-settings-account" style="display: flex; flex-direction: column; gap: 16px; max-width: 520px;">
          <div>
            <label style="display: block; font-size: 0.84rem; color: #94a3b8; margin-bottom: 6px;">Email Address (Primary)</label>
            <input type="text" value="${escapeHtml(user.email || 'None')}" disabled style="width: 100%; opacity: 0.75; cursor: not-allowed;" />
            <span style="font-size: 0.72rem; color: #10b981; display: inline-block; margin-top: 4px;">✓ Verified Account Email</span>
          </div>

          <div>
            <label style="display: block; font-size: 0.84rem; color: #94a3b8; margin-bottom: 6px;">Mobile Phone Number</label>
            <input type="text" value="${escapeHtml(user.phone || 'None')}" disabled style="width: 100%; opacity: 0.75; cursor: not-allowed;" />
          </div>

          <div>
            <label for="settings-address-input" style="display: block; font-size: 0.84rem; color: #f8fafc; font-weight: 600; margin-bottom: 6px;">
              Delivery & Billing Address
            </label>
            <textarea id="settings-address-input" rows="3" placeholder="Enter your full address..." style="width: 100%; resize: vertical;">${escapeHtml(user.address || '')}</textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="align-self: flex-start; padding: 9px 20px;">
            Save Account Details
          </button>
        </form>
      </div>
    `;
  }

  if (section === 'profile') {
    const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.fullName || 'User')}`;
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 16px;">✏️ Profile & Channel Settings</h3>
        <form id="form-settings-profile" style="display: flex; flex-direction: column; gap: 18px; max-width: 540px;">
          <div style="display: flex; align-items: center; gap: 16px; padding: 14px; background: rgba(255,255,255,0.03); border: 1px dashed var(--border-glass); border-radius: 12px;">
            <img id="settings-avatar-preview" src="${user.avatar || fallbackAvatar}" onerror="this.onerror=null; this.src='${fallbackAvatar}';" style="width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;" />
            <div style="flex: 1;">
              <label for="settings-avatar-file" style="display: block; font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-bottom: 4px;">Change Avatar</label>
              <input type="file" id="settings-avatar-file" accept="image/png, image/jpeg, image/webp" style="font-size: 0.78rem; color: #94a3b8;" />
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.84rem; color: #f8fafc; font-weight: 600; margin-bottom: 6px;">Channel / Full Name</label>
            <input type="text" id="settings-fullname-input" value="${escapeHtml(user.fullName || '')}" required style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.84rem; color: #f8fafc; font-weight: 600; margin-bottom: 6px;">Bio / About Channel</label>
            <textarea id="settings-bio-input" rows="3" style="width: 100%;">${escapeHtml(user.bio || '')}</textarea>
          </div>

          <div>
            <label style="display: block; font-size: 0.84rem; color: #f8fafc; font-weight: 600; margin-bottom: 6px;">Skill Tags (Backend Discovery)</label>
            <input type="text" id="settings-skills-input" value="${escapeHtml(user.skills || '')}" placeholder="e.g. javascript, react, python" style="width: 100%;" />
          </div>

          <button type="submit" id="btn-save-settings-profile" class="btn btn-primary" style="align-self: flex-start; padding: 9px 22px;">
            💾 Save Profile Changes
          </button>
        </form>
      </div>
    `;
  }

  if (section === 'privacy') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 16px;">🔒 Privacy & Security</h3>
        <div style="display: flex; flex-direction: column; gap: 20px; max-width: 520px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 12px; padding: 16px;">
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <div>
                <div style="font-size: 0.9rem; font-weight: 600; color: #f8fafc;">Hide Learning Activity</div>
                <div style="font-size: 0.76rem; color: #94a3b8;">Don't show my enrolled classes on my public channel</div>
              </div>
              <input type="checkbox" id="pref-privacy-activity" ${userPrefs.activityPrivacy ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #38bdf8;" />
            </label>
          </div>

          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px;">
            <h4 style="font-size: 0.95rem; color: #f8fafc; margin: 0 0 12px;">Change Account Password</h4>
            <form id="form-settings-password" style="display: flex; flex-direction: column; gap: 12px;">
              <div>
                <label style="display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Current Password</label>
                <input type="password" id="pw-current" required placeholder="••••••••" style="width: 100%;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">New Password (min 6 characters)</label>
                <input type="password" id="pw-new" minlength="6" required placeholder="••••••••" style="width: 100%;" />
              </div>
              <div>
                <label style="display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Confirm New Password</label>
                <input type="password" id="pw-confirm" minlength="6" required placeholder="••••••••" style="width: 100%;" />
              </div>
              <button type="submit" class="btn btn-secondary" style="align-self: flex-start; padding: 8px 18px; margin-top: 4px;">
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  if (section === 'notifications') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 16px;">🔔 Notification Preferences</h3>
        <div style="display: flex; flex-direction: column; gap: 14px; max-width: 520px;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 12px; padding: 16px;">
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <div>
                <div style="font-size: 0.9rem; font-weight: 600; color: #f8fafc;">Email Notifications</div>
                <div style="font-size: 0.76rem; color: #94a3b8;">Receive verification codes, receipts, and important notices</div>
              </div>
              <input type="checkbox" id="pref-notif-email" ${userPrefs.emailNotifications ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #38bdf8;" />
            </label>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 12px; padding: 16px;">
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <div>
                <div style="font-size: 0.9rem; font-weight: 600; color: #f8fafc;">Course & Live Alerts</div>
                <div style="font-size: 0.76rem; color: #94a3b8;">Get notified when creators you follow go live or publish new videos</div>
              </div>
              <input type="checkbox" id="pref-notif-courses" ${userPrefs.courseAlerts ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #38bdf8;" />
            </label>
          </div>

          <button type="button" id="btn-save-notif-prefs" class="btn btn-primary" style="align-self: flex-start; padding: 8px 20px; margin-top: 6px;">
            Save Preferences
          </button>
        </div>
      </div>
    `;
  }

  if (section === 'saved') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 10px;">🔖 Saved Content Overview</h3>
        <p style="font-size: 0.88rem; color: #94a3b8; margin: 0 0 18px;">
          Manage your saved lessons and bookmarks. All bookmarked videos are saved directly in your profile.
        </p>
        <button type="button" id="btn-goto-saved-tab" class="btn btn-primary" style="padding: 9px 20px;">
          Open Saved Items Tab →
        </button>
      </div>
    `;
  }

  if (section === 'downloads') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 10px;">⬇️ Offline Downloads</h3>
        <p style="font-size: 0.88rem; color: #94a3b8; margin: 0 0 18px;">
          View downloaded course files and lesson recordings saved to your device.
        </p>
        <button type="button" id="btn-goto-downloads-tab" class="btn btn-primary" style="padding: 9px 20px;">
          Open Downloads Tab →
        </button>
      </div>
    `;
  }

  if (section === 'playlists') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 10px;">📑 Playlist Management</h3>
        <p style="font-size: 0.88rem; color: #94a3b8; margin: 0 0 18px;">
          Create custom playlists to group and sequence lessons according to your learning path.
        </p>
        <button type="button" id="btn-goto-playlists-tab" class="btn btn-primary" style="padding: 9px 20px;">
          Manage My Playlists →
        </button>
      </div>
    `;
  }

  if (section === 'appearance') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 16px;">🎨 Appearance & Theme Preferences</h3>
        <div style="display: flex; flex-direction: column; gap: 18px; max-width: 520px;">
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-bottom: 8px;">Color Theme</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
              <button type="button" class="theme-choice-btn btn ${userPrefs.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}" data-theme="dark" style="padding: 10px; font-size: 0.82rem; font-weight: 600;">
                🌌 Dark Nebula
              </button>
              <button type="button" class="theme-choice-btn btn ${userPrefs.theme === 'midnight' ? 'btn-primary' : 'btn-secondary'}" data-theme="midnight" style="padding: 10px; font-size: 0.82rem; font-weight: 600;">
                ⚡ Midnight
              </button>
              <button type="button" class="theme-choice-btn btn ${userPrefs.theme === 'light' ? 'btn-primary' : 'btn-secondary'}" data-theme="light" style="padding: 10px; font-size: 0.82rem; font-weight: 600;">
                ☀️ Daylight
              </button>
            </div>
          </div>

          <div style="padding-top: 10px;">
            <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #f8fafc; margin-bottom: 8px;">Currency Standard</label>
            <div style="padding: 12px 14px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 10px; font-size: 0.84rem; color: #e2e8f0;">
              🇮🇳 Default Currency: <strong>Indian Rupees (₹ INR)</strong> using Indian number formatting (e.g., ₹1,25,000).
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (section === 'help') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #f8fafc; margin: 0 0 16px;">❓ Help & Support</h3>
        <div style="display: flex; flex-direction: column; gap: 14px; max-width: 560px;">
          <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 10px; padding: 12px 16px; cursor: pointer;">
            <summary style="font-size: 0.88rem; font-weight: 600; color: #f8fafc;">How does Crditeach peer knowledge exchange work?</summary>
            <p style="font-size: 0.82rem; color: #94a3b8; margin: 10px 0 0; line-height: 1.55;">
              Crditeach has zero video ads. Teaching a fellow student earns you Credits (₢). You can spend your earned Credits to unlock courses and masterclasses taught by other peers for free.
            </p>
          </details>

          <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 10px; padding: 12px 16px; cursor: pointer;">
            <summary style="font-size: 0.88rem; font-weight: 600; color: #f8fafc;">How do offline downloads work?</summary>
            <p style="font-size: 0.82rem; color: #94a3b8; margin: 10px 0 0; line-height: 1.55;">
              Clicking "Download" saves the video file directly to your device and records the entry in your Downloads tab for quick access.
            </p>
          </details>

          <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass); border-radius: 10px; padding: 12px 16px; cursor: pointer;">
            <summary style="font-size: 0.88rem; font-weight: 600; color: #f8fafc;">How do I report violations?</summary>
            <p style="font-size: 0.82rem; color: #94a3b8; margin: 10px 0 0; line-height: 1.55;">
              Click "Report" on any video or channel. All violation reports are immediately recorded and dispatched to the platform moderation inbox.
            </p>
          </details>

          <div style="margin-top: 10px; padding: 16px; background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px;">
            <div style="font-size: 0.86rem; font-weight: 600; color: #38bdf8; margin-bottom: 4px;">Need additional assistance?</div>
            <p style="font-size: 0.8rem; color: #cbd5e1; margin: 0 0 10px;">Send a message to our community moderation team.</p>
            <button type="button" class="btn btn-secondary" onclick="window.showToast('Support Ticket', 'Support team notified. We will reply to your registered email.', 'info')" style="font-size: 0.8rem; padding: 6px 14px;">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (section === 'signout') {
    return `
      <div>
        <h3 style="font-size: 1.1rem; color: #fca5a5; margin: 0 0 12px;">🚪 Account Sign Out</h3>
        <p style="font-size: 0.88rem; color: #94a3b8; margin: 0 0 20px; max-width: 460px;">
          Are you sure you want to sign out of Crditeach on this browser? Your saved content, playlists, and wallet remain safe.
        </p>
        <button type="button" id="btn-settings-do-signout" class="btn btn-secondary" style="background: rgba(239, 68, 68, 0.16); border-color: rgba(239, 68, 68, 0.45); color: #fca5a5; padding: 10px 22px; font-weight: 700;">
          🚪 Confirm Sign Out
        </button>
      </div>
    `;
  }

  return `<div>Settings section</div>`;
}

function attachSettingsSectionListeners(section, mount, user, userPrefs) {
  // Navigation shortcuts
  document.getElementById('btn-goto-saved-tab')?.addEventListener('click', () => {
    activeProfileTab = 'saved';
    renderOwnerProfilePage(mount, user);
  });
  document.getElementById('btn-goto-downloads-tab')?.addEventListener('click', () => {
    activeProfileTab = 'downloads';
    renderOwnerProfilePage(mount, user);
  });
  document.getElementById('btn-goto-playlists-tab')?.addEventListener('click', () => {
    activeProfileTab = 'playlists';
    renderOwnerProfilePage(mount, user);
  });

  // Account address form
  document.getElementById('form-settings-account')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const address = document.getElementById('settings-address-input')?.value.trim();
    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        user.address = address;
        window.showToast?.('Saved!', 'Account address updated.', 'success');
      }
    } catch {
      window.showToast?.('Error', 'Failed to update address.', 'error');
    }
  });

  // Profile customization form
  const avatarInput = document.getElementById('settings-avatar-file');
  const avatarPreview = document.getElementById('settings-avatar-preview');
  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        selectedAvatarFile = file;
        avatarPreview.src = URL.createObjectURL(file);
      }
    });
  }

  document.getElementById('form-settings-profile')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-settings-profile');
    const fullName = document.getElementById('settings-fullname-input')?.value.trim();
    const bio = document.getElementById('settings-bio-input')?.value.trim();
    const skills = document.getElementById('settings-skills-input')?.value.trim();

    if (!fullName) return;

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      let uploadedAvatarUrl = user.avatar || null;
      if (selectedAvatarFile) {
        const fd = new FormData();
        fd.append('thumbnailFile', selectedAvatarFile);
        const upRes = await fetch('/api/upload-thumbnail', {
          method: 'POST',
          credentials: 'include',
          body: fd
        });
        const upData = await upRes.json();
        if (upRes.ok && upData.success) {
          uploadedAvatarUrl = upData.thumbnailUrl;
        }
      }

      const res = await fetch('/api/user/profile', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, bio, skills, avatar: uploadedAvatarUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        auth.user = { ...auth.user, ...data.user };
        if (state.user) {
          state.user.name = data.user.fullName;
          state.user.avatar = data.user.avatar;
        }
        await state.loadCoursesFromDB();
        window.showToast?.('Profile Updated!', 'Your profile details have been saved.', 'success');
        renderOwnerProfilePage(mount, auth.user);
      }
    } catch (err) {
      window.showToast?.('Error', 'Failed to save profile changes.', 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Profile Changes';
      }
    }
  });

  // Password update form
  document.getElementById('form-settings-password')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('pw-current')?.value;
    const newPassword = document.getElementById('pw-new')?.value;
    const confirmPassword = document.getElementById('pw-confirm')?.value;

    if (newPassword !== confirmPassword) {
      window.showToast?.('Mismatch', 'New passwords do not match.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/user/security/password', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        window.showToast?.('Password Changed', 'Your security credentials were updated.', 'success');
        e.target.reset();
      } else {
        window.showToast?.('Notice', data.error || 'Failed to update password.', 'error');
      }
    } catch {
      window.showToast?.('Error', 'Network error changing password.', 'error');
    }
  });

  // Notification preferences
  document.getElementById('btn-save-notif-prefs')?.addEventListener('click', async () => {
    const emailNotifications = document.getElementById('pref-notif-email')?.checked;
    const courseAlerts = document.getElementById('pref-notif-courses')?.checked;
    const activityPrivacy = document.getElementById('pref-privacy-activity')?.checked ?? userPrefs.activityPrivacy;

    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotifications, courseAlerts, activityPrivacy, theme: userPrefs.theme })
      });
      if (res.ok) {
        window.showToast?.('Saved', 'Notification preferences updated.', 'success');
      }
    } catch {}
  });

  // Theme buttons
  mount.querySelectorAll('.theme-choice-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const theme = btn.getAttribute('data-theme');
      userPrefs.theme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      try {
        await fetch('/api/user/preferences', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme, emailNotifications: userPrefs.emailNotifications, courseAlerts: userPrefs.courseAlerts, activityPrivacy: userPrefs.activityPrivacy })
        });
        window.showToast?.('Theme Applied', `Theme switched to ${theme}.`, 'info');
        renderTabSettings(mount, user);
      } catch {}
    });
  });

  // Sign out button inside settings
  document.getElementById('btn-settings-do-signout')?.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('crditeach_token');
    localStorage.removeItem('crditeach_user');
    if (auth && typeof auth.logout === 'function') {
      await auth.logout();
    }
    window.showToast?.('Signed Out', 'You have been signed out safely.', 'info');
    if (navigateCallback) navigateCallback('marketplace');
    window.location.reload();
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
