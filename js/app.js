/**
- CRDITEACH - APPLICATION BOOTSTRAP & ROUTER
- Orchestrates modules, view lifecycle, 3-step upload wizard, YouTube-style Go Live Studio, and toasts
 */

import { state } from './state.js';
import { auth, publishCourseToServer } from './auth.js';
import { initNavbar, setActiveNavTab } from './components/navbar.js';
import { initMarketplace } from './components/marketplace.js';
import { initClassroom, dockVideoToMiniPlayer, removeFloatingMiniPlayer } from './components/classroom.js';
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
    sponsors: document.getElementById('view-sponsors'),
    profile: document.getElementById('view-profile')
  };

  if (!views[viewName]) return;

  Object.values(views).forEach(v => {
    if (v) v.classList.remove('active-view');
  });

  views[viewName].classList.add('active-view');
  setActiveNavTab(viewName);

  if (viewName === 'classroom') {
    removeFloatingMiniPlayer(false);
  } else {
    dockVideoToMiniPlayer();
  }

  if (viewName === 'profile') {
    renderProfileView();
  }

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

  const quickTeachBtn = document.getElementById('quick-teach-shortcut');
  if (quickTeachBtn && walletModal) {
    quickTeachBtn.addEventListener('click', () => {
      const res = state.teachStudentSimulation('Sarah Connor', 'Distributed Systems & Go');
      window.showToast('Teaching Complete!', `Taught Sarah Connor. Earned +${res.earnedCredits} Credits!`, 'success');
      walletModal.classList.remove('open');
      navigateTo('studio');
    });
  }

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('open');
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.open').forEach(modal => {
        modal.classList.remove('open');
      });
    }
  });

  const bannerClose = document.getElementById('banner-close');
  const flywheelBanner = document.getElementById('flywheel-banner');
  if (bannerClose && flywheelBanner) {
    bannerClose.addEventListener('click', () => {
      flywheelBanner.style.opacity = '0';
      setTimeout(() => flywheelBanner.style.display = 'none', 300);
    });
  }
}

