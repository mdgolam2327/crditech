/**
 * CRDITEACH - APPLICATION BOOTSTRAP & ROUTER
 * Orchestrates modules, view lifecycle, modals, and toasts
 */

import { state } from './state.js';
import { auth } from './auth.js';
import { initNavbar, setActiveNavTab } from './components/navbar.js';
import { initMarketplace } from './components/marketplace.js';
import { initClassroom } from './components/classroom.js';
import { initTeacherStudio } from './components/teacherStudio.js';
import { initSponsorLounge } from './components/sponsorLounge.js';
import { initAuthModal } from './components/authModal.js';
import { initProfileView, renderProfileView } from './components/profileView.js';

// Global Toast Notification Helper
window.showToast = function (title, desc, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'reward') icon = '⚡';

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-desc">${desc}</div>
    </div>
  `;

  container.appendChild(toast);
  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4200);
};

// Application Router
function navigateTo(viewName) {
  const views = {
    marketplace: document.getElementById('view-marketplace'),
    classroom: document.getElementById('view-classroom'),
    studio: document.getElementById('view-studio'),
    sponsors: document.getElementById('view-sponsors'),
    profile: document.getElementById('view-profile')
  };

  if (!views[viewName]) return;

  // Deactivate all views
  Object.values(views).forEach(v => {
    if (v) v.classList.remove('active-view');
  });

  // Activate chosen view
  views[viewName].classList.add('active-view');
  setActiveNavTab(viewName);

  // If navigating to profile, render fresh profile
  if (viewName === 'profile') {
    renderProfileView();
  }

  // Scroll to top of content smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.navigateTo = navigateTo;

// Setup Global Modal Controls
function setupModalListeners() {
  const closeEnrollBtn = document.getElementById('close-enroll-modal');
  const enrollModal = document.getElementById('enroll-modal');
  if (closeEnrollBtn && enrollModal) {
    closeEnrollBtn.addEventListener('click', () => enrollModal.classList.remove('open'));
  }

  const closeWalletBtn = document.getElementById('close-wallet-modal');
  const doneWalletBtn = document.getElementById('btn-close-wallet-done');
  const walletModal = document.getElementById('wallet-modal');
  if (closeWalletBtn && walletModal) {
    closeWalletBtn.addEventListener('click', () => walletModal.classList.remove('open'));
  }
  if (doneWalletBtn && walletModal) {
    doneWalletBtn.addEventListener('click', () => walletModal.classList.remove('open'));
  }

  // Quick teach shortcut inside Wallet modal
  const quickTeachBtn = document.getElementById('quick-teach-shortcut');
  if (quickTeachBtn && walletModal) {
    quickTeachBtn.addEventListener('click', () => {
      const res = state.teachStudentSimulation('Sarah Connor', 'Distributed Systems & Go');
      window.showToast('Teaching Complete!', `Taught Sarah Connor. Earned +${res.earnedCredits} Credits!`, 'success');
      walletModal.classList.remove('open');
      navigateTo('studio');
    });
  }

  // Close modals on clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
      }
    });
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(modal => {
        modal.classList.remove('open');
      });
    }
  });

  // Flywheel explainer banner dismiss
  const bannerClose = document.getElementById('banner-close');
  const flywheelBanner = document.getElementById('flywheel-banner');
  if (bannerClose && flywheelBanner) {
    bannerClose.addEventListener('click', () => {
      flywheelBanner.style.opacity = '0';
      setTimeout(() => flywheelBanner.style.display = 'none', 300);
    });
  }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Crditeach Web Platform...');

  // 1. Initialize Auth & Profile Modals & Restore Session
  initAuthModal();
  await auth.checkSession();

  // 2. Initialize UI components
  initNavbar(navigateTo);
  initMarketplace(navigateTo);
  initClassroom(navigateTo);
  initTeacherStudio(navigateTo);
  initSponsorLounge();
  initProfileView(navigateTo);

  // 3. Setup modal triggers and handlers
  setupModalListeners();

  // 4. Welcome toast
  setTimeout(() => {
    if (auth.isAuthenticated()) {
      window.showToast(
        `Welcome Back, ${auth.user.fullName}!`,
        'Your profile and credits are connected.',
        'success'
      );
    } else {
      window.showToast(
        'Welcome to Crditeach!',
        'Teach to learn, earn credits, and unlock ad-free courses.',
        'reward'
      );
    }
  }, 600);
});
