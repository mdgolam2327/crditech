/**
- NAVBAR COMPONENT
- Handles live credit counter, tab routing, upload/live dropdown,
- and responsive Sign In / Register / Profile triggers.
 */

import { state, formatINR } from '../state.js';
import { auth } from '../auth.js';
import { openOwnProfile } from './profileView.js';
import { openAuthModal } from './authModal.js';

export function initNavbar(onNavigate) {
  const navButtons = document.querySelectorAll('.nav-btn');
  const userCreditsEl = document.getElementById('user-credits');
  const userCashEl = document.getElementById('user-cash');
  const enrolledBadge = document.getElementById('enrolled-badge');
  const brandLogo = document.getElementById('brand-logo');
  const walletWidget = document.getElementById('wallet-widget');

  // Auth & Profile Elements
  const btnHeaderLogin = document.getElementById('btn-header-login');
  const btnHeaderRegister = document.getElementById('btn-header-register');
  const btnOpenProfile = document.getElementById('btn-open-profile');
  const authGuestControls = document.getElementById('auth-guest-controls');
  const authUserControls = document.getElementById('auth-user-controls');
  const userDisplayName = document.getElementById('user-display-name');

  // Profile Dropdown Elements (Requirement 2)
  const profileDropdown = document.getElementById('profile-nav-dropdown');
  const dropdownViewProfile = document.getElementById('dropdown-view-profile');
  const dropdownSignOut = document.getElementById('dropdown-sign-out');

  // Auth Button Handlers
  btnHeaderLogin?.addEventListener('click', () => openAuthModal('login'));
  btnHeaderRegister?.addEventListener('click', () => openAuthModal('register'));

  // Toggle Profile Dropdown on Click (Desktop & Mobile)
  btnOpenProfile?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!profileDropdown) return;
    const isShowing = profileDropdown.style.display === 'block';
    profileDropdown.style.display = isShowing ? 'none' : 'block';
    btnOpenProfile.setAttribute('aria-expanded', String(!isShowing));
  });

  // Dropdown Option 1: View Your Profile
  dropdownViewProfile?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (profileDropdown) profileDropdown.style.display = 'none';
    btnOpenProfile?.setAttribute('aria-expanded', 'false');
    openOwnProfile();
  });

  // Dropdown Option 2: Sign Out
  dropdownSignOut?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (profileDropdown) profileDropdown.style.display = 'none';
    btnOpenProfile?.setAttribute('aria-expanded', 'false');
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('crditeach_token');
    localStorage.removeItem('crditeach_user');
    if (auth && typeof auth.logout === 'function') {
      await auth.logout();
    }
    window.showToast?.('Signed Out', 'You have been securely signed out.', 'info');
    onNavigate('marketplace');
    window.location.reload();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (profileDropdown && profileDropdown.style.display === 'block') {
      if (!e.target.closest('.profile-dropdown-wrapper')) {
        profileDropdown.style.display = 'none';
        btnOpenProfile?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Navigation tab clicks
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      onNavigate(view);
    });
  });

  // Brand logo click -> home/marketplace
  brandLogo?.addEventListener('click', () => {
    onNavigate('marketplace');
  });

  // Wallet widget click -> open wallet modal
  walletWidget?.addEventListener('click', () => {
    openWalletModal();
  });

  // Update UI when state or auth changes
  function updateNavUI(appState) {
    if (userCreditsEl) userCreditsEl.textContent = appState.user.credits;
    if (userCashEl) userCashEl.textContent = Math.round(appState.user.cash).toLocaleString('en-IN');
    if (enrolledBadge) enrolledBadge.textContent = appState.enrolledCourseIds.length;

    // Toggle between Guest Controls (Sign In / Register) and Profile Trigger
    if (auth.isAuthenticated()) {
      if (authGuestControls) authGuestControls.style.display = 'none';
      if (authUserControls) authUserControls.style.display = 'flex';
      if (userDisplayName) userDisplayName.textContent = auth.user.fullName || 'Member';

      // Sync real user avatar into the Navbar Profile button
      const displayName = auth.user?.fullName || appState.user?.name || 'Member';
      const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;
      const resolvedAvatar = (auth.user?.avatar || appState.user?.avatar || fallbackAvatar).trim();

      if (btnOpenProfile) {
        // Hide any existing default SVG, icon, or emoji span inside the profile button (keep only #user-display-name)
        Array.from(btnOpenProfile.children).forEach(child => {
          if (child.id !== 'user-display-name' && !child.classList.contains('nav-user-avatar-img')) {
            child.style.display = 'none';
          }
        });

        let navAvatarImg = btnOpenProfile.querySelector('.nav-user-avatar-img');
        if (!navAvatarImg) {
          navAvatarImg = document.createElement('img');
          navAvatarImg.className = 'nav-user-avatar-img';
          navAvatarImg.style.cssText = 'width: 28px; height: 28px; min-width: 28px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(56, 189, 248, 0.6); display: inline-block; vertical-align: middle;';
          btnOpenProfile.prepend(navAvatarImg);
        }
        navAvatarImg.src = resolvedAvatar;
        navAvatarImg.alt = displayName;
        navAvatarImg.onerror = () => {
          navAvatarImg.onerror = null;
          navAvatarImg.src = fallbackAvatar;
        };
      }
    } else {
      if (authGuestControls) authGuestControls.style.display = 'flex';
      if (authUserControls) authUserControls.style.display = 'none';
    }

    // Animate wallet numbers on change
    if (userCreditsEl) {
      userCreditsEl.classList.remove('num-pop');
      void userCreditsEl.offsetWidth; // trigger reflow
      userCreditsEl.classList.add('num-pop');
    }
  }

  // Subscribe to state changes and auth changes
  state.subscribe(updateNavUI);
  auth.subscribe(() => updateNavUI(state));
  updateNavUI(state);
}

export function setActiveNavTab(viewName) {
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(btn => {
    if (btn.getAttribute('data-view') === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function openWalletModal() {
  const modal = document.getElementById('wallet-modal');
  const creditsEl = document.getElementById('modal-wallet-credits');
  const cashEl = document.getElementById('modal-wallet-cash');
  const teachingSubEl = document.getElementById('modal-teaching-sub');
  const ledgerList = document.getElementById('ledger-entries');

  if (creditsEl) creditsEl.textContent = state.user.credits;
  if (cashEl) cashEl.textContent = formatINR(state.user.cash);
  if (teachingSubEl) {
    teachingSubEl.textContent = `Earned by teaching ${state.user.studentsTaught} student${state.user.studentsTaught === 1 ? '' : 's'}`;
  }

  if (state.ledger.length === 0) {
    ledgerList.innerHTML = `
      <div style="text-align: center; padding: 24px 14px; background: rgba(255, 255, 255, 0.02); border-radius: var(--radius-sm); border: 1px dashed var(--border-glass);">
        <div style="font-size: 1.5rem; margin-bottom: 6px;">📜</div>
        <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0;">No activity ledger recorded yet.</p>
        <small style="color: var(--text-muted); display: block; margin-top: 4px;">Teach a peer or claim sponsor perks to start circulating credits!</small>
      </div>
    `;
  } else {
    ledgerList.innerHTML = state.ledger.map(item => `
      <div class="ledger-item ${item.type}">
        <div class="l-info">
          <strong>${item.title}</strong>
          <div style="font-size:0.75rem; color: var(--text-muted);">${item.date}</div>
        </div>
        <span class="l-amt">${item.amount}</span>
      </div>
    `).join('');
  }

  modal?.classList.add('open');
}