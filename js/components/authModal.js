/**
 * CRDITEACH - AUTHENTICATION & PROFILE MODAL COMPONENT
 * Implements Sign In, Register, and Profile Management
 * with responsive layout, locked user details, and editable address.
 */

import { auth } from '../auth.js';

let currentMode = 'login'; // 'login' or 'register'

export function initAuthModal() {
  const authModal = document.getElementById('auth-modal');
  const profileModal = document.getElementById('profile-modal');

  // --- Auth Modal Controls ---
  const closeAuthBtn = document.getElementById('close-auth-modal');
  if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', () => closeAuthModal());
  }

  // --- Profile Modal Controls ---
  const closeProfileBtn = document.getElementById('close-profile-modal');
  if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => closeProfileModal());
  }

  // Backdrop click handlers
  authModal?.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });
  profileModal?.addEventListener('click', (e) => {
    if (e.target === profileModal) closeProfileModal();
  });

  // Tab switching between Sign In & Register
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const linkToRegister = document.getElementById('link-to-register');
  const linkToLogin = document.getElementById('link-to-login');

  tabLogin?.addEventListener('click', () => switchAuthMode('login'));
  tabRegister?.addEventListener('click', () => switchAuthMode('register'));
  linkToRegister?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthMode('register');
  });
  linkToLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthMode('login');
  });

  // Form Submissions
  setupAuthFormSubmits();

  // Profile Address Save
  setupProfileHandlers();
}

export function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  switchAuthMode(mode);
  clearAuthAlerts();
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  // Focus appropriate field
  setTimeout(() => {
    if (mode === 'login') {
      document.getElementById('login-identifier')?.focus();
    } else {
      document.getElementById('reg-name')?.focus();
    }
  }, 100);
}

export function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  clearAuthAlerts();
}

export function openProfileModal() {
  if (!auth.isAuthenticated()) {
    openAuthModal('login');
    return;
  }

  const modal = document.getElementById('profile-modal');
  if (!modal) return;

  const user = auth.user;
  populateProfileDetails(user);
  clearProfileAlerts();

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

export function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  if (modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }
  clearProfileAlerts();
}

function switchAuthMode(mode) {
  currentMode = mode;
  const tabLogin = document.getElementById('auth-tab-login');
  const tabRegister = document.getElementById('auth-tab-register');
  const formLogin = document.getElementById('auth-login-form');
  const formRegister = document.getElementById('auth-register-form');
  const title = document.getElementById('auth-modal-title');
  const subtitle = document.getElementById('auth-modal-subtitle');

  clearAuthAlerts();

  if (mode === 'register') {
    tabRegister?.classList.add('active');
    tabLogin?.classList.remove('active');
    if (formRegister) formRegister.style.display = 'block';
    if (formLogin) formLogin.style.display = 'none';
    if (title) title.textContent = 'Create your Crditeach Account';
    if (subtitle) subtitle.textContent = 'Join the peer knowledge-sharing network';
  } else {
    tabLogin?.classList.add('active');
    tabRegister?.classList.remove('active');
    if (formLogin) formLogin.style.display = 'block';
    if (formRegister) formRegister.style.display = 'none';
    if (title) title.textContent = 'Sign In to Crditeach';
    if (subtitle) subtitle.textContent = 'Access your courses, teaching credits, and ad-free learning';
  }
}

