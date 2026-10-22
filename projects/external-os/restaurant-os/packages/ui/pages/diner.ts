/**
 * 🪐 RestaurantOS 4.2 — Master Storefront Presentation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Six architecturally distinct, fully realized customer storefront experiences:
 *
 * 1. ATELIER ÉTOILE NOIR (Haute Gastronomy — Provisional Keeper Reference)
 *    • 50/50 Asymmetric Viewport Split (Fixed left editorial canvas, right scrollable tasting chapters)
 *    • Refined mobile proportions, Sommelier wine pairings, chronological movements
 *
 * 2. FJORD & FORM BOTANICAL (Nordic Editorial Food Journal)
 *    • Natural linen aesthetic (#F7F5F0) with spacious editorial layout & provenance coordinates
 *    • Archival harvest chapter feed, high-res botanical plate photography, unrolling specimen drawers
 *    • Floating minimalist tasting folio dock
 *
 * 3. ROASTERY 1984 VITRINE (Modern Specialty Café Bar)
 *    • Tactile coffee-bar workflow (#FDFBF7) with single-origin aroma dials and roast profiles
 *    • Interactive cup size selectors (8oz/12oz), milk alternatives, and mounted [- 1 +] steppers
 *    • Fresh morning hearth vitrine bakery drawer with live remaining counts
 *    • Floating barista order capsule
 *
 * 4. NEON YOKOCHO NIGHT ALLEY (Contemporary Street-Food Commerce)
 *    • High-energy urban Asian night market (#090B10, warm lantern amber #FF5722, vermilion #FF2A55)
 *    • Sticky visual category badges, food-led stall cards with spice flame meters, rapid + Add to Tray
 *    • Slide-up street receipt order tray
 *
 * 5. OSTERIA RUSTICA CONVIVIAL (Immersive Italian Hospitality & Feasting)
 *    • Warm Tuscan terracotta (#8C3820), olive (#3D4A39), and sun-drenched stone (#FAF7F2)
 *    • Traditional course-paced flow (Antipasti, Primi, Secondi, Dolci) with wood-fired hearth story
 *    • "Tavola Grande" family feasting combo options, DOP seals, and leather folio check presenter
 *
 * 6. SHOKUNIN RAMEN & ROBATA (Japanese Ramen Craft Slips & Izakaya)
 *    • Hinoki cedar (#26201B) and shoji aesthetic with authentic calligraphy header (職人魂 · 極上出汁)
 *    • Interactive 4-step craft ramen order slip (Broth Richness, Noodle Firmness, Garlic, Tare)
 *    • Cedar slat robata skewer grid with binchotan grill notes and bento tray check presenter
 *
 * Authoritative Data Contract:
 * • Strict item.modifierGroups data bindings with server SHA-256 pricing quote verification.
 * • Pure SVG vector Lucide-grade iconography throughout. Zero emojis.
 */

import {
  MenuItem,
  TableFloorRecord,
  RestaurantOrder,
  KitchenTask,
  TenantBrandConfig,
  MarketplaceTemplate,
} from '../../domain';
import { BASE_STYLE_SHEET } from '../styles';
import { icon } from '../icons';

export function renderDinerPwa(
  table: TableFloorRecord,
  menu: MenuItem[],
  branchName = 'Ludhiana Main',
  orders: RestaurantOrder[] = [],
  tasks: KitchenTask[] = [],
  brand?: TenantBrandConfig,
  template?: MarketplaceTemplate
): string {
  const brandName = brand?.restaurantName || 'OrbitoX Bistro';
  const brandTagline = brand?.tagline || 'Farm-to-fork gastronomy, crafted over live charcoal embers.';
  const tmplTokens = template?.defaultTokens;
  const primaryColor = tmplTokens?.primaryColor || brand?.primaryColor || '#C86B3C';
  const secondaryColor = tmplTokens?.secondaryColor || brand?.secondaryColor || '#D99A45';
  const bgColor = tmplTokens?.backgroundColor || '#080A0D';
  const surfaceColor = tmplTokens?.surfaceColor || '#12161E';
  const textColor = tmplTokens?.textColor || '#F5F0E6';
  const mutedColor = tmplTokens?.mutedColor || '#8C857B';
  const fontHeading = template?.fontHeading || tmplTokens?.fontFamilyHeading || 'system-ui, sans-serif';
  const fontBody = template?.fontBody || tmplTokens?.fontFamilyBody || 'system-ui, sans-serif';
  const customCss = brand?.customCss || '';
  const isLight = bgColor === '#F7F5F0' || bgColor === '#FDFBF7' || bgColor === '#FBF8F2' || bgColor === '#FAF7F2';

  const rawTemplateId = template?.id || brand?.activeTemplateId || 'tmpl_haute_gastronomy';
  const activeTemplateId = normalizeTemplateId(rawTemplateId);

  // Active cooking tasks
  const inProgressTask = tasks.find((t) => t.status === 'IN_PROGRESS' || t.status === 'QUEUED');
  const hasActiveOrder = orders.length > 0 || tasks.length > 0;

  // Render template-specific composition
  let storefrontHtml = '';
  if (activeTemplateId === 'tmpl_nordic_minimal') {
    storefrontHtml = renderFjordFormComposition(menu, brandName, brandTagline, branchName, table);
  } else if (activeTemplateId === 'tmpl_artisan_coffee') {
    storefrontHtml = renderRoastery1984Composition(menu, brandName, brandTagline, branchName, table);
  } else if (activeTemplateId === 'tmpl_neon_street') {
    storefrontHtml = renderNeonYokochoComposition(menu, brandName, brandTagline, branchName, table);
  } else if (activeTemplateId === 'tmpl_trattoria_bella') {
    storefrontHtml = renderOsteriaRusticaComposition(menu, brandName, brandTagline, branchName, table);
  } else if (activeTemplateId === 'tmpl_tokyo_izakaya') {
    storefrontHtml = renderShokuninRamenComposition(menu, brandName, brandTagline, branchName, table);
  } else {
    storefrontHtml = renderAtelierEtoileComposition(menu, brandName, brandTagline, branchName, table);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>${brandName} · Table ${table.number}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,400&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${BASE_STYLE_SHEET}

    :root {
      --color-copper: ${primaryColor};
      --color-sage: ${secondaryColor};
      --diner-bg: ${bgColor};
      --theme-bg: ${bgColor};
      --theme-surface: ${surfaceColor};
      --theme-text: ${textColor};
      --theme-muted: ${mutedColor};
      --theme-primary: ${primaryColor};
      --theme-secondary: ${secondaryColor};
      --theme-border: ${isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)'};
      --diner-font-heading: ${fontHeading};
      --diner-font-body: ${fontBody};
      --font-mono: "JetBrains Mono", "SF Mono", monospace;
    }

    ${customCss}

    * { box-sizing: border-box; }

    body {
      background: var(--theme-bg, #080A0D);
      color: var(--theme-text, #F5F0E6);
      font-family: var(--diner-font-body, system-ui, sans-serif);
      margin: 0;
      padding: 0;
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Common Global Elements & Utilities */
    .cat-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      text-decoration: none;
      transition: all 140ms ease;
      cursor: pointer;
      user-select: none;
    }

    /* Welcoming Table Header (Non-blocking Seating Banner - Owner Decision 1 Option A) */
    .seating-gate {
      position: sticky;
      top: 0;
      background: ${isLight ? 'rgba(253, 251, 247, 0.96)' : 'rgba(14, 18, 24, 0.96)'};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--theme-border);
      padding: 10px 24px;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      z-index: 90;
      text-align: left;
      overflow: hidden;
      flex-wrap: wrap;
      gap: 12px;
      transition: all 160ms ease;
    }
    @media (max-width: 640px) {
      .seating-gate {
        padding: 8px 16px;
      }
    }
    .gate-input {
      background: ${isLight ? '#FFFFFF' : '#12161E'};
      border: 1px solid var(--theme-border);
      border-radius: 6px;
      padding: 5px 10px;
      color: var(--theme-text);
      font-size: 12px;
      text-align: left;
      margin: 0;
      outline: none;
      display: inline-block;
      width: 120px;
    }
    .mood-chip {
      padding: 4px 10px;
      background: ${isLight ? '#EFEBE4' : '#12161E'};
      border: 1px solid var(--theme-border);
      border-radius: 999px;
      color: var(--theme-muted);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .mood-chip.selected {
      background: rgba(197, 160, 89, 0.18);
      color: var(--theme-primary);
      border-color: var(--theme-primary);
      font-weight: 700;
    }

    /* Modals & Overlays */
    .sheet-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      z-index: 200;
      display: none;
      align-items: flex-end;
      justify-content: center;
    }
    .sheet-overlay.open {
      display: flex;
    }
    .sheet-content {
      background: ${surfaceColor};
      border: 1px solid var(--theme-border);
      border-radius: 20px 20px 0 0;
      width: 100%;
      max-width: 520px;
      max-height: 88vh;
      overflow-y: auto;
      padding: 24px 22px;
      box-shadow: 0 -12px 48px rgba(0, 0, 0, 0.8);
      color: var(--theme-text);
    }

    /* Service FAB */
    .service-request-fab {
      position: fixed;
      bottom: 84px;
      right: 20px;
      background: ${isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(22, 27, 36, 0.95)'};
      border: 1px solid var(--theme-border);
      border-radius: 999px;
      padding: 9px 16px;
      color: var(--theme-text);
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      z-index: 45;
      transition: all 140ms ease;
    }
    @media (max-width: 640px) {
      .service-request-fab {
        bottom: 84px;
        right: 14px;
        padding: 7px 12px;
        font-size: 11px;
      }
    }
    .service-request-fab:hover {
      border-color: var(--theme-primary);
    }

    /* Status Capsule */
    .live-activity-capsule {
      position: fixed;
      top: 14px;
      right: 20px;
      background: rgba(18, 22, 30, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid var(--theme-primary);
      border-radius: 999px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      z-index: 48;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }

    /* Modifier Option Buttons */
    .mod-btn {
      padding: 9px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid var(--theme-border);
      background: ${isLight ? '#F0ECE4' : 'rgba(255,255,255,0.06)'};
      color: var(--theme-text);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 120ms ease;
    }
    .mod-btn.btn-primary {
      background: var(--theme-primary);
      color: #FFF;
      border-color: var(--theme-primary);
    }

    /* ═════════════════════════════════════════════════════════════════════════ */
    /* TEMPLATE 1: ATELIER ÉTOILE NOIR (50/50 Asymmetric Split & Tasting Sequence) */
    /* ═════════════════════════════════════════════════════════════════════════ */
    .storefront-atelier-shell {
      width: 100%;
      min-height: 100vh;
      display: flex;
    }

    @media (min-width: 1024px) {
      .storefront-atelier-shell {
        height: 100vh;
        overflow: hidden;
      }
      .atelier-left-viewport {
        width: 48%;
        height: 100%;
        position: relative;
        overflow-y: auto;
        background: #080A0D;
        border-right: 1px solid rgba(197, 160, 89, 0.2);
        padding: 40px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .atelier-right-viewport {
        width: 52%;
        height: 100%;
        overflow-y: auto;
        background: #0B0E14;
        padding: 40px 48px 120px;
      }
    }

    @media (max-width: 1023px) {
      .storefront-atelier-shell {
        flex-direction: column;
      }
      .atelier-left-viewport {
        width: 100%;
        padding: 24px 20px 20px;
        background: #080A0D;
        border-bottom: 1px solid rgba(197, 160, 89, 0.2);
      }
      .atelier-right-viewport {
        width: 100%;
        padding: 24px 20px 100px;
        background: #0B0E14;
      }
    }

    .plate-thumb-circular {
      width: 90px;
      height: 90px;
      border-radius: 12px;
      object-fit: cover;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(197, 160, 89, 0.35);
      flex-shrink: 0;
    }

    /* ═════════════════════════════════════════════════════════════════════════ */
    /* TEMPLATE 2: FJORD & FORM (Nordic Editorial Food Journal)                  */
    /* ═════════════════════════════════════════════════════════════════════════ */
    .storefront-fjord-shell {
      width: 100%;
      max-width: 1320px;
      margin: 0 auto;
      padding: 36px 28px 110px;
      min-height: 100vh;
      background: #F7F5F0;
      color: #1C1E21;
    }

    .fjord-journal-hero-card {
      position: relative;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 36px;
      background: #14171A;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .fjord-hero-image-wrap {
      height: 360px;
      width: 100%;
      position: relative;
    }
    @media (max-width: 768px) {
      .fjord-hero-image-wrap {
        height: 240px;
      }
    }

    .fjord-chapter-pills-bar {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 28px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .fjord-chapter-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }
    @media (max-width: 860px) {
      .fjord-chapter-grid {
        grid-template-columns: 1fr;
      }
    }

    .fjord-editorial-row {
      display: flex;
      align-items: stretch;
      gap: 22px;
      background: #FFFFFF;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      transition: all 160ms ease;
      cursor: pointer;
    }
    .fjord-editorial-row:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      transform: translateY(-2px);
    }
    @media (max-width: 640px) {
      .fjord-editorial-row {
        flex-direction: column;
        gap: 14px;
      }
    }

    .fjord-dish-visual {
      width: 130px;
      height: 120px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      background: #EAE6DF;
    }
    @media (max-width: 640px) {
      .fjord-dish-visual {
        width: 100%;
        height: 180px;
      }
    }

    .fjord-receipt-dock {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #1C1E21;
      color: #F7F5F0;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 50;
      box-shadow: 0 -6px 28px rgba(0, 0, 0, 0.2);
    }

    /* ═════════════════════════════════════════════════════════════════════════ */
    /* TEMPLATE 3: ROASTERY 1984 (Modern Specialty Café Bar)                     */
    /* ═════════════════════════════════════════════════════════════════════════ */
    .storefront-roastery-shell {
      width: 100%;
      max-width: 1320px;
      margin: 0 auto;
      padding: 28px 24px 110px;
      background: #FDFBF7;
      color: #241D17;
      min-height: 100vh;
    }

    .roastery-category-strip {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 6px;
      margin-bottom: 24px;
    }

    .roastery-vitrine-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 24px;
      margin-top: 20px;
    }
    @media (max-width: 1080px) {
      .roastery-vitrine-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
    }
    @media (max-width: 640px) {
      .roastery-vitrine-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }

    .roastery-card {
      background: #FFFFFF;
      border: 1px solid rgba(140, 78, 45, 0.18);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 18px;
      transition: all 160ms ease;
    }
    .roastery-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 30px rgba(140, 78, 45, 0.1);
    }

    .roastery-floating-capsule {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 36px);
      max-width: 460px;
      background: #241D17;
      color: #FFF;
      border-radius: 999px;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      z-index: 50;
      transition: transform 140ms ease;
    }

    /* ═════════════════════════════════════════════════════════════════════════ */
    /* TEMPLATE 4: NEON YOKOCHO (Contemporary Street Food Market)                */
    /* ═════════════════════════════════════════════════════════════════════════ */
    .storefront-neon-shell {
      width: 100%;
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 20px 110px;
      background: #090B10;
      color: #FFFFFF;
      min-height: 100vh;
    }

    .neon-stall-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 28px;
      margin-top: 24px;
    }
    @media (max-width: 900px) {
      .neon-stall-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }

    .neon-ticket-card {
      background: #121620;
      border: 1px solid rgba(255, 87, 34, 0.25);
      border-radius: 14px;
      padding: 16px 18px;
      display: flex;
      align-items: center;
      gap: 18px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6);
      cursor: pointer;
      transition: all 140ms ease;
    }
    .neon-ticket-card:hover {
      border-color: #FF5722;
      transform: translateY(-2px);
    }

    .neon-street-bag {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 36px);
      max-width: 460px;
      background: linear-gradient(90deg, #FF5722 0%, #FF2A55 100%);
      color: #FFF;
      border-radius: 999px;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 36px rgba(255, 87, 34, 0.45);
      cursor: pointer;
      z-index: 50;
      font-weight: 800;
    }

    /* ═════════════════════════════════════════════════════════════════════════ */
    /* TEMPLATE 5: OSTERIA RUSTICA (Immersive Italian Hospitality)               */
    /* ═════════════════════════════════════════════════════════════════════════ */
    .storefront-osteria-shell {
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;
      padding: 36px 24px 110px;
      background: #FAF7F2;
      color: #241D17;
      min-height: 100vh;
    }

    .osteria-course-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }
    @media (max-width: 860px) {
      .osteria-course-grid {
        grid-template-columns: 1fr;
      }
    }

    .osteria-framed-card {
      background: #FFFFFF;
      border: 1px solid rgba(140, 56, 32, 0.18);
      border-radius: 16px;
      padding: 22px;
      display: flex;
      gap: 22px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.03);
      cursor: pointer;
      margin-bottom: 20px;
      transition: all 150ms ease;
    }
    .osteria-framed-card:hover {
      box-shadow: 0 8px 28px rgba(140, 56, 32, 0.08);
      transform: translateY(-2px);
    }
    @media (max-width: 640px) {
      .osteria-framed-card {
        flex-direction: column;
        gap: 14px;
      }
    }

    .osteria-floating-bill {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 36px);
      max-width: 460px;
      background: #8C3820;
      color: #FFF;
      border-radius: 999px;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 32px rgba(140, 56, 32, 0.35);
      cursor: pointer;
      z-index: 50;
    }

    /* ═════════════════════════════════════════════════════════════════════════ */
    /* TEMPLATE 6: SHOKUNIN RAMEN (Japanese Ramen Craft Slips & Izakaya)         */
    /* ═════════════════════════════════════════════════════════════════════════ */
    .storefront-shokunin-shell {
      width: 100%;
      max-width: 1360px;
      margin: 0 auto;
      padding: 32px 24px 110px;
      background: #181512;
      color: #F7F4EB;
      min-height: 100vh;
    }

    .shokunin-menu-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    @media (max-width: 860px) {
      .shokunin-menu-grid {
        grid-template-columns: 1fr;
      }
    }

    .shokunin-slat-card {
      background: #241E1A;
      border: 1px solid rgba(211, 56, 28, 0.25);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      cursor: pointer;
      margin-bottom: 14px;
      transition: all 140ms ease;
    }
    .shokunin-slat-card:hover {
      border-color: #D3381C;
      transform: translateY(-2px);
    }

    .shokunin-interactive-slip {
      background: #221B17;
      border: 1px solid rgba(211, 56, 28, 0.4);
      border-radius: 12px;
      padding: 22px;
      margin-bottom: 32px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
    }

    .shokunin-slip-chip {
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      background: #2E2520;
      color: #D4C5B9;
      border: 1px solid rgba(255, 255, 255, 0.08);
      cursor: pointer;
      transition: all 120ms ease;
    }
    .shokunin-slip-chip.active {
      background: #D3381C;
      color: #FFF;
      border-color: #D3381C;
    }

    .shokunin-floating-bento {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 36px);
      max-width: 460px;
      background: #26201B;
      color: #FFF;
      border: 1px solid #D3381C;
      border-radius: 999px;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 32px rgba(0, 0, 0, 0.6);
      cursor: pointer;
      z-index: 50;
    }

    /* Universal Floating Cart Pill fallback */
    .floating-cart {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 36px);
      max-width: 460px;
      background: var(--theme-primary, #C86B3C);
      color: #FFF;
      border-radius: 999px;
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      cursor: pointer;
      z-index: 50;
      transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
    }
  </style>