// Upload Video (3-Step Wizard) & YouTube-Style Go Live Studio Logic
function setupUploadAndLiveModals() {
  const uploadDropdownGroup = document.getElementById('upload-dropdown-group');
  const uploadBtn = document.getElementById('btn-upload-action');
  const uploadDropdownMenu = document.getElementById('upload-dropdown-menu');
  const uploadVideoModal = document.getElementById('upload-video-modal');
  const goLiveModal = document.getElementById('go-live-modal');

  // Hide manual "Estimated Duration" input (auto-detected from video file)
  const durationInputEl = document.getElementById('upload-video-duration');
  if (durationInputEl) {
    const wrapper = durationInputEl.closest('.form-group') || durationInputEl.parentElement;
    if (wrapper) wrapper.style.display = 'none';
  }

  function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.add('open');
    modalElement.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalElement) {
    if (!modalElement) return;
    if (document.activeElement && modalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    modalElement.classList.remove('open');
    modalElement.setAttribute('aria-hidden', 'true');
  }

  // Toggle "+ Create" dropdown
  uploadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = uploadDropdownMenu.classList.toggle('open');
    uploadDropdownMenu.setAttribute('aria-hidden', !isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!uploadDropdownGroup?.contains(e.target)) {
      uploadDropdownMenu?.classList.remove('open');
      uploadDropdownMenu?.setAttribute('aria-hidden', 'true');
    }
  });

  // Open Upload Video Modal (reset to Step 1)
  document.getElementById('btn-upload-video')?.addEventListener('click', () => {
    uploadDropdownMenu?.classList.remove('open');
    if (typeof window.__setUploadWizardStep === 'function') {
      window.__setUploadWizardStep(1);
    }
    openModal(uploadVideoModal);
  });

  // Open YouTube-style Go Live Modal
  document.getElementById('btn-go-live')?.addEventListener('click', () => {
    uploadDropdownMenu?.classList.remove('open');
    openModal(goLiveModal);
    if (typeof window.__startLiveSetupPreview === 'function') {
      window.__startLiveSetupPreview();
    }
  });

  // Close Upload Video Modal
  document.getElementById('close-upload-video-modal')?.addEventListener('click', () => closeModal(uploadVideoModal));
  document.getElementById('cancel-upload-video-btn')?.addEventListener('click', () => closeModal(uploadVideoModal));

  // Close Go Live Modal (stop setup preview stream if user didn't go live)
  function closeGoLiveSetup() {
    if (typeof window.__stopLiveSetupPreview === 'function') {
      window.__stopLiveSetupPreview();
    }
    closeModal(goLiveModal);
  }
  document.getElementById('close-go-live-modal')?.addEventListener('click', closeGoLiveSetup);
  document.getElementById('cancel-go-live-btn')?.addEventListener('click', closeGoLiveSetup);

  // Reveal stream key
  document.getElementById('btn-reveal-key')?.addEventListener('click', (e) => {
    const keyInput = document.getElementById('live-stream-key');
    if (keyInput.type === 'password') {
      keyInput.type = 'text';
      keyInput.value = 'live_sk_crditeach_' + Math.random().toString(36).slice(2, 18);
      e.target.textContent = 'Hide Key';
    } else {
      keyInput.type = 'password';
      keyInput.value = 'live_sk_••••••••••••••••';
      e.target.textContent = 'Show Key';
    }
  });

  // Shared helper for uploading notes/code attachment file
  async function uploadNotesAttachmentFile(fileObj) {
    if (!fileObj) return null;
    const notesFormData = new FormData();
    notesFormData.append('notesFile', fileObj);

    const headers = {};
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

    const notesRes = await fetch('/api/upload-notes-file', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: notesFormData
    });
    const notesData = await notesRes.json();
    if (!notesRes.ok || !notesData.success) {
      throw new Error(notesData.error || 'Notes attachment upload failed.');
    }
    return notesData;
  }

  // ---------------------------------------------------------
  // 3-STEP MULTI-PAGE UPLOAD WIZARD (Description on Page 1!)
  // ---------------------------------------------------------
  const uploadForm = document.getElementById('upload-video-form');
  let selectedNotesFile = null;

  function initMultiStepUploadWizard() {
    if (!uploadForm || uploadForm.dataset.wizardInitialized === 'true') return;
    uploadForm.dataset.wizardInitialized = 'true';

    const dropZoneEl = document.getElementById('upload-drop-zone');
    const titleGroup = document.getElementById('upload-video-title')?.closest('.form-group') || document.getElementById('upload-video-title')?.parentElement;
    const descGroup = document.getElementById('upload-video-desc')?.closest('.form-group') || document.getElementById('upload-video-desc')?.parentElement;

    const thumbInput = document.getElementById('upload-thumbnail-input') || uploadForm.querySelector('input[type="file"][accept*="image"]');
    const thumbGroup = thumbInput?.closest('.form-group') || thumbInput?.parentElement;
    const catGroup = document.getElementById('upload-video-category')?.closest('.form-group') || document.getElementById('upload-video-category')?.parentElement;
    const tagsGroup = document.getElementById('upload-video-tags')?.closest('.form-group') || document.getElementById('upload-video-tags')?.parentElement;

    const visibilityGroup = document.getElementById('upload-video-visibility')?.closest('.form-group') || document.getElementById('upload-video-visibility')?.parentElement;
    const originalSubmitBtn = uploadForm.querySelector('button[type="submit"]');
    const originalFooter = originalSubmitBtn?.parentElement;

    const stepperHeader = document.createElement('div');
    stepperHeader.id = 'upload-wizard-stepper';
    stepperHeader.style.cssText = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 18px; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;';
    stepperHeader.innerHTML = `
      <div class="js-wiz-step-pill" data-step="1" style="padding: 8px 10px; border-radius: 8px; text-align: center; font-size: 0.78rem; font-weight: 700; cursor: pointer;">
        1. Video, Title & Description
      </div>
      <div class="js-wiz-step-pill" data-step="2" style="padding: 8px 10px; border-radius: 8px; text-align: center; font-size: 0.78rem; font-weight: 700; cursor: pointer;">
        2. Thumbnail & Category
      </div>
      <div class="js-wiz-step-pill" data-step="3" style="padding: 8px 10px; border-radius: 8px; text-align: center; font-size: 0.78rem; font-weight: 700; cursor: pointer;">
        3. Notes, Code & Publish
      </div>
    `;

    const step1Page = document.createElement('div');
    step1Page.id = 'upload-step-page-1';
    step1Page.style.cssText = 'display: flex; flex-direction: column; gap: 14px;';

    const step2Page = document.createElement('div');
    step2Page.id = 'upload-step-page-2';
    step2Page.style.cssText = 'display: none; flex-direction: column; gap: 14px;';

    const step3Page = document.createElement('div');
    step3Page.id = 'upload-step-page-3';
    step3Page.style.cssText = 'display: none; flex-direction: column; gap: 14px;';

    // Step 1: Video file + Title + Description
    if (dropZoneEl) step1Page.appendChild(dropZoneEl);
    if (titleGroup) step1Page.appendChild(titleGroup);
    if (descGroup) step1Page.appendChild(descGroup);

    // Step 2: Thumbnail + Topic Category + Tags
    if (thumbGroup) step2Page.appendChild(thumbGroup);
    if (catGroup) step2Page.appendChild(catGroup);
    if (tagsGroup) step2Page.appendChild(tagsGroup);

    // Step 3: Lesson Notes & Code (Text + File) + Visibility
    const notesSection = document.createElement('div');
    notesSection.style.cssText = 'display: flex; flex-direction: column; gap: 12px; padding: 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;';
    notesSection.innerHTML = `
      <div>
        <label for="upload-lesson-notes-text" style="display: block; font-size: 0.85rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">
          📝 Lesson Notes & Code (Optional)
        </label>
        <p style="font-size: 0.76rem; color: #94a3b8; margin: 0 0 8px;">
          Write lesson notes, paste code snippets, or attach a downloadable file (PDF, TXT, MD, JS, PY, ZIP, DOCX, Image).
        </p>
        <textarea 
          id="upload-lesson-notes-text" 
          rows="5" 
          placeholder="Type your lesson summary, key formulas, or paste source code here..."
          style="width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.84rem; resize: vertical;"
        ></textarea>
      </div>

      <div>
        <label for="upload-lesson-notes-file" style="display: block; font-size: 0.82rem; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">
          📎 Attach Notes / Code File (Optional)
        </label>
        <input 
          type="file" 
          id="upload-lesson-notes-file" 
          accept=".pdf,.txt,.md,.doc,.docx,.js,.ts,.py,.java,.cpp,.c,.html,.css,.json,.csv,.zip,image/*"
          style="width: 100%; font-size: 0.82rem; color: #cbd5e1;"
        />
        <div id="upload-notes-file-badge" style="display: none; margin-top: 8px; padding: 7px 11px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; font-size: 0.78rem; color: #38bdf8; align-items: center; justify-content: space-between; gap: 8px;">
          <span id="upload-notes-file-name"></span>
          <button type="button" id="btn-clear-notes-file" style="background: transparent; border: none; color: #fca5a5; font-weight: 700; cursor: pointer;">✕ Remove</button>
        </div>
      </div>
    `;

    step3Page.appendChild(notesSection);
    if (visibilityGroup) step3Page.appendChild(visibilityGroup);

    const wizardNavFooter = document.createElement('div');
    wizardNavFooter.style.cssText = 'display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.1);';
    wizardNavFooter.innerHTML = `
      <button type="button" id="btn-wiz-prev" class="btn btn-secondary" style="display: none; padding: 9px 18px;">
        ← Previous
      </button>
      <div style="margin-left: auto; display: flex; align-items: center; gap: 10px;">
        <button type="button" id="btn-wiz-next" class="btn btn-primary" style="padding: 9px 22px; font-weight: 600;">
          Next Step →
        </button>
        <div id="wiz-final-submit-slot" style="display: none;"></div>
      </div>
    `;

    if (originalSubmitBtn) {
      wizardNavFooter.querySelector('#wiz-final-submit-slot').appendChild(originalSubmitBtn);
    }
    if (originalFooter && originalFooter.children.length === 0) {
      originalFooter.remove();
    }

    uploadForm.prepend(step3Page);
    uploadForm.prepend(step2Page);
    uploadForm.prepend(step1Page);
    uploadForm.prepend(stepperHeader);
    uploadForm.appendChild(wizardNavFooter);

    const notesFileInput = document.getElementById('upload-lesson-notes-file');
    const notesFileBadge = document.getElementById('upload-notes-file-badge');
    const notesFileNameEl = document.getElementById('upload-notes-file-name');
    const clearNotesFileBtn = document.getElementById('btn-clear-notes-file');

    notesFileInput?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) {
        selectedNotesFile = f;
        if (notesFileNameEl) notesFileNameEl.textContent = `📄 ${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
        if (notesFileBadge) notesFileBadge.style.display = 'flex';
      }
    });

    clearNotesFileBtn?.addEventListener('click', () => {
      selectedNotesFile = null;
      if (notesFileInput) notesFileInput.value = '';
      if (notesFileBadge) notesFileBadge.style.display = 'none';
    });

    let currentWizardStep = 1;
    const prevBtn = document.getElementById('btn-wiz-prev');
    const nextBtn = document.getElementById('btn-wiz-next');
    const finalSubmitSlot = document.getElementById('wiz-final-submit-slot');

    function setUploadWizardStep(step) {
      currentWizardStep = step;
      step1Page.style.display = step === 1 ? 'flex' : 'none';
      step2Page.style.display = step === 2 ? 'flex' : 'none';
      step3Page.style.display = step === 3 ? 'flex' : 'none';

      prevBtn.style.display = step > 1 ? 'inline-flex' : 'none';
      nextBtn.style.display = step < 3 ? 'inline-flex' : 'none';
      finalSubmitSlot.style.display = step === 3 ? 'inline-flex' : 'none';

      stepperHeader.querySelectorAll('.js-wiz-step-pill').forEach(pill => {
        const s = Number(pill.getAttribute('data-step'));
        if (s === step) {
          pill.style.background = 'rgba(56, 189, 248, 0.2)';
          pill.style.color = '#38bdf8';
          pill.style.border = '1px solid rgba(56, 189, 248, 0.45)';
        } else if (s < step) {
          pill.style.background = 'rgba(16, 185, 129, 0.14)';
          pill.style.color = '#34d399';
          pill.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        } else {
          pill.style.background = 'transparent';
          pill.style.color = '#94a3b8';
          pill.style.border = '1px solid transparent';
        }
      });
    }

    window.__setUploadWizardStep = setUploadWizardStep;

    function validateStep1() {
      const titleInput = document.getElementById('upload-video-title');
      if (titleInput && !titleInput.value.trim()) {
        titleInput.focus();
        window.showToast?.('Required', 'Please enter a video title before continuing.', 'error');
        return false;
      }
      return true;
    }

    function validateStep2() {
      const catInput = document.getElementById('upload-video-category');
      if (catInput && !catInput.value.trim()) {
        catInput.focus();
        window.showToast?.('Required', 'Please type a topic category before continuing.', 'error');
        return false;
      }
      return true;
    }

    nextBtn?.addEventListener('click', () => {
      if (currentWizardStep === 1 && !validateStep1()) return;
      if (currentWizardStep === 2 && !validateStep2()) return;
      if (currentWizardStep < 3) setUploadWizardStep(currentWizardStep + 1);
    });

    prevBtn?.addEventListener('click', () => {
      if (currentWizardStep > 1) setUploadWizardStep(currentWizardStep - 1);
    });

    stepperHeader.querySelectorAll('.js-wiz-step-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const targetStep = Number(pill.getAttribute('data-step'));
        if (targetStep > 1 && !validateStep1()) return;
        if (targetStep > 2 && !validateStep2()) return;
        setUploadWizardStep(targetStep);
      });
    });

    setUploadWizardStep(1);
  }

  initMultiStepUploadWizard();

  // ---------------------------------------------------------
  // YOUTUBE-STYLE GO LIVE STUDIO SETUP & LIVE PREVIEW
  // ---------------------------------------------------------
  const liveForm = document.getElementById('go-live-form');
  let selectedLiveNotesFile = null;
  let liveSetupPreviewStream = null;

  function initYouTubeLiveStudioForm() {
    if (!liveForm || liveForm.dataset.ytStudioInitialized === 'true') return;
    liveForm.dataset.ytStudioInitialized = 'true';

    // Make the Go Live modal container wider for YouTube Studio 2-column feel
    const modalContent = liveForm.closest('.modal-content, .modal-box, .modal-dialog');
    if (modalContent) {
      modalContent.style.maxWidth = '880px';
      modalContent.style.width = '95%';
    }

    const titleGroup = document.getElementById('live-title')?.closest('.form-group') || document.getElementById('live-title')?.parentElement;
    const catGroup = document.getElementById('live-category')?.closest('.form-group') || document.getElementById('live-category')?.parentElement;
    const descGroup = document.getElementById('live-desc')?.closest('.form-group') || document.getElementById('live-desc')?.parentElement;
    const tagsGroup = document.getElementById('live-stream-tags')?.closest('.form-group') || document.getElementById('live-stream-tags')?.parentElement;
    const thumbInput = document.getElementById('live-thumbnail-input') || liveForm.querySelector('input[type="file"][accept*="image"]');
    const thumbGroup = thumbInput?.closest('.form-group') || thumbInput?.parentElement;

    const studioGrid = document.createElement('div');
    studioGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 18px; align-items: start; margin-bottom: 14px;';

    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'display: flex; flex-direction: column; gap: 12px;';

    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'display: flex; flex-direction: column; gap: 12px; background: rgba(2, 6, 23, 0.55); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px;';

    // Right Column: YouTube-style Live Camera / Screen Preview Box
    rightCol.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span style="font-size: 0.8rem; font-weight: 700; color: #f8fafc; display: inline-flex; align-items: center; gap: 6px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
          Live Stream Preview
        </span>
        <span id="live-preview-status-pill" style="font-size: 0.72rem; color: #94a3b8; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 999px;">
          Initializing...
        </span>
      </div>

      <div style="position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12);">
        <video id="live-studio-setup-video" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover; display: block;"></video>
        <div id="live-studio-preview-fallback" style="display: none; position: absolute; inset: 0; align-items: center; justify-content: center; flex-direction: column; gap: 6px; color: #94a3b8; font-size: 0.8rem; text-align: center; padding: 12px;">
          <span style="font-size: 1.5rem;">📹</span>
          <span>Allow camera or screen permission to preview your stream</span>
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button type="button" id="btn-live-src-camera" class="btn btn-primary" style="flex: 1; padding: 7px 10px; font-size: 0.78rem;">
          📷 Camera
        </button>
        <button type="button" id="btn-live-src-screen" class="btn btn-secondary" style="flex: 1; padding: 7px 10px; font-size: 0.78rem;">
          🖥️ Screen Share
        </button>
      </div>
    `;

    // Left Column: Stream Metadata + Lesson Notes & Code (Text + File)
    if (titleGroup) leftCol.appendChild(titleGroup);
    if (descGroup) leftCol.appendChild(descGroup);
    if (catGroup) leftCol.appendChild(catGroup);

    const liveNotesBox = document.createElement('div');
    liveNotesBox.style.cssText = 'display: flex; flex-direction: column; gap: 10px; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px;';
    liveNotesBox.innerHTML = `
      <div>
        <label for="live-lesson-notes-text" style="display: block; font-size: 0.82rem; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">
          📝 Live Lesson Notes & Code (Optional)
        </label>
        <textarea 
          id="live-lesson-notes-text" 
          rows="3" 
          placeholder="Add notes or code snippets for viewers (you can also upload files while live)..."
          style="width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 0.82rem; resize: vertical;"
        ></textarea>
      </div>

      <div>
        <label for="live-lesson-notes-file" style="display: block; font-size: 0.78rem; font-weight: 600; color: #cbd5e1; margin-bottom: 4px;">
          📎 Attach File for Live Viewers (PDF, Code, ZIP, Image)
        </label>
        <input 
          type="file" 
          id="live-lesson-notes-file" 
          accept=".pdf,.txt,.md,.doc,.docx,.js,.ts,.py,.java,.cpp,.c,.html,.css,.json,.csv,.zip,image/*"
          style="width: 100%; font-size: 0.78rem; color: #cbd5e1;"
        />
        <div id="live-notes-file-badge" style="display: none; margin-top: 6px; padding: 5px 9px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 7px; font-size: 0.75rem; color: #38bdf8; align-items: center; justify-content: space-between; gap: 6px;">
          <span id="live-notes-file-name"></span>
          <button type="button" id="btn-clear-live-notes-file" style="background: transparent; border: none; color: #fca5a5; font-weight: 700; cursor: pointer;">✕</button>
        </div>
      </div>
    `;

    leftCol.appendChild(liveNotesBox);
    if (tagsGroup) leftCol.appendChild(tagsGroup);
    if (thumbGroup) rightCol.appendChild(thumbGroup);

    studioGrid.appendChild(leftCol);
    studioGrid.appendChild(rightCol);
    liveForm.prepend(studioGrid);

    // Live Notes file input handlers
    const liveNotesInput = document.getElementById('live-lesson-notes-file');
    const liveNotesBadge = document.getElementById('live-notes-file-badge');
    const liveNotesName = document.getElementById('live-notes-file-name');
    document.getElementById('btn-clear-live-notes-file')?.addEventListener('click', () => {
      selectedLiveNotesFile = null;
      if (liveNotesInput) liveNotesInput.value = '';
      if (liveNotesBadge) liveNotesBadge.style.display = 'none';
    });
    liveNotesInput?.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (f) {
        selectedLiveNotesFile = f;
        if (liveNotesName) liveNotesName.textContent = `📄 ${f.name}`;
        if (liveNotesBadge) liveNotesBadge.style.display = 'flex';
      }
    });

    // Camera / Screen preview switcher inside Go Live Studio
    let chosenLiveMode = 'camera';
    const camBtn = document.getElementById('btn-live-src-camera');
    const scrBtn = document.getElementById('btn-live-src-screen');
    const previewVideo = document.getElementById('live-studio-setup-video');
    const fallbackEl = document.getElementById('live-studio-preview-fallback');
    const statusPill = document.getElementById('live-preview-status-pill');

    async function startLiveSetupPreview(mode = chosenLiveMode) {
      chosenLiveMode = mode;
      if (camBtn && scrBtn) {
        camBtn.className = mode === 'camera' ? 'btn btn-primary' : 'btn btn-secondary';
        scrBtn.className = mode === 'screen' ? 'btn btn-primary' : 'btn btn-secondary';
      }
      // Sync hidden radio inputs if present in DOM
      const radioMatch = liveForm.querySelector(`input[name="live-source-type"][value="${mode}"]`);
      if (radioMatch) radioMatch.checked = true;

      if (liveSetupPreviewStream) {
        liveSetupPreviewStream.getTracks().forEach(t => t.stop());
        liveSetupPreviewStream = null;
      }

      try {
        liveSetupPreviewStream = mode === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        if (previewVideo) {
          previewVideo.srcObject = liveSetupPreviewStream;
          previewVideo.style.display = 'block';
        }
        if (fallbackEl) fallbackEl.style.display = 'none';
        if (statusPill) {
          statusPill.textContent = mode === 'screen' ? '● Screen Ready' : '● Camera Ready';
          statusPill.style.color = '#34d399';
        }
      } catch {
        if (previewVideo) previewVideo.style.display = 'none';
        if (fallbackEl) fallbackEl.style.display = 'flex';
        if (statusPill) {
          statusPill.textContent = 'Permission Needed';
          statusPill.style.color = '#fca5a5';
        }
      }
    }

    function stopLiveSetupPreview() {
      if (liveSetupPreviewStream) {
        liveSetupPreviewStream.getTracks().forEach(t => t.stop());
        liveSetupPreviewStream = null;
      }
      if (previewVideo) previewVideo.srcObject = null;
    }

    camBtn?.addEventListener('click', () => startLiveSetupPreview('camera'));
    scrBtn?.addEventListener('click', () => startLiveSetupPreview('screen'));

    window.__startLiveSetupPreview = startLiveSetupPreview;
    window.__stopLiveSetupPreview = stopLiveSetupPreview;
    window.__getChosenLiveMode = () => chosenLiveMode;
    window.__consumeLiveSetupStream = () => {
      const s = liveSetupPreviewStream;
      liveSetupPreviewStream = null;
      return s;
    };
  }

  initYouTubeLiveStudioForm();

  // ---------------------------------------------------------
  // CUSTOM THUMBNAIL PREVIEW & UPLOAD HELPER
  // ---------------------------------------------------------
  function getThumbnailFileInput(preferredId, formId) {
    const byId = document.getElementById(preferredId);
    if (byId) return byId;
    const form = document.getElementById(formId);
    return form?.querySelector('input[type="file"][accept*="image"]') || null;
  }

  function setupAutoThumbnailPreview(preferredInputId, formId, previewPrefix) {
    const input = getThumbnailFileInput(preferredInputId, formId);
    if (!input) return;

    let box = document.getElementById(`${previewPrefix}-preview-box`);
    let img = document.getElementById(`${previewPrefix}-preview-img`);
    let clearBtn = document.getElementById(`btn-clear-${previewPrefix}`);

    if (!box) {
      box = document.createElement('div');
      box.id = `${previewPrefix}-preview-box`;
      box.style.cssText = 'display: none; margin-top: 10px; position: relative; border-radius: 10px; overflow: hidden; border: 1px solid rgba(56, 189, 248, 0.45); background: #020617; max-width: 280px;';
      box.innerHTML = `
        <img id="${previewPrefix}-preview-img" alt="Thumbnail Preview" style="width: 100%; height: 155px; object-fit: cover; display: block;" />
        <button type="button" id="btn-clear-${previewPrefix}" style="position: absolute; top: 8px; right: 8px; background: rgba(15, 23, 42, 0.9); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; padding: 3px 8px; font-size: 0.74rem; font-weight: 600; cursor: pointer;">
          ✕ Remove
        </button>
      `;
      input.parentElement?.appendChild(box);
      img = document.getElementById(`${previewPrefix}-preview-img`);
      clearBtn = document.getElementById(`btn-clear-${previewPrefix}`);
    }

    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && img && box) {
        img.src = URL.createObjectURL(file);
        box.style.display = 'block';
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        if (img) img.src = '';
        if (box) box.style.display = 'none';
      });
    }
  }

  setupAutoThumbnailPreview('upload-thumbnail-input', 'upload-video-form', 'upload-thumb');
  setupAutoThumbnailPreview('live-thumbnail-input', 'go-live-form', 'live-thumb');

  async function uploadThumbnailBlobOrFile(fileOrBlob, filename = 'thumbnail.jpg') {
    if (!fileOrBlob) return null;
    const formData = new FormData();
    formData.append('thumbnailFile', fileOrBlob, filename);

    const headers = {};
    if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

    const res = await fetch('/api/upload-thumbnail', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData
    });
    const data = await res.json();
    if (res.ok && data.success && data.thumbnailUrl) {
      return data.thumbnailUrl;
    }
    throw new Error(data.error || 'Thumbnail upload failed');
  }

  async function uploadCustomThumbnailIfSelected(preferredId, formId) {
    const input = getThumbnailFileInput(preferredId, formId);
    const file = input?.files?.[0];
    if (!file) return null;
    return await uploadThumbnailBlobOrFile(file, file.name);
  }

  function captureVideoFrameBlob(videoFile) {
    return new Promise((resolve) => {
      if (!videoFile) return resolve(null);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const objUrl = URL.createObjectURL(videoFile);
      video.src = objUrl;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(objUrl);
            resolve(blob || null);
          }, 'image/jpeg', 0.85);
        } catch {
          URL.revokeObjectURL(objUrl);
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(null);
      };
    });
  }

  // ---------------------------------------------------------
  // AUTOMATIC VIDEO DURATION EXTRACTOR
  // ---------------------------------------------------------
  let selectedVideoFile = null;
  let detectedVideoDuration = '';

  function formatSecondsToDuration(sec) {
    if (!sec || !isFinite(sec) || sec <= 0) return '';
    const totalSec = Math.round(sec);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
  }

  function extractVideoDuration(file) {
    return new Promise((resolve) => {
      if (!file) return resolve('');
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      const url = URL.createObjectURL(file);
      tempVideo.src = url;

      tempVideo.onloadedmetadata = () => {
        const formatted = formatSecondsToDuration(tempVideo.duration);
        URL.revokeObjectURL(url);
        resolve(formatted);
      };

      tempVideo.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
    });
  }

  const dropZone = document.getElementById('upload-drop-zone');
  const fileInput = document.getElementById('video-file-input');
  const progressWrapper = document.getElementById('upload-progress-wrapper');
  const fileInfo = document.getElementById('upload-file-info');
  const progressFill = document.getElementById('upload-progress-fill');
  const progressPct = document.getElementById('upload-progress-pct');

  async function handleFileSelection(file) {
    if (!file) return;
    selectedVideoFile = file;
    detectedVideoDuration = await extractVideoDuration(file);

    const durLabel = detectedVideoDuration ? ` • ⏱️ ${detectedVideoDuration}` : '';
    if (fileInfo) {
      fileInfo.textContent = `📄 ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)${durLabel}`;
    }
    if (progressWrapper) progressWrapper.style.display = 'block';
    if (progressFill) progressFill.style.width = '100%';
    if (progressPct) progressPct.textContent = '✓ Ready to Publish';
  }

  fileInput?.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileSelection(fileInput.files[0]);
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) handleFileSelection(file);
  });

  // 1. UPLOAD VIDEO TO MAIN FEED HANDLER
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = uploadForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Upload & Publish';

      const title = document.getElementById('upload-video-title').value.trim();
      const rawCategory = document.getElementById('upload-video-category').value.trim();
      const category = rawCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
      const categoryName = rawCategory;

      const desc = document.getElementById('upload-video-desc').value.trim();
      const tags = document.getElementById('upload-video-tags')?.value.trim() || '';
      const visibility = document.getElementById('upload-video-visibility')?.value || 'public';
      const rawNotesText = document.getElementById('upload-lesson-notes-text')?.value.trim() || '';

      const duration = detectedVideoDuration || (selectedVideoFile ? await extractVideoDuration(selectedVideoFile) : '');
      const pricingModel = visibility === 'public' ? 'free' : (visibility === 'credits' ? 'credit-only' : 'dual');
      const creditPrice = visibility === 'public' ? 0 : 25;

      let finalVideoUrl = '';

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '⏳ Uploading Files...';
        }

        let finalThumbUrl = await uploadCustomThumbnailIfSelected('upload-thumbnail-input', 'upload-video-form');
        if (!finalThumbUrl && selectedVideoFile) {
          const frameBlob = await captureVideoFrameBlob(selectedVideoFile);
          if (frameBlob) {
            finalThumbUrl = await uploadThumbnailBlobOrFile(frameBlob, `frame-${Date.now()}.jpg`).catch(() => null);
          }
        }

        const uploadedNotesAttachment = await uploadNotesAttachmentFile(selectedNotesFile);
        let finalNotesPayload = rawNotesText;
        if (uploadedNotesAttachment) {
          const attachmentLine = `📎 Attached File: ${uploadedNotesAttachment.fileName} (${window.location.origin}${uploadedNotesAttachment.fileUrl})`;
          finalNotesPayload = finalNotesPayload ? `${finalNotesPayload}\n\n${attachmentLine}` : attachmentLine;
        }

        if (selectedVideoFile) {
          if (progressPct) progressPct.textContent = 'Uploading to server...';
          const formData = new FormData();
          formData.append('videoFile', selectedVideoFile);

          const headers = {};
          if (auth.token) headers['Authorization'] = `Bearer ${auth.token}`;

          const uploadRes = await fetch('/api/upload-video', {
            method: 'POST',
            credentials: 'include',
            headers,
            body: formData
          });
          const uploadData = await uploadRes.json();

          if (!uploadRes.ok || !uploadData.success) {
            throw new Error(uploadData.error || 'Video file upload failed.');
          }
          finalVideoUrl = uploadData.videoUrl;
        }

        const newCourseData = {
          title,
          category,
          categoryName,
          desc,
          notes: finalNotesPayload,
          tags,
          format: 'Video Lesson',
          duration,
          pricingModel,
          creditPrice,
          isLive: false,
          videoUrl: finalVideoUrl,
          thumbnail: finalThumbUrl || ''
        };

        const res = await publishCourseToServer(newCourseData);
        if (res.success) {
          closeModal(uploadVideoModal);
          uploadForm.reset();
          selectedVideoFile = null;
          selectedNotesFile = null;
          detectedVideoDuration = '';
          if (progressWrapper) progressWrapper.style.display = 'none';
          const previewBox = document.getElementById('upload-thumb-preview-box');
          if (previewBox) previewBox.style.display = 'none';
          const notesBadge = document.getElementById('upload-notes-file-badge');
          if (notesBadge) notesBadge.style.display = 'none';
          if (typeof window.__setUploadWizardStep === 'function') window.__setUploadWizardStep(1);

          await state.loadCoursesFromDB();
          window.showToast('Video Published!', 'Your video, notes, and thumbnail are live on the feed!', 'success');
        } else {
          window.showToast('Publish Failed', res.error || 'Please log in first to upload videos.', 'error');
        }
      } catch (err) {
        window.showToast('Upload Error', err.message || 'Could not upload video.', 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      }
    });
  }

  // 2. GO LIVE STREAM HANDLER (WITH LIVE NOTES & FILE ATTACHMENTS)
  if (liveForm) {
    liveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('live-title').value.trim();
      const rawLiveCategory = document.getElementById('live-category').value.trim();
      const category = rawLiveCategory.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'general';
      const categoryName = rawLiveCategory;

      const desc = document.getElementById('live-desc')?.value.trim() || '';
      const tags = document.getElementById('live-stream-tags')?.value.trim() || '';
      const rawLiveNotesText = document.getElementById('live-lesson-notes-text')?.value.trim() || '';
      const sourceType = (typeof window.__getChosenLiveMode === 'function' ? window.__getChosenLiveMode() : null) ||
        document.querySelector('input[name="live-source-type"]:checked')?.value || 'camera';

      let customLiveThumbUrl = null;
      let uploadedLiveNotesFile = null;
      try {
        customLiveThumbUrl = await uploadCustomThumbnailIfSelected('live-thumbnail-input', 'go-live-form');
        uploadedLiveNotesFile = await uploadNotesAttachmentFile(selectedLiveNotesFile);
      } catch (uploadErr) {
        window.showToast('Upload Error', uploadErr.message, 'error');
        return;
      }

      let finalLiveNotesPayload = rawLiveNotesText;
      if (uploadedLiveNotesFile) {
        const attachmentLine = `📎 Attached File: ${uploadedLiveNotesFile.fileName} (${window.location.origin}${uploadedLiveNotesFile.fileUrl})`;
        finalLiveNotesPayload = finalLiveNotesPayload ? `${finalLiveNotesPayload}\n\n${attachmentLine}` : attachmentLine;
      }

      // Reuse already-active preview stream if available, else request permission
      let mediaStream = typeof window.__consumeLiveSetupStream === 'function' ? window.__consumeLiveSetupStream() : null;
      if (!mediaStream) {
        try {
          mediaStream = sourceType === 'screen'
            ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            : await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch {
          window.showToast('Camera/Screen Blocked', 'Please allow camera or screen sharing permission to go live.', 'error');
          return;
        }
      }
      window.activeLocalLiveStream = mediaStream;

      window.liveRecordedChunks = [];
      try {
        const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm' });
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            window.liveRecordedChunks.push(event.data);
          }
        };
        recorder.start(1000);
        window.activeLiveRecorder = recorder;
      } catch (recErr) {
        console.warn('MediaRecorder fallback:', recErr);
      }

      const liveSessionData = {
        title,
        category,
        categoryName,
        desc,
        notes: finalLiveNotesPayload,
        tags,
        format: 'LIVE',
        duration: 'LIVE',
        pricingModel: 'free',
        creditPrice: 0,
        isLive: true,
        videoUrl: '',
        thumbnail: customLiveThumbUrl || ''
      };

      const res = await publishCourseToServer(liveSessionData);
      if (res.success) {
        closeModal(goLiveModal);
        liveForm.reset();
        selectedLiveNotesFile = null;
        const livePreviewBox = document.getElementById('live-thumb-preview-box');
        if (livePreviewBox) livePreviewBox.style.display = 'none';
        const liveNotesBadge = document.getElementById('live-notes-file-badge');
        if (liveNotesBadge) liveNotesBadge.style.display = 'none';

        await state.loadCoursesFromDB();

        state.activeCourseId = res.courseId;
        navigateTo('classroom');
        window.showToast('🔴 You are LIVE!', 'Your camera/screen is now broadcasting live!', 'success');
      } else {
        if (window.activeLiveRecorder && window.activeLiveRecorder.state !== 'inactive') {
          window.activeLiveRecorder.stop();
        }
        mediaStream.getTracks().forEach(track => track.stop());
        window.activeLocalLiveStream = null;
        window.showToast('Stream Error', res.error || 'Please log in first to go live.', 'error');
      }
    });
  }
}

// Bootstrap Application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Crditeach Web Platform...');

  initAuthModal();
  await auth.checkSession();

  initNavbar(navigateTo);
  initMarketplace(navigateTo);
  initClassroom(navigateTo);
  initSponsorLounge();
  initProfileView(navigateTo);

  setupModalListeners();
  setupUploadAndLiveModals();

  // Support direct deep linking to shared videos (?video=courseId)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedVideoId = urlParams.get('video');
    if (sharedVideoId) {
      state.activeCourseId = sharedVideoId;
      state.recordCourseView(sharedVideoId);
      navigateTo('classroom');
    }
  } catch (e) {
    console.warn('Could not parse initial route parameters:', e);
  }

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