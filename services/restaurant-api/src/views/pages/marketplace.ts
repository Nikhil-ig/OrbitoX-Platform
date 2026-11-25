/**
 * 🪐 RestaurantOS 3.2 — Elite Multi-Template Marketplace
 * ─────────────────────────────────────────────────────────────────────────────
 * Discovery, filtering, multi-device responsive previews, and safe 1-click
 * installation of authentic restaurant design systems.
 * Zero emojis: Lucide vector iconography throughout.
 * Full-width visual discovery shell — no competing administrative sidebar.
 */

import { MarketplaceTemplate, MenuItem, TenantBrandConfig, BranchRecord } from '../../shared';
import { icon } from '../icons';
import { BASE_STYLE_SHEET } from '../styles';

function renderTemplateMiniPreview(tmpl: MarketplaceTemplate): string {
  if (tmpl.id === 'tmpl_haute_gastronomy' || tmpl.id === 'tmpl_atelier_etoile_4_1' || tmpl.id === 'tmpl_atelier_etoile_noir') {
    return `
    <div style="background: #080A0D; border: 1px solid rgba(197,160,89,0.35); border-radius: 10px; padding: 16px; color: #FFF; font-family: var(--font-editorial, serif); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: inset 0 0 30px rgba(0,0,0,0.6);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.18em; color: #C5A059;">Chronological Tasting Progression</span>
          <span style="font-size: 8px; color: #D99A45; font-family: var(--font-mono);">Act I / IV</span>
        </div>
        <div style="font-size: 15px; font-weight: 700; color: #FFF; margin-bottom: 6px; letter-spacing: -0.01em;">Atelier Étoile Noir · Hearth & Crudo</div>
        <div style="background: rgba(18,22,30,0.9); border-left: 2px solid #C5A059; padding: 6px 10px; font-size: 9px; font-style: italic; color: #E5E7EB; margin-bottom: 10px; border-radius: 0 4px 4px 0;">
          "50/50 Asymmetric Canvas with Sommelier Cellar Folio"
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="background: #11151C; border: 1px solid rgba(197,160,89,0.25); border-radius: 7px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #FFF;">Course I · Paneer Tikka Charcoal</div>
            <div style="font-size: 9px; color: #C5A059; margin-top: 2px;">Pairing: 2021 Blanc de Blancs Brut Nature</div>
          </div>
          <span style="font-size: 12px; font-weight: 800; color: #C5A059; font-family: var(--font-mono);">₹350</span>
        </div>
        <div style="font-size: 8px; color: #8C857B; display: flex; justify-content: space-between; padding: 0 4px;">
          <span>Sommelier Cellar Notes</span>
          <span style="color: #C5A059;">Kitchen Firing: Immediate</span>
        </div>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_nordic_minimal' || tmpl.id === 'tmpl_fjord_form_4_1' || tmpl.id === 'tmpl_fjord_form_nordic') {
    return `
    <div style="background: #F7F5F0; border: 1px solid #E2DDD5; border-radius: 10px; padding: 16px; color: #1C1E21; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <div>
        <div style="display: flex; justify-content: space-between; font-size: 8px; font-family: var(--font-mono); color: #737D8C; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.08em;">
          <span>Arctic Harvest Circle · 68°N</span>
          <span>Table Seated Journal</span>
        </div>
        <div style="font-size: 15px; font-weight: 800; color: #1C1E21; margin-bottom: 6px; letter-spacing: -0.02em;">Fjord & Form Botanical Journal</div>
        <div style="font-size: 10px; color: #5C6470; line-height: 1.4; margin-bottom: 10px;">Editorial harvest chapters, provenance badges, and clean foraged plate presentations.</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="background: #FFFFFF; border: 1px solid #E5E1D8; border-radius: 7px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: #1C1E21; display: flex; align-items: center; gap: 6px;">
              <span>Amritsari Cold Water Fish Tikka</span>
              <span style="font-size: 7px; background: #E8F0EC; color: #2D5A43; padding: 1px 5px; border-radius: 3px; font-weight: 800;">LOT-081</span>
            </div>
            <div style="font-size: 9px; color: #64748B; margin-top: 2px;">Lofoten cold fjords · Pickled sea buckthorn</div>
          </div>
          <span style="font-size: 12px; font-weight: 800; color: #1C1E21; font-family: var(--font-mono);">₹480</span>
        </div>
        <div style="font-size: 8px; color: #737D8C; display: flex; justify-content: space-between; padding: 0 4px; font-family: var(--font-mono);">
          <span>Terroir: Arctic Marine</span>
          <span style="color: #2D5A43; font-weight: 700;">+ Select Course</span>
        </div>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_artisan_coffee' || tmpl.id === 'tmpl_roastery_1984_4_1' || tmpl.id === 'tmpl_roastery_1984_cafe') {
    return `
    <div style="background: #FDFBF7; border: 1px solid rgba(140,78,45,0.25); border-radius: 10px; padding: 16px; color: #241D17; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #C86B3C;">Micro-Lot Roastery Bar</span>
          <span style="font-size: 8px; background: rgba(200,107,60,0.15); color: #C86B3C; padding: 2px 6px; border-radius: 999px; font-weight: 700;">BATCH #84</span>
        </div>
        <div style="font-size: 15px; font-weight: 900; color: #241D17; margin-bottom: 6px;">Roastery 1984 Vitrine</div>
        <div style="display: flex; gap: 5px; margin-bottom: 10px;">
          <span style="font-size: 8px; background: #FFF; border: 1px solid rgba(140,78,45,0.2); padding: 2px 6px; border-radius: 4px; color: #241D17;">8oz Standard</span>
          <span style="font-size: 8px; background: #FFF; border: 1px solid rgba(140,78,45,0.2); padding: 2px 6px; border-radius: 4px; color: #241D17;">Oat Milk</span>
          <span style="font-size: 8px; background: rgba(200,107,60,0.15); padding: 2px 6px; border-radius: 4px; color: #C86B3C; font-weight: 700;">Fresh Vitrine</span>
        </div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid rgba(140,78,45,0.18); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #241D17;">Single-Origin Flat White</div>
          <div style="font-size: 9px; color: #C86B3C; margin-top: 2px;">Ratnagiri Estate · Toasted Hazelnut</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 11px; font-weight: 800; color: #241D17; font-family: var(--font-mono);">₹180</span>
          <div style="display: flex; align-items: center; gap: 3px; background: #241D17; color: #FFF; border-radius: 999px; padding: 2px 6px; font-size: 9px; font-weight: 800;">
            <span>-</span><span>1</span><span>+</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_neon_street' || tmpl.id === 'tmpl_neon_yokocho_4_1' || tmpl.id === 'tmpl_neon_yokocho_street') {
    return `
    <div style="background: #090B10; border: 1px solid rgba(255,87,34,0.35); border-radius: 10px; padding: 16px; color: #FFF; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 20px rgba(0,0,0,0.6);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="background: #FF5722; color: #FFF; padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: 900; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 3px;">${icon('flame', { size: 10, strokeWidth: 2.5 })} STREET HEAT</span>
          <span style="color: #FFC107; font-size: 8px; font-weight: 800; font-family: var(--font-mono);">OPEN TIL 02:00 AM</span>
        </div>
        <div style="font-size: 15px; font-weight: 900; color: #FFF; text-transform: uppercase; margin-bottom: 6px;">Neon Yokocho // 東京夜市</div>
        <div style="font-size: 9px; color: #D1D5DB; margin-bottom: 10px;">Urban food market · Charcoal binchotan skewers & wok-fired noodles</div>
      </div>
      <div style="background: #121620; border: 1px solid rgba(255,87,34,0.3); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #FFF;">Tare Charcoal Chicken Skewers</div>
          <div style="font-size: 8px; color: #FF5722; font-weight: 800; margin-top: 2px;">FIRE 3X SPICE · ROBATA</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-family: var(--font-mono); font-weight: 900; font-size: 11px; color: #FF5722;">₹320</span>
          <span style="background: #FF5722; color: #FFF; font-size: 8px; font-weight: 900; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">+ ADD</span>
        </div>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_trattoria_bella' || tmpl.id === 'tmpl_osteria_rustica_4_1' || tmpl.id === 'tmpl_osteria_rustica_tratt') {
    return `
    <div style="background: #FAF7F2; border: 1px solid rgba(140,56,32,0.25); border-radius: 10px; padding: 16px; color: #241D17; font-family: var(--font-editorial, serif); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8px; font-weight: 700; color: #3D4A39; text-transform: uppercase; letter-spacing: 0.1em;">Forno a Legna dal 1974</span>
          <span style="font-size: 8px; color: #8C3820; font-weight: 700;">Tavola Grande</span>
        </div>
        <div style="font-size: 15px; font-weight: 800; color: #241D17; margin-bottom: 6px;">Osteria Rustica Convivial</div>
        <div style="font-size: 9px; color: #7C6F62; line-height: 1.4; margin-bottom: 10px;">Antipasti to dolci course pacing, DOP seals, and convivial family feasting.</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid rgba(140,56,32,0.18); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #241D17;">Pappardelle al Cinghiale</div>
          <div style="font-size: 8px; color: #8C3820; margin-top: 2px;">DOP Certified · Slow Braised Ragù</div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 12px; font-weight: 800; color: #8C3820; font-family: var(--font-mono);">₹380</span>
          <span style="background: #8C3820; color: #FFF; font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">+ Ordina</span>
        </div>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_tokyo_izakaya' || tmpl.id === 'tmpl_shokunin_ramen_4_1' || tmpl.id === 'tmpl_shokunin_ramen_tokyo') {
    return `
    <div style="background: #181512; border: 1px solid rgba(211,56,28,0.35); border-radius: 10px; padding: 16px; color: #F7F4EB; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 9px; font-weight: 900; color: #D3381C; letter-spacing: 0.14em;">職人魂 · SHOKUNIN</span>
          <span style="font-size: 8px; color: #9E9285; font-family: var(--font-mono);">18H DASHI</span>
        </div>
        <div style="font-size: 15px; font-weight: 900; color: #FFF; margin-bottom: 6px;">Shokunin Ramen & Robata</div>
        <div style="font-size: 9px; color: #9E9285; line-height: 1.4; margin-bottom: 10px;">Interactive 4-step ramen order slip, noodle firmness, and cedar robata board.</div>
      </div>
      <div style="background: #241E1A; border: 1px solid rgba(211,56,28,0.25); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #F7F4EB;">Hakata Tonkotsu Craft Slip</div>
          <div style="font-size: 8px; color: #D3381C; margin-top: 2px;">Kotteri Rich · Katame Firm · Garlic</div>
        </div>
        <span style="background: #D3381C; color: #FFF; font-size: 9px; font-weight: 900; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">CRAFT SLIP</span>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_crave_atlas') {
    return `
    <div style="background: #F8F9FA; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; color: #1C1C27; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; color: #E23744; display: inline-flex; align-items: center; gap: 3px;">${icon('flame', { size: 10 })} DISCOVERY MARKETPLACE</span>
          <span style="font-size: 8px; background: rgba(36, 150, 63, 0.15); color: #24963F; padding: 2px 6px; border-radius: 4px; font-weight: 800;">4.8 ★</span>
        </div>
        <div style="font-size: 15px; font-weight: 900; color: #1C1C27; margin-bottom: 4px;">CraveAtlas Discovery</div>
        <div style="font-size: 9px; color: #6B7280; margin-bottom: 8px;">Multi-restaurant portal, location selector, curated cuisines, and single-cart guard.</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #1C1C27;">Heritage Charcoal & Dum</div>
          <div style="font-size: 8px; color: #E23744; font-weight: 700; margin-top: 2px;">25-35 MINS · ₹800 FOR TWO</div>
        </div>
        <span style="background: #E23744; color: #FFF; font-size: 8px; font-weight: 800; padding: 3px 8px; border-radius: 4px;">EXPLORE</span>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_swift_bite') {
    return `
    <div style="background: #F7F7F8; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; color: #171A29; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8px; font-weight: 900; color: #FC8019; text-transform: uppercase; display: inline-flex; align-items: center; gap: 3px;">${icon('zap', { size: 10 })} SPEED ORDERING</span>
          <span style="font-size: 8px; background: rgba(72,196,121,0.15); color: #15803D; padding: 2px 6px; border-radius: 4px; font-weight: 800;">20 MINS</span>
        </div>
        <div style="font-size: 15px; font-weight: 900; color: #171A29; margin-bottom: 4px;">SwiftBite Express</div>
        <div style="font-size: 9px; color: #686B78; margin-bottom: 8px;">Speed-first cravings scroller, 1-tap fast add, stepper buttons, and idempotent checkout.</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #171A29;">Murgh Makhani Express</div>
          <div style="font-size: 8px; color: #48C479; font-weight: 800; margin-top: 2px;">READY IN 15 MINS</div>
        </div>
        <div style="background: #171A29; color: #FFF; border-radius: 4px; padding: 2px 8px; font-size: 9px; font-weight: 800;">- 1 +</div>
      </div>
    </div>`;
  }

  if (tmpl.id === 'tmpl_pantry_rush') {
    return `
    <div style="background: #F8FAF8; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; color: #0F172A; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8px; font-weight: 900; color: #15803D; text-transform: uppercase; display: inline-flex; align-items: center; gap: 3px;">${icon('shopping-bag', { size: 10 })} QUICK COMMERCE</span>
          <span style="font-size: 8px; background: rgba(34,197,94,0.15); color: #15803D; padding: 2px 6px; border-radius: 4px; font-weight: 800;">15 MINS</span>
        </div>
        <div style="font-size: 15px; font-weight: 900; color: #0F172A; margin-bottom: 4px;">PantryRush Grocery</div>
        <div style="font-size: 9px; color: #64748B; margin-bottom: 8px;">SKU pack sizes, real inventory counters, substitution rules, and dark-store fulfillment.</div>
      </div>
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #0F172A;">Amul Taaza 1L Tetra</div>
          <div style="font-size: 8px; color: #15803D; font-weight: 800; margin-top: 2px;">18 IN STOCK · ₹72.00</div>
        </div>
        <span style="background: #22C55E; color: #FFF; font-size: 8px; font-weight: 900; padding: 3px 8px; border-radius: 4px;">+ ADD</span>
      </div>
    </div>`;
  }

  return `
    <div style="background: linear-gradient(135deg, #1E1410, #12161E); border: 1px solid rgba(200,107,60,0.45); border-radius: 10px; padding: 16px; color: #FFFFFF; font-family: var(--font-sans); height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-shadow: inset 0 0 24px rgba(0,0,0,0.45);">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.14em; color: #FB923C;">${tmpl.category || 'Signature Dining'}</span>
          <span style="font-size: 8px; color: #D99A45; font-family: monospace;">LIVE SYNCED</span>
        </div>
        <div style="font-size: 15px; font-weight: 800; color: #FFF; margin-bottom: 6px;">${tmpl.name}</div>
        <div style="font-size: 10px; color: #CBD5E1; line-height: 1.4; margin-bottom: 10px;">${tmpl.description}</div>
      </div>
      <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(251,146,60,0.28); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 11px; font-weight: 700; color: #FFF;">Chef’s Signature Tasting</span>
        <span style="font-size: 11px; font-weight: 800; color: #FB923C; font-family: monospace;">₹380</span>
      </div>
    </div>`;
}

function getTemplateHighlights(tmpl: MarketplaceTemplate): string[] {
  if (tmpl.id === 'tmpl_crave_atlas') {
    return ['Multi-Restaurant Discovery Portal', 'Single-Restaurant Cart Guard', 'Cross-Entity Search & Cuisines'];
  }
  if (tmpl.id === 'tmpl_swift_bite') {
    return ['Speed-First Craving Scroller', '1-Tap Fast Add & Stepper Buttons', 'Idempotent Checkout Protection'];
  }
  if (tmpl.id === 'tmpl_pantry_rush') {
    return ['Hyper-Local Grocery SKU Catalog', 'Real Inventory & Stock Limits', 'Explicit Substitution Preferences'];
  }
  if (tmpl.id === 'tmpl_haute_gastronomy' || tmpl.id === 'tmpl_atelier_etoile_4_1') {
    return ['50/50 Asymmetric Viewport Split', 'Sommelier Cellar Folio Pairings', 'Chronological Movement Chapters'];
  }
  if (tmpl.id === 'tmpl_nordic_minimal' || tmpl.id === 'tmpl_fjord_form_4_1') {
    return ['Botanical Specimen Hairline Rows', 'In-Row Spec Drawer Unrolling', 'Estate Lot Badging (Zero Cards)'];
  }
  if (tmpl.id === 'tmpl_artisan_coffee' || tmpl.id === 'tmpl_roastery_1984_4_1') {
    return ['3-Column Tactile Vitrine Grid', 'Card-Face Steppers [- 1 +]', 'Roastery Bake Schedule Badging'];
  }
  if (tmpl.id === 'tmpl_neon_street' || tmpl.id === 'tmpl_neon_yokocho_4_1') {
    return ['Parallel Dual-Stall Market Lanes', '128 BPM Street Heat Marquee', 'Rapid + BUMP Action Triggers'];
  }
  if (tmpl.id === 'tmpl_trattoria_bella' || tmpl.id === 'tmpl_osteria_rustica_4_1') {
    return ['Centered Classic Editorial Column', 'Tavola Grande Family Feast Builder', 'DOP Certified Heritage Badges'];
  }
  if (tmpl.id === 'tmpl_tokyo_izakaya' || tmpl.id === 'tmpl_shokunin_ramen_4_1') {
    return ['Vertical Timber Plank Nav Rail', '4-Step Broth & Noodle Customizer', '18-Hour Marrow Dashi Timer Badge'];
  }
  return ['Authoritative Menu Binding', 'Real-Time KDS Routing', 'Responsive Table Ordering'];
}

export function renderMarketplaceWorkspace(
  templates: MarketplaceTemplate[],
  activeBrand: TenantBrandConfig,
  menuItems: MenuItem[],
  branchId = 'branch_ldh',
  branches?: BranchRecord[],
  previewLocator = ''
): string {
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const activeTemplateId = activeBrand?.activeTemplateId || safeTemplates[0]?.id;
  const activeTemplate: MarketplaceTemplate =
    safeTemplates.find((t) => t.id === activeTemplateId) ||
    safeTemplates[0] ||
    ({
      id: 'tmpl_haute_gastronomy',
      slug: 'atelier-etoile',
      name: 'Atelier Étoile Noir',
      description: 'Asymmetric dark & gold dining storefront synced to menu and KDS.',
      category: 'Haute Gastronomy',
      previewUrl: '/dine/table-1',
      tags: ['Fine Dining', 'Tasting', 'Editorial'],
    } as unknown as MarketplaceTemplate);

  const dinerPreviewUrl = previewLocator ? `/dine/${encodeURIComponent(previewLocator)}` : '/operations/floor';

  const categories = [
    'All Concepts',
    'Restaurant Storefronts',
    'Food Discovery Marketplaces',
    'Speed-First Food Ordering',
    'Grocery & Quick Commerce',
    'Haute Gastronomy',
    'Modern Minimal',
    'Cafe & Artisan Coffee',
    'Neon Street Food',
    'Trattoria & Italian',
    'Asian & Ramen',
  ];

  return `
  <style>
    /* Unified Owner Console Marketplace Layout */
    .mkt-page-wrapper {
      color: #0F172A;
      display: flex;
      flex-direction: column;
    }

    .mkt-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 32px 72px 32px;
      width: 100%;
      box-sizing: border-box;
    }

    /* Template Cards Grid */
    .mkt-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    @media (max-width: 1024px) {
      .mkt-gallery-grid {
        grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
        gap: 20px;
      }
    }

    @media (max-width: 768px) {
      .mkt-container {
        padding: 16px 16px 88px 16px;
      }
      .mkt-gallery-grid {
        grid-template-columns: 1fr;
      }
      .mkt-featured-grid {
        grid-template-columns: 1fr !important;
      }
    }
  </style>

  <div class="mkt-page-wrapper">
    <main class="mkt-container">
      <!-- Top Action Bar inside Owner Shell -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 16px; margin-bottom: 28px;">
        <div>
          <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #C86B3C; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
            <span style="display: inline-flex; align-items: center;">${icon('marketplace', { size: 14 })}</span>
            <span>Design Systems Marketplace · ${activeBrand?.restaurantName || 'RestaurantOS'}</span>
          </div>
          <h1 style="font-size: 32px; font-weight: 800; color: #0F172A; letter-spacing: -0.025em; line-height: 1.15; margin: 0;">
            Architectural Storefronts &amp; Apps
          </h1>
          <p style="font-size: 14px; color: #64748B; margin: 6px 0 0 0; max-width: 720px; line-height: 1.55;">
            Compare art-directed dining storefronts and multi-venue commerce apps. Every theme binds live to your menu catalog and kitchen routing.
          </p>
        </div>

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <a href="/studio?branch=${encodeURIComponent(branchId)}" class="btn btn-secondary" style="border-radius: 9999px; padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none;">
            ${icon('edit', { size: 14 })} <span>Customize in Studio</span>
          </a>
          <a href="${dinerPreviewUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="border-radius: 9999px; padding: 9px 18px; font-size: 13px; font-weight: 600; text-decoration: none;">
            ${icon('eye', { size: 14 })} <span>Open Diner PWA ↗</span>
          </a>
        </div>
      </div>

      <!-- Featured Active Template Spotlight Banner -->
      <div style="background: linear-gradient(135deg, #0F172A, #1E293B); border: 1px solid rgba(15, 23, 42, 0.12); border-radius: 24px; padding: 28px 32px; margin-bottom: 28px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.14); color: #FFFFFF;">
        <div class="mkt-featured-grid" style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 32px; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
              <span class="badge badge-copper" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;">
                Flagship Storefront
              </span>
              <span class="badge badge-sage">Active on Table PWA</span>
            </div>
            <h2 style="font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.02em; margin: 0 0 8px 0;">
              ${activeTemplate.name}
            </h2>
            <p style="font-size: 13px; color: #CBD5E1; line-height: 1.55; margin: 0 0 18px 0;">
              ${activeTemplate.description}
            </p>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px;">
              ${getTemplateHighlights(activeTemplate)
                .map(
                  (h) => `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #E2E8F0;">
                  <span style="color: #FB923C; display: inline-flex;">${icon('check', { size: 14, strokeWidth: 3 })}</span>
                  <span>${h}</span>
                </div>`
                )
                .join('')}
            </div>

            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <button type="button" onclick="openLivePreviewModal('${activeTemplate.id}')" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 9999px;">
                ${icon('eye', { size: 15 })} <span>Live Multi-Device Preview</span>
              </button>
              <a href="/studio?branch=${encodeURIComponent(branchId)}" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 9999px; text-decoration: none;">
                ${icon('edit', { size: 15 })} <span>Customize in Studio</span>
              </a>
            </div>
          </div>

          <!-- Right: Visual Frame Preview -->
          <div style="height: 260px; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.12);">
            ${renderTemplateMiniPreview(activeTemplate)}
          </div>
        </div>
      </div>

      <!-- Filter & Search Discovery Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
        <div style="display: flex; gap: 8px; overflow-x: auto; max-width: 100%; padding-bottom: 4px;" id="category-pills">
          ${categories
            .map(
              (cat, idx) => `
            <button
              type="button"
              onclick="filterCategory('${cat}')"
              class="category-btn ${idx === 0 ? 'active' : ''}"
              data-cat="${cat}"
              style="padding: 7px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ${idx === 0 ? '#0F172A' : '#E2E8F0'}; background: ${idx === 0 ? '#0F172A' : '#FFFFFF'}; color: ${idx === 0 ? '#FFFFFF' : '#475569'}; transition: all 140ms ease; white-space: nowrap;"
            >
              ${cat}
            </button>`
            )
            .join('')}
        </div>

        <div style="position: relative; min-width: 260px; max-width: 100%; flex: 0 1 300px;">
          <input
            type="text"
            id="template-search"
            placeholder="Search templates, styles, cuisines..."
            oninput="searchTemplates(this.value)"
            style="width: 100%; padding: 9px 14px 9px 36px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 9999px; color: #0F172A; font-size: 13px; outline: none; box-sizing: border-box;"
          />
          <span style="position: absolute; left: 13px; top: 10px; color: #64748B; display: flex; align-items: center;">
            ${icon('search', { size: 15 })}
          </span>
        </div>
      </div>

      <!-- Template Cards Gallery -->
      <div class="mkt-gallery-grid" id="templates-grid">
        ${safeTemplates
          .map((tmpl) => {
            const isActive = tmpl.id === activeTemplateId;
            const highlights = getTemplateHighlights(tmpl);
            return `
          <div
            class="ui-card template-card"
            data-id="${tmpl.id}"
            data-category="${tmpl.category}"
            data-experience="${tmpl.experienceType || 'restaurant_storefront'}"
            data-name="${tmpl.name.toLowerCase()}"
            data-desc="${tmpl.description.toLowerCase()}"
            style="background: #FFFFFF; border: ${isActive ? '2px solid #0F172A' : '1px solid #E2E8F0'}; border-radius: 22px; overflow: hidden; display: flex; flex-direction: column; position: relative; box-shadow: 0 4px 16px rgba(15,23,42,0.04);"
          >
            ${
              isActive
                ? `<div style="position: absolute; top: 14px; left: 14px; z-index: 10; background: #0F172A; color: #FFF; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 999px; box-shadow: 0 2px 10px rgba(0,0,0,0.35); display:inline-flex; align-items:center; gap:5px;">${icon(
                    'check',
                    { size: 12, strokeWidth: 3 }
                  )} Active Storefront</div>`
                : ''
            }

            <div style="position: relative; height: 240px; overflow: hidden; background: #0B0E14; padding: 12px; border-bottom: 1px solid #E2E8F0; display: flex; flex-direction: column; justify-content: space-between;">
              ${renderTemplateMiniPreview(tmpl)}
              <div style="position: absolute; top: 14px; right: 14px; display: flex; gap: 6px; z-index: 5;">
                <span class="badge ${
                  tmpl.tierRequired === 'enterprise'
                    ? 'badge-amber'
                    : tmpl.tierRequired === 'pro'
                      ? 'badge-copper'
                      : 'badge-sage'
                }" style="font-size: 10px; font-weight: 700;">
                  ${tmpl.priceLabel}
                </span>
              </div>
            </div>

            <div style="padding: 20px 22px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                  <span class="badge" style="font-size: 10px; font-weight: 700; background: #F1F5F9; color: #334155;">
                    ${tmpl.targetBusinessModel || 'Single Restaurant Table QR'}
                  </span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 6px;">
                  <h3 style="font-size: 17px; font-weight: 800; color: #0F172A; margin: 0;">
                    ${tmpl.name}
                  </h3>
                  <span style="font-size: 11px; font-weight: 700; color: #C86B3C; text-transform: uppercase;">
                    ${tmpl.category}
                  </span>
                </div>

                <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 0 0 14px 0;">
                  ${tmpl.description}
                </p>

                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; background: #F8FAFC; border-radius: 10px; padding: 10px 12px; border: 1px solid #E2E8F0;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B;">
                    Highlights:
                  </div>
                  ${highlights
                    .map(
                      (h) => `
                    <div style="font-size: 11px; color: #334155; display: flex; align-items: center; gap: 6px;">
                      <span style="color: #2563EB;">•</span>
                      <span>${h}</span>
                    </div>`
                    )
                    .join('')}
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 14px;">
                <button
                  type="button"
                  onclick="openLivePreviewModal('${tmpl.id}')"
                  class="btn btn-secondary btn-sm"
                  style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 9999px;"
                >
                  ${icon('eye', { size: 14 })} <span>Preview</span>
                </button>

                ${
                  tmpl.id === 'tmpl_crave_atlas'
                    ? `<a href="/apps/crave-atlas" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #E23744; border-color: #E23744; border-radius: 9999px; text-decoration: none;">
                        ${icon('external-link', { size: 14 })} <span>Launch App</span>
                      </a>`
                    : tmpl.id === 'tmpl_swift_bite'
                      ? `<a href="/apps/swift-bite" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #FC8019; border-color: #FC8019; border-radius: 9999px; text-decoration: none;">
                          ${icon('external-link', { size: 14 })} <span>Launch App</span>
                        </a>`
                      : tmpl.id === 'tmpl_pantry_rush'
                        ? `<a href="/apps/pantry-rush" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #22C55E; border-color: #22C55E; color: #FFF; border-radius: 9999px; text-decoration: none;">
                            ${icon('external-link', { size: 14 })} <span>Launch App</span>
                          </a>`
                        : isActive
                          ? `<a href="/studio?branch=${encodeURIComponent(branchId)}" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 9999px; text-decoration: none;">
                              ${icon('edit', { size: 14 })} <span>Customize</span>
                            </a>`
                          : `<button
                              type="button"
                              onclick="installTemplate('${tmpl.id}')"
                              id="btn-install-${tmpl.id}"
                              class="btn btn-primary btn-sm"
                              style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 9999px;"
                            >
                              ${icon('check', { size: 14 })} <span>Install</span>
                            </button>`
                }
              </div>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </main>
  </div>

  <!-- Multi-Device Responsive Live Preview Modal -->
  <div id="preview-modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.86); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 99999; flex-direction: column;">
    <div style="min-height: 60px; background: #0E1216; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; padding: 10px 24px; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span id="preview-modal-title" style="font-size: 16px; font-weight: 800; color: #FFF;">Template Preview</span>
        <span id="preview-modal-badge" class="badge badge-copper">Storefront</span>
      </div>

      <div style="display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 3px;">
        <button type="button" onclick="setPreviewViewport('mobile')" id="vp-mobile" class="vp-btn" style="padding: 6px 12px; border-radius: 5px; border: none; background: transparent; color: #CBD5E1; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('smartphone', { size: 14 })} <span>390px</span>
        </button>
        <button type="button" onclick="setPreviewViewport('tablet')" id="vp-tablet" class="vp-btn" style="padding: 6px 12px; border-radius: 5px; border: none; background: transparent; color: #CBD5E1; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('tablet', { size: 14 })} <span>768px</span>
        </button>
        <button type="button" onclick="setPreviewViewport('desktop')" id="vp-desktop" class="vp-btn active" style="padding: 6px 12px; border-radius: 5px; border: none; background: #C86B3C; color: #FFF; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('monitor', { size: 14 })} <span>1200px</span>
        </button>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <button type="button" id="modal-install-btn" onclick="installTemplateFromModal()" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; border-radius: 9999px;">
          ${icon('check', { size: 14 })} <span>Install &amp; Customize</span>
        </button>
        <button type="button" id="close-preview-btn" onclick="closeLivePreviewModal()" class="btn btn-secondary btn-sm" style="padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px; border-radius: 9999px;">
          ${icon('x', { size: 14 })} <span>Close</span>
        </button>
      </div>
    </div>

    <div style="flex: 1; overflow: auto; display: flex; align-items: flex-start; justify-content: center; padding: 24px; background: #050709;">
      <div id="preview-frame-container" style="width: 100%; max-width: 1200px; transition: max-width 220ms ease; background: #080A0D; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 50px rgba(0,0,0,0.85); border: 1px solid rgba(255,255,255,0.12);">
        <div id="preview-canvas-content" style="min-height: 640px;"></div>
      </div>
    </div>
  </div>

  <script>
    const TEMPLATES_DATA = ${JSON.stringify(safeTemplates)};
    const PREVIEW_LOCATOR = ${JSON.stringify(previewLocator)};
    const BRANCH_ID = ${JSON.stringify(branchId)};
    let selectedTemplateForModal = null;

    function filterCategory(category) {
      document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === category) {
          btn.style.background = '#0F172A';
          btn.style.borderColor = '#0F172A';
          btn.style.color = '#FFFFFF';
        } else {
          btn.style.background = '#FFFFFF';
          btn.style.borderColor = '#E2E8F0';
          btn.style.color = '#475569';
        }
      });

      const cards = document.querySelectorAll('.template-card');
      cards.forEach(card => {
        const cat = card.getAttribute('data-category') || '';
        const exp = card.getAttribute('data-experience') || 'restaurant_storefront';
        let match = false;

        if (category === 'All Concepts') {
          match = true;
        } else if (category === 'Restaurant Storefronts') {
          match = (exp === 'restaurant_storefront');
        } else if (category === 'Food Discovery Marketplaces') {
          match = (exp === 'food_marketplace' || cat.toLowerCase().includes('discovery'));
        } else if (category === 'Speed-First Food Ordering') {
          match = (exp === 'food_ordering' || cat.toLowerCase().includes('ordering'));
        } else if (category === 'Grocery & Quick Commerce') {
          match = (exp === 'quick_commerce' || cat.toLowerCase().includes('grocery') || cat.toLowerCase().includes('quick'));
        } else {
          match = (cat.toLowerCase() === category.toLowerCase());
        }

        card.style.display = match ? 'flex' : 'none';
      });
    }

    function searchTemplates(query) {
      const q = String(query || '').toLowerCase().trim();
      const cards = document.querySelectorAll('.template-card');
      cards.forEach(card => {
        const name = card.getAttribute('data-name') || '';
        const desc = card.getAttribute('data-desc') || '';
        const cat = (card.getAttribute('data-category') || '').toLowerCase();
        card.style.display = (!q || name.includes(q) || desc.includes(q) || cat.includes(q)) ? 'flex' : 'none';
      });
    }

    async function installTemplate(templateId) {
      const btn = document.getElementById('btn-install-' + templateId);
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Installing...';
      }
      try {
        await window.apiFetch('/api/restaurant/templates/' + encodeURIComponent(templateId) + '/install', {
          method: 'POST',
          body: { installedBy: 'Restaurant Manager', templateId }
        });
        if (window.showToast) window.showToast('Template installed! Opening Brand Studio...', 'success');
        setTimeout(() => {
          window.location.href = '/studio?branch=' + encodeURIComponent(BRANCH_ID);
        }, 450);
      } catch (err) {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Install';
        }
      }
    }

    function installTemplateFromModal() {
      if (selectedTemplateForModal) {
        installTemplate(selectedTemplateForModal.id);
      }
    }

    function setPreviewViewport(device) {
      const container = document.getElementById('preview-frame-container');
      const btns = {
        mobile: document.getElementById('vp-mobile'),
        tablet: document.getElementById('vp-tablet'),
        desktop: document.getElementById('vp-desktop'),
      };
      Object.values(btns).forEach(b => {
        if (b) { b.style.background = 'transparent'; b.style.color = '#CBD5E1'; }
      });
      if (btns[device]) {
        btns[device].style.background = '#C86B3C';
        btns[device].style.color = '#FFF';
      }
      if (container) {
        container.style.maxWidth = device === 'mobile' ? '390px' : device === 'tablet' ? '768px' : '1200px';
      }
    }

    function openLivePreviewModal(templateId) {
      const tmpl = TEMPLATES_DATA.find(t => t.id === templateId) || TEMPLATES_DATA[0];
      if (!tmpl) return;
      selectedTemplateForModal = tmpl;

      document.getElementById('preview-modal-title').innerText = tmpl.name;
      document.getElementById('preview-modal-badge').innerText = tmpl.category;
      const modal = document.getElementById('preview-modal');
      modal.style.display = 'flex';
      modal.classList.add('open');

      const modalInstallBtn = document.getElementById('modal-install-btn');
      if (modalInstallBtn) {
        if (tmpl.id === 'tmpl_crave_atlas') {
          modalInstallBtn.innerHTML = '<span>Launch CraveAtlas ↗</span>';
          modalInstallBtn.onclick = () => window.open('/apps/crave-atlas', '_blank');
        } else if (tmpl.id === 'tmpl_swift_bite') {
          modalInstallBtn.innerHTML = '<span>Launch SwiftBite ↗</span>';
          modalInstallBtn.onclick = () => window.open('/apps/swift-bite', '_blank');
        } else if (tmpl.id === 'tmpl_pantry_rush') {
          modalInstallBtn.innerHTML = '<span>Launch PantryRush ↗</span>';
          modalInstallBtn.onclick = () => window.open('/apps/pantry-rush', '_blank');
        } else {
          modalInstallBtn.innerHTML = '<span>Install &amp; Customize</span>';
          modalInstallBtn.onclick = installTemplateFromModal;
        }
      }

      const locSegment = PREVIEW_LOCATOR ? ('/dine/' + encodeURIComponent(PREVIEW_LOCATOR)) : '/operations/floor';
      let iframeSrc = locSegment + '?templateId=' + encodeURIComponent(tmpl.id) + '&preview=1';
      if (tmpl.id === 'tmpl_crave_atlas') iframeSrc = '/apps/crave-atlas?preview=1';
      else if (tmpl.id === 'tmpl_swift_bite') iframeSrc = '/apps/swift-bite?preview=1';
      else if (tmpl.id === 'tmpl_pantry_rush') iframeSrc = '/apps/pantry-rush?preview=1';

      const content = document.getElementById('preview-canvas-content');
      content.innerHTML = '<iframe id="preview-live-iframe" src="' + iframeSrc + '" style="width: 100%; height: 760px; border: none; display: block; background: ' + (tmpl.defaultTokens && tmpl.defaultTokens.backgroundColor ? tmpl.defaultTokens.backgroundColor : '#080A0D') + ';" loading="lazy"></iframe>';
    }

    function closeLivePreviewModal() {
      const modal = document.getElementById('preview-modal');
      modal.style.display = 'none';
      modal.classList.remove('open');
      selectedTemplateForModal = null;
    }
  </script>
  `;
}