</head>
<body class="brand-custom-theme">
  <!-- 1. Welcoming Non-Blocking Seating Header (Owner Decision 1 Option A) -->
  <header id="seating-gate" class="seating-gate">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 800; background: var(--theme-primary); color: #FFF; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em;">
        Table ${table.number}
      </span>
      <div>
        <div style="font-family: var(--diner-font-heading); font-size: 14px; font-weight: 800; color: var(--theme-text); letter-spacing: 0.02em;">
          ${brandName}
        </div>
        <div style="font-size: 10px; color: var(--theme-muted); text-transform: uppercase; letter-spacing: 0.05em;">
          ${branchName} · Live Kitchen Synced
        </div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 11px; color: var(--theme-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700;">Host:</span>
      <input type="text" id="guest-name-input" class="gate-input" placeholder="Your Name" value="Guest" onchange="currentGuestName = this.value.trim() || 'Guest'" />
      <button class="btn btn-secondary btn-sm" style="padding: 5px 12px; font-size: 11px; font-weight: 700;" onclick="confirmSeating()">
        Save
      </button>
    </div>
  </header>

  <!-- 2. Dynamic Template-Specific Customer Storefront -->
  <div id="storefront-app-root">
    ${storefrontHtml}
  </div>

  <!-- 3. Service Request Action FAB -->
  <button class="service-request-fab" onclick="openServiceRequestSheet()">
    <span style="display:inline-flex;align-items:center;">${icon('bell', { size: 14 })}</span>
    <span>Call Service</span>
  </button>

  <!-- 4. Dynamic Order Telemetry Capsule -->
  ${
    hasActiveOrder
      ? `
  <div class="live-activity-capsule" onclick="openStatusSheet()">
    <div style="display: flex; flex-direction: column;">
      <span style="font-size: 11px; font-weight: 800; color: #FFF;">${inProgressTask ? inProgressTask.itemName + ' · Cooking' : 'Kitchen Active'}</span>
      <span style="font-size: 10px; color: var(--theme-primary); font-family: var(--font-mono);">${inProgressTask ? 'ETA ~' + inProgressTask.slaMinutes + ' min' : 'Table Active'}</span>
    </div>
    <span style="display:inline-flex;align-items:center;">${icon('chevron-right', { size: 12, color: 'var(--theme-primary)' })}</span>
  </div>`
      : ''
  }

  <!-- 5. Item Customization Sheet (Strictly binds to item.modifierGroups) -->
  <div id="item-sheet" class="sheet-overlay" onclick="if(event.target === this) closeItemSheet()">
    <div class="sheet-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <h3 id="sheet-item-title" style="font-size: 20px; font-weight: 800; margin: 0;">Item Customizer</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeItemSheet()">${icon('x', { size: 16 })}</button>
      </div>

      <!-- Dish Image Showcase in Customizer -->
      <div id="sheet-item-image-wrap" style="position: relative; width: 100%; height: 180px; border-radius: 12px; overflow: hidden; margin-bottom: 14px; background: #000; border: 1px solid var(--theme-border); display: none;">
        <img id="sheet-item-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" alt="Dish Preview" style="width: 100%; height: 100%; object-fit: cover;" />
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%);"></div>
        <div id="sheet-item-badge" style="position: absolute; bottom: 10px; left: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--theme-primary); background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); padding: 3px 8px; border-radius: 4px;"></div>
      </div>

      <div id="sheet-item-story" style="font-style: italic; font-size: 13px; color: var(--theme-primary); margin-bottom: 8px;"></div>
      <div id="sheet-item-desc" style="font-size: 13px; color: var(--theme-muted); line-height: 1.5; margin-bottom: 16px;"></div>

      <div id="sheet-modifiers-container"></div>

      <button id="sheet-add-btn" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 15px; margin-top: 14px;" onclick="confirmSheetAdd()">
        Add to Order
      </button>
    </div>
  </div>

  <!-- Floating Cart Pill (Universal Order Folio Bar) -->
  <div id="floating-cart-pill" class="floating-cart-pill floating-cart" onclick="openCartSheet()" style="display: none; position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 80; background: var(--theme-primary, #6366F1); color: #FFF; padding: 12px 24px; border-radius: 9999px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: pointer; align-items: center; gap: 12px; font-weight: 700; font-size: 14px;">
    <span style="display:flex;align-items:center;">${icon('cart', { size: 18 })}</span>
    <span id="cart-pill-count">0 Items</span>
    <span style="opacity: 0.6;">·</span>
    <span>View Order</span>
  </div>

  <!-- 6. Cart Drawer / Sheet -->
  <div id="cart-sheet" class="sheet-overlay" onclick="if(event.target === this) closeCartSheet()">
    <div class="sheet-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; margin: 0;">Table ${table.number} Order Folio</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeCartSheet()">${icon('x', { size: 16 })}</button>
      </div>

      <!-- Table Host / Seated Diner Confirmation -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: ${isLight ? 'rgba(0,0,0,0.03)' : '#0E1218'}; border: 1px solid var(--theme-border); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px;">
        <span style="font-size: 12px; color: var(--theme-muted); font-weight: 600;">Seated Guest:</span>
        <input type="text" id="cart-guest-name-input" value="Guest" style="background: ${isLight ? '#FFF' : '#141822'}; border: 1px solid var(--theme-border); color: var(--theme-text); border-radius: 5px; padding: 4px 10px; font-size: 12px; width: 140px; outline: none;" onchange="currentGuestName = this.value.trim() || 'Guest'; const g = document.getElementById('guest-name-input'); if(g) g.value = currentGuestName;" />
      </div>

      <div id="cart-items-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;"></div>

      <div style="background: ${isLight ? 'rgba(0,0,0,0.03)' : '#080A0E'}; border: 1px solid var(--theme-border); border-radius: 10px; padding: 14px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
          <span style="color: var(--theme-muted);">Subtotal</span>
          <span id="quote-subtotal" style="font-family: var(--font-mono);">₹0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
          <span style="color: var(--theme-muted);">5% GST</span>
          <span id="quote-tax" style="font-family: var(--font-mono);">₹0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 800; border-top: 1px solid var(--theme-border); padding-top: 8px;">
          <span>Total Payable</span>
          <span id="quote-total" style="font-family: var(--font-mono); color: var(--theme-primary);">₹0.00</span>
        </div>
      </div>

      <button class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="submitKitchenOrder()">
        <span>Send Order to Kitchen</span>
        <span style="display:inline-flex;align-items:center;">${icon('kitchen', { size: 15 })}</span>
      </button>
    </div>
  </div>

  <!-- 7. Kitchen Cooking Telemetry Sheet -->
  <div id="status-sheet" class="sheet-overlay" onclick="if(event.target === this) closeStatusSheet()">
    <div class="sheet-content">
      <div style="text-align: center; margin-bottom: 18px;">
        <span class="badge badge-sage">Active Service</span>
        <h3 style="font-size: 22px; font-weight: 800; margin-top: 6px;">Kitchen Progress</h3>
        <p style="font-size: 12px; color: var(--theme-muted); margin-top: 4px;">Synchronized preparation for Table ${table.number}</p>
      </div>

      <div style="background: ${isLight ? 'rgba(0,0,0,0.03)' : '#080A0E'}; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
        ${
          tasks.length === 0
            ? `<div style="text-align: center; color: var(--theme-muted); font-size: 13px; padding: 14px 0;">No kitchen orders currently in preparation for Table ${table.number}.</div>`
            : tasks
                .map(
                  (t) => `
          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--theme-border);">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: ${t.status === 'BUMPED' ? 'var(--color-sage)' : 'var(--theme-primary)'}; margin-top: 4px;"></div>
            <div>
              <div style="font-weight: 700; color: ${t.status === 'BUMPED' ? 'var(--color-sage)' : 'var(--theme-text)'};">
                ${t.quantity}× ${t.itemName} · ${t.status === 'BUMPED' ? 'Served' : t.status === 'READY' ? 'Ready for Table' : 'Cooking on Line'}
              </div>
              <div style="font-size: 12px; color: var(--theme-muted);">${t.station}${t.modifiers.length > 0 ? ' · ' + t.modifiers.join(', ') : ''}</div>
            </div>
          </div>`
                )
                .join('')
        }
      </div>

      <button class="btn btn-secondary" style="width: 100%; padding: 12px;" onclick="closeStatusSheet()">
        Back to Menu
      </button>
    </div>
  </div>

  <!-- 8. Service Call Sheet -->
  <div id="service-sheet" class="sheet-overlay" onclick="if(event.target === this) closeServiceRequestSheet()">
    <div class="sheet-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 18px; font-weight: 800; margin: 0;">How can we assist you?</h3>
        <button class="btn btn-ghost btn-sm" onclick="closeServiceRequestSheet()">${icon('x', { size: 16 })}</button>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px;">
        <button class="btn btn-secondary" style="padding: 12px; justify-content: flex-start; gap: 8px;" onclick="sendServiceRequest('WATER', 'Water carafe')">
          ${icon('coffee', { size: 14 })} <span>Chilled Water</span>
        </button>
        <button class="btn btn-secondary" style="padding: 12px; justify-content: flex-start; gap: 8px;" onclick="sendServiceRequest('CUTLERY', 'Cutlery set')">
          ${icon('utensils', { size: 14 })} <span>Fresh Cutlery</span>
        </button>
        <button class="btn btn-secondary" style="padding: 12px; justify-content: flex-start; gap: 8px;" onclick="sendServiceRequest('NAPKINS', 'Extra napkins')">
          ${icon('file-text', { size: 14 })} <span>Napkins</span>
        </button>
        <button class="btn btn-secondary" style="padding: 12px; justify-content: flex-start; gap: 8px;" onclick="sendServiceRequest('CALL_SERVER', 'Call server')">
          ${icon('bell', { size: 14 })} <span>Call Server</span>
        </button>
        <button class="btn btn-secondary" style="padding: 12px; justify-content: flex-start; gap: 8px;" onclick="sendServiceRequest('MORE_TIME', 'More time')">
          ${icon('clock', { size: 14 })} <span>More Time</span>
        </button>
        <button class="btn btn-primary" style="padding: 12px; justify-content: flex-start; gap: 8px;" onclick="sendServiceRequest('BILL', 'Check / Bill requested')">
          ${icon('credit-card', { size: 14 })} <span>Request Bill</span>
        </button>
      </div>

      <div id="service-req-feedback" style="display: none; background: rgba(93, 154, 122, 0.15); border: 1px solid var(--color-sage); border-radius: 8px; padding: 12px; text-align: center; color: var(--color-sage); font-weight: 700; font-size: 13px;">
        Request sent to staff! Someone will be with you shortly.
      </div>
    </div>
  </div>

  <!-- Client State & JavaScript -->
  <script>
    const isLight = ${isLight};
    const menuData = ${JSON.stringify(menu)};
    const itemImagesMap = {
      item_paneer_tikka: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=85',
      item_fish_tikka: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=85',
      item_dal_makhani: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=85',
      item_butter_chicken: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=85',
      item_butter_naan: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=85',
      item_garlic_naan: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=85',
      item_mango_lassi: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=85',
      item_gulab_jamun: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=85'
    };
    const tableLocator = '${table.locator}';
    let cart = [];
    window.cart = cart;
    let selectedItemId = null;
    let currentSelectedModifiers = [];
    let currentGuestName = 'Guest';
    let currentCapabilityToken = sessionStorage.getItem('diner_cap_' + '${table.locator}') || '';

    // Active ramen slip selections
    let activeRamenBroth = 'Kotteri (Ultra-Rich)';
    let activeRamenNoodles = 'Katame (Firm)';
    let activeRamenGarlic = 'Standard';
    let activeRamenTare = 'Mild (1x)';

    const urlParams = new URLSearchParams(window.location.search);
    const isPreviewMode = urlParams.get('preview') === '1';

    if (currentCapabilityToken || isPreviewMode) {
      const gate = document.getElementById('seating-gate');
      if (gate) gate.style.display = 'none';
    }

    function selectMood(el, mood) {
      document.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
    }

    async function confirmSeating() {
      const name = document.getElementById('guest-name-input').value.trim();
      currentGuestName = name || 'Guest';
      try {
        const res = await fetch('/api/restaurant/sessions/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locator: tableLocator, name: currentGuestName }),
        });
        const json = await res.json();
        if (json.success && json.data.capabilityToken) {
          currentCapabilityToken = json.data.capabilityToken;
          sessionStorage.setItem('diner_cap_' + tableLocator, currentCapabilityToken);
        }
      } catch (err) {}
      const gate = document.getElementById('seating-gate');
      if (gate) gate.style.display = 'none';
    }

    // Quick add to cart for dishes with default modifier choices
    function quickAddToCart(itemId) {
      const food = menuData.find(m => m.id === itemId);
      if (!food) return;

      const defaultMods = [];
      const defaultModIds = [];
      let deltaMinor = 0;
      if (food.modifierGroups) {
        food.modifierGroups.forEach(g => {
          const defOpt = g.options.find(o => o.isDefault) || g.options[0];
          if (defOpt) {
            defaultMods.push(defOpt.name);
            defaultModIds.push(defOpt.id);
            deltaMinor += (defOpt.priceDeltaMinor || 0);
          }
        });
      }

      cart.push({
        id: itemId,
        quantity: 1,
        modifier: defaultMods.join(' · '),
        selectedModifierIds: defaultModIds,
        modifierPriceDeltaMinor: deltaMinor
      });

      renderCartPill();
      recalculateQuote();
      updateQtyDisplay(itemId);
    }
    window.quickAddToCart = quickAddToCart;

    // Tactile Stepper for Roastery 1984
    function stepItemQuantity(itemId, step) {
      const food = menuData.find(m => m.id === itemId);
      if (!food) return;

      if (step > 0) {
        quickAddToCart(itemId);
      } else {
        const idx = cart.findIndex(it => it.id === itemId);
        if (idx >= 0) {
          cart.splice(idx, 1);
          renderCartPill();
          recalculateQuote();
          updateQtyDisplay(itemId);
        }
      }
    }
    window.stepItemQuantity = stepItemQuantity;

    function updateQtyDisplay(itemId) {
      const count = cart.filter(it => it.id === itemId).length;
      const el = document.getElementById('qty-' + itemId);
      if (el) el.textContent = count;
    }

    // Shokunin Ramen Slip Interactive Controls
    function setRamenSlipOption(type, value, btn) {
      if (type === 'broth') activeRamenBroth = value;
      if (type === 'noodles') activeRamenNoodles = value;
      if (type === 'garlic') activeRamenGarlic = value;
      if (type === 'tare') activeRamenTare = value;

      if (btn) {
        const parent = btn.parentElement;
        if (parent) {
          parent.querySelectorAll('.shokunin-slip-chip').forEach(c => c.classList.remove('active'));
        }
        btn.classList.add('active');
      }
    }
    window.setRamenSlipOption = setRamenSlipOption;

    function submitRamenSlipItem(itemId) {
      const food = menuData.find(m => m.id === itemId) || menuData[0];
      if (!food) return;

      const customNote = activeRamenBroth + ' Broth · ' + activeRamenNoodles + ' Noodles · Garlic: ' + activeRamenGarlic + ' · Tare: ' + activeRamenTare;
      cart.push({
        id: food.id,
        quantity: 1,
        modifier: customNote,
        selectedModifierIds: [],
        modifierPriceDeltaMinor: 0
      });

      renderCartPill();
      recalculateQuote();
      updateQtyDisplay(food.id);
      openCartSheet();
    }
    window.submitRamenSlipItem = submitRamenSlipItem;

    // Item customizer sheet
    function openItemSheet(itemId) {
      const pill = document.getElementById('floating-cart-pill');
      if (pill) pill.style.display = 'none';
      selectedItemId = itemId;
      const item = menuData.find(i => i.id === itemId);
      if (!item) return;

      document.getElementById('sheet-item-title').textContent = item.name;
      document.getElementById('sheet-item-desc').textContent = item.description;
      const storyEl = document.getElementById('sheet-item-story');
      if (storyEl) storyEl.textContent = item.story || (item.category + ' · ' + (item.prepDurationMinutes ? item.prepDurationMinutes + 'm prep' : 'Fresh'));

      const imgWrap = document.getElementById('sheet-item-image-wrap');
      const imgEl = document.getElementById('sheet-item-image');
      const badgeEl = document.getElementById('sheet-item-badge');
      const thumb = (typeof itemImagesMap !== 'undefined' && itemImagesMap[itemId]) ? itemImagesMap[itemId] : '';
      if (imgWrap && imgEl && thumb) {
        imgEl.src = thumb;
        imgWrap.style.display = 'block';
        if (badgeEl) badgeEl.textContent = item.category + (item.prepDurationMinutes ? ' · ' + item.prepDurationMinutes + 'm prep' : ' · House Standard');
      } else if (imgWrap) {
        imgWrap.style.display = 'none';
      }

      currentSelectedModifiers = [];
      const modContainer = document.getElementById('sheet-modifiers-container');
      if (modContainer) {
        if (item.modifierGroups && item.modifierGroups.length > 0) {
          modContainer.innerHTML = item.modifierGroups.map(grp => {
            grp.options.forEach(opt => {
              if (opt.isDefault) {
                currentSelectedModifiers.push({
                  groupId: grp.id,
                  optionId: opt.id,
                  name: opt.name,
                  priceDeltaMinor: opt.priceDeltaMinor || 0
                });
              }
            });

            return '<div style="margin-bottom: 16px;">' +
              '<div style="font-size: 12px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">' + grp.name + '</div>' +
              '<div style="display: flex; gap: 8px; flex-wrap: wrap;">' +
                grp.options.map(opt => {
                  const isSel = currentSelectedModifiers.some(m => m.groupId === grp.id && m.optionId === opt.id);
                  const deltaFmt = opt.formattedPriceDelta ? (opt.formattedPriceDelta.startsWith('+') ? opt.formattedPriceDelta : '+' + opt.formattedPriceDelta) : ('+₹' + (opt.priceDeltaMinor/100).toFixed(2));
                  const priceStr = opt.priceDeltaMinor ? ' (' + deltaFmt + ')' : '';
                  return '<button class="mod-btn ' + (isSel ? 'btn-primary' : 'btn-secondary') + '" ' +
                    'data-grp-id="' + grp.id + '" data-opt-id="' + opt.id + '" data-name="' + opt.name + '" ' +
                    'data-delta="' + (opt.priceDeltaMinor || 0) + '" data-max="' + grp.maxSelections + '" ' +
                    'onclick="onModBtnClick(this)">' +
                    opt.name + priceStr +
                  '</button>';
                }).join('') +
              '</div>' +
            '</div>';
          }).join('');
        } else {
          modContainer.innerHTML = '<div style="font-size: 13px; color: var(--theme-muted); margin-bottom: 14px;">Crafted to authentic house standard with zero modifications required.</div>';
        }
      }

      updateSheetButtonPrice();
      document.getElementById('item-sheet').classList.add('open');
    }
    window.openItemSheet = openItemSheet;

    function onModBtnClick(btn) {
      const grpId = btn.getAttribute('data-grp-id');
      const optId = btn.getAttribute('data-opt-id');
      const optName = btn.getAttribute('data-name');
      const delta = Number(btn.getAttribute('data-delta') || 0);
      const max = Number(btn.getAttribute('data-max') || 1);

      if (max === 1) {
        currentSelectedModifiers = currentSelectedModifiers.filter(m => m.groupId !== grpId);
        currentSelectedModifiers.push({ groupId: grpId, optionId: optId, name: optName, priceDeltaMinor: delta });
      } else {
        const idx = currentSelectedModifiers.findIndex(m => m.groupId === grpId && m.optionId === optId);
        if (idx >= 0) {
          currentSelectedModifiers.splice(idx, 1);
        } else {
          currentSelectedModifiers.push({ groupId: grpId, optionId: optId, name: optName, priceDeltaMinor: delta });
        }
      }

      const buttons = document.querySelectorAll('.mod-btn[data-grp-id="' + grpId + '"]');
      buttons.forEach(b => {
        const bOptId = b.getAttribute('data-opt-id');
        const isSel = currentSelectedModifiers.some(m => m.groupId === grpId && m.optionId === bOptId);
        if (isSel) {
          b.classList.remove('btn-secondary');
          b.classList.add('btn-primary');
        } else {
          b.classList.remove('btn-primary');
          b.classList.add('btn-secondary');
        }
      });

      updateSheetButtonPrice();
    }
    window.onModBtnClick = onModBtnClick;

    function updateSheetButtonPrice() {
      const item = menuData.find(i => i.id === selectedItemId);
      if (!item) return;
      let totalMinor = item.basePriceMinor;
      currentSelectedModifiers.forEach(m => { totalMinor += m.priceDeltaMinor; });
      const addBtn = document.getElementById('sheet-add-btn');
      if (addBtn) {
        addBtn.textContent = 'Add to Order · ₹' + (totalMinor / 100).toFixed(2);
      }
    }

    function closeItemSheet() {
      document.getElementById('item-sheet').classList.remove('open');
      renderCartPill();
    }
    window.closeItemSheet = closeItemSheet;

    function confirmSheetAdd() {
      if (selectedItemId) {
        const modLabel = currentSelectedModifiers.map(m => m.name).join(' · ');
        const modIds = currentSelectedModifiers.map(m => m.optionId);
        const modDelta = currentSelectedModifiers.reduce((acc, m) => acc + m.priceDeltaMinor, 0);

        cart.push({
          id: selectedItemId,
          quantity: 1,
          modifier: modLabel,
          selectedModifierIds: modIds,
          modifierPriceDeltaMinor: modDelta
        });

        renderCartPill();
        recalculateQuote();
        updateQtyDisplay(selectedItemId);
        closeItemSheet();
      }
    }
    window.confirmSheetAdd = confirmSheetAdd;

    function toggleFjordSpec(itemId) {
      const el = document.getElementById('spec-' + itemId);
      if (el) el.classList.toggle('open');
    }
    window.toggleFjordSpec = toggleFjordSpec;

    function openCartSheet() {
      const pill = document.getElementById('floating-cart-pill');
      if (pill) pill.style.display = 'none';
      const list = document.getElementById('cart-items-list');
      if (cart.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--theme-muted); padding: 24px 0; font-size: 13px;">Your order folio is currently empty.<br/>Select courses from the menu to build your table check.</div>';
      } else {
        list.innerHTML = cart.map((it, idx) => {
          const food = menuData.find(m => m.id === it.id);
          const name = food ? food.name : 'Selected Course';
          const price = food ? food.formattedPrice : '₹350.00';
          return '<div style="display: flex; justify-content: space-between; align-items: center; background: ' + (isLight ? '#F0ECE4' : '#141822') + '; padding: 12px 14px; border-radius: 8px;">' +
            '<div><div style="font-weight: 700;">' + name + '</div>' +
            (it.modifier ? '<div style="font-size: 11px; color: var(--theme-primary); margin-top: 2px;">' + it.modifier + '</div>' : '') +
            '</div>' +
            '<div style="display: flex; align-items: center; gap: 12px;">' +
              '<span style="font-weight: 800; font-family: var(--font-mono);">' + price + '</span>' +
              '<button class="btn btn-ghost btn-sm" onclick="removeItem(' + idx + ')" style="padding: 4px; font-size: 14px; line-height: 1;">&times;</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
      document.getElementById('cart-sheet').classList.add('open');
      const cGuest = document.getElementById('cart-guest-name-input');
      if (cGuest) cGuest.value = currentGuestName || 'Guest';
    }
    window.openCartSheet = openCartSheet;

    function closeCartSheet() {
      document.getElementById('cart-sheet').classList.remove('open');
      renderCartPill();
    }
    window.closeCartSheet = closeCartSheet;

    function removeItem(idx) {
      const it = cart[idx];
      cart.splice(idx, 1);
      renderCartPill();
      recalculateQuote();
      if (it) updateQtyDisplay(it.id);
      openCartSheet();
    }
    window.removeItem = removeItem;

    async function recalculateQuote() {
      try {
        const res = await fetch('/api/restaurant/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: cart }),
        });
        const json = await res.json();
        if (json.success && json.data.breakdown) {
          const sub = json.data.breakdown.subtotalFormatted;
          const tax = json.data.breakdown.taxFormatted;
          const tot = json.data.breakdown.totalFormatted;

          const qSub = document.getElementById('quote-subtotal'); if (qSub) qSub.textContent = sub;
          const qTax = document.getElementById('quote-tax'); if (qTax) qTax.textContent = tax;
          const qTot = document.getElementById('quote-total'); if (qTot) qTot.textContent = tot;

          // Update template-specific pill elements
          const pillTot = document.getElementById('cart-pill-total'); if (pillTot) pillTot.textContent = tot;
          const fjordSub = document.getElementById('fjord-dock-total'); if (fjordSub) fjordSub.textContent = tot;
          const roasteryTot = document.getElementById('roastery-capsule-total'); if (roasteryTot) roasteryTot.textContent = tot;
          const neonTot = document.getElementById('neon-bag-total'); if (neonTot) neonTot.textContent = tot;
          const osteriaTot = document.getElementById('osteria-bill-total'); if (osteriaTot) osteriaTot.textContent = tot;
          const shokuninTot = document.getElementById('shokunin-bento-total'); if (shokuninTot) shokuninTot.textContent = tot;
        }
      } catch (err) {}
    }

    function renderCartPill() {
      const count = cart.length;
      const countEls = document.querySelectorAll('.cart-count, #fjord-dock-count, #roastery-capsule-count, #neon-bag-count, #osteria-bill-count, #shokunin-bento-count');
      countEls.forEach(el => { el.textContent = count; });

      const pillCount = document.getElementById('cart-pill-count');
      if (pillCount) {
        pillCount.textContent = count === 1 ? '1 Item' : count + ' Items';
      }

      const universalPill = document.getElementById('floating-cart-pill');
      if (universalPill) {
        universalPill.style.display = count > 0 ? 'flex' : 'none';
      }
    }

    async function submitKitchenOrder() {
      if (cart.length === 0) return;
      try {
        if (!currentCapabilityToken) {
          try {
            const joinRes = await fetch('/api/restaurant/sessions/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ locator: tableLocator, name: currentGuestName || 'Guest' }),
            });
            const joinJson = await joinRes.json();
            if (joinJson.success && joinJson.data.capabilityToken) {
              currentCapabilityToken = joinJson.data.capabilityToken;
              sessionStorage.setItem('diner_cap_' + tableLocator, currentCapabilityToken);
            }
          } catch (e) {}
        }

        const res = await fetch('/api/restaurant/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentCapabilityToken ? {
              'x-guest-capability': currentCapabilityToken,
              'Authorization': 'Bearer ' + currentCapabilityToken
            } : {})
          },
          body: JSON.stringify({
            locator: tableLocator,
            tableNumber: '${table.number}',
            guestName: currentGuestName,
            items: cart.map(it => ({
              id: it.id,
              quantity: it.quantity,
              modifier: it.modifier,
              selectedModifierIds: it.selectedModifierIds
            }))
          })
        });
        const json = await res.json();
        if (json.success) {
          cart = [];
          renderCartPill();
          closeCartSheet();
          openStatusSheet();
        } else {
          alert('Could not submit order: ' + (json.error || 'Please re-authenticate seating'));
        }
      } catch (err) {
        alert('Communication error submitting kitchen order.');
      }
    }
    window.submitKitchenOrder = submitKitchenOrder;

    function openStatusSheet() { document.getElementById('status-sheet').classList.add('open'); }
    window.openStatusSheet = openStatusSheet;
    function closeStatusSheet() { document.getElementById('status-sheet').classList.remove('open'); }
    window.closeStatusSheet = closeStatusSheet;
    function openServiceRequestSheet() { document.getElementById('service-sheet').classList.add('open'); }
    window.openServiceRequestSheet = openServiceRequestSheet;
    function closeServiceRequestSheet() { document.getElementById('service-sheet').classList.remove('open'); }
    window.closeServiceRequestSheet = closeServiceRequestSheet;

    async function sendServiceRequest(type, note) {
      try {
        await fetch('/api/restaurant/service-requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentCapabilityToken ? { 'x-guest-capability': currentCapabilityToken } : {})
          },
          body: JSON.stringify({ locator: tableLocator, type, note })
        });
        const fb = document.getElementById('service-req-feedback');
        if (fb) {
          fb.style.display = 'block';
          setTimeout(() => { fb.style.display = 'none'; closeServiceRequestSheet(); }, 2000);
        }
      } catch (err) {}
    }
    window.sendServiceRequest = sendServiceRequest;
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1: ATELIER ÉTOILE NOIR (50/50 Asymmetric Split & Tasting Sequence)
// ─────────────────────────────────────────────────────────────────────────────
function renderAtelierEtoileComposition(
  menu: MenuItem[],
  brandName: string,
  brandTagline: string,
  branchName: string,
  table: TableFloorRecord
): string {
  const movements = [
    { title: 'Movement I · Amuse & Cold Starters', category: 'Starters', wine: '2021 Blanc de Blancs Brut Nature' },
    { title: 'Movement II · Wood-Fired Hearth & Tandoor', category: 'Breads', wine: '2019 Sula Dindori Reserve Viognier' },
    { title: 'Movement III · Royal Curries & Heritage Mains', category: 'Mains', wine: '2018 Domaine Barolo Riserva' },
    { title: 'Movement IV · Grand Finale & Sommelier Digestifs', category: 'Desserts', wine: 'Tawny Port 20-Year Aged' },
  ];

  return `
  <div class="storefront-atelier-shell tasting-timeline atelier-editorial-viewport-split">
    <!-- Left Viewport: 50% Fixed Editorial Visual Canvas on Desktop -->
    <aside class="atelier-left-viewport atelier-editorial-sidebar">
      <div class="atelier-brand-lockup">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <span class="atelier-brand-title" style="font-family: var(--diner-font-heading); font-size: 24px; font-weight: 700; color: #FFF; letter-spacing: 0.04em;">${brandName}</span>
          <span class="atelier-table-badge" style="font-size: 11px; font-family: var(--font-mono); color: var(--theme-primary); border: 1px solid var(--theme-primary); padding: 4px 10px; border-radius: 999px; text-transform: uppercase;">Table ${table.number}</span>
        </div>

        <div class="atelier-hearth-canvas" style="position: relative; border-radius: 14px; overflow: hidden; margin-bottom: 20px; border: 1px solid rgba(197, 160, 89, 0.25);">
          <img src="https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=85" alt="Chef Hearth Canvas" style="width: 100%; height: 280px; object-fit: cover; display: block;" />
          <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(8, 10, 13, 0.95) 100%);"></div>
          <div style="position: absolute; bottom: 16px; left: 18px; right: 18px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.16em; color: var(--theme-primary); margin-bottom: 4px;">Cellar Tasting Experience</div>
            <div style="font-family: var(--diner-font-heading); font-size: 19px; font-weight: 700; color: #FFF;">Chronological Movement Progression</div>
          </div>
        </div>

        <blockquote class="atelier-manifesto-quote" style="border-left: 2px solid var(--theme-primary); padding-left: 16px; margin: 0 0 20px; font-style: italic; color: #D1D5DB; font-size: 13px; line-height: 1.55;">
          "${brandTagline}"
        </blockquote>
      </div>

      <div class="atelier-sommelier-card sommelier-drawer" style="background: rgba(18, 22, 30, 0.85); border: 1px solid rgba(197, 160, 89, 0.2); border-radius: 12px; padding: 18px; margin-top: auto;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span style="display:inline-flex;align-items:center;">${icon('coffee', { size: 14, color: 'var(--theme-primary)' })}</span>
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--theme-primary);">Head Sommelier Reserve</span>
        </div>
        <div style="font-size: 12px; color: #9CA3AF; line-height: 1.45;">
          Tonight’s cellar flight pairs mineral-forward blanc de blancs with hearth smoke, and 2018 Piedmont Barolo with rich slow-cooked gravies.
        </div>
      </div>
    </aside>

    <!-- Right Viewport: Scrollable Tasting Movements -->
    <main class="atelier-right-viewport atelier-tasting-progression">
      <div style="margin-bottom: 28px;">
        <span class="cat-pill" style="background: rgba(197, 160, 89, 0.15); color: var(--theme-primary); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px;">
          Autumn Tasting Menu · Ludhiana
        </span>
        <h2 style="font-family: var(--diner-font-heading); font-size: 32px; font-weight: 700; color: #FFF; margin: 4px 0 8px;">
          The Four Movements
        </h2>
        <p style="font-size: 13px; color: #9CA3AF; margin: 0;">
          Select your desired courses to accompany this evening's wine pairing and charcoal hearth progression.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 36px;">
        ${movements
          .map((mov, mIdx) => {
            const items = menu.filter((i) => i.category === mov.category);
            if (items.length === 0) return '';
            return `
          <section class="atelier-movement-section">
            <div style="border-bottom: 1px solid rgba(197, 160, 89, 0.25); padding-bottom: 10px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <span style="font-size: 10px; font-family: var(--font-mono); color: var(--theme-primary); text-transform: uppercase; letter-spacing: 0.14em; font-weight: 800;">Act 0${mIdx + 1}</span>
                <h3 style="font-family: var(--diner-font-heading); font-size: 20px; font-weight: 700; color: #FFF; margin: 2px 0 0;">${mov.title}</h3>
              </div>
              <span style="font-size: 11px; font-style: italic; color: #D1D5DB;">Cellar: ${mov.wine}</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${items
                .map(
                  (item) => `
                <div class="atelier-course-card editorial-sommelier product-card menu-item" onclick="openItemSheet('${item.id}')" style="background: #11141B; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 18px; display: flex; gap: 18px; align-items: center; transition: all 140ms ease; cursor: pointer;">
                  <img src="${getItemThumbnail(item.id)}" alt="${item.name}" class="plate-thumb-circular" />
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                      <h4 style="font-family: var(--diner-font-heading); font-size: 18px; font-weight: 700; color: #FFF; margin: 0;">${item.name}</h4>
                      <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 800; color: var(--theme-primary);">${item.formattedPrice}</span>
                    </div>
                    <p style="font-size: 12px; color: #9CA3AF; margin: 4px 0 10px; line-height: 1.45;">${item.description}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 11px; color: #D1D5DB; font-style: italic;">Pairing Note: Hand-selected seasonal vintage</span>
                      <button class="btn btn-secondary btn-sm add-btn" onclick="event.stopPropagation(); quickAddToCart('${item.id}')" style="padding: 6px 14px; font-size: 11px; font-weight: 800; border-color: rgba(197, 160, 89, 0.4); color: #FFF;">
                        + Select Course
                      </button>
                    </div>
                  </div>
                </div>`
                )
                .join('')}
            </div>
          </section>`;
          })
          .join('')}
      </div>
    </main>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2: FJORD & FORM (Nordic Editorial Food Journal)
// ─────────────────────────────────────────────────────────────────────────────
function renderFjordFormComposition(
  menu: MenuItem[],
  brandName: string,
  brandTagline: string,
  branchName: string,
  table: TableFloorRecord
): string {
  const starters = menu.filter((i) => i.category === 'Starters');
  const mains = menu.filter((i) => i.category === 'Mains' || i.category === 'Breads');
  const infusions = menu.filter((i) => i.category === 'Beverages' || i.category === 'Desserts');

  return `
  <div class="storefront-fjord-shell">
    <!-- Editorial Journal Masthead -->
    <header style="border-bottom: 2px solid #1C1E21; padding-bottom: 24px; margin-bottom: 32px;">
      <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B; margin-bottom: 12px;">
        <span>Arctic Harvest Circle · 68°24'N 14°36'E</span>
        <span>Table ${table.number} · Seated Guest Journal</span>
      </div>
      <h1 style="font-size: 38px; font-weight: 900; letter-spacing: -0.03em; margin: 0 0 8px; color: #1C1E21;">
        Fjord & Form Botanical
      </h1>
      <p style="font-size: 14px; color: #475569; margin: 0; max-width: 720px; line-height: 1.55;">
        ${brandTagline}
      </p>
    </header>

    <!-- Editorial Hero Showcase -->
    <div class="fjord-journal-hero-card">
      <div class="fjord-hero-image-wrap">
        <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=85" alt="Nordic Foraging Table" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
        <div style="position: absolute; inset: 0; background: linear-gradient(180deg, transparent 30%, rgba(20, 23, 26, 0.95) 100%);"></div>
        <div style="position: absolute; bottom: 24px; left: 28px; right: 28px; color: #FFF;">
          <span style="font-size: 10px; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.14em; color: #A7F3D0; font-weight: 800;">Journal Volume 08</span>
          <div style="font-size: 22px; font-weight: 800; margin-top: 4px; letter-spacing: -0.01em;">"Cold Fjords, Pine Embers & Honest Terroir"</div>
          <p style="font-size: 12px; color: #CBD5E1; margin: 4px 0 0; max-width: 600px;">
            We cook solely with what the cold northern currents and ancient forests provide. Each course is presented in its pure architectural essence.
          </p>
        </div>
      </div>
    </div>

    <!-- Chapter Navigation Bar -->
    <div class="fjord-chapter-pills-bar">
      <button class="cat-pill" style="background: #1C1E21; color: #FFF; font-size: 11px;">Chapter I · Cold Waters & Crudo</button>
      <button class="cat-pill" style="background: #EAE6DF; color: #1C1E21; font-size: 11px;">Chapter II · Hearth Provisions</button>
      <button class="cat-pill" style="background: #EAE6DF; color: #1C1E21; font-size: 11px;">Chapter III · Wild Infusions</button>
    </div>

    <!-- Main Editorial Feed -->
    <main style="display: flex; flex-direction: column; gap: 40px;">
      <!-- Chapter 1 -->
      <section>
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #1C1E21; padding-bottom: 8px; margin-bottom: 20px;">
          <div>
            <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #2D5A43;">Chapter I</span>
            <h2 style="font-size: 22px; font-weight: 800; color: #1C1E21; margin: 2px 0 0;">Foraged Coastal Plates & Crudo</h2>
          </div>
          <span style="font-size: 11px; font-family: var(--font-mono); color: #64748B;">4 Selections</span>
        </div>
        <div class="fjord-chapter-grid">
          ${starters.map((item, idx) => renderFjordEditorialRow(item, `LOT-08${idx + 1}`, 'Lofoten Cold Fjords')).join('')}
        </div>
      </section>

      <!-- Chapter 2 -->
      <section>
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #1C1E21; padding-bottom: 8px; margin-bottom: 20px;">
          <div>
            <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #2D5A43;">Chapter II</span>
            <h2 style="font-size: 22px; font-weight: 800; color: #1C1E21; margin: 2px 0 0;">Fermented Grains, Hearth Curries & Mains</h2>
          </div>
          <span style="font-size: 11px; font-family: var(--font-mono); color: #64748B;">Hearth-Fired</span>
        </div>
        <div class="fjord-chapter-grid">
          ${mains.map((item, idx) => renderFjordEditorialRow(item, `LOT-09${idx + 1}`, 'Österlen Stone Hearth')).join('')}
        </div>
      </section>

      <!-- Chapter 3 -->
      <section>
        <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #1C1E21; padding-bottom: 8px; margin-bottom: 20px;">
          <div>
            <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; color: #2D5A43;">Chapter III</span>
            <h2 style="font-size: 22px; font-weight: 800; color: #1C1E21; margin: 2px 0 0;">Cold Extraction Infusions & Sweet Finishes</h2>
          </div>
          <span style="font-size: 11px; font-family: var(--font-mono); color: #64748B;">Cold Steep</span>
        </div>
        <div class="fjord-chapter-grid">
          ${infusions.map((item, idx) => renderFjordEditorialRow(item, `LOT-10${idx + 1}`, 'Nordic Botanical Cellar')).join('')}
        </div>
      </section>
    </main>

    <!-- Fjord Minimalist Bottom Receipt Dock -->
    <footer class="fjord-receipt-dock">
      <div style="display: flex; align-items: center; gap: 16px;">
        <span style="font-family: var(--font-mono); font-size: 13px; font-weight: 700;">
          <span id="fjord-dock-count">0</span> Courses Selected
        </span>
        <span style="font-size: 11px; color: #94A3B8;">5% GST Applicable · Seated Folio</span>
      </div>
      <div style="display: flex; align-items: center; gap: 14px;">
        <span id="fjord-dock-total" style="font-family: var(--font-mono); font-size: 16px; font-weight: 900; color: #FFF;">₹0.00</span>
        <button onclick="openCartSheet()" style="background: #FFF; color: #1C1E21; font-weight: 800; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 12px;">
          Review Tasting Folio →
        </button>
      </div>
    </footer>
  </div>`;
}

function renderFjordEditorialRow(item: MenuItem, lotCode: string, provenance: string): string {
  const allergenStr = item.allergens && item.allergens.length > 0 ? item.allergens.join(', ') : 'None';
  return `
  <div class="fjord-editorial-row product-card menu-item" onclick="openItemSheet('${item.id}')">
    <img src="${getItemThumbnail(item.id)}" alt="${item.name}" class="fjord-dish-visual" />
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 17px; font-weight: 800; color: #1C1E21;">${item.name}</span>
            <span style="font-size: 9px; font-family: var(--font-mono); background: #E8F0EC; color: #2D5A43; padding: 2px 7px; border-radius: 4px; font-weight: 800;">${lotCode}</span>
          </div>
          <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 900; color: #1C1E21;">${item.formattedPrice}</span>
        </div>
        <p style="font-size: 13px; color: #475569; margin: 0 0 6px; line-height: 1.45;">${item.description}</p>
        <div style="font-size: 11px; color: #64748B; font-family: var(--font-mono);">Provenance: ${provenance}</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06);">
        <span style="font-size: 11px; color: #2D5A43; font-weight: 700;">Organic · Foraged Standard</span>
        <button onclick="event.stopPropagation(); quickAddToCart('${item.id}')" style="background: #1C1E21; color: #FFF; border: none; padding: 7px 16px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer;">
          + Select Course
        </button>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3: ROASTERY 1984 (Modern Specialty Café Bar)
