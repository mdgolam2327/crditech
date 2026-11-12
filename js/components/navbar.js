/**
 * NAVBAR COMPONENT
 * Handles live credit counter, persona switcher (Teacher vs Learner),
 * tab routing, and responsive Sign In / Register / Profile triggers.
 */

import { state } from '../state.js';
import { auth } from '../auth.js';
import { openAuthModal, openProfileModal } from './authModal.js';

export function initNavbar(onNavigate) {
  const navButtons = document.querySelectorAll('.nav-btn');
  const userCreditsEl = document.getElementById('user-credits');
  const userCashEl = document.getElementById('user-cash');
  const personaToggleBtn = document.getElementById('persona-toggle');
  const personaIndicator = document.getElementById('persona-indicator');
  const personaText = document.getElementById('persona-text');
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

  // Auth Button Handlers
  btnHeaderLogin?.addEventListener('click', () => openAuthModal('login'));
  btnHeaderRegister?.addEventListener('click', () => openAuthModal('register'));
  btnOpenProfile?.addEventListener('click', () => onNavigate('profile'));

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

  // Persona / Role Switcher (Teacher vs Learner)
  personaToggleBtn?.addEventListener('click', () => {
    const newRole = state.toggleRole();
    window.showToast(
      'Role Switched',
      newRole === 'teacher'
        ? '⚡ You are in Teacher Mode! Teach peers to use Crditeach for free and earn Credits.'
        : '🎓 You are in Pure Learner Mode! Fees apply unless you teach someone.',
      'info'
    );
  });

  // Update UI when state or auth changes
  function updateNavUI(appState) {
    if (userCreditsEl) userCreditsEl.textContent = appState.user.credits;
    if (userCashEl) userCashEl.textContent = appState.user.cash.toFixed(2);
    if (enrolledBadge) enrolledBadge.textContent = appState.enrolledCourseIds.length;

    // Toggle between Guest Controls (Sign In / Register) and Profile Trigger
    if (auth.isAuthenticated()) {
      if (authGuestControls) authGuestControls.style.display = 'none';
      if (authUserControls) authUserControls.style.display = 'flex';
      if (userDisplayName) userDisplayName.textContent = auth.user.fullName || 'Member';
    } else {
      if (authGuestControls) authGuestControls.style.display = 'flex';
      if (authUserControls) authUserControls.style.display = 'none';
    }

    if (personaIndicator && personaText) {
      if (appState.user.role === 'teacher') {
        personaIndicator.className = 'persona-indicator teacher-active';
        personaText.textContent = 'Teacher Mode';
      } else {
        personaIndicator.className = 'persona-indicator learner-active';
        personaText.textContent = 'Learner Mode';
      }
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
  if (cashEl) cashEl.textContent = state.user.cash.toFixed(2);
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
