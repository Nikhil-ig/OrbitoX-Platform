/**
 * 🪐 RestaurantOS 3.2 — Elite Multi-Template Marketplace
 * ─────────────────────────────────────────────────────────────────────────────
 * Discovery, filtering, multi-device responsive previews, and safe 1-click
 * installation of authentic restaurant design systems.
 * Zero emojis: Lucide vector iconography throughout.
 * Full-width visual discovery shell — no competing administrative sidebar.
 */

import { MarketplaceTemplate, MenuItem, TenantBrandConfig, BranchRecord } from '../../domain';
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

  return '';
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
  branches?: BranchRecord[]
): string {
  const activeTemplateId = activeBrand.activeTemplateId || templates[0]?.id;
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Storefront Design Systems · OrbitoX Template Marketplace</title>
  <style>
    ${BASE_STYLE_SHEET}

    /* Marketplace Layout */
    .mkt-page-wrapper {
      min-height: 100vh;
      background: #080A0D;
      color: var(--color-linen);
      display: flex;
      flex-direction: column;
    }

    /* Top Sticky Discovery Bar */
    .mkt-topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 64px;
      background: rgba(14, 18, 22, 0.95);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border-default);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      gap: 20px;
    }

    .mkt-brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }

    .mkt-logo-badge {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: linear-gradient(135deg, #C86B3C, #D99A45);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      box-shadow: 0 2px 10px rgba(200, 107, 60, 0.35);
    }

    .mkt-nav-tabs {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .mkt-nav-tab {
      padding: 8px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      color: var(--color-stone);
      transition: all 140ms ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .mkt-nav-tab:hover {
      color: #FFF;
      background: rgba(255, 255, 255, 0.05);
    }

    .mkt-nav-tab.active {
      color: #FFF;
      background: rgba(200, 107, 60, 0.15);
      border: 1px solid rgba(200, 107, 60, 0.3);
    }

    .mkt-actions-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mkt-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 32px 80px 32px;
      width: 100%;
    }

    /* Template Cards Grid */
    .mkt-gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
      gap: 28px;
    }

    @media (max-width: 1024px) {
      .mkt-gallery-grid {
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
      }
    }

    @media (max-width: 768px) {
      .mkt-topbar {
        padding: 0 16px;
        height: auto;
        padding-top: 12px;
        padding-bottom: 12px;
        flex-direction: column;
        align-items: stretch;
      }
      .mkt-container {
        padding: 20px 16px 60px 16px;
      }
      .mkt-gallery-grid {
        grid-template-columns: 1fr;
      }
      .mkt-featured-grid {
        grid-template-columns: 1fr !important;
      }
    }
  </style>
</head>
<body>
  <div class="mkt-page-wrapper">
    <!-- Top Global Discovery Bar -->
    <header class="mkt-topbar">
      <div style="display: flex; align-items: center; gap: 24px;">
        <a href="/marketplace" class="mkt-brand-group">
          <div class="mkt-logo-badge">
            ${icon('marketplace', { size: 18, color: '#FFFFFF' })}
          </div>
          <div>
            <div style="font-size: 14px; font-weight: 800; color: #FFF; letter-spacing: -0.01em;">OrbitoX Storefronts</div>
            <div style="font-size: 10px; color: var(--color-stone); text-transform: uppercase; letter-spacing: 0.06em;">Design Systems Marketplace</div>
          </div>
        </a>

        <nav class="mkt-nav-tabs">
          <a href="/marketplace" class="mkt-nav-tab active">
            ${icon('overview', { size: 14 })} <span>Discover</span>
          </a>
          <a href="/studio" class="mkt-nav-tab">
            ${icon('studio', { size: 14 })} <span>Brand Studio</span>
          </a>
          <a href="/white-label" class="mkt-nav-tab">
            ${icon('whitelabel', { size: 14 })} <span>White-Label & Domains</span>
          </a>
          <a href="/" class="mkt-nav-tab">
            ${icon('tables', { size: 14 })} <span>Operations Cockpit</span>
          </a>
        </nav>
      </div>

      <div class="mkt-actions-group">
        <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-default); border-radius: 8px; padding: 6px 12px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px rgba(16,185,129,0.5);"></span>
          <span style="font-size: 12px; font-weight: 700; color: #FFF;">${activeBrand.restaurantName}</span>
          <span style="color: var(--border-strong);">·</span>
          <span style="font-size: 11px; font-family: var(--font-mono); color: var(--color-copper);">${activeBrand.subdomain || 'bistro.orbitox.live'}</span>
        </div>

        <a href="/dine/4Kl6zX8c0V" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('eye', { size: 13 })} <span>Open Diner PWA ↗</span>
        </a>
      </div>
    </header>

    <!-- Main Content Container -->
    <main class="mkt-container">
      <!-- Editorial Hero Header -->
      <div style="margin-bottom: 36px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; color: var(--color-copper); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px;">
          <span style="display: inline-flex; align-items: center;">${icon('marketplace', { size: 14 })}</span>
          <span>Curated Architectural Experiences</span>
          <span style="color: var(--border-strong);">|</span>
          <span style="color: var(--color-stone);">Six Distinct Dining Design Systems</span>
        </div>
        <h1 style="font-size: 34px; font-weight: 800; color: #FFF; letter-spacing: -0.03em; line-height: 1.15; max-width: 840px;">
          Architectural Storefronts Crafted for Distinctive Dining
        </h1>
        <p style="font-size: 14px; color: var(--color-stone); margin-top: 8px; max-width: 760px; line-height: 1.6;">
          Select from six independently art-directed design systems. Each template binds securely to your authoritative menu catalog, kitchen KDS station routing, and guest table ordering sessions without requiring custom code.
        </p>
      </div>

      <!-- Featured Template Spotlight Banner -->
      <div style="background: linear-gradient(135deg, rgba(200, 107, 60, 0.14), rgba(18, 22, 28, 0.98)); border: 1px solid rgba(200, 107, 60, 0.35); border-radius: 16px; padding: 28px 32px; margin-bottom: 36px; box-shadow: 0 12px 36px rgba(0,0,0,0.45);">
        <div class="mkt-featured-grid" style="display: grid; grid-template-columns: 1fr 1.1fr; gap: 36px; align-items: center;">
          <!-- Left: Narrative & Pitch -->
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span class="badge badge-copper" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;">
                Flagship Hospitality System
              </span>
              <span class="badge badge-sage">Active on Table PWA</span>
            </div>
            <h2 style="font-size: 26px; font-weight: 800; color: #FFF; letter-spacing: -0.02em; margin-bottom: 8px;">
              ${activeTemplate.name}
            </h2>
            <p style="font-size: 13px; color: #D1D5DB; line-height: 1.55; margin-bottom: 20px;">
              ${activeTemplate.description}
            </p>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
              ${getTemplateHighlights(activeTemplate)
                .map(
                  (h) => `
                <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #E5E7EB;">
                  <span style="color: var(--color-copper); display: inline-flex;">${icon('check', { size: 14, strokeWidth: 3 })}</span>
                  <span>${h}</span>
                </div>`
                )
                .join('')}
            </div>

            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <button onclick="openLivePreviewModal('${activeTemplate.id}')" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;">
                ${icon('eye', { size: 15 })} <span>Live Multi-Device Preview</span>
              </button>
              <a href="/studio" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px;">
                ${icon('edit', { size: 15 })} <span>Customize in Brand Studio</span>
              </a>
            </div>
          </div>

          <!-- Right: Visual Frame Preview -->
          <div style="height: 280px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
            ${renderTemplateMiniPreview(activeTemplate)}
          </div>
        </div>
      </div>

      <!-- Filter & Search Discovery Toolbar -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 28px; flex-wrap: wrap;">
        <!-- Concept Filter Pills -->
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;" id="category-pills">
          ${categories
            .map(
              (cat, idx) => `
            <button
              onclick="filterCategory('${cat}')"
              class="category-btn ${idx === 0 ? 'active' : ''}"
              data-cat="${cat}"
              style="padding: 7px 16px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid ${
                idx === 0 ? 'var(--color-copper)' : 'var(--border-default)'
              }; background: ${idx === 0 ? 'var(--color-copper)' : 'var(--color-charcoal)'}; color: ${
                idx === 0 ? '#FFFFFF' : 'var(--color-stone)'
              }; transition: all 140ms ease; white-space: nowrap;"
            >
              ${cat}
            </button>`
            )
            .join('')}
        </div>

        <!-- Real-Time Search Box -->
        <div style="position: relative; min-width: 280px;">
          <input
            type="text"
            id="template-search"
            placeholder="Search templates, styles, cuisines..."
            oninput="searchTemplates(this.value)"
            style="width: 100%; padding: 9px 14px 9px 36px; background: var(--color-charcoal); border: 1px solid var(--border-default); border-radius: 8px; color: var(--color-linen); font-size: 13px; outline: none; transition: border-color 140ms ease;"
          />
          <span style="position: absolute; left: 12px; top: 10px; color: var(--color-muted); display: flex; align-items: center;">
            ${icon('search', { size: 15 })}
          </span>
        </div>
      </div>

      <!-- Template Cards Gallery -->
      <div class="mkt-gallery-grid" id="templates-grid">
        ${templates
          .map((tmpl) => {
            const isActive = tmpl.id === activeTemplateId;
            const highlights = getTemplateHighlights(tmpl);
            return `
          <div
            class="template-card"
            data-id="${tmpl.id}"
            data-category="${tmpl.category}"
            data-experience="${tmpl.experienceType || 'restaurant_storefront'}"
            data-name="${tmpl.name.toLowerCase()}"
            data-desc="${tmpl.description.toLowerCase()}"
            style="background: var(--color-charcoal); border: 1px solid ${
              isActive ? 'var(--color-copper)' : 'var(--border-default)'
            }; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; transition: transform 180ms ease, border-color 180ms ease; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3);"
          >
            ${
              isActive
                ? `<div style="position: absolute; top: 14px; left: 14px; z-index: 10; background: var(--color-copper); color: #FFF; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 999px; box-shadow: 0 2px 10px rgba(0,0,0,0.6); display:inline-flex; align-items:center; gap:5px;">${icon(
                    'check',
                    { size: 12, strokeWidth: 3 }
                  )} Active Storefront</div>`
                : ''
            }

            <!-- Large Visual Storefront Preview -->
            <div style="position: relative; height: 260px; overflow: hidden; background: #06080A; padding: 12px; border-bottom: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
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

            <!-- Card Body with Clear Visual Hierarchy -->
            <div style="padding: 20px 22px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap;">
                  <span class="badge" style="font-size: 9px; font-weight: 800; background: rgba(255,255,255,0.08); color: #FFF; text-transform: uppercase;">
                    ${tmpl.targetBusinessModel || 'Single Restaurant Table QR'}
                  </span>
                  <span class="badge badge-copper" style="font-size: 9px; font-weight: 700;">
                    ${tmpl.capabilities?.compatibleScope || 'single_restaurant'}
                  </span>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
                  <h3 style="font-size: 18px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.01em;">
                    ${tmpl.name}
                  </h3>
                  <span style="font-size: 11px; font-weight: 700; color: ${tmpl.accentColor}; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${tmpl.category}
                  </span>
                </div>

                <p style="font-size: 13px; color: var(--color-stone); line-height: 1.5; margin-bottom: 16px;">
                  ${tmpl.description}
                </p>

                <!-- Curated Experience Highlights (Human Readable) -->
                <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px 12px; border: 1px solid var(--border-subtle);">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-stone);">
                    Architecture & Flow Highlights:
                  </div>
                  ${highlights
                    .map(
                      (h) => `
                    <div style="font-size: 11px; color: #E5E7EB; display: flex; align-items: center; gap: 6px;">
                      <span style="color: ${tmpl.accentColor}; display: inline-flex;">•</span>
                      <span>${h}</span>
                    </div>`
                    )
                    .join('')}
                </div>

                ${
                  tmpl.id === 'tmpl_pantry_rush'
                    ? '<div style="font-size: 11px; color: #34D399; margin-bottom: 12px; font-weight: 600;">• Prerequisite: Dark Store SKU Catalog & Hyper-Local Dispatch Station</div>'
                    : tmpl.id === 'tmpl_crave_atlas'
                    ? '<div style="font-size: 11px; color: #F87171; margin-bottom: 12px; font-weight: 600;">• Prerequisite: Multi-Merchant Partner Catalog & Delivery Fleet</div>'
                    : tmpl.id === 'tmpl_swift_bite'
                    ? '<div style="font-size: 11px; color: #FBBF24; margin-bottom: 12px; font-weight: 600;">• Prerequisite: Fast-Casual Menu & Express Station Dispatch</div>'
                    : ''
                }
              </div>

              <!-- Card Action Buttons -->
              <div>
                <div style="display: flex; gap: 10px; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
                  <button
                    onclick="openLivePreviewModal('${tmpl.id}')"
                    class="btn btn-secondary btn-sm"
                    style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;"
                  >
                    ${icon('eye', { size: 14 })} <span>Preview</span>
                  </button>

                  ${
                    tmpl.id === 'tmpl_crave_atlas'
                      ? `<a href="/apps/crave-atlas" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #E23744; border-color: #E23744;">
                          ${icon('external-link', { size: 14 })} <span>Launch App ↗</span>
                        </a>`
                      : tmpl.id === 'tmpl_swift_bite'
                      ? `<a href="/apps/swift-bite" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #FC8019; border-color: #FC8019;">
                          ${icon('external-link', { size: 14 })} <span>Launch App ↗</span>
                        </a>`
                      : tmpl.id === 'tmpl_pantry_rush'
                      ? `<a href="/apps/pantry-rush" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #22C55E; border-color: #22C55E; color: #FFF;">
                          ${icon('external-link', { size: 14 })} <span>Launch App ↗</span>
                        </a>`
                      : isActive
                      ? `<a href="/studio" class="btn btn-primary btn-sm" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                          ${icon('edit', { size: 14 })} <span>Edit in Studio</span>
                        </a>`
                      : `<button
                          onclick="installTemplate('${tmpl.id}')"
                          id="btn-install-${tmpl.id}"
                          class="btn btn-primary btn-sm"
                          style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;"
                        >
                          ${icon('check', { size: 14 })} <span>Install Template</span>
                        </button>`
                  }
                </div>
              </div>
            </div>
          </div>`;
          })
          .join('')}
      </div>
    </main>
  </div>

  <!-- Multi-Device Responsive Live Preview Modal -->
  <div id="preview-modal" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.9); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); z-index: 1000; flex-direction: column;">
    <!-- Top Modal Control Bar -->
    <div style="height: 60px; background: #0E1216; border-bottom: 1px solid var(--border-default); display: flex; align-items: center; justify-content: space-between; padding: 0 28px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span id="preview-modal-title" style="font-size: 16px; font-weight: 800; color: #FFF;">Template Preview</span>
        <span id="preview-modal-badge" class="badge badge-copper">Haute Gastronomy</span>
      </div>

      <!-- Real Device Viewport Switcher -->
      <div style="display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-default); border-radius: 8px; padding: 3px;">
        <button onclick="setPreviewViewport('mobile')" id="vp-mobile" class="vp-btn" style="padding: 6px 14px; border-radius: 5px; border: none; background: transparent; color: var(--color-stone); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('smartphone', { size: 14 })} <span>Mobile (390px)</span>
        </button>
        <button onclick="setPreviewViewport('tablet')" id="vp-tablet" class="vp-btn" style="padding: 6px 14px; border-radius: 5px; border: none; background: transparent; color: var(--color-stone); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('tablet', { size: 14 })} <span>Tablet (768px)</span>
        </button>
        <button onclick="setPreviewViewport('desktop')" id="vp-desktop" class="vp-btn active" style="padding: 6px 14px; border-radius: 5px; border: none; background: var(--color-copper); color: #FFF; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('monitor', { size: 14 })} <span>Desktop (1200px)</span>
        </button>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <button id="modal-install-btn" onclick="installTemplateFromModal()" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${icon('check', { size: 14 })} <span>Install & Use Template</span>
        </button>
        <button id="close-preview-btn" onclick="closeLivePreviewModal()" class="btn btn-secondary btn-sm" style="padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px;">
          ${icon('x', { size: 14 })} <span>Close</span>
        </button>
      </div>
    </div>

    <!-- Live Preview Stage Frame -->
    <div style="flex: 1; overflow: auto; display: flex; align-items: flex-start; justify-content: center; padding: 28px; background: #050709;">
      <div id="preview-frame-container" style="width: 100%; max-width: 1200px; transition: max-width 220ms ease; background: var(--color-ink); border-radius: 12px; overflow: hidden; box-shadow: 0 16px 50px rgba(0,0,0,0.9); border: 1px solid var(--border-strong);">
        <div id="preview-canvas-content" style="min-height: 640px;">
          <!-- Dynamically Injected Template Preview HTML -->
        </div>
      </div>
    </div>
  </div>

  <script>
    const TEMPLATES_DATA = ${JSON.stringify(templates)};
    const MENU_ITEMS_DATA = ${JSON.stringify(menuItems)};
    const BRAND_DATA = ${JSON.stringify(activeBrand)};
    let selectedTemplateForModal = null;

    function filterCategory(category) {
      document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === category) {
          btn.style.background = 'var(--color-copper)';
          btn.style.borderColor = 'var(--color-copper)';
          btn.style.color = '#FFFFFF';
        } else {
          btn.style.background = 'var(--color-charcoal)';
          btn.style.borderColor = 'var(--border-default)';
          btn.style.color = 'var(--color-stone)';
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
      const q = query.toLowerCase().trim();
      const cards = document.querySelectorAll('.template-card');
      cards.forEach(card => {
        const name = card.getAttribute('data-name') || '';
        const desc = card.getAttribute('data-desc') || '';
        const cat = (card.getAttribute('data-category') || '').toLowerCase();
        if (name.includes(q) || desc.includes(q) || cat.includes(q)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    async function installTemplate(templateId) {
      const btn = document.getElementById('btn-install-' + templateId);
      if (btn) btn.innerText = 'Installing...';

      try {
        const res = await fetch('/api/restaurant/templates/' + templateId + '/install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ installedBy: 'Restaurant Manager' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          alert('Template installed successfully! Opening Visual Studio to customize...');
          window.location.href = '/studio';
        } else {
          alert('Installation failed: ' + (data.error || 'Server error'));
          if (btn) btn.innerText = 'Install Template';
        }
      } catch (err) {
        alert('Network error installing template.');
        if (btn) btn.innerText = 'Install Template';
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
        b.style.background = 'transparent';
        b.style.color = 'var(--color-stone)';
      });

      btns[device].style.background = 'var(--color-copper)';
      btns[device].style.color = '#FFF';

      if (device === 'mobile') {
        container.style.maxWidth = '390px';
      } else if (device === 'tablet') {
        container.style.maxWidth = '768px';
      } else {
        container.style.maxWidth = '1200px';
      }
    }

    function renderModalPreviewForTemplate(tmpl) {
      const brand = BRAND_DATA.restaurantName;
      const starters = MENU_ITEMS_DATA.filter(m => m.category === 'Starters');
      const mains = MENU_ITEMS_DATA.filter(m => m.category === 'Mains');

      if (tmpl.id === 'tmpl_haute_gastronomy') {
        return \`
        <div style="background: #090B0E; color: #F3EEE5; font-family: var(--font-editorial, serif); padding: 48px 36px; min-height: 800px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #C86B3C; margin-bottom: 8px;">
            Tasting Menu & Sommelier Cellar · \${brand}
          </div>
          <h1 style="font-size: 34px; font-weight: 700; color: #FFF; margin-bottom: 12px; line-height: 1.2;">
            Heritage Charcoal & Brass Handi
          </h1>
          <div style="background: rgba(18,21,25,0.85); border-left: 3px solid #C86B3C; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 32px; font-style: italic; color: #E5E7EB; font-size: 13px;">
            "Our black dal simmers undisturbed for 24 continuous hours over dying sal wood coals. True flavor cannot be rushed."
          </div>

          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div style="border-bottom: 1px solid rgba(200,107,60,0.25); padding-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <h3 style="font-size: 20px; font-weight: 700; color: #FFF;">Course I · Amuse & Cold Appetizers</h3>
                <span style="font-size: 11px; font-family: monospace; color: #C86B3C;">Act 01</span>
              </div>
              <div style="font-size: 12px; color: #C86B3C; margin-top: 4px;">Sommelier Pairing: 2021 Blanc de Blancs Brut Nature</div>
              <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 12px;">
                \${starters.map(s => \`
                  <div style="background: #11151C; border: 1px solid rgba(200,107,60,0.2); border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-weight: 700; font-size: 15px; color: #FFF;">\${s.name}</div>
                      <div style="font-size: 12px; color: #9CA3AF; margin-top: 3px;">\${s.description}</div>
                    </div>
                    <span style="font-weight: 800; color: #C86B3C; font-family: monospace; font-size: 14px;">\${s.formattedPrice}</span>
                  </div>
                \`).join('')}
              </div>
            </div>
          </div>
        </div>\`;
      }

      if (tmpl.id === 'tmpl_nordic_minimal') {
        return \`
        <div style="background: #F7F6F2; color: #1C1E21; font-family: sans-serif; padding: 48px 36px; min-height: 800px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: #737D8C; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.06em;">
            <span>Harvest Season · October Rotation</span>
            <span>Origin 30°54'N 75°51'E · \${brand}</span>
          </div>
          <h1 style="font-size: 32px; font-weight: 800; color: #1C1E21; margin-bottom: 8px; letter-spacing: -0.03em;">
            Pure Form. Honest Botanicals.
          </h1>
          <p style="font-size: 14px; color: #5C6470; line-height: 1.5; margin-bottom: 32px;">
            Rooted in Scandinavian restraint, seasonal forage, and low-intervention hearth craft.
          </p>

          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #2D5A43; border-bottom: 1px solid rgba(45,90,67,0.25); padding-bottom: 6px;">
              01 / Foraged Harvest Plates & Botanicals
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              \${starters.map(s => \`
                <div style="background: #FFFFFF; border: 1px solid #E5E1D8; border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  <div>
                    <div style="font-weight: 700; font-size: 15px; color: #1C1E21; display: flex; align-items: center; gap: 8px;">
                      <span>\${s.name}</span>
                      <span style="font-size: 9px; font-family: monospace; padding: 2px 6px; border-radius: 4px; background: #E8F0EC; color: #2D5A43; border: 1px solid #C4D9CD; font-weight: 800;">ESTATE LOT</span>
                    </div>
                    <div style="font-size: 12px; color: #64748B; margin-top: 3px;">\${s.description}</div>
                  </div>
                  <span style="font-weight: 800; color: #1C1E21; font-family: monospace; font-size: 14px;">\${s.formattedPrice}</span>
                </div>
              \`).join('')}
            </div>
          </div>
        </div>\`;
      }

      if (tmpl.id === 'tmpl_artisan_coffee') {
        return \`
        <div style="background: #14100E; color: #FFF; font-family: sans-serif; padding: 48px 36px; min-height: 800px;">
          <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: #D35400; margin-bottom: 6px;">
            Micro-Lot Roastery & Slow Vitrine · \${brand}
          </div>
          <h1 style="font-size: 34px; font-weight: 900; color: #FFF; margin-bottom: 20px;">
            Craft Pours & Fresh Bakes
          </h1>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px;">
            \${[...starters, ...mains].slice(0, 4).map(item => \`
              <div style="background: #D96B00; border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 6px 20px rgba(217,107,0,0.3);">
                <div>
                  <div style="font-size: 18px; font-weight: 800; color: #FFF;">\${item.name}</div>
                  <div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-top: 3px;">Micro-Lot Pour · Craft Brewed</div>
                  <div style="font-size: 15px; font-weight: 800; color: #FFF; margin-top: 8px; font-family: monospace;">\${item.formattedPrice}</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="background: rgba(255,255,255,0.22); border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; color: #FFF;">House Reserve</span>
                  <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.25); border-radius: 999px; padding: 2px 8px;">
                    <span style="font-weight: 800;">-</span>
                    <span style="font-weight: 800; min-width: 16px; text-align: center;">1</span>
                    <span style="font-weight: 800;">+</span>
                  </div>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>\`;
      }

      if (tmpl.id === 'tmpl_neon_street') {
        return \`
        <div style="background: #0A0512; color: #FFF; font-family: sans-serif; padding: 48px 36px; min-height: 800px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 800; background: #EC4899; color: #FFF; padding: 3px 8px; border-radius: 4px;">STREET HEAT 128 BPM</span>
            <span style="font-size: 12px; font-family: monospace; color: #06B6D4;">OPEN UNTIL 02:00 AM · \${brand}</span>
          </div>
          <h1 style="font-size: 36px; font-weight: 900; color: #FFF; text-transform: uppercase; text-shadow: 0 0 14px rgba(236,72,153,0.6); margin-bottom: 24px;">
            Tokyo Night Market
          </h1>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div style="font-size: 13px; font-weight: 900; color: #EC4899; text-transform: uppercase; letter-spacing: 0.08em;">
              Stall 01: Bincho-tan Charcoal Skewers
            </div>
            \${starters.map(s => \`
              <div style="background: #170E28; border: 1px solid rgba(236,72,153,0.35); border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 14px rgba(0,0,0,0.5);">
                <div>
                  <div style="font-size: 16px; font-weight: 800; color: #FFF;">\${s.name}</div>
                  <div style="font-size: 12px; color: #A78BFA; margin-top: 3px;">\${s.description}</div>
                  <span style="font-size: 9px; font-weight: 800; color: #06B6D4; background: rgba(6,182,212,0.15); padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 6px;">FIRE 3X</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                  <span style="font-family: monospace; font-weight: 900; font-size: 15px; color: #EC4899;">\${s.formattedPrice}</span>
                  <button style="padding: 6px 14px; font-size: 11px; font-weight: 900; background: #EC4899; color: #FFF; border: none; border-radius: 6px; text-transform: uppercase;">BUMP</button>
                </div>
              </div>
            \`).join('')}
          </div>
        </div>\`;
      }

      if (tmpl.id === 'tmpl_trattoria_bella') {
        return \`
        <div style="background: #120D0C; color: #FFF; font-family: var(--font-editorial, serif); padding: 48px 36px; min-height: 800px;">
          <div style="font-size: 11px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">
            Forno a Legna & Pasta Fatta a Mano · \${brand}
          </div>
          <h1 style="font-size: 34px; font-weight: 800; color: #FFF; margin-bottom: 12px;">
            Toscana Tavola Calda
          </h1>
          <p style="font-size: 14px; color: #D1D5DB; line-height: 1.5; margin-bottom: 24px;">
            Family-style sharing platters, stone-ground semolina pasta, and Tuscan Chianti pairings.
          </p>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            \${[...starters, ...mains].slice(0, 3).map(m => \`
              <div style="background: #1C1311; border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 16px; font-weight: 800; color: #FFF;">\${m.name}</div>
                  <div style="font-size: 12px; color: #9CA3AF; margin-top: 2px;">\${m.description}</div>
                  <div style="font-size: 10px; color: #F59E0B; margin-top: 4px;">Family Combo Option Available</div>
                </div>
                <span style="font-size: 15px; font-weight: 800; color: #EF4444; font-family: monospace;">\${m.formattedPrice}</span>
              </div>
            \`).join('')}
          </div>
        </div>\`;
      }

      if (tmpl.id === 'tmpl_tokyo_izakaya') {
        return \`
        <div style="background: #0E0C0A; color: #FFF; font-family: sans-serif; padding: 48px 36px; min-height: 800px;">
          <div style="font-size: 12px; font-weight: 900; color: #D97706; margin-bottom: 6px; letter-spacing: 0.12em;">
            居酒屋 伝統 · SHOKUNIN BROTH BAR · \${brand}
          </div>
          <h1 style="font-size: 34px; font-weight: 900; color: #FFF; margin-bottom: 12px;">
            Kyoto Izakaya & Broth Bar
          </h1>
          <p style="font-size: 14px; color: #9CA3AF; margin-bottom: 24px;">
            Triple-boiled 18-hour pork marrow, seasoned tare, and hand-pulled noodles.
          </p>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            \${[...starters, ...mains].slice(0, 3).map(item => \`
              <div style="background: #181410; border: 1px solid rgba(217,119,6,0.25); border-radius: 8px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 15px; font-weight: 800; color: #FFF;">\${item.name}</div>
                  <div style="font-size: 11px; color: #9CA3AF; margin-top: 2px;">\${item.description}</div>
                  <div style="font-size: 10px; color: #D97706; margin-top: 4px;">Choice of Tare: Shio · Shoyu · Miso</div>
                </div>
                <span style="font-size: 14px; font-weight: 800; color: #D97706; font-family: monospace;">\${item.formattedPrice}</span>
              </div>
            \`).join('')}
          </div>
        </div>\`;
      }

      return '';
    }

    function openLivePreviewModal(templateId) {
      const tmpl = TEMPLATES_DATA.find(t => t.id === templateId) || TEMPLATES_DATA[0];
      selectedTemplateForModal = tmpl;

      document.getElementById('preview-modal-title').innerText = tmpl.name;
      document.getElementById('preview-modal-badge').innerText = tmpl.category;
      const modal = document.getElementById('preview-modal');
      modal.style.display = 'flex';
      modal.classList.add('open');

      const modalInstallBtn = document.getElementById('modal-install-btn');
      if (modalInstallBtn) {
        if (tmpl.id === 'tmpl_crave_atlas') {
          modalInstallBtn.innerHTML = '<span>Launch CraveAtlas App ↗</span>';
          modalInstallBtn.onclick = () => window.open('/apps/crave-atlas', '_blank');
        } else if (tmpl.id === 'tmpl_swift_bite') {
          modalInstallBtn.innerHTML = '<span>Launch SwiftBite App ↗</span>';
          modalInstallBtn.onclick = () => window.open('/apps/swift-bite', '_blank');
        } else if (tmpl.id === 'tmpl_pantry_rush') {
          modalInstallBtn.innerHTML = '<span>Launch PantryRush App ↗</span>';
          modalInstallBtn.onclick = () => window.open('/apps/pantry-rush', '_blank');
        } else {
          modalInstallBtn.innerHTML = '<span>Install & Use Template</span>';
          modalInstallBtn.onclick = installTemplateFromModal;
        }
      }

      let iframeSrc = '/dine/4Kl6zX8c0V?templateId=' + tmpl.id + '&preview=1';
      if (tmpl.id === 'tmpl_crave_atlas') {
        iframeSrc = '/apps/crave-atlas?preview=1';
      } else if (tmpl.id === 'tmpl_swift_bite') {
        iframeSrc = '/apps/swift-bite?preview=1';
      } else if (tmpl.id === 'tmpl_pantry_rush') {
        iframeSrc = '/apps/pantry-rush?preview=1';
      }

      const content = document.getElementById('preview-canvas-content');
      content.innerHTML = '<iframe id="preview-live-iframe" src="' + iframeSrc + '" style="width: 100%; height: 820px; border: none; display: block; background: ' + (tmpl.defaultTokens && tmpl.defaultTokens.backgroundColor ? tmpl.defaultTokens.backgroundColor : '#080A0D') + ';" loading="lazy"></iframe>';
    }

    function closeLivePreviewModal() {
      const modal = document.getElementById('preview-modal');
      modal.style.display = 'none';
      modal.classList.remove('open');
      selectedTemplateForModal = null;
    }
  </script>
</body>
</html>
`;
}