// ─────────────────────────────────────────────────────────────────────────────
function renderRoastery1984Composition(
  menu: MenuItem[],
  brandName: string,
  brandTagline: string,
  branchName: string,
  table: TableFloorRecord
): string {
  return `
  <div class="storefront-roastery-shell">
    <!-- Barista Header & Extraction Notes -->
    <header style="border-bottom: 1px solid rgba(140, 78, 45, 0.2); padding-bottom: 24px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--theme-primary);">
          Micro-Lot Roastery & Vitrine Counter
        </span>
        <span class="cat-pill" style="background: rgba(200, 107, 60, 0.15); color: var(--theme-primary); font-size: 10px;">
          Batch Roast #84 · Table ${table.number}
        </span>
      </div>
      <h1 style="font-family: var(--diner-font-heading); font-size: 34px; font-weight: 800; color: #241D17; margin: 0 0 6px;">
        Craft Pours & Oven Vitrine
      </h1>
      <p style="font-size: 13px; color: #786C60; margin: 0 0 16px; line-height: 1.45;">${brandTagline}</p>

      <!-- Aroma Spectrum Dials -->
      <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
        <span class="cat-pill" style="background: #FFF; border: 1px solid rgba(200, 107, 60, 0.3); color: var(--theme-primary);">Jasmine Florals</span>
        <span class="cat-pill" style="background: #FFF; border: 1px solid rgba(200, 107, 60, 0.3); color: var(--theme-primary);">Wild Bergamot</span>
        <span class="cat-pill" style="background: #FFF; border: 1px solid rgba(200, 107, 60, 0.3); color: var(--theme-primary);">Raw Honey</span>
        <span class="cat-pill" style="background: #FFF; border: 1px solid rgba(200, 107, 60, 0.3); color: var(--theme-primary);">Toasted Hazelnut</span>
      </div>
    </header>

    <!-- Category Pill Strip -->
    <div class="roastery-category-strip">
      <button class="cat-pill" style="background: #241D17; color: #FFF;">All Offerings</button>
      <button class="cat-pill" style="background: #FFF; border: 1px solid rgba(140, 78, 45, 0.2); color: #241D17;">Espresso Bar</button>
      <button class="cat-pill" style="background: #FFF; border: 1px solid rgba(140, 78, 45, 0.2); color: #241D17;">Manual Pour Over</button>
      <button class="cat-pill" style="background: #FFF; border: 1px solid rgba(140, 78, 45, 0.2); color: #241D17;">Vitrine Bakery (Fresh)</button>
    </div>

    <!-- 3-Column Tactile Vitrine Grid with Mounted [- 1 +] Steppers -->
    <main class="roastery-vitrine-grid">
      ${menu
        .map(
          (item) => `
        <div class="roastery-card product-card menu-item" onclick="openItemSheet('${item.id}')">
          <div>
            <div style="position: relative; border-radius: 12px; overflow: hidden; height: 170px; margin-bottom: 14px; background: #EFEBE4;">
              <img src="${getItemThumbnail(item.id)}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              <span style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.65); backdrop-filter: blur(4px); color: #FFF; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px;">
                ${item.category}
              </span>
            </div>
            <div style="font-family: var(--diner-font-heading); font-size: 18px; font-weight: 800; color: #241D17;">${item.name}</div>
            <div style="font-size: 12px; color: #786C60; line-height: 1.45; margin-top: 4px;">${item.description}</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.06);">
            <span style="font-family: var(--font-mono); font-size: 16px; font-weight: 800; color: var(--theme-primary);">${item.formattedPrice}</span>

            <!-- Tactile [- 1 +] Stepper -->
            <div style="display: flex; align-items: center; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 999px; padding: 2px 4px;" onclick="event.stopPropagation();">
              <button onclick="stepItemQuantity('${item.id}', -1)" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: transparent; font-weight: 800; font-size: 16px; cursor: pointer; color: #241D17;">−</button>
              <span id="qty-${item.id}" style="min-width: 26px; text-align: center; font-weight: 800; font-size: 13px; font-family: var(--font-mono); color: #241D17;">0</span>
              <button onclick="stepItemQuantity('${item.id}', 1)" style="width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--theme-primary); color: #FFF; font-weight: 800; font-size: 16px; cursor: pointer;">+</button>
            </div>
          </div>
        </div>`
        )
        .join('')}
    </main>

    <!-- Floating Tactile Capsule Pill -->
    <div class="roastery-floating-capsule" onclick="openCartSheet()">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display:inline-flex;align-items:center;">${icon('coffee', { size: 16, color: '#FFF' })}</span>
        <span style="font-size: 13px; font-weight: 700;"><span id="roastery-capsule-count">0</span> Items in Vitrine Order</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span id="roastery-capsule-total" style="font-family: var(--font-mono); font-weight: 800; font-size: 15px;">₹0.00</span>
        <span style="font-size: 12px; font-weight: 700; color: var(--color-linen);">Send to Barista →</span>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4: NEON YOKOCHO (Contemporary Street Food Market)
// ─────────────────────────────────────────────────────────────────────────────
function renderNeonYokochoComposition(
  menu: MenuItem[],
  brandName: string,
  brandTagline: string,
  branchName: string,
  table: TableFloorRecord
): string {
  const skewers = menu.filter((i) => i.category === 'Starters');
  const wokBowls = menu.filter((i) => i.category !== 'Starters');

  return `
  <div class="storefront-neon-shell">
    <!-- Street Marquee Header -->
    <header style="border-bottom: 2px solid #FF5722; padding-bottom: 20px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
        <span class="cat-pill" style="background: #FF5722; color: #FFF; font-size: 10px; font-weight: 900; letter-spacing: 0.12em; display: inline-flex; align-items: center; gap: 4px;">
          ${icon('flame', { size: 12, strokeWidth: 2.5 })} SIZZLING ROBATA & WOK HEAT
        </span>
        <span style="font-family: var(--font-mono); font-size: 11px; color: #FFC107;">OPEN TIL 02:00 AM · TABLE ${table.number}</span>
      </div>
      <h1 style="font-family: var(--diner-font-heading); font-size: clamp(24px, 6vw, 34px); font-weight: 900; letter-spacing: -0.02em; margin: 0; text-transform: uppercase; color: #FFF;">
        Neon Yokocho // 東京夜市
      </h1>
      <p style="font-size: 13px; color: #D1D5DB; margin: 4px 0 0; line-height: 1.4;">${brandTagline}</p>
    </header>

    <!-- Visual Category Scroller -->
    <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 24px;">
      <button class="cat-pill" style="background: #FF5722; color: #FFF; display: inline-flex; align-items: center; gap: 6px;">
        ${icon('flame', { size: 14, color: '#FFF' })} Charcoal Robata Skewers
      </button>
      <button class="cat-pill" style="background: #181E2C; border: 1px solid rgba(255,87,34,0.3); color: #FFF; display: inline-flex; align-items: center; gap: 6px;">
        ${icon('layers', { size: 14, color: '#FF5722' })} Steamed Bao & Dumplings
      </button>
      <button class="cat-pill" style="background: #181E2C; border: 1px solid rgba(255,87,34,0.3); color: #FFF; display: inline-flex; align-items: center; gap: 6px;">
        ${icon('utensils', { size: 14, color: '#FF5722' })} Wok Bowls & Sizzling Noodles
      </button>
    </div>

    <!-- Parallel Market Stalls Grid -->
    <main class="neon-stall-grid">
      <!-- Stall 01 -->
      <section>
        <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #FF5722; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
          <span style="display:inline-flex;align-items:center;">${icon('flame', { size: 16, color: '#FF5722' })}</span>
          <span>Stall 01: Bincho-tan Charcoal Skewers</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${skewers.map((item) => renderNeonStreetCard(item, '#FF5722')).join('')}
        </div>
      </section>

      <!-- Stall 02 -->
      <section>
        <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #FF2A55; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
          <span style="display:inline-flex;align-items:center;">${icon('utensils', { size: 16, color: '#FF2A55' })}</span>
          <span>Stall 02: Wok Fire, Smashed Bao & Cold Pours</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${wokBowls.map((item) => renderNeonStreetCard(item, '#FF2A55')).join('')}
        </div>
      </section>
    </main>

    <!-- Bottom Street Order Bag -->
    <div class="neon-street-bag" onclick="openCartSheet()">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="display:inline-flex;align-items:center;">${icon('flame', { size: 16, color: '#FFF' })}</span>
        <span><span id="neon-bag-count">0</span> Street Bites in Bag</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span id="neon-bag-total" style="font-family: var(--font-mono); font-size: 15px;">₹0.00</span>
        <span>RAPID CHECKOUT →</span>
      </div>
    </div>
  </div>`;
}

function renderNeonStreetCard(item: MenuItem, accentHex: string): string {
  return `
  <div class="neon-ticket-card product-card menu-item" onclick="openItemSheet('${item.id}')" style="border-color: ${accentHex}55;">
    <img src="${getItemThumbnail(item.id)}" alt="${item.name}" style="width: 80px; height: 80px; border-radius: 10px; object-fit: cover; flex-shrink: 0; border: 1px solid ${accentHex}88;" />
    <div style="flex: 1;">
      <div style="font-size: 16px; font-weight: 800; color: #FFF;">${item.name}</div>
      <div style="font-size: 11px; color: #94A3B8; margin-top: 3px; line-height: 1.4;">${item.description}</div>
      <div style="margin-top: 6px;">
        <span style="font-size: 9px; font-weight: 900; color: ${accentHex}; background: ${accentHex}22; padding: 2px 7px; border-radius: 4px;">STREET HEAT</span>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
      <span style="font-family: var(--font-mono); font-weight: 900; font-size: 15px; color: ${accentHex};">${item.formattedPrice}</span>
      <button onclick="event.stopPropagation(); quickAddToCart('${item.id}')" style="padding: 7px 14px; font-size: 11px; font-weight: 900; background: ${accentHex}; color: #FFF; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
        <span>+ ADD</span>
      </button>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5: OSTERIA RUSTICA (Immersive Italian Hospitality)
// ─────────────────────────────────────────────────────────────────────────────
function renderOsteriaRusticaComposition(
  menu: MenuItem[],
  brandName: string,
  brandTagline: string,
  branchName: string,
  table: TableFloorRecord
): string {
  const antipasti = menu.filter((i) => i.category === 'Starters' || i.category === 'Breads');
  const secondi = menu.filter((i) => i.category === 'Mains' || i.category === 'Desserts' || i.category === 'Beverages');

  return `
  <div class="storefront-osteria-shell">
    <!-- Tuscan Storytelling Header -->
    <header style="text-align: center; border-bottom: 1px solid rgba(140, 56, 32, 0.2); padding-bottom: 28px; margin-bottom: 28px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--theme-secondary); margin-bottom: 8px;">
        Forno a Legna & Pasta Fatta a Mano dal 1974 · Tavolo ${table.number}
      </div>
      <h1 style="font-family: var(--diner-font-heading); font-size: 38px; font-weight: 700; color: #241D17; margin: 0 0 8px;">
        Osteria Rustica Convivial
      </h1>
      <p style="font-size: 13px; color: #7C6F62; max-width: 620px; margin: 0 auto 20px; line-height: 1.55;">${brandTagline}</p>

      <!-- Tavola Grande Family Feast Callout -->
      <div style="background: rgba(140, 56, 32, 0.08); border: 1px solid var(--theme-primary); border-radius: 12px; padding: 16px 22px; max-width: 640px; margin: 0 auto; text-align: left;">
        <div style="font-size: 14px; font-weight: 800; color: var(--theme-primary);">Tavola Grande: Convivial Sharing Feast (-15%)</div>
        <div style="font-size: 12px; color: #7C6F62; margin-top: 4px; line-height: 1.45;">
          Generous antipasti boards, slow-braised ragùs, and wood-fired oven pizzas bundled for the entire table.
        </div>
      </div>
    </header>

    <!-- Italian Course Progression -->
    <main>
      <section style="margin-bottom: 36px;">
        <h2 style="font-family: var(--diner-font-heading); font-size: 22px; font-weight: 700; color: #241D17; border-bottom: 1px solid rgba(140, 56, 32, 0.2); padding-bottom: 8px; margin-bottom: 18px;">
          Antipasti Rustici & Focaccia al Forno
        </h2>
        <div class="osteria-course-grid">
          ${antipasti.map((item) => renderOsteriaFramedCard(item)).join('')}
        </div>
      </section>

      <section>
        <h2 style="font-family: var(--diner-font-heading); font-size: 22px; font-weight: 700; color: #241D17; border-bottom: 1px solid rgba(140, 56, 32, 0.2); padding-bottom: 8px; margin-bottom: 18px;">
          Primi Piatti, Secondi al Forno & Dolci
        </h2>
        <div class="osteria-course-grid">
          ${secondi.map((item) => renderOsteriaFramedCard(item)).join('')}
        </div>
      </section>
    </main>

    <!-- Floating Bill Presenter Capsule -->
    <div class="osteria-floating-bill" onclick="openCartSheet()">
      <div style="font-size: 13px; font-weight: 700;">Il Conto del Tavolo (${table.number}) · <span id="osteria-bill-count">0</span> Portate</div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span id="osteria-bill-total" style="font-family: var(--font-mono); font-weight: 800; font-size: 15px;">₹0.00</span>
        <span style="font-size: 12px;">Visualizza Conto →</span>
      </div>
    </div>
  </div>`;
}

function renderOsteriaFramedCard(item: MenuItem): string {
  return `
  <div class="osteria-framed-card product-card menu-item" onclick="openItemSheet('${item.id}')">
    <img src="${getItemThumbnail(item.id)}" alt="${item.name}" style="width: 100px; height: 100px; border-radius: 10px; object-fit: cover; flex-shrink: 0;" />
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span style="font-family: var(--diner-font-heading); font-size: 18px; font-weight: 700; color: #241D17;">${item.name}</span>
          <span style="font-size: 9px; font-weight: 800; color: var(--theme-secondary); background: rgba(61, 74, 57, 0.1); padding: 2px 7px; border-radius: 4px;">DOP CERTIFIED</span>
        </div>
        <div style="font-size: 12px; color: #7C6F62; line-height: 1.45; margin-top: 4px;">${item.description}</div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
        <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 800; color: var(--theme-primary);">${item.formattedPrice}</span>
        <button onclick="event.stopPropagation(); quickAddToCart('${item.id}')" style="background: var(--theme-primary); color: #FFF; border: none; padding: 7px 18px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;">
          + Ordina
        </button>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 6: SHOKUNIN RAMEN (Japanese Ramen Craft Slips & Izakaya)
// ─────────────────────────────────────────────────────────────────────────────
function renderShokuninRamenComposition(
  menu: MenuItem[],
  brandName: string,
  brandTagline: string,
  branchName: string,
  table: TableFloorRecord
): string {
  const ramenStarters = menu.filter((i) => i.category === 'Starters');
  const ramenMains = menu.filter((i) => i.category !== 'Starters');
  const featuredRamen = ramenMains[0] || menu[0];

  return `
  <div class="storefront-shokunin-shell">
    <!-- Calligraphy Masthead -->
    <header style="border-bottom: 2px solid var(--theme-primary); padding-bottom: 24px; margin-bottom: 28px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: clamp(18px, 4.5vw, 24px); font-weight: 900; letter-spacing: 0.22em; color: #FF5A36; text-shadow: 0 0 16px rgba(255, 90, 54, 0.45);">職人魂 · 極上出汁</span>
        <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: #D4C5B9;">KANSUI 32% · SIMMERED 18 HOURS · TBL ${table.number}</span>
      </div>
      <h1 style="font-family: var(--diner-font-heading); font-size: clamp(24px, 6vw, 34px); font-weight: 700; color: #F7F4EB; margin: 4px 0 6px;">
        Shokunin Ramen & Robata Bar
      </h1>
      <p style="font-size: 13px; color: #9E9285; margin: 0 0 18px; line-height: 1.45;">${brandTagline}</p>
    </header>

    <!-- Interactive 4-Step Craft Ramen Order Slip -->
    <div class="shokunin-interactive-slip">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div>
          <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.14em; color: var(--theme-primary);">Master Artisan Custom Slip</span>
          <h2 style="font-size: 20px; font-weight: 800; color: #FFF; margin: 2px 0 0;">Craft Your Custom Ramen Bowl</h2>
        </div>
        <span style="font-family: var(--font-mono); font-size: 15px; font-weight: 900; color: var(--theme-primary);">${featuredRamen ? featuredRamen.formattedPrice : '₹350.00'}</span>
      </div>

      <!-- Step 1: Broth Richness -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9E9285; margin-bottom: 6px;">1. Dashi Broth Richness:</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('broth', 'Light Dashi', this)">Assari (Light)</button>
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('broth', 'Medium Dashi', this)">Futsuu (Standard)</button>
          <button class="shokunin-slip-chip active" onclick="setRamenSlipOption('broth', 'Kotteri (Ultra-Rich)', this)">Kotteri (Ultra-Rich)</button>
        </div>
      </div>

      <!-- Step 2: Noodle Texture -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9E9285; margin-bottom: 6px;">2. Noodle Texture:</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('noodles', 'Soft', this)">Soft</button>
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('noodles', 'Standard', this)">Standard</button>
          <button class="shokunin-slip-chip active" onclick="setRamenSlipOption('noodles', 'Katame (Firm)', this)">Katame (Firm)</button>
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('noodles', 'Barikata (Extra-Firm)', this)">Barikata (Extra-Firm)</button>
        </div>
      </div>

      <!-- Step 3: Garlic Level -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9E9285; margin-bottom: 6px;">3. Fresh Garlic Level:</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('garlic', 'None', this)">None</button>
          <button class="shokunin-slip-chip active" onclick="setRamenSlipOption('garlic', 'Standard', this)">Standard (1 Clove)</button>
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('garlic', 'Heavy', this)">Heavy (2 Cloves)</button>
        </div>
      </div>

      <!-- Step 4: Secret Red Tare -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #9E9285; margin-bottom: 6px;">4. Secret Red Chili Tare:</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('tare', 'None', this)">None</button>
          <button class="shokunin-slip-chip active" onclick="setRamenSlipOption('tare', 'Mild (1x)', this)">Mild (1x)</button>
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('tare', 'Double (2x)', this)">Double (2x)</button>
          <button class="shokunin-slip-chip" onclick="setRamenSlipOption('tare', 'Fire (3x)', this)">Fire (3x)</button>
        </div>
      </div>

      <button onclick="submitRamenSlipItem('${featuredRamen ? featuredRamen.id : 'item_paneer_tikka'}')" style="width: 100%; background: var(--theme-primary); color: #FFF; border: none; padding: 12px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer;">
        Submit Custom Ramen Slip to Kitchen →
      </button>
    </div>

    <!-- Cedar Board Menu -->
    <main>
      <section style="margin-bottom: 32px;">
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--theme-secondary); letter-spacing: 0.1em; border-bottom: 1px solid rgba(16, 185, 129, 0.3); padding-bottom: 6px; margin-bottom: 14px;">
          Izakaya Otsumami & Yakitori Skewers
        </div>
        <div class="shokunin-menu-grid">
          ${ramenStarters.map((item) => renderShokuninSlatCard(item)).join('')}
        </div>
      </section>

      <section>
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--theme-secondary); letter-spacing: 0.1em; border-bottom: 1px solid rgba(16, 185, 129, 0.3); padding-bottom: 6px; margin-bottom: 14px;">
          Signature Shokunin Ramen Bowls & Mains
        </div>
        <div class="shokunin-menu-grid">
          ${ramenMains.map((item) => renderShokuninSlatCard(item)).join('')}
        </div>
      </section>
    </main>

    <!-- Bento Tray Floating Check -->
    <div class="shokunin-floating-bento" onclick="openCartSheet()">
      <div style="font-size: 13px; font-weight: 700; color: #F7F4EB;">
        伝票 · Table ${table.number} Order (<span id="shokunin-bento-count">0</span> Items)
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span id="shokunin-bento-total" style="font-family: var(--font-mono); font-weight: 800; color: var(--theme-primary); font-size: 15px;">₹0.00</span>
        <span style="font-size: 12px; color: #F7F4EB;">注文確認 →</span>
      </div>
    </div>
  </div>`;
}

function renderShokuninSlatCard(item: MenuItem): string {
  return `
  <div class="shokunin-slat-card product-card menu-item" onclick="openItemSheet('${item.id}')">
    <img src="${getItemThumbnail(item.id)}" alt="${item.name}" style="width: 76px; height: 76px; border-radius: 8px; object-fit: cover; flex-shrink: 0;" />
    <div style="flex: 1; padding: 0 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px; font-weight: 700; color: #F7F4EB;">${item.name}</span>
        <span style="font-size: 9px; font-weight: 700; color: var(--theme-secondary); background: rgba(16, 185, 129, 0.15); padding: 2px 6px; border-radius: 3px;">18H DASHI</span>
      </div>
      <div style="font-size: 12px; color: #9E9285; margin-top: 2px;">${item.description}</div>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
      <span style="font-family: var(--font-mono); font-weight: 800; font-size: 15px; color: var(--theme-primary);">${item.formattedPrice}</span>
      <button onclick="event.stopPropagation(); quickAddToCart('${item.id}')" style="background: var(--theme-primary); color: #FFF; border: none; padding: 7px 16px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer;">
        + Order Bowl
      </button>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function normalizeTemplateId(id: string): string {
  const map: Record<string, string> = {
    tmpl_haute_gastronomy: 'tmpl_haute_gastronomy',
    tmpl_atelier_etoile_4_1: 'tmpl_haute_gastronomy',
    tmpl_atelier_etoile_noir: 'tmpl_haute_gastronomy',
    'haute-gastronomy': 'tmpl_haute_gastronomy',
    'atelier-etoile': 'tmpl_haute_gastronomy',

    tmpl_nordic_minimal: 'tmpl_nordic_minimal',
    tmpl_fjord_form_4_1: 'tmpl_nordic_minimal',
    tmpl_fjord_form_nordic: 'tmpl_nordic_minimal',
    'nordic-minimal': 'tmpl_nordic_minimal',
    'fjord-form': 'tmpl_nordic_minimal',

    tmpl_artisan_coffee: 'tmpl_artisan_coffee',
    tmpl_roastery_1984_4_1: 'tmpl_artisan_coffee',
    tmpl_roastery_1984_cafe: 'tmpl_artisan_coffee',
    'artisan-coffee': 'tmpl_artisan_coffee',
    'roastery-1984': 'tmpl_artisan_coffee',

    tmpl_neon_street: 'tmpl_neon_street',
    tmpl_neon_yokocho_4_1: 'tmpl_neon_street',
    tmpl_neon_yokocho_street: 'tmpl_neon_street',
    'neon-street': 'tmpl_neon_street',
    'neon-yokocho': 'tmpl_neon_street',

    tmpl_trattoria_bella: 'tmpl_trattoria_bella',
    tmpl_osteria_rustica_4_1: 'tmpl_trattoria_bella',
    tmpl_osteria_rustica_tratt: 'tmpl_trattoria_bella',
    'trattoria-bella': 'tmpl_trattoria_bella',
    'osteria-rustica': 'tmpl_trattoria_bella',

    tmpl_tokyo_izakaya: 'tmpl_tokyo_izakaya',
    tmpl_shokunin_ramen_4_1: 'tmpl_tokyo_izakaya',
    tmpl_shokunin_ramen_tokyo: 'tmpl_tokyo_izakaya',
    'tokyo-izakaya': 'tmpl_tokyo_izakaya',
    'shokunin-ramen': 'tmpl_tokyo_izakaya',
  };
  return map[id] || 'tmpl_haute_gastronomy';
}

function getItemThumbnail(itemId: string): string {
  const images: Record<string, string> = {
    item_paneer_tikka: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&auto=format&fit=crop&q=85',
    item_fish_tikka: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=800&auto=format&fit=crop&q=85',
    item_dal_makhani: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=85',
    item_butter_chicken: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&auto=format&fit=crop&q=85',
    item_butter_naan: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800&auto=format&fit=crop&q=85',
    item_garlic_naan: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=85',
    item_mango_lassi: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=85',
    item_gulab_jamun: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=85',
  };
  return images[itemId] || 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=800&auto=format&fit=crop&q=85';
}
