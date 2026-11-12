/**
 * CRDITEACH - FRONTEND AUTH & PERSISTENCE CLIENT
 * Connects client application to authentication & persistence REST endpoints
 * with automatic local fallback for 100% offline and standalone reliability.
 */

const LOCAL_STORAGE_USER_KEY = 'crditeach_active_user';
const LOCAL_STORAGE_USERS_DB = 'crditeach_registered_users';

class AuthManager {
  constructor() {
    this.user = null;
    this.listeners = [];
    this.isLoaded = false;
  }

  // Subscribe to auth status changes
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.user));
  }

  isAuthenticated() {
    return Boolean(this.user && (this.user.id || this.user.email));
  }

  // 1. Check current session on load
  async checkSession() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.user = data.user;
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(this.user));
          this.isLoaded = true;
          this.notify();
          return this.user;
        }
      }
    } catch (e) {
      // offline / standalone
    }

    // Fallback to localStorage session
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (local) {
        this.user = JSON.parse(local);
      } else {
        this.user = null;
      }
    } catch (e) {
      this.user = null;
    }

    this.isLoaded = true;
    this.notify();
    return this.user;
  }

  // 2. Register new account
  async register({ fullName, email, phone, password, address = '' }) {
    const trimmedName = (fullName || '').trim();
    const normEmail = (email || '').trim().toLowerCase();
    const normPhone = (phone || '').trim();
    let cleanAddress = (address || '').trim();

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: trimmedName,
          email: normEmail,
          phone: normPhone,
          password,
          address: cleanAddress
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      this.user = data.user;
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(this.user));
      this.notify();
      return data;
    } catch (err) {
      // If server rejected with validation error (e.g., duplicate email/phone), rethrow
      if (err.message && !err.message.includes('fetch') && !err.message.includes('NetworkError') && !err.message.includes('Failed')) {
        throw err;
      }

      // Local offline registration fallback
      let users = [];
      try {
        users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS_DB) || '[]');
      } catch (e) { users = []; }

      if (users.some(u => u.email === normEmail)) {
        throw new Error('An account with this email already exists.');
      }
      if (users.some(u => u.phone === normPhone)) {
        throw new Error('An account with this phone number already exists.');
      }

      const newUser = {
        id: 'usr_' + Date.now().toString(36),
        fullName: trimmedName,
        email: normEmail,
        phone: normPhone,
        address: cleanAddress,
        password: password
      };
      users.push(newUser);
      localStorage.setItem(LOCAL_STORAGE_USERS_DB, JSON.stringify(users));

      this.user = {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(this.user));
      this.notify();
      return { success: true, user: this.user };
    }
  }

  // 3. Login with Email or Mobile Number + Password
  async login({ identifier, password }) {
    const cleanId = (identifier || '').trim();
    if (!cleanId) throw new Error('Please enter your email or mobile number.');
    if (!password) throw new Error('Please enter your password.');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: cleanId, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials.');

      this.user = data.user;
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(this.user));
      this.notify();
      return data;
    } catch (err) {
      // If server responded with error message, rethrow it
      if (err.message && !err.message.includes('fetch') && !err.message.includes('NetworkError') && !err.message.includes('Failed')) {
        throw err;
      }

      // Local offline login fallback
      let users = [];
      try {
        users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS_DB) || '[]');
      } catch (e) { users = []; }

      const matched = users.find(u =>
        (u.email.toLowerCase() === cleanId.toLowerCase() || u.phone === cleanId) &&
        u.password === password
      );

      if (!matched) {
        throw new Error('Invalid email/mobile number or password.');
      }

      this.user = {
        id: matched.id,
        fullName: matched.fullName,
        email: matched.email,
        phone: matched.phone,
        address: matched.address || ''
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(this.user));
      this.notify();
      return { success: true, user: this.user };
    }
  }

  // 4. Update Address (User can only change address)
  async updateAddress(newAddress) {
    if (!this.isAuthenticated()) throw new Error('User not authenticated.');
    let cleanAddress = (newAddress || '').trim();

    try {
      const res = await fetch('/api/user/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ address: cleanAddress })
      });
      if (res.ok) {
        const data = await res.json();
        cleanAddress = data.address ?? cleanAddress;
      }
    } catch (e) {
      // Offline fallback
    }

    if (this.user) {
      this.user.address = cleanAddress;
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(this.user));

      // Update in offline users db
      try {
        let users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS_DB) || '[]');
        const idx = users.findIndex(u => u.id === this.user.id || u.email === this.user.email);
        if (idx !== -1) {
          users[idx].address = cleanAddress;
          localStorage.setItem(LOCAL_STORAGE_USERS_DB, JSON.stringify(users));
        }
      } catch (e) {}

      this.notify();
    }

    return { success: true, address: cleanAddress };
  }

  // 5. Logout
  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}

    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    this.user = null;
    this.notify();
  }
}

export const auth = new AuthManager();
