/**
 * SPONSOR LOUNGE COMPONENT (DEDICATED AD SECTION)
 * Clean zero-state when empty + compact, sleek presentation when real sponsors are added
 */

import { state } from '../state.js';

export function initSponsorLounge() {
  const mount = document.getElementById('sponsor-mount');

  function renderSponsors() {
    if (!mount) return;

    const sponsorsList = Array.isArray(state.sponsors) ? state.sponsors : [];

    mount.innerHTML = `
      <div class="sponsor-lounge-container" style="max-width: 1140px; margin: 0 auto;">
        
        <!-- Compact Hero Explainer -->
        <div class="sponsor-hero" style="padding: 28px 24px; margin-bottom: 24px;">
          <div class="sponsor-hero-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Dedicated Sponsor & Partner Lounge
          </div>
          <h2 style="font-size: 1.55rem; margin-bottom: 8px;">Zero In-Video Ads. Curated Partner Deals Here.</h2>
          <p style="font-size: 0.9rem; max-width: 680px; margin: 0 auto;">
            Video lessons on Crditeach are 100% ad-free. All verified partner deals and developer perks live quietly in this dedicated space.
          </p>
        </div>

        <!-- Compact Sponsors Grid OR Clean Empty State -->
        ${sponsorsList.length > 0 ? `
          <div class="sponsors-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 18px; margin-bottom: 32px;">
            ${sponsorsList.map(sp => `
              <div class="sponsor-card" data-sponsor-id="${sp.id}" style="padding: 18px; border-radius: 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
                <div>
                  <!-- Compact Brand Header -->
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <img src="${sp.logo}" alt="${sp.brand}" style="width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border-glass);" />
                    <div style="min-width: 0;">
                      <h4 style="font-size: 0.98rem; color: var(--text-pure); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sp.brand}</h4>
                      <span style="font-size: 0.75rem; color: var(--text-muted); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sp.category}</span>
                    </div>
                  </div>

                  <!-- Compact Offer Details -->
                  <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-glass); border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                    <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-pure); margin-bottom: 4px; line-height: 1.35;">
                      ${sp.headline}
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.45; margin: 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                      ${sp.desc}
                    </p>
                  </div>
                </div>

                <!-- Compact Footer Action -->
                <div>
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 0.76rem;">
                    <span style="color: var(--text-secondary);">Partner Bonus:</span>
                    <span class="reward-tag" style="padding: 2px 8px; font-size: 0.74rem;">+${sp.bonusCredits} ₢</span>
                  </div>
                  <button 
                    class="btn ${sp.claimed ? 'btn-secondary' : 'btn-emerald'} btn-claim-perk" 
                    data-sp-id="${sp.id}"
                    style="width: 100%; padding: 8px 14px; font-size: 0.82rem;"
                    ${sp.claimed ? 'disabled' : ''}
                  >
                    ${sp.claimed ? '✓ Claimed' : `Claim Deal (+${sp.bonusCredits} ₢)`}
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 44px 20px; margin-bottom: 32px; background: var(--bg-card); border: 1px dashed var(--border-glass); border-radius: 16px;">
            <div style="font-size: 2rem; margin-bottom: 8px;">🤝</div>
            <h3 style="font-size: 1.1rem; color: var(--text-pure); margin-bottom: 6px;">No Active Sponsors Yet</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); max-width: 460px; margin: 0 auto;">
              Verified partner offers and developer perks will appear here in compact cards once sponsors join Crditeach.
            </p>
          </div>
        `}

        <!-- Compact Become a Sponsor Section -->
        <div style="background: var(--bg-card); backdrop-filter: blur(16px); border: 1px solid var(--border-glass); border-radius: var(--radius-lg); padding: 26px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; align-items: center;">
          <div>
            <span class="info-pill" style="margin-bottom: 8px; display: inline-block;">Partner With Crditeach</span>
            <h3 style="font-size: 1.25rem; margin-bottom: 8px;">Feature Your Brand Without Disrupting Videos</h3>
            <p style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.55; margin-bottom: 12px;">
              Reach high-intent developers and learners who opt-in to explore your tools, cloud infrastructure, and APIs in a clean, respected environment.
            </p>
            <ul style="font-size: 0.8rem; color: var(--text-secondary); padding-left: 18px; line-height: 1.7; margin: 0;">
              <li>Compact, non-intrusive card showcase</li>
              <li>Direct developer trial activations</li>
              <li>Fund learner credits to support peer education</li>
            </ul>
          </div>

          <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 20px;">
            <h4 style="font-size: 1rem; margin-bottom: 12px; color: var(--text-pure);">Inquire for a Sponsor Showcase</h4>
            <form id="sponsor-inquiry-form">
              <div class="form-group" style="margin-bottom: 10px;">
                <label for="sponsor-company" style="font-size: 0.8rem;">Company / Product Name</label>
                <input type="text" id="sponsor-company" placeholder="e.g. CloudScale AI" required />
              </div>
              <div class="form-group" style="margin-bottom: 12px;">
                <label for="sponsor-email" style="font-size: 0.8rem;">Work Email</label>
                <input type="email" id="sponsor-email" placeholder="partners@company.com" required />
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 9px 14px; font-size: 0.85rem;">
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


  state.subscribe(renderSponsors);
  renderSponsors();
}