function setupAuthFormSubmits() {
  // 1. LOGIN SUBMIT
  const loginForm = document.getElementById('auth-login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthAlerts();

    const identifier = document.getElementById('login-identifier')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    const submitBtn = document.getElementById('btn-submit-login');

    if (!identifier) {
      showAuthError('Please enter your email address or mobile number.');
      return;
    }
    if (!password) {
      showAuthError('Please enter your password.');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';
      }

      const res = await auth.login({ identifier, password });
      closeAuthModal();
      loginForm.reset();

      window.showToast?.(
        'Welcome Back!',
        `Logged in as ${res.user.fullName || 'User'}.`,
        'success'
      );
    } catch (err) {
      showAuthError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Account';
      }
    }
  });

  // DEMO LOGIN QUICK BUTTON
  const demoLoginBtn = document.getElementById('btn-demo-login');
  demoLoginBtn?.addEventListener('click', async () => {
    clearAuthAlerts();
    try {
      if (demoLoginBtn) {
        demoLoginBtn.disabled = true;
        demoLoginBtn.textContent = '⚡ Signing In as Demo User...';
      }

      const demoUser = {
        fullName: 'Maya Patel',
        email: 'maya.patel@crditeach.org',
        phone: '+880 1712-345678',
        password: 'demoPassword123',
        address: 'House 42, Road 11, Banani, Dhaka, Bangladesh'
      };

      try {
        await auth.register(demoUser);
      } catch (e) {
        await auth.login({ identifier: demoUser.email, password: demoUser.password });
      }

      closeAuthModal();
      window.showToast?.('Demo Sign In', 'Logged in as Maya Patel! Opening full profile.', 'success');
      if (window.navigateTo) window.navigateTo('profile');
    } catch (err) {
      showAuthError(err.message || 'Demo sign in failed.');
    } finally {
      if (demoLoginBtn) {
        demoLoginBtn.disabled = false;
        demoLoginBtn.textContent = '⚡ One-Click Demo Sign In (Maya Patel)';
      }
    }
  });

  // 2. REGISTER SUBMIT
  const regForm = document.getElementById('auth-register-form');
  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthAlerts();

    const fullName = document.getElementById('reg-name')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const submitBtn = document.getElementById('btn-submit-register');

    if (!fullName || fullName.length < 2) {
      showAuthError('Please enter your full name (minimum 2 characters).');
      return;
    }
    if (!email || !email.includes('@')) {
      showAuthError('Please enter a valid email address.');
      return;
    }
    if (!phone || phone.length < 6) {
      showAuthError('Please enter a valid mobile number.');
      return;
    }
    if (!password || password.length < 6) {
      showAuthError('Password must be at least 6 characters long.');
      return;
    }

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';
      }

      const res = await auth.register({ fullName, email, phone, password });
      closeAuthModal();
      regForm.reset();

      window.showToast?.(
        'Registration Complete!',
        `Welcome to Crditeach, ${res.user.fullName}!`,
        'success'
      );
    } catch (err) {
      showAuthError(err.message || 'Registration failed. Please try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account & Register';
      }
    }
  });
}

function setupProfileHandlers() {
  // Save Address button
  const saveAddressBtn = document.getElementById('btn-save-address');
  const addressInput = document.getElementById('profile-field-address');

  saveAddressBtn?.addEventListener('click', async () => {
    clearProfileAlerts();
    const newAddress = (addressInput?.value || '').trim();

    try {
      saveAddressBtn.disabled = true;
      saveAddressBtn.textContent = 'Saving...';

      await auth.updateAddress(newAddress);
      showProfileSuccess('✓ Address updated successfully!');

      window.showToast?.(
        'Address Saved',
        'Your profile address has been updated.',
        'success'
      );
    } catch (err) {
      showProfileError(err.message || 'Failed to update address.');
    } finally {
      saveAddressBtn.disabled = false;
      saveAddressBtn.textContent = 'Save Address';
    }
  });

  // Logout button inside Profile modal
  const logoutBtn = document.getElementById('btn-profile-logout');
  logoutBtn?.addEventListener('click', async () => {
    closeProfileModal();
    await auth.logout();

    window.showToast?.(
      'Signed Out',
      'You have been logged out successfully.',
      'info'
    );
  });
}

function populateProfileDetails(user) {
  if (!user) return;

  const cardName = document.getElementById('profile-card-name');
  const fieldName = document.getElementById('profile-field-name');
  const fieldEmail = document.getElementById('profile-field-email');
  const fieldPhone = document.getElementById('profile-field-phone');
  const fieldAddress = document.getElementById('profile-field-address');
  const avatarInitials = document.getElementById('profile-avatar-initials');

  const name = user.fullName || 'Member';
  if (cardName) cardName.textContent = name;
  if (fieldName) fieldName.textContent = name;
  if (fieldEmail) fieldEmail.textContent = user.email || '—';
  if (fieldPhone) fieldPhone.textContent = user.phone || '—';
  if (fieldAddress) fieldAddress.value = user.address || '';

  if (avatarInitials) {
    const initials = name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    avatarInitials.textContent = initials || 'U';
  }
}

function showAuthError(msg) {
  const errBox = document.getElementById('auth-error-alert');
  if (errBox) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
}

function showAuthSuccess(msg) {
  const succBox = document.getElementById('auth-success-alert');
  if (succBox) {
    succBox.textContent = msg;
    succBox.style.display = 'block';
  }
}

function clearAuthAlerts() {
  const errBox = document.getElementById('auth-error-alert');
  const succBox = document.getElementById('auth-success-alert');
  if (errBox) errBox.style.display = 'none';
  if (succBox) succBox.style.display = 'none';
}

function showProfileError(msg) {
  const errBox = document.getElementById('profile-error-alert');
  if (errBox) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
}

function showProfileSuccess(msg) {
  const succBox = document.getElementById('profile-success-alert');
  if (succBox) {
    succBox.textContent = msg;
    succBox.style.display = 'block';
  }
}

function clearProfileAlerts() {
  const errBox = document.getElementById('profile-error-alert');
  const succBox = document.getElementById('profile-success-alert');
  if (errBox) errBox.style.display = 'none';
  if (succBox) succBox.style.display = 'none';
}
