/**
 * SPONSOR LOUNGE COMPONENT (DEDICATED AD SECTION)
 * Separate, non-intrusive hub for developer deals, cloud credits, and partner perks
 */

import { state } from '../state.js';

export function initSponsorLounge() {
  const mount = document.getElementById('sponsor-mount');

  function renderSponsors() {
    mount.innerHTML = `
      <div class="sponsor-lounge-container">
        
        <!-- Hero Explainer -->
        <div class="sponsor-hero">
          <div class="sponsor-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Dedicated Sponsor & Partner Lounge
          </div>
          <h2>Zero In-Video Ads. Real Developer Value Here.</h2>
          <p>
            At Crditeach, video lessons are 100% distraction-free—never interrupted by pre-rolls or mid-rolls. 
            Instead, all partner sponsorships, cloud grants, and developer perks live here. Explore partner deals or earn bonus Credits to fund your learning!
          </p>
        </div>

        <!-- Sponsors Grid -->
        <div class="sponsors-grid">
          ${state.sponsors.map(sp => `
            <div class="sponsor-card" data-sponsor-id="${sp.id}">
              <div>
                <div class="sponsor-brand-row">
                  <img src="${sp.logo}" alt="${sp.brand}" class="sponsor-logo" />
                  <div class="sponsor-brand-info">
                    <h4>${sp.brand}</h4>
                    <span class="sponsor-category">${sp.category}</span>
                  </div>
                </div>

                <div class="sponsor-offer-box">
                  <div class="sponsor-offer-title">${sp.headline}</div>
                  <div class="sponsor-offer-desc">${sp.desc}</div>
                </div>

                <div class="sponsor-reward-prompt">
                  <span style="font-size: 0.78rem; color: var(--text-secondary);">Partner Reward:</span>
                  <span class="reward-tag">+${sp.bonusCredits} Bonus Credits ₢</span>
                </div>
              </div>

              <div>
                <button 
                  class="btn ${sp.claimed ? 'btn-secondary' : 'btn-emerald'} btn-claim-perk" 
                  data-sp-id="${sp.id}"
                  style="width: 100%;"
                  ${sp.claimed ? 'disabled' : ''}
                >
                  ${sp.claimed ? '✓ Perk Claimed (+Credits Added)' : `Claim Deal & Earn +${sp.bonusCredits} ₢`}
                </button>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Become a Sponsor Section -->
        <div style="background: var(--bg-card); backdrop-filter: blur(16px); border: 1px solid var(--border-glass); border-radius: var(--radius-lg); padding: 32px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; align-items: center;">
          <div>
            <span class="info-pill" style="margin-bottom: 8px; display: inline-block;">Partner With Crditeach</span>
            <h3 style="font-size: 1.5rem; margin-bottom: 10px;">Support Developer Education Without Disrupting It</h3>
            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
              Developers hate video ad interruptions. By featuring your company in our dedicated Sponsor Lounge, you reach high-intent engineers, builders, and learners who opt-in to discover your cloud infrastructure, developer tools, and APIs.
            </p>
            <ul style="font-size: 0.84rem; color: var(--text-secondary); padding-left: 18px; line-height: 1.8;">
              <li>High brand respect through non-invasive, opt-in placement</li>
              <li>Direct attribution & developer trial activations</li>
              <li>Fund student credits to democratize technical education</li>
            </ul>
          </div>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 24px;">
            <h4 style="font-size: 1.1rem; margin-bottom: 14px; color: var(--text-pure);">Inquire for a Sponsor Showcase</h4>
            <form id="sponsor-inquiry-form">
              <div class="form-group">
                <label for="sponsor-company">Company / Product Name</label>
                <input type="text" id="sponsor-company" placeholder="e.g. CloudScale AI" required />
              </div>
              <div class="form-group">
                <label for="sponsor-email">Work Email</label>
                <input type="text" id="sponsor-email" placeholder="partners@company.com" required />
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">
                Submit Sponsorship Inquiry
              </button>
            </form>
          </div>
        </div>

      </div>
    `;

    attachSponsorListeners();
  }

  function attachSponsorListeners() {
    // Claim Perk Buttons
    document.querySelectorAll('.btn-claim-perk').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-sp-id');
        const res = state.claimSponsorReward(id);
        if (res.success) {
          window.showToast('Bonus Credits Claimed!', res.message, 'success');
          renderSponsors();
        } else {
          window.showToast('Perk Info', res.message, 'info');
        }
      });
    });

    // Inquiry Form
    const inquiryForm = document.getElementById('sponsor-inquiry-form');
    if (inquiryForm) {
      inquiryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const comp = document.getElementById('sponsor-company').value;
        window.showToast(
          'Inquiry Received!',
          `Thank you! The Crditeach partnerships team will reach out regarding ${comp}.`,
          'success'
        );
        inquiryForm.reset();
      });
    }
  }

  // Subscribe to state changes
  state.subscribe(renderSponsors);
  renderSponsors();
}
