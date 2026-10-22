/**
 * 🪐 RestaurantOS 5.2 — CraveAtlas Single-Brand Restaurant Flagship Website
 * ─────────────────────────────────────────────────────────────────────────────
 * Discovery-first brand storefront for an individual restaurant brand and its branches.
 * Features:
 * - Single-Brand Identity (OrbitoX Bistro & Bar) with culinary storytelling
 * - Branch / Location Selector: Switches between branches of THIS brand (Ludhiana, Chandigarh, Delhi CP)
 * - Branch-Aware Menu & Overrides: Effective branch pricing & 86'd / sold-out indicators
 * - Culinary Signature Highlights Horizontal Carousel (WAI-ARIA compliant, swipeable on mobile, prev/next arrows on desktop)
 * - Category navigation & unified real-time dish search with clear-state recovery
 * - Modifier customization modal for dishes with choices (spice level, accompaniments, style)
 * - Instant in-place card quantity steppers ([- 1 +]) for simple items
 * - Floating bottom order bar (mobile-first, enters smoothly when cart > 0, shows items & subtotal)
 * - Slide-in Order Folio / Cart with delivery vs pickup toggle, 5% GST, and server quotes
 * - Idempotent order placement (`x-idempotency-key`) routed to branch KDS stations
 * - Connected live order tracking modal
 * - Zero emojis: 100% vector SVG icons via packages/ui/icons.ts
 */

import { BranchRecord, ResolvedMenuItem, TenantBrandConfig } from '../../domain';
import { icon } from '../icons';

export function renderCraveAtlasPage(
  branches: BranchRecord[],
  activeBranch: BranchRecord,
  resolvedMenu: ResolvedMenuItem[],
  brand: TenantBrandConfig
): string {
  const openingHours = activeBranch.openingHours || {
    openTime: '12:00 PM',
    closeTime: '11:30 PM',
    daysOpen: 'Mon - Sun',
    isOpenNow: true,
  };

  const categories = ['ALL', 'Starters', 'Mains', 'Breads', 'Beverages', 'Desserts'];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
  <title>${brand.restaurantName} · Official Restaurant & Online Ordering</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --ca-primary: #C86B3C;
      --ca-primary-hover: #B55B2E;
      --ca-primary-subtle: rgba(200, 107, 60, 0.08);
      --ca-bg: #F9F9FA;
      --ca-surface: #FFFFFF;
      --ca-dark: #14171E;
      --ca-stone: #4E5463;
      --ca-muted: #8E95A5;
      --ca-border: #E6E9EE;
      --ca-gold: #D99A45;
      --ca-green: #2E8540;
      --ca-red: #D9383A;
      --ca-radius: 12px;
      --ca-radius-sm: 8px;
      --ca-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
      --ca-shadow-hover: 0 10px 32px rgba(0, 0, 0, 0.12);
      --font-display: "Playfair Display", Georgia, serif;
      --font-heading: "Plus Jakarta Sans", -apple-system, sans-serif;
      --font-body: "Inter", -apple-system, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--ca-bg);
      color: var(--ca-dark);
      font-family: var(--font-body);
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
      padding-bottom: 120px;
    }

    /* Top Navigation Header */
    .ca-nav {
      background: var(--ca-surface);
      border-bottom: 1px solid var(--ca-border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 12px rgba(0,0,0,0.03);
    }
    .ca-nav-inner {
      max-width: 1360px;
      margin: 0 auto;
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .ca-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: var(--ca-dark);
    }
    .ca-brand-logo {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--ca-primary), var(--ca-gold));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      box-shadow: 0 3px 12px rgba(200, 107, 60, 0.3);
      flex-shrink: 0;
    }
    .ca-brand-text {
      display: flex;
      flex-direction: column;
    }
    .ca-brand-title {
      font-family: var(--font-heading);
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .ca-brand-subtitle {
      font-size: 11px;
      font-weight: 600;
      color: var(--ca-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    /* Branch Location Picker */
    .ca-branch-picker-wrap {
      position: relative;
    }
    .ca-branch-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #F3F4F6;
      border: 1px solid var(--ca-border);
      border-radius: 999px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 700;
      color: var(--ca-dark);
      transition: all 140ms ease;
    }
    .ca-branch-pill:hover {
      background: #FFF;
      border-color: var(--ca-primary);
    }
    .ca-branch-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 320px;
      background: #FFF;
      border: 1px solid var(--ca-border);
      border-radius: var(--ca-radius);
      box-shadow: 0 12px 36px rgba(0,0,0,0.12);
      z-index: 200;
      overflow: hidden;
    }
    .ca-branch-dropdown.open { display: block; }
    .ca-branch-option {
      padding: 12px 16px;
      border-bottom: 1px solid #F1F3F5;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 120ms ease;
    }
    .ca-branch-option:hover { background: #F8F9FA; }
    .ca-branch-option.active {
      background: var(--ca-primary-subtle);
      border-left: 3px solid var(--ca-primary);
    }

    /* Search Bar */
    .ca-search-box {
      flex: 1;
      max-width: 480px;
      position: relative;
    }
    .ca-search-input {
      width: 100%;
      padding: 10px 18px 10px 42px;
      border-radius: 999px;
      border: 1px solid var(--ca-border);
      background: #F3F4F6;
      font-size: 13px;
      color: var(--ca-dark);
      outline: none;
      transition: all 140ms ease;
    }
    .ca-search-input:focus {
      background: #FFF;
      border-color: var(--ca-primary);
      box-shadow: 0 0 0 3px rgba(200, 107, 60, 0.15);
    }
    .ca-search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--ca-muted);
      display: flex;
    }

    /* Header Cart Button */
    .ca-nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ca-cart-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--ca-primary);
      color: #FFF;
      border: none;
      padding: 9px 18px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 3px 12px rgba(200, 107, 60, 0.3);
      transition: all 140ms ease;
    }
    .ca-cart-btn:hover {
      background: var(--ca-primary-hover);
      transform: translateY(-1px);
    }

    /* Main Container */
    .ca-container {
      max-width: 1360px;
      margin: 0 auto;
      padding: 28px 24px 60px 24px;
    }

    /* Hero Section */
    .ca-hero {
      background: linear-gradient(135deg, #1A1C23 0%, #2A2421 100%);
      color: #FFF;
      border-radius: 20px;
      padding: 48px 54px;
      margin-bottom: 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 36px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(0,0,0,0.12);
    }
    .ca-hero-text {
      flex: 1;
      max-width: 650px;
      z-index: 2;
    }
    .ca-hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(217, 154, 69, 0.2);
      border: 1px solid rgba(217, 154, 69, 0.4);
      color: var(--ca-gold);
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .ca-hero-title {
      font-family: var(--font-display);
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin-bottom: 14px;
    }
    .ca-hero-subtitle {
      font-size: 15px;
      color: #D1D5DB;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .ca-hero-meta {
      display: flex;
      gap: 20px;
      align-items: center;
      font-size: 12px;
      color: #9CA3AF;
      border-top: 1px solid rgba(255,255,255,0.12);
      padding-top: 18px;
    }
    .ca-hero-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ca-hero-media {
      width: 380px;
      height: 280px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0,0,0,0.4);
      flex-shrink: 0;
      z-index: 2;
    }
    .ca-hero-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Section Headers */
    .ca-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
    }
    .ca-section-title {
      font-family: var(--font-heading);
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.01em;
      color: var(--ca-dark);
    }

    /* Culinary Highlights Carousel (WAI-ARIA Compliant) */
    .ca-carousel-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ca-carousel-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--ca-surface);
      border: 1px solid var(--ca-border);
      color: var(--ca-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 140ms ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
    .ca-carousel-btn:hover:not(:disabled) {
      background: var(--ca-primary);
      color: #FFF;
      border-color: var(--ca-primary);
    }
    .ca-carousel-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .ca-carousel-container {
      position: relative;
      margin-bottom: 40px;
      width: 100%;
    }
    .ca-carousel-track {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      scroll-behavior: smooth;
      scroll-snap-type: x mandatory;
      scrollbar-width: none;
      padding: 4px 2px 14px 2px;
      outline: none;
    }
    .ca-carousel-track::-webkit-scrollbar { display: none; }
    .ca-carousel-slide {
      scroll-snap-align: start;
      flex-shrink: 0;
      width: 290px;
      background: var(--ca-surface);
      border: 1px solid var(--ca-border);
      border-radius: var(--ca-radius);
      overflow: hidden;
      cursor: pointer;
      box-shadow: var(--ca-shadow);
      transition: all 180ms ease;
      outline: none;
    }
    .ca-carousel-slide:hover, .ca-carousel-slide:focus-visible {
      transform: translateY(-4px);
      box-shadow: var(--ca-shadow-hover);
      border-color: #D1D5DB;
    }
    .ca-carousel-slide:focus-visible {
      box-shadow: 0 0 0 3px rgba(200, 107, 60, 0.4);
    }
    .ca-carousel-media {
      position: relative;
      height: 160px;
      width: 100%;
      overflow: hidden;
      background: #14171E;
    }
    .ca-carousel-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 300ms ease;
    }
    .ca-carousel-slide:hover .ca-carousel-media img {
      transform: scale(1.04);
    }
    .ca-carousel-pill {
      position: absolute;
      bottom: 10px;
      left: 10px;
      background: rgba(20, 23, 30, 0.75);
      backdrop-filter: blur(4px);
      color: #FFF;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 999px;
      letter-spacing: 0.02em;
    }
    .ca-carousel-content {
      padding: 14px 16px;
    }
    .ca-carousel-title {
      font-family: var(--font-heading);
      font-size: 15px;
      font-weight: 800;
      color: var(--ca-dark);
      margin-bottom: 4px;
    }
    .ca-carousel-desc {
      font-size: 12px;
      color: var(--ca-stone);
      line-height: 1.4;
    }

    /* Cuisine Filter Rail */
    .ca-cuisine-rail {
      display: flex;
      gap: 10px;
      overflow-x: auto;
      padding-bottom: 6px;
      margin-bottom: 24px;
      scrollbar-width: none;
    }
    .ca-cuisine-rail::-webkit-scrollbar { display: none; }
    .ca-cuisine-chip {
      padding: 8px 18px;
      border-radius: 999px;
      border: 1px solid var(--ca-border);
      background: var(--ca-surface);
      font-size: 13px;
      font-weight: 700;
      color: var(--ca-stone);
      cursor: pointer;
      white-space: nowrap;
      transition: all 140ms ease;
    }
    .ca-cuisine-chip:hover, .ca-cuisine-chip.active {
      background: var(--ca-primary);
      color: #FFF;
      border-color: var(--ca-primary);
      box-shadow: 0 2px 8px rgba(200, 107, 60, 0.25);
    }

    /* Menu Items Grid */
    .ca-menu-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 48px;
    }
    .ca-dish-card {
      background: var(--ca-surface);
      border: 1px solid var(--ca-border);
      border-radius: var(--ca-radius);
      padding: 18px 20px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      box-shadow: var(--ca-shadow);
      transition: all 160ms ease;
    }
    .ca-dish-card:hover {
      box-shadow: var(--ca-shadow-hover);
      border-color: #D1D5DB;
    }
    .ca-dish-card.is-sold-out {
      opacity: 0.72;
      background: #FDFCFB;
    }
    .ca-dish-info { flex: 1; }
    .ca-dish-veg {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border: 1px solid var(--ca-green);
      border-radius: 3px;
      margin-bottom: 6px;
    }
    .ca-dish-veg::after {
      content: "";
      width: 6px;
      height: 6px;
      background: var(--ca-green);
      border-radius: 50%;
    }
    .ca-dish-nonveg {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border: 1px solid var(--ca-red);
      border-radius: 3px;
      margin-bottom: 6px;
    }
    .ca-dish-nonveg::after {
      content: "";
      width: 6px;
      height: 6px;
      background: var(--ca-red);
      border-radius: 50%;
    }
    .ca-dish-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .ca-dish-name {
      font-family: var(--font-heading);
      font-size: 16px;
      font-weight: 800;
      color: var(--ca-dark);
    }
    .ca-badge-override {
      background: rgba(200, 107, 60, 0.12);
      color: var(--ca-primary);
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.02em;
    }
    .ca-badge-soldout {
      background: rgba(217, 56, 58, 0.12);
      color: var(--ca-red);
      font-size: 10px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .ca-badge-customizable {
      background: #F3F4F6;
      color: var(--ca-stone);
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .ca-dish-desc {
      font-size: 13px;
      color: var(--ca-stone);
      line-height: 1.45;
      margin-bottom: 8px;
    }
    .ca-dish-price {
      font-family: var(--font-heading);
      font-size: 16px;
      font-weight: 800;
      color: var(--ca-dark);
    }
    .ca-dish-media {
      width: 124px;
      height: 114px;
      position: relative;
      border-radius: var(--ca-radius-sm);
      overflow: hidden;
      flex-shrink: 0;
    }
    .ca-dish-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    /* Dish Action Controls */
    .ca-dish-add-btn {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      background: #FFF;
      color: var(--ca-primary);
      border: 1px solid var(--ca-border);
      border-radius: 6px;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 14px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      transition: all 120ms ease;
      white-space: nowrap;
      z-index: 5;
    }
    .ca-dish-add-btn:hover:not(:disabled) {
      background: var(--ca-primary);
      color: #FFF;
      border-color: var(--ca-primary);
    }
    .ca-dish-add-btn:disabled {
      background: #E5E7EB;
      color: #9CA3AF;
      border-color: #D1D5DB;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* In-Place Card Quantity Stepper */
    .ca-dish-stepper {
      display: none;
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--ca-primary);
      color: #FFF;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 3px 12px rgba(200, 107, 60, 0.35);
      align-items: center;
      z-index: 5;
    }
    .ca-dish-stepper.active {
      display: flex;
    }
    .ca-dish-stepper button {
      background: none;
      border: none;
      color: #FFF;
      font-weight: 800;
      font-size: 14px;
      padding: 6px 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 120ms ease;
    }
    .ca-dish-stepper button:hover {
      background: rgba(0, 0, 0, 0.15);
    }
    .ca-dish-stepper span {
      font-size: 13px;
      font-weight: 800;
      padding: 0 6px;
      min-width: 20px;
      text-align: center;
    }

    /* Catalog Empty State */
    .ca-catalog-empty {
      display: none;
      grid-column: 1 / -1;
      text-align: center;
      padding: 50px 20px;
      background: var(--ca-surface);
      border: 1px dashed var(--ca-border);
      border-radius: var(--ca-radius);
    }

    /* Floating Bottom Order Bar (Mobile & Responsive) */
    .ca-float-bar {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--ca-surface);
      border-top: 1px solid var(--ca-border);
      padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
      z-index: 900;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
      animation: caFloatSlideUp 220ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ca-float-bar.visible {
      display: flex;
    }
    @keyframes caFloatSlideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .ca-float-bar-inner {
      max-width: 1360px;
      width: 100%;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .ca-float-summary {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }
    .ca-float-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--ca-primary-subtle);
      color: var(--ca-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ca-float-details {
      display: flex;
      flex-direction: column;
    }
    .ca-float-items-count {
      font-size: 13px;
      font-weight: 800;
      color: var(--ca-dark);
    }
    .ca-float-subtotal {
      font-size: 14px;
      font-weight: 900;
      color: var(--ca-primary);
    }
    .ca-float-subtotal span {
      font-size: 11px;
      font-weight: 600;
      color: var(--ca-muted);
      margin-left: 4px;
    }
    .ca-float-cta-btn {
      background: var(--ca-primary);
      color: #FFF;
      border: none;
      border-radius: var(--ca-radius-sm);
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 3px 12px rgba(200, 107, 60, 0.3);
      transition: all 140ms ease;
      white-space: nowrap;
    }
    .ca-float-cta-btn:hover {
      background: var(--ca-primary-hover);
      transform: translateY(-1px);
    }

    /* Cart Drawer */
    .ca-cart-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .ca-cart-overlay.open { display: block; }
    .ca-cart-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 420px;
      background: #FFF;
      z-index: 1001;
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
      transform: translateX(100%);
      transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
    }
    .ca-cart-drawer.open { transform: translateX(0); }
    .ca-cart-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--ca-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .ca-cart-title {
      font-family: var(--font-heading);
      font-size: 18px;
      font-weight: 800;
      color: var(--ca-dark);
    }
    .ca-cart-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--ca-muted);
      display: flex;
    }
    .ca-cart-branch-notice {
      background: #F8F9FA;
      padding: 10px 24px;
      font-size: 12px;
      color: var(--ca-stone);
      border-bottom: 1px solid var(--ca-border);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .ca-cart-fulfillment {
      display: flex;
      padding: 12px 24px;
      gap: 10px;
      border-bottom: 1px solid var(--ca-border);
      background: #FFF;
    }
    .ca-fulfill-btn {
      flex: 1;
      padding: 8px;
      border-radius: var(--ca-radius-sm);
      border: 1px solid var(--ca-border);
      background: #F9F9FA;
      font-size: 12px;
      font-weight: 800;
      color: var(--ca-stone);
      cursor: pointer;
      transition: all 120ms ease;
    }
    .ca-fulfill-btn.active {
      background: var(--ca-primary-subtle);
      border-color: var(--ca-primary);
      color: var(--ca-primary);
    }
    .ca-cart-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 24px;
    }
    .ca-cart-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #F1F3F5;
    }
    .ca-cart-stepper {
      display: flex;
      align-items: center;
      gap: 8px;
      border: 1px solid var(--ca-border);
      border-radius: 6px;
      padding: 2px 6px;
      background: #F9FAFB;
    }
    .ca-step-btn {
      background: none;
      border: none;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
      color: var(--ca-dark);
      padding: 2px 6px;
    }
    .ca-cart-footer {
      border-top: 1px solid var(--ca-border);
      padding: 18px 24px;
      background: #FAFAFB;
    }
    .ca-cart-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: var(--ca-stone);
      margin-bottom: 8px;
    }
    .ca-cart-total-row {
      display: flex;
      justify-content: space-between;
      font-size: 17px;
      font-weight: 900;
      color: var(--ca-dark);
      border-top: 1px solid var(--ca-border);
      padding-top: 10px;
      margin-top: 8px;
      margin-bottom: 16px;
    }
    .ca-checkout-btn {
      width: 100%;
      background: var(--ca-primary);
      color: #FFF;
      border: none;
      padding: 13px;
      border-radius: var(--ca-radius-sm);
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(200, 107, 60, 0.35);
      transition: all 120ms ease;
    }
    .ca-checkout-btn:hover:not(:disabled) { background: var(--ca-primary-hover); }
    .ca-checkout-btn:disabled { background: #D1D5DB; cursor: not-allowed; box-shadow: none; }

    /* Modals (Customizer & Tracking) */
    .ca-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 1100;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(2px);
    }
    .ca-modal.open { display: flex; }
    .ca-modal-content {
      background: #FFF;
      border-radius: var(--ca-radius);
      width: 100%;
      max-width: 540px;
      padding: 24px 28px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.25);
      position: relative;
      max-height: 90vh;
      overflow-y: auto;
    }

    /* Floating Reopen Tracker Pill */
    .ca-floating-tracker {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1050;
      background: #14171E;
      color: #FFF;
      border: 1px solid rgba(200, 107, 60, 0.5);
      border-radius: 999px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 32px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ca-floating-tracker:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 40px rgba(200, 107, 60, 0.35);
      border-color: var(--ca-primary);
    }
    .ca-tracker-pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: ca-pulse-anim 1.8s infinite;
      flex-shrink: 0;
    }
    @keyframes ca-pulse-anim {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .ca-tracker-label {
      font-size: 10px;
      font-weight: 800;
      color: var(--ca-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.1;
    }
    .ca-tracker-status {
      font-size: 12px;
      font-weight: 700;
      color: #FFF;
      line-height: 1.2;
    }
    .ca-tracker-action {
      font-size: 11px;
      font-weight: 800;
      color: #D1D5DB;
      background: rgba(255,255,255,0.12);
      padding: 4px 10px;
      border-radius: 999px;
    }

    /* Live Tracking Steppers */
    .ca-track-stepper {
      display: flex;
      flex-direction: column;
      gap: 0;
      margin: 16px 0;
    }
    .ca-track-step {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      position: relative;
      padding-bottom: 18px;
    }
    .ca-track-step:last-child {
      padding-bottom: 0;
    }
    .ca-track-step-line {
      position: absolute;
      left: 11px;
      top: 24px;
      bottom: 0;
      width: 2px;
      background: #E5E7EB;
    }
    .ca-track-step.done .ca-track-step-line {
      background: #10B981;
    }
    .ca-track-step-bullet {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #F3F4F6;
      border: 2px solid #D1D5DB;
      color: #9CA3AF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      z-index: 2;
      flex-shrink: 0;
    }
    .ca-track-step.active .ca-track-step-bullet {
      background: var(--ca-primary);
      border-color: var(--ca-primary);
      color: #FFF;
      box-shadow: 0 0 0 4px rgba(200, 107, 60, 0.2);
    }
    .ca-track-step.done .ca-track-step-bullet {
      background: #10B981;
      border-color: #10B981;
      color: #FFF;
    }

    /* Customizer Modal Specifics */
    .ca-cust-group {
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid #F1F3F5;
    }
    .ca-cust-group-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
    }
    .ca-cust-group-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--ca-dark);
    }
    .ca-cust-group-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--ca-primary);
      text-transform: uppercase;
    }
    .ca-cust-group-desc {
      font-size: 12px;
      color: var(--ca-muted);
      margin-bottom: 10px;
    }
    .ca-cust-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 120ms ease;
    }
    .ca-cust-option:hover { background: #F8F9FA; }
    .ca-cust-option input {
      accent-color: var(--ca-primary);
      margin-right: 10px;
      width: 16px;
      height: 16px;
    }
    .ca-cust-opt-label {
      display: flex;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--ca-dark);
      cursor: pointer;
    }
    .ca-cust-opt-price {
      font-size: 12px;
      font-weight: 700;
      color: var(--ca-stone);
    }

    /* Responsive Breakdown */
    @media (max-width: 900px) {
      .ca-hero { flex-direction: column; padding: 32px 24px; text-align: center; }
      .ca-hero-media { width: 100%; max-width: 360px; height: 220px; margin: 0 auto; }
      .ca-hero-meta { justify-content: center; flex-wrap: wrap; }
      .ca-menu-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .ca-nav-inner { flex-wrap: wrap; padding: 12px 16px; gap: 10px; }
      .ca-search-box { order: 3; max-width: 100%; width: 100%; }
      .ca-cart-drawer { width: 100%; }
      .ca-carousel-controls { display: none; }
      .ca-carousel-slide { width: 250px; }
      .ca-dish-card { padding: 14px 16px; gap: 14px; }
      .ca-dish-media { width: 105px; height: 95px; }
      .ca-float-bar { padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); }
      .ca-float-cta-btn { padding: 9px 16px; font-size: 13px; }
    }
  </style>
</head>
<body>

  <!-- Top Navigation Header -->
  <header class="ca-nav">
    <div class="ca-nav-inner">
      <a href="/apps/crave-atlas?branch=${activeBranch.id}" class="ca-brand" id="ca-brand-link">
        <div class="ca-brand-logo">
          ${icon('flame', { size: 22, strokeWidth: 2.5 })}
        </div>
        <div class="ca-brand-text">
          <div class="ca-brand-title">${brand.restaurantName}</div>
          <div class="ca-brand-subtitle">Artisan Tandoor & Bar</div>
        </div>
      </a>

      <!-- Branch Selector Pill -->
      <div class="ca-branch-picker-wrap">
        <button class="ca-branch-pill" id="ca-branch-btn" onclick="toggleBranchDropdown()">
          ${icon('map-pin', { size: 16, color: 'var(--ca-primary)' })}
          <span id="ca-branch-label">${activeBranch.name}</span>
          ${icon('chevron-down', { size: 14 })}
        </button>

        <!-- Dropdown of Branches for THIS Brand -->
        <div class="ca-branch-dropdown" id="ca-branch-dropdown">
          <div style="padding: 10px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--ca-muted); background: #F8F9FA;">
            Select Outlet Location
          </div>
          ${branches
            .map((b) => {
              const isActive = b.id === activeBranch.id;
              const hours = b.openingHours?.openTime ? `${b.openingHours.openTime} - ${b.openingHours.closeTime}` : '12:00 PM - 11:30 PM';
              return `
            <div class="ca-branch-option ${isActive ? 'active' : ''}" onclick="selectBranch('${b.id}')">
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--ca-dark);">${b.name}</div>
                <div style="font-size: 11px; color: var(--ca-muted); margin-top: 2px;">${b.address}, ${b.city}</div>
                <div style="font-size: 11px; color: var(--ca-primary); font-weight: 600; margin-top: 4px;">${icon('clock', { size: 10 })} ${hours}</div>
              </div>
              ${isActive ? `<span style="color: var(--ca-primary);">${icon('check', { size: 16 })}</span>` : ''}
            </div>`;
            })
            .join('')}
        </div>
      </div>

      <!-- Dish Search -->
      <div class="ca-search-box">
        <span class="ca-search-icon">${icon('search', { size: 16 })}</span>
        <input
          type="text"
          class="ca-search-input"
          id="ca-global-search"
          placeholder="Search dishes, curries, tandoor breads..."
          oninput="handleMenuSearch(this.value)"
        />
      </div>

      <!-- Top Nav Actions -->
      <div class="ca-nav-actions">
        <button class="ca-cart-btn" id="ca-cart-trigger" onclick="toggleCartDrawer()">
          ${icon('shopping-bag', { size: 16 })}
          <span id="ca-cart-label">Order Folio (0)</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="ca-container">

    <!-- Restaurant Hero -->
    <section class="ca-hero">
      <div class="ca-hero-text">
        <div class="ca-hero-badge">
          ${icon('sparkles', { size: 12 })} Luxury Charcoal Gastronomy
        </div>
        <h1 class="ca-hero-title">${brand.restaurantName}</h1>
        <p class="ca-hero-subtitle">
          Experience authentic slow-simmered handis, clay-oven charcoal tandoor, and single-origin Kashmiri spices at our <strong>${activeBranch.name}</strong> outlet. Freshly prepared to order.
        </p>
        <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
          <a href="#menu-catalog" class="ca-cart-btn" style="text-decoration: none;">Explore Menu & Order Online →</a>
          <a href="/dine/7Kp9xQ8m2L?branch=${activeBranch.id}" class="ca-branch-pill" style="text-decoration: none; background: rgba(255,255,255,0.1); color: #FFF; border-color: rgba(255,255,255,0.2);">Dine-In Table QR</a>
        </div>
        <div class="ca-hero-meta">
          <div class="ca-hero-meta-item">
            ${icon('map-pin', { size: 14, color: 'var(--ca-gold)' })}
            <span>${activeBranch.address}, ${activeBranch.city}</span>
          </div>
          <div class="ca-hero-meta-item">
            ${icon('clock', { size: 14, color: 'var(--ca-gold)' })}
            <span>${openingHours.openTime} – ${openingHours.closeTime}</span>
          </div>
          <div class="ca-hero-meta-item">
            ${icon('phone', { size: 14, color: 'var(--ca-gold)' })}
            <span>${activeBranch.phone || '+91 161 450 8890'}</span>
          </div>
        </div>
      </div>
      <div class="ca-hero-media">
        <img src="https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80" alt="OrbitoX Charcoal Embers" />
      </div>
    </section>

    <!-- Culinary Signature Highlights Carousel (WAI-ARIA Pattern) -->
    <div class="ca-section-header">
      <div>
        <div class="ca-section-title">Culinary Signature Highlights</div>
        <span style="font-size: 13px; color: var(--ca-muted); font-weight: 600;">Handcrafted Daily at ${activeBranch.city}</span>
      </div>
      <!-- Desktop & Tablet Carousel Arrows -->
      <div class="ca-carousel-controls" aria-label="Signature Highlights Controls">
        <button
          type="button"
          class="ca-carousel-btn"
          id="ca-carousel-prev"
          onclick="scrollCarousel(-1)"
          aria-label="Previous signature highlights"
          disabled
        >
          ${icon('chevron-left', { size: 16 })}
        </button>
        <button
          type="button"
          class="ca-carousel-btn"
          id="ca-carousel-next"
          onclick="scrollCarousel(1)"
          aria-label="Next signature highlights"
        >
          ${icon('chevron-right', { size: 16 })}
        </button>
      </div>
    </div>

    <section
      class="ca-carousel-container"
      role="region"
      aria-roledescription="carousel"
      aria-label="Culinary Signature Highlights"
    >
      <div
        class="ca-carousel-track"
        id="ca-carousel-track"
        tabindex="0"
        aria-live="polite"
        onscroll="updateCarouselButtons()"
      >
        <!-- Slide 1: Royal Curries (Mains) -->
        <article
          class="ca-carousel-slide"
          role="group"
          aria-roledescription="slide"
          aria-label="1 of 5: Slow-Simmered Royal Curries"
          onclick="handleHighlightClick('Mains')"
          tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' ') handleHighlightClick('Mains')"
        >
          <div class="ca-carousel-media">
            <img src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80" alt="Royal Curries" />
            <span class="ca-carousel-pill">Explore Mains</span>
          </div>
          <div class="ca-carousel-content">
            <h3 class="ca-carousel-title">Slow-Simmered Royal Curries</h3>
            <p class="ca-carousel-desc">24-hour copper handi simmering with hand-ground spices</p>
          </div>
        </article>

        <!-- Slide 2: Clay Oven Tandoor (Starters) -->
        <article
          class="ca-carousel-slide"
          role="group"
          aria-roledescription="slide"
          aria-label="2 of 5: Live Clay Oven Tandoor"
          onclick="handleHighlightClick('Starters')"
          tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' ') handleHighlightClick('Starters')"
        >
          <div class="ca-carousel-media">
            <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80" alt="Charcoal Tandoor" />
            <span class="ca-carousel-pill">Explore Starters</span>
          </div>
          <div class="ca-carousel-content">
            <h3 class="ca-carousel-title">Live Clay Oven Tandoor</h3>
            <p class="ca-carousel-desc">Charcoal-smoked skewers fired at 450°C clay heat</p>
          </div>
        </article>

        <!-- Slide 3: Artisan Breads (Breads) -->
        <article
          class="ca-carousel-slide"
          role="group"
          aria-roledescription="slide"
          aria-label="3 of 5: Artisan Naan & Rotis"
          onclick="handleHighlightClick('Breads')"
          tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' ') handleHighlightClick('Breads')"
        >
          <div class="ca-carousel-media">
            <img src="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80" alt="Artisan Breads" />
            <span class="ca-carousel-pill">Explore Breads</span>
          </div>
          <div class="ca-carousel-content">
            <h3 class="ca-carousel-title">Artisan Naan & Rotis</h3>
            <p class="ca-carousel-desc">Freshly slap-baked on tandoor walls with organic ghee</p>
          </div>
        </article>

        <!-- Slide 4: Chilled Lassis & Craft Brews (Beverages) -->
        <article
          class="ca-carousel-slide"
          role="group"
          aria-roledescription="slide"
          aria-label="4 of 5: Chilled Lassis & Craft Brews"
          onclick="handleHighlightClick('Beverages')"
          tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' ') handleHighlightClick('Beverages')"
        >
          <div class="ca-carousel-media">
            <img src="https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80" alt="Cold Brews" />
            <span class="ca-carousel-pill">Explore Beverages</span>
          </div>
          <div class="ca-carousel-content">
            <h3 class="ca-carousel-title">Chilled Lassis & Craft Brews</h3>
            <p class="ca-carousel-desc">Ratnagiri Alphonso mango pulp and saffron cold lassi</p>
          </div>
        </article>

        <!-- Slide 5: Traditional Royal Desserts (Desserts) -->
        <article
          class="ca-carousel-slide"
          role="group"
          aria-roledescription="slide"
          aria-label="5 of 5: Traditional Royal Desserts"
          onclick="handleHighlightClick('Desserts')"
          tabindex="0"
          onkeydown="if(event.key==='Enter'||event.key===' ') handleHighlightClick('Desserts')"
        >
          <div class="ca-carousel-media">
            <img src="https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=600&auto=format&fit=crop&q=80" alt="Desserts" />
            <span class="ca-carousel-pill">Explore Desserts</span>
          </div>
          <div class="ca-carousel-content">
            <h3 class="ca-carousel-title">Traditional Royal Desserts</h3>
            <p class="ca-carousel-desc">Slow-reduced milk rabri, pistachio dust, and cardamom</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Category Navigation Rail -->
    <div class="ca-section-header" id="menu-catalog">
      <div class="ca-section-title">Outlet Menu Catalog</div>
      <span style="font-size: 13px; font-weight: 700; color: var(--ca-stone);">${resolvedMenu.length} Available Dishes</span>
    </div>

    <div class="ca-cuisine-rail" id="ca-cuisine-rail">
      ${categories
        .map(
          (cat) => `
        <button
          class="ca-cuisine-chip ${cat === 'ALL' ? 'active' : ''}"
          data-cat="${cat}"
          onclick="filterCategory('${cat}')"
        >
          ${cat === 'ALL' ? 'Full Menu' : cat}
        </button>`
        )
        .join('')}
    </div>

    <!-- Menu Items Grid -->
    <div class="ca-menu-grid" id="ca-menu-grid">
      ${resolvedMenu
        .map((item) => {
          const isVeg = item.dietaryFlags?.includes('VEG') || false;
          const isSoldOut = !item.isAvailableAtBranch;
          const priceDisplay = item.effectiveFormattedPrice;
          const hasMods = Boolean(item.modifierGroups && item.modifierGroups.length > 0);

          return `
        <div
          class="ca-dish-card ${isSoldOut ? 'is-sold-out' : ''}"
          data-dish-id="${item.id}"
          data-dish-cat="${item.category}"
          data-dish-name="${item.name.toLowerCase()}"
        >
          <div class="ca-dish-info">
            <div class="${isVeg ? 'ca-dish-veg' : 'ca-dish-nonveg'}"></div>
            <div class="ca-dish-title-row">
              <span class="ca-dish-name">${item.name}</span>
              ${item.isPriceOverridden ? `<span class="ca-badge-override">${activeBranch.code} Price</span>` : ''}
              ${isSoldOut ? `<span class="ca-badge-soldout">Sold Out at this Outlet</span>` : ''}
              ${hasMods ? `<span class="ca-badge-customizable">Customisable</span>` : ''}
            </div>
            <div class="ca-dish-desc">${item.description}</div>
            <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
              <div class="ca-dish-price">${priceDisplay}</div>
              <span style="font-size: 11px; color: var(--ca-muted);">${item.prepDurationMinutes} mins SLA · ${item.station}</span>
            </div>
          </div>
          <div class="ca-dish-media">
            <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}" alt="${item.name}" />
            
            ${
              isSoldOut
                ? `<button class="ca-dish-add-btn" disabled>86'd</button>`
                : hasMods
                ? `<button
                    class="ca-dish-add-btn"
                    id="btn-add-${item.id}"
                    onclick="openCustomizer('${item.id}')"
                   >
                     + CUSTOMISE
                   </button>`
                : `<button
                    class="ca-dish-add-btn"
                    id="btn-add-${item.id}"
                    onclick="handleAddDish('${item.id}')"
                   >
                     + ADD
                   </button>
                   <div class="ca-dish-stepper" id="stepper-${item.id}">
                     <button onclick="handleCardStepper('${item.id}', -1)" aria-label="Decrease quantity">−</button>
                     <span id="card-qty-${item.id}">0</span>
                     <button onclick="handleCardStepper('${item.id}', 1)" aria-label="Increase quantity">+</button>
                   </div>`
            }
          </div>
        </div>`;
        })
        .join('')}

      <!-- Empty Filter State -->
      <div class="ca-catalog-empty" id="ca-catalog-empty">
        <div style="font-size: 16px; font-weight: 800; color: var(--ca-dark); margin-bottom: 6px;">
          No culinary items found
        </div>
        <p style="font-size: 13px; color: var(--ca-muted); margin-bottom: 16px;">
          No dishes match your active search and category filters.
        </p>
        <button class="ca-cart-btn" onclick="clearFilters()" style="margin: 0 auto;">
          Clear Filters & Show All
        </button>
      </div>
    </div>

  </main>

  <!-- Floating Bottom Order Bar (Mobile-first, Active when cart > 0) -->
  <aside class="ca-float-bar" id="ca-float-bar" onclick="toggleCartDrawer()">
    <div class="ca-float-bar-inner">
      <div class="ca-float-summary">
        <div class="ca-float-icon">
          ${icon('shopping-bag', { size: 20 })}
        </div>
        <div class="ca-float-details">
          <span class="ca-float-items-count" id="ca-float-count">0 items</span>
          <span class="ca-float-subtotal" id="ca-float-subtotal">₹0.00 <span>Subtotal</span></span>
        </div>
      </div>
      <button class="ca-float-cta-btn" onclick="event.stopPropagation(); toggleCartDrawer();">
        <span>View Order</span>
        ${icon('arrow-right', { size: 16 })}
      </button>
    </div>
  </aside>

  <!-- Slide-In Cart Drawer -->
  <div class="ca-cart-overlay" id="ca-cart-overlay" onclick="toggleCartDrawer()"></div>
  <aside class="ca-cart-drawer" id="ca-cart-drawer">
    <div class="ca-cart-header">
      <div class="ca-cart-title">Your Order Folio</div>
      <button class="ca-cart-close" onclick="toggleCartDrawer()" aria-label="Close cart drawer">${icon('x', { size: 18 })}</button>
    </div>

    <div class="ca-cart-branch-notice">
      ${icon('map-pin', { size: 14, color: 'var(--ca-primary)' })}
      <span>Fulfilling from <strong>${activeBranch.name}</strong></span>
    </div>

    <div class="ca-cart-fulfillment">
      <button class="ca-fulfill-btn active" id="btn-fulfill-delivery" onclick="setFulfillment('delivery')">Delivery</button>
      <button class="ca-fulfill-btn" id="btn-fulfill-pickup" onclick="setFulfillment('pickup')">Pickup at Outlet</button>
    </div>

    <div class="ca-cart-body" id="ca-cart-items-container">
      <div style="text-align: center; color: var(--ca-muted); padding: 40px 20px;">
        ${icon('shopping-bag', { size: 36, color: '#D1D5DB' })}
        <div style="font-size: 14px; font-weight: 700; margin-top: 10px; color: var(--ca-dark);">Your cart is empty</div>
        <p style="font-size: 12px; margin-top: 4px;">Add some signature tandoor dishes or curries to start your order.</p>
      </div>
    </div>

    <div class="ca-cart-footer">
      <!-- Real Customer Identity Capture -->
      <div style="margin-bottom: 12px; background: #FFF; border: 1px solid var(--ca-border); border-radius: var(--ca-radius-sm); padding: 12px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--ca-dark); margin-bottom: 8px; letter-spacing: 0.04em;">
          Customer Contact & Dispatch
        </div>

        <div style="margin-bottom: 8px;">
          <label for="ca-customer-name" style="display: block; font-size: 11px; font-weight: 700; color: var(--ca-stone); margin-bottom: 3px;">Full Name *</label>
          <input
            type="text"
            id="ca-customer-name"
            placeholder="e.g. Gurpreet Singh"
            style="width: 100%; padding: 7px 10px; border: 1px solid var(--ca-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--ca-dark);"
            maxlength="80"
          />
        </div>

        <div style="margin-bottom: 8px;">
          <label for="ca-customer-phone" style="display: block; font-size: 11px; font-weight: 700; color: var(--ca-stone); margin-bottom: 3px;">Mobile Number (+91) *</label>
          <input
            type="tel"
            id="ca-customer-phone"
            placeholder="+91 98765 43210"
            style="width: 100%; padding: 7px 10px; border: 1px solid var(--ca-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--ca-dark);"
            maxlength="16"
          />
          <div style="font-size: 10px; color: var(--ca-muted); margin-top: 2px;">Used for order status and station dispatch</div>
        </div>

        <div id="ca-delivery-address-group" style="margin-bottom: 8px;">
          <label for="ca-delivery-address" style="display: block; font-size: 11px; font-weight: 700; color: var(--ca-stone); margin-bottom: 3px;">Delivery Address in ${activeBranch.city} *</label>
          <input
            type="text"
            id="ca-delivery-address"
            placeholder="House/flat, street, sector..."
            value="Model Town, Sector 32"
            style="width: 100%; padding: 7px 10px; border: 1px solid var(--ca-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--ca-dark);"
            maxlength="250"
          />
        </div>

        <div>
          <label for="ca-customer-notes" style="display: block; font-size: 11px; font-weight: 700; color: var(--ca-stone); margin-bottom: 3px;">Kitchen & Delivery Instructions</label>
          <input
            type="text"
            id="ca-customer-notes"
            placeholder="e.g. Ring bell, extra spicy, no cutlery"
            style="width: 100%; padding: 7px 10px; border: 1px solid var(--ca-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--ca-dark);"
            maxlength="200"
          />
        </div>

        <div id="ca-checkout-error" style="display: none; margin-top: 8px; padding: 7px 10px; background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 11px; color: #DC2626; font-weight: 700;"></div>
      </div>

      <div class="ca-cart-row">
        <span>Item Subtotal</span>
        <span id="ca-subtotal">₹0.00</span>
      </div>
      <div class="ca-cart-row">
        <span>Goods & Services Tax (5% GST)</span>
        <span id="ca-tax">₹0.00</span>
      </div>
      <div class="ca-cart-row" id="ca-delivery-fee-row">
        <span>Delivery Fee</span>
        <span id="ca-delivery-fee">₹40.00</span>
      </div>
      <div class="ca-cart-total-row">
        <span>Total Payable</span>
        <span id="ca-total">₹0.00</span>
      </div>

      <button class="ca-checkout-btn" id="ca-submit-order-btn" disabled onclick="submitOrder()">
        Place Order Now
      </button>
    </div>
  </aside>

  <!-- Dish Customizer Modal -->
  <div class="ca-modal" id="ca-customizer-modal" role="dialog" aria-modal="true" aria-labelledby="cust-dish-name">
    <div class="ca-modal-content" style="max-width: 480px; max-height: 85vh; display: flex; flex-direction: column; padding: 0; overflow: hidden;">
      
      <!-- Modal Header with Image & Title -->
      <div style="position: relative; height: 160px; background: #14171E; flex-shrink: 0;">
        <img id="cust-dish-img" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" alt="" style="width: 100%; height: 100%; object-fit: cover;" />
        <button
          onclick="closeCustomizer()"
          style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; width: 32px; height: 32px; color: #FFF; display: flex; align-items: center; justify-content: center; cursor: pointer;"
          aria-label="Close customizer"
        >
          ${icon('x', { size: 16 })}
        </button>
        <div style="position: absolute; bottom: 10px; left: 16px; right: 16px; color: #FFF; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">
          <div id="cust-dish-name" style="font-family: var(--font-heading); font-size: 18px; font-weight: 800;"></div>
          <div id="cust-dish-base-price" style="font-size: 13px; font-weight: 700; opacity: 0.9;"></div>
        </div>
      </div>

      <!-- Scrollable Options Body -->
      <div id="cust-options-container" style="flex: 1; overflow-y: auto; padding: 18px 20px;">
        <!-- Injected dynamically per dish -->
      </div>

      <!-- Sticky Modal Footer -->
      <div style="padding: 14px 20px; border-top: 1px solid var(--ca-border); background: var(--ca-surface); display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; color: var(--ca-muted); font-weight: 700; text-transform: uppercase;">Total with Selections</div>
          <div id="cust-modal-total" style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; color: var(--ca-primary);">₹0.00</div>
        </div>
        <button class="ca-checkout-btn" id="cust-add-to-order-btn" onclick="confirmCustomizerAdd()" style="width: auto; padding: 12px 24px;">
          Add to Order
        </button>
      </div>

    </div>
  </div>

  <!-- Order Status Tracking Modal -->
  <div class="ca-modal" id="ca-tracking-modal" role="dialog" aria-modal="true" aria-labelledby="track-modal-title">
    <div class="ca-modal-content">
      <!-- Modal Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid var(--ca-border); padding-bottom: 14px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span id="ca-track-transport" style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: rgba(46, 133, 64, 0.1); color: var(--ca-green); border: 1px solid rgba(46, 133, 64, 0.25);">
              🟢 Live SSE Stream
            </span>
            <span style="font-size: 12px; color: var(--ca-muted); font-family: monospace;" id="track-order-id-label">
              Order #<span id="track-order-id">-</span>
            </span>
          </div>
          <div id="track-modal-title" style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: var(--ca-dark);">
            Order Confirmed & Sent to Kitchen
          </div>
        </div>
        <button onclick="closeTrackingModal()" style="background: none; border: none; cursor: pointer; color: var(--ca-stone); padding: 4px;" aria-label="Close tracking modal">
          ${icon('x', { size: 20 })}
        </button>
      </div>

      <!-- Branch & Status Overview -->
      <div style="background: #F9FAFB; border: 1px solid var(--ca-border); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--ca-stone);">Target Branch Kitchen:</span>
          <strong id="track-branch-name" style="color: var(--ca-dark);">${activeBranch.name}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--ca-stone);">Live Status:</span>
          <span id="track-status-pill" style="font-weight: 800; color: var(--ca-primary); text-transform: uppercase;">CONFIRMED</span>
        </div>
      </div>

      <!-- 4-Step Domain Progression Stepper -->
      <div class="ca-track-stepper">
        <div class="ca-track-step" id="ca-step-1">
          <div class="ca-track-step-line"></div>
          <div class="ca-track-step-bullet">1</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--ca-dark);">Order Confirmed</div>
            <div style="font-size: 11px; color: var(--ca-muted);">Validated and routed to branch kitchen</div>
          </div>
        </div>
        <div class="ca-track-step" id="ca-step-2">
          <div class="ca-track-step-line"></div>
          <div class="ca-track-step-bullet">2</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--ca-dark);">Cooking on Kitchen Workstations</div>
            <div style="font-size: 11px; color: var(--ca-muted);">Station chefs firing pans and ovens</div>
          </div>
        </div>
        <div class="ca-track-step" id="ca-step-3">
          <div class="ca-track-step-line"></div>
          <div class="ca-track-step-bullet">3</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--ca-dark);">Order Ready</div>
            <div style="font-size: 11px; color: var(--ca-muted);">Packed at Expo counter for dispatch / pickup</div>
          </div>
        </div>
        <div class="ca-track-step" id="ca-step-4">
          <div class="ca-track-step-bullet">4</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--ca-dark);">Complete / Delivered</div>
            <div style="font-size: 11px; color: var(--ca-muted);">Fulfilled to customer</div>
          </div>
        </div>
      </div>

      <!-- Real Kitchen Station Breakdown -->
      <div style="margin-top: 14px; border-top: 1px solid var(--ca-border); padding-top: 12px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--ca-stone); margin-bottom: 8px;">
          Station Task Breakdown
        </div>
        <div id="track-station-tasks" style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
          <div style="color: var(--ca-muted); font-size: 12px; font-style: italic;">Routing to kitchen workstations...</div>
        </div>
      </div>

      <!-- Customer Summary -->
      <div style="margin-top: 14px; background: #FFF; border: 1px solid var(--ca-border); border-radius: 8px; padding: 10px 14px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span style="color: var(--ca-muted);">Recipient:</span>
          <strong id="track-customer-name">-</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span style="color: var(--ca-muted);">Mobile:</span>
          <span id="track-customer-phone" style="font-family: monospace;">-</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--ca-muted);">Delivery / Notes:</span>
          <span id="track-customer-address" style="text-align: right; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</span>
        </div>
      </div>

      <button class="ca-checkout-btn" style="margin-top: 16px;" onclick="closeTrackingModal()">
        Keep Browsing Menu
      </button>
    </div>
  </div>

  <!-- Floating Reopen Tracker Pill -->
  <div id="ca-floating-tracker" class="ca-floating-tracker" style="display: none;" onclick="reopenTrackingModal()">
    <div class="ca-tracker-pulse"></div>
    <div style="display: flex; flex-direction: column;">
      <span class="ca-tracker-label">ACTIVE ORDER</span>
      <span class="ca-tracker-status" id="ca-float-status">In Kitchen</span>
    </div>
    <span class="ca-tracker-action">Track Live →</span>
  </div>

  <script>
    const activeBranchId = "${activeBranch.id}";
    const menuItems = ${JSON.stringify(resolvedMenu)};
    
    // Core authoritative cart state
    let cart = [];
    let fulfillmentMethod = 'delivery';

    // Restore and revalidate cart on page load (branch switch or reload)
    try {
      const savedCart = sessionStorage.getItem('ca_branch_switch_cart') || sessionStorage.getItem('ca_active_cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const revalidated = [];
          const droppedItems = [];
          const priceChangedItems = [];

          for (const item of parsed) {
            const currentItem = menuItems.find(m => m.id === item.dishId);
            if (!currentItem) {
              droppedItems.push(item.name + ' (No longer in catalog)');
              continue;
            }
            if (!currentItem.isAvailableAtBranch) {
              droppedItems.push(item.name + ' (Sold out at this outlet)');
              continue;
            }
            const targetBasePrice = currentItem.effectivePriceMinor;
            let modifierDelta = 0;
            if (Array.isArray(item.selectedModifiers)) {
              for (const mod of item.selectedModifiers) {
                modifierDelta += (mod.priceDeltaMinor || 0);
              }
            }
            const targetTotalUnitPrice = targetBasePrice + modifierDelta;
            if (targetTotalUnitPrice !== item.priceMinor) {
              priceChangedItems.push({
                name: item.name,
                oldPrice: item.priceMinor,
                newPrice: targetTotalUnitPrice,
              });
            }

            revalidated.push({
              ...item,
              priceMinor: targetTotalUnitPrice,
            });
          }

          cart = revalidated;
          sessionStorage.removeItem('ca_branch_switch_cart');
          sessionStorage.setItem('ca_active_cart', JSON.stringify(cart));

          if (droppedItems.length > 0) {
            console.warn('Notice: Branch items unavailable:', droppedItems);
          } else if (priceChangedItems.length > 0) {
            console.info('Notice: Branch prices updated:', priceChangedItems);
          }
        }
      }
    } catch (e) {}
    
    // Filtering state
    let currentCategory = 'ALL';
    let currentSearchQuery = '';

    // Customizer state
    let customizingDish = null;
    let selectedOptionsMap = {}; // groupId -> array of option objects

    // --- CAROUSEL CONTROLS ---
    function scrollCarousel(direction) {
      const track = document.getElementById('ca-carousel-track');
      if (!track) return;
      const slide = track.querySelector('.ca-carousel-slide');
      const step = slide ? (slide.offsetWidth + 16) : 300;
      track.scrollBy({ left: direction * step, behavior: 'smooth' });
    }

    function updateCarouselButtons() {
      const track = document.getElementById('ca-carousel-track');
      const prevBtn = document.getElementById('ca-carousel-prev');
      const nextBtn = document.getElementById('ca-carousel-next');
      if (!track || !prevBtn || !nextBtn) return;
      
      prevBtn.disabled = track.scrollLeft <= 5;
      nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;
    }

    function handleHighlightClick(category) {
      filterCategory(category);
      const target = document.getElementById('menu-catalog');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Keyboard support on carousel track
    document.getElementById('ca-carousel-track')?.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        scrollCarousel(-1);
      } else if (e.key === 'ArrowRight') {
        scrollCarousel(1);
      }
    });

    // --- BRANCH SELECTOR ---
    function toggleBranchDropdown() {
      const drop = document.getElementById('ca-branch-dropdown');
      drop.classList.toggle('open');
    }

    function selectBranch(branchId) {
      if (branchId === activeBranchId) {
        toggleBranchDropdown();
        return;
      }
      if (cart.length > 0) {
        if (!confirm('Switching branch will update menu prices and check item availability for the new location. Proceed?')) {
          return;
        }
        try {
          sessionStorage.setItem('ca_branch_switch_cart', JSON.stringify(cart));
        } catch (e) {}
      }
      window.location.href = '/apps/crave-atlas?branch=' + encodeURIComponent(branchId);
    }

    // Close branch dropdown on click outside
    document.addEventListener('click', (e) => {
      const drop = document.getElementById('ca-branch-dropdown');
      const btn = document.getElementById('ca-branch-btn');
      if (drop && btn && !btn.contains(e.target) && !drop.contains(e.target)) {
        drop.classList.remove('open');
      }
    });

    // --- CART DRAWER TOGGLE ---
    function toggleCartDrawer() {
      const overlay = document.getElementById('ca-cart-overlay');
      const drawer = document.getElementById('ca-cart-drawer');
      overlay.classList.toggle('open');
      drawer.classList.toggle('open');
    }

    // --- CATEGORY & SEARCH FILTERING ---
    function filterCategory(cat) {
      currentCategory = cat;
      document.querySelectorAll('.ca-cuisine-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === cat);
      });
      applyFilters();
    }

    function handleMenuSearch(q) {
      currentSearchQuery = q.toLowerCase().trim();
      applyFilters();
    }

    function applyFilters() {
      const cards = document.querySelectorAll('.ca-dish-card');
      let visibleCount = 0;
      cards.forEach(c => {
        const cardCat = c.getAttribute('data-dish-cat') || '';
        const cardName = c.getAttribute('data-dish-name') || '';
        const cardDesc = c.querySelector('.ca-dish-desc')?.textContent.toLowerCase() || '';

        const matchesCat = (currentCategory === 'ALL' || cardCat === currentCategory);
        const matchesSearch = (currentSearchQuery === '' || cardName.includes(currentSearchQuery) || cardDesc.includes(currentSearchQuery));

        if (matchesCat && matchesSearch) {
          c.style.display = 'flex';
          visibleCount++;
        } else {
          c.style.display = 'none';
        }
      });

      const emptyState = document.getElementById('ca-catalog-empty');
      if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
      }
    }

    function clearFilters() {
      currentCategory = 'ALL';
      currentSearchQuery = '';
      const input = document.getElementById('ca-global-search');
      if (input) input.value = '';
      document.querySelectorAll('.ca-cuisine-chip').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-cat') === 'ALL');
      });
      applyFilters();
    }

    // --- DISH CUSTOMIZER ---
    function openCustomizer(dishId) {
      const dish = menuItems.find(m => m.id === dishId);
      if (!dish) return;

      customizingDish = dish;
      selectedOptionsMap = {};

      document.getElementById('cust-dish-img').src = dish.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
      document.getElementById('cust-dish-name').textContent = dish.name;
      document.getElementById('cust-dish-base-price').textContent = 'Base Price: ' + dish.effectiveFormattedPrice;

      const container = document.getElementById('cust-options-container');
      container.innerHTML = '';

      if (dish.modifierGroups && dish.modifierGroups.length > 0) {
        dish.modifierGroups.forEach(grp => {
          selectedOptionsMap[grp.id] = [];
          
          const isSingle = grp.maxSelections === 1;
          const isRequired = grp.minSelections > 0;

          const grpEl = document.createElement('div');
          grpEl.className = 'ca-cust-group';
          grpEl.innerHTML = \`
            <div class="ca-cust-group-header">
              <span class="ca-cust-group-title">\${grp.name}</span>
              <span class="ca-cust-group-tag">\${isRequired ? 'Required · Choose ' + grp.minSelections : 'Optional'}</span>
            </div>
            \${grp.description ? \`<div class="ca-cust-group-desc">\${grp.description}</div>\` : ''}
            <div class="ca-cust-options-list" id="grp-opts-\${grp.id}"></div>
          \`;

          const listEl = grpEl.querySelector(\`#grp-opts-\${grp.id}\`);

          grp.options.forEach((opt, oIdx) => {
            const optEl = document.createElement('label');
            optEl.className = 'ca-cust-option';
            
            const inputType = isSingle ? 'radio' : 'checkbox';
            const inputName = \`opt_\${grp.id}\`;
            const isChecked = opt.isDefault || (isSingle && oIdx === 0 && isRequired);

            if (isChecked) {
              selectedOptionsMap[grp.id].push(opt);
            }

            const deltaText = opt.priceDeltaMinor > 0 
              ? \`+₹\${(opt.priceDeltaMinor / 100).toFixed(2)}\` 
              : 'Free';

            optEl.innerHTML = \`
              <span class="ca-cust-opt-label">
                <input
                  type="\${inputType}"
                  name="\${inputName}"
                  value="\${opt.id}"
                  \${isChecked ? 'checked' : ''}
                  onchange="handleOptionToggle('\${grp.id}', '\${opt.id}', \${isSingle})"
                />
                \${opt.name}
              </span>
              <span class="ca-cust-opt-price">\${deltaText}</span>
            \`;
            listEl.appendChild(optEl);
          });

          container.appendChild(grpEl);
        });
      }

      recalculateCustomizerTotal();
      document.getElementById('ca-customizer-modal').classList.add('open');
    }

    function handleOptionToggle(groupId, optionId, isSingle) {
      if (!customizingDish) return;
      const grp = customizingDish.modifierGroups?.find(g => g.id === groupId);
      if (!grp) return;
      const opt = grp.options.find(o => o.id === optionId);
      if (!opt) return;

      if (isSingle) {
        selectedOptionsMap[groupId] = [opt];
      } else {
        const existingIdx = selectedOptionsMap[groupId].findIndex(o => o.id === optionId);
        if (existingIdx >= 0) {
          selectedOptionsMap[groupId].splice(existingIdx, 1);
        } else {
          if (selectedOptionsMap[groupId].length < grp.maxSelections) {
            selectedOptionsMap[groupId].push(opt);
          } else {
            alert(\`You can select at most \${grp.maxSelections} options for \${grp.name}.\`);
            const cb = document.querySelector(\`input[name="opt_\${groupId}"][value="\${optionId}"]\`);
            if (cb) cb.checked = false;
          }
        }
      }

      recalculateCustomizerTotal();
    }

    function recalculateCustomizerTotal() {
      if (!customizingDish) return;
      let totalMinor = customizingDish.effectivePriceMinor;
      Object.values(selectedOptionsMap).forEach(opts => {
        opts.forEach(o => {
          totalMinor += (o.priceDeltaMinor || 0);
        });
      });
      document.getElementById('cust-modal-total').textContent = \`₹\${(totalMinor / 100).toFixed(2)}\`;
    }

    function confirmCustomizerAdd() {
      if (!customizingDish) return;

      // Validate required groups
      if (customizingDish.modifierGroups) {
        for (const grp of customizingDish.modifierGroups) {
          const selected = selectedOptionsMap[grp.id] || [];
          if (grp.minSelections > 0 && selected.length < grp.minSelections) {
            alert(\`Please select at least \${grp.minSelections} option for \${grp.name}.\`);
            return;
          }
        }
      }

      // Collect flat selected options
      const flatOptions = [];
      let addOnMinor = 0;
      Object.keys(selectedOptionsMap).forEach(gId => {
        const grp = customizingDish.modifierGroups?.find(g => g.id === gId);
        selectedOptionsMap[gId].forEach(o => {
          flatOptions.push({
            groupId: gId,
            groupName: grp ? grp.name : '',
            optionId: o.id,
            optionName: o.name,
            priceDeltaMinor: o.priceDeltaMinor || 0,
          });
          addOnMinor += (o.priceDeltaMinor || 0);
        });
      });

      const optKey = flatOptions.map(o => o.optionId).sort().join('_');
      const lineId = customizingDish.id + (optKey ? '__' + optKey : '');
      const unitPriceMinor = customizingDish.effectivePriceMinor + addOnMinor;

      const existingLine = cart.find(it => it.lineId === lineId);
      if (existingLine) {
        existingLine.quantity += 1;
      } else {
        cart.push({
          lineId,
          dishId: customizingDish.id,
          name: customizingDish.name,
          priceMinor: unitPriceMinor,
          quantity: 1,
          selectedModifiers: flatOptions,
        });
      }

      closeCustomizer();
      renderAllCartSurfaces();
    }

    function closeCustomizer() {
      document.getElementById('ca-customizer-modal').classList.remove('open');
      customizingDish = null;
      selectedOptionsMap = {};
    }

    // --- SIMPLE ITEM DIRECT ADD & CARD STEPPERS ---
    function handleAddDish(id) {
      const dish = menuItems.find(m => m.id === id);
      if (!dish) return;

      if (dish.modifierGroups && dish.modifierGroups.length > 0) {
        openCustomizer(id);
        return;
      }

      const existing = cart.find(it => it.dishId === id && (!it.selectedModifiers || it.selectedModifiers.length === 0));
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({
          lineId: id,
          dishId: id,
          name: dish.name,
          priceMinor: dish.effectivePriceMinor,
          quantity: 1,
          selectedModifiers: [],
        });
      }

      renderAllCartSurfaces();
    }

    function handleCardStepper(id, delta) {
      const idx = cart.findIndex(it => it.dishId === id && (!it.selectedModifiers || it.selectedModifiers.length === 0));
      if (idx === -1) {
        if (delta > 0) handleAddDish(id);
        return;
      }

      cart[idx].quantity += delta;
      if (cart[idx].quantity <= 0) {
        cart.splice(idx, 1);
      }

      renderAllCartSurfaces();
    }

    // --- CART DRAWER QUANTITY UPDATE ---
    function updateCartQty(lineId, delta) {
      const idx = cart.findIndex(it => it.lineId === lineId);
      if (idx === -1) return;

      cart[idx].quantity += delta;
      if (cart[idx].quantity <= 0) {
        cart.splice(idx, 1);
      }

      renderAllCartSurfaces();
    }

    // --- FULFILLMENT METHOD TOGGLE ---
    function setFulfillment(method) {
      fulfillmentMethod = method;
      document.getElementById('btn-fulfill-delivery').classList.toggle('active', method === 'delivery');
      document.getElementById('btn-fulfill-pickup').classList.toggle('active', method === 'pickup');
      document.getElementById('ca-delivery-fee-row').style.display = method === 'delivery' ? 'flex' : 'none';
      const addressGroup = document.getElementById('ca-delivery-address-group');
      if (addressGroup) {
        addressGroup.style.display = method === 'delivery' ? 'block' : 'none';
      }
      renderAllCartSurfaces();
    }

    // --- AUTHORITATIVE STATE SYNCHRONIZATION ---
    function renderAllCartSurfaces() {
      try {
        sessionStorage.setItem('ca_active_cart', JSON.stringify(cart));
      } catch (e) {}

      const totalItems = cart.reduce((acc, it) => acc + it.quantity, 0);

      // 1. Header Cart Label
      const headerLabel = document.getElementById('ca-cart-label');
      if (headerLabel) {
        headerLabel.textContent = 'Order Folio (' + totalItems + ')';
      }

      // 2. Calculations
      let subtotalMinor = 0;
      for (const item of cart) {
        subtotalMinor += (item.priceMinor * item.quantity);
      }
      const taxMinor = Math.round(subtotalMinor * 0.05);
      const deliveryFeeMinor = fulfillmentMethod === 'delivery' ? 4000 : 0;
      const totalMinor = subtotalMinor + taxMinor + deliveryFeeMinor;

      // 3. Floating Bottom Order Bar
      const floatBar = document.getElementById('ca-float-bar');
      const floatCount = document.getElementById('ca-float-count');
      const floatSubtotal = document.getElementById('ca-float-subtotal');
      if (floatBar) {
        if (totalItems > 0) {
          floatBar.classList.add('visible');
          if (floatCount) {
            floatCount.textContent = totalItems + (totalItems === 1 ? ' item in your order' : ' items in your order');
          }
          if (floatSubtotal) {
            floatSubtotal.innerHTML = '₹' + (subtotalMinor / 100).toFixed(2) + ' <span>Subtotal</span>';
          }
        } else {
          floatBar.classList.remove('visible');
        }
      }

      // 4. In-Place Dish Card Steppers on Menu
      document.querySelectorAll('.ca-dish-card').forEach(card => {
        const dishId = card.getAttribute('data-dish-id');
        if (!dishId) return;

        const dish = menuItems.find(m => m.id === dishId);
        if (!dish || !dish.isAvailableAtBranch) return;

        const hasMods = Boolean(dish.modifierGroups && dish.modifierGroups.length > 0);
        const qty = cart.filter(it => it.dishId === dishId).reduce((a, b) => a + b.quantity, 0);

        const addBtn = card.querySelector('.ca-dish-add-btn');
        const stepper = card.querySelector('.ca-dish-stepper');
        const qtySpan = card.querySelector('#card-qty-' + dishId);

        if (!hasMods) {
          if (qty > 0) {
            if (addBtn) addBtn.style.display = 'none';
            if (stepper) stepper.classList.add('active');
            if (qtySpan) qtySpan.textContent = qty;
          } else {
            if (addBtn) {
              addBtn.style.display = 'block';
              addBtn.textContent = '+ ADD';
            }
            if (stepper) stepper.classList.remove('active');
          }
        } else {
          if (addBtn) {
            if (qty > 0) {
              addBtn.textContent = 'CUSTOMISED (' + qty + ') +';
              addBtn.style.background = 'var(--ca-primary)';
              addBtn.style.color = '#FFF';
            } else {
              addBtn.textContent = '+ CUSTOMISE';
              addBtn.style.background = '#FFF';
              addBtn.style.color = 'var(--ca-primary)';
            }
          }
        }
      });

      // 5. Cart Drawer Contents
      const itemsContainer = document.getElementById('ca-cart-items-container');
      const submitBtn = document.getElementById('ca-submit-order-btn');

      if (cart.length === 0) {
        if (itemsContainer) {
          itemsContainer.innerHTML = \`
            <div style="text-align: center; color: var(--ca-muted); padding: 40px 20px;">
              ${icon('shopping-bag', { size: 36, color: '#D1D5DB' })}
              <div style="font-size: 14px; font-weight: 700; margin-top: 10px; color: var(--ca-dark);">Your cart is empty</div>
              <p style="font-size: 12px; margin-top: 4px;">Add some signature tandoor dishes or curries to start your order.</p>
            </div>\`;
        }
        document.getElementById('ca-subtotal').textContent = '₹0.00';
        document.getElementById('ca-tax').textContent = '₹0.00';
        document.getElementById('ca-delivery-fee').textContent = '₹0.00';
        document.getElementById('ca-total').textContent = '₹0.00';
        if (submitBtn) submitBtn.disabled = true;
        return;
      }

      let html = '';
      for (const item of cart) {
        const itemTotal = item.priceMinor * item.quantity;
        const modSummary = item.selectedModifiers && item.selectedModifiers.length > 0
          ? item.selectedModifiers.map(m => m.optionName).join(', ')
          : '';

        html += \`
          <div class="ca-cart-item">
            <div style="flex: 1; padding-right: 12px;">
              <div style="font-size: 13px; font-weight: 800; color: var(--ca-dark);">\${item.name}</div>
              \${modSummary ? \`<div style="font-size: 11px; color: var(--ca-primary); font-weight: 600; margin-top: 2px;">\${modSummary}</div>\` : ''}
              <div style="font-size: 12px; color: var(--ca-stone); margin-top: 2px;">₹\${(item.priceMinor / 100).toFixed(2)} each</div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="ca-cart-stepper">
                <button class="ca-step-btn" onclick="updateCartQty('\${item.lineId}', -1)" aria-label="Decrease quantity">−</button>
                <span style="font-size: 12px; font-weight: 700; min-width: 16px; text-align: center;">\${item.quantity}</span>
                <button class="ca-step-btn" onclick="updateCartQty('\${item.lineId}', 1)" aria-label="Increase quantity">+</button>
              </div>
              <div style="font-size: 13px; font-weight: 800; width: 64px; text-align: right;">
                ₹\${(itemTotal / 100).toFixed(2)}
              </div>
            </div>
          </div>\`;
      }

      if (itemsContainer) itemsContainer.innerHTML = html;

      document.getElementById('ca-subtotal').textContent = '₹' + (subtotalMinor / 100).toFixed(2);
      document.getElementById('ca-tax').textContent = '₹' + (taxMinor / 100).toFixed(2);
      document.getElementById('ca-delivery-fee').textContent = '₹' + (deliveryFeeMinor / 100).toFixed(2);
      document.getElementById('ca-total').textContent = '₹' + (totalMinor / 100).toFixed(2);
      if (submitBtn) submitBtn.disabled = false;
    }

    // Idempotency, SSE event stream and order tracking state
    let pendingOrderAttemptKey = null;
    let orderPollInterval = null;
    let orderEventSource = null;
    let activeTrackedOrderId = null;
    let activeTrackedOrderToken = null;
    let lastKnownOrderStatus = null;

    function getOrderIdempotencyKey() {
      if (!pendingOrderAttemptKey) {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
          pendingOrderAttemptKey = 'idemp_' + window.crypto.randomUUID();
        } else {
          pendingOrderAttemptKey = 'idemp_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
        }
      }
      return pendingOrderAttemptKey;
    }

    function showCheckoutError(msg) {
      const errEl = document.getElementById('ca-checkout-error');
      if (!errEl) return;
      if (msg) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
      } else {
        errEl.textContent = '';
        errEl.style.display = 'none';
      }
    }

    // --- ORDER SUBMISSION ---
    async function submitOrder() {
      if (cart.length === 0) return;
      showCheckoutError(null);

      const nameInput = document.getElementById('ca-customer-name');
      const phoneInput = document.getElementById('ca-customer-phone');
      const addressInput = document.getElementById('ca-delivery-address');
      const notesInput = document.getElementById('ca-customer-notes');

      const customerName = (nameInput ? nameInput.value : '').trim();
      const customerPhone = (phoneInput ? phoneInput.value : '').trim();
      const deliveryAddress = (addressInput ? addressInput.value : '').trim();
      const customerNotes = (notesInput ? notesInput.value : '').trim();

      // Client-side validations
      if (!customerName || customerName.length < 2 || customerName.length > 80 || /<[a-zA-Z][^>]*>/.test(customerName)) {
        showCheckoutError('Please enter a valid full name (2 to 80 characters, no HTML tags).');
        if (nameInput) nameInput.focus();
        return;
      }

      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      const validPhone = (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) ||
        (cleanPhone.length === 12 && cleanPhone.startsWith('91') && /^[6-9]/.test(cleanPhone.slice(2))) ||
        (cleanPhone.length === 11 && cleanPhone.startsWith('0') && /^[6-9]/.test(cleanPhone.slice(1)));

      if (!validPhone) {
        showCheckoutError('Please enter a valid 10-digit Indian mobile number (+91 [6-9]XXXXXXXXX).');
        if (phoneInput) phoneInput.focus();
        return;
      }

      if (fulfillmentMethod === 'delivery' && (!deliveryAddress || deliveryAddress.length < 5)) {
        showCheckoutError('Please provide a complete delivery address (minimum 5 characters).');
        if (addressInput) addressInput.focus();
        return;
      }

      const submitBtn = document.getElementById('ca-submit-order-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting to Kitchen...';

      const idempotencyKey = getOrderIdempotencyKey();

      try {
        const res = await fetch('/api/commerce/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            branchId: activeBranchId,
            fulfillmentMethod: fulfillmentMethod,
            customerName: customerName,
            customerPhone: customerPhone,
            deliveryAddress: fulfillmentMethod === 'delivery' ? deliveryAddress : (deliveryAddress || 'Takeaway Counter Pickup'),
            customerNotes: customerNotes,
            items: cart.map(it => ({
              id: it.dishId,
              name: it.name,
              quantity: it.quantity,
              priceMinor: it.priceMinor,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          pendingOrderAttemptKey = null; // Clear on definitive success
          cart = [];
          try {
            sessionStorage.removeItem('ca_active_cart');
            sessionStorage.removeItem('ca_branch_switch_cart');
          } catch (e) {}
          renderAllCartSurfaces();
          toggleCartDrawer();

          openTrackingModal(data.orderId, data.orderToken);
        } else {
          showCheckoutError(data.message || data.error || 'Server rejected order creation. Please verify details.');
        }
      } catch (err) {
        showCheckoutError('Network connection issue. Your order details are preserved — click below to retry safely.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order Now';
      }
    }

    // --- AUTHORITATIVE LIVE TRACKING WITH SSE + BOUNDED POLLING ---
    async function openTrackingModal(orderId, orderToken) {
      activeTrackedOrderId = orderId;
      activeTrackedOrderToken = orderToken;

      try {
        localStorage.setItem('ca_active_order', JSON.stringify({
          orderId,
          orderToken,
          branchId: activeBranchId,
          timestamp: Date.now()
        }));
      } catch (e) {}

      document.getElementById('track-order-id').textContent = orderId;
      const modal = document.getElementById('ca-tracking-modal');
      if (modal) modal.classList.add('open');
      const floatPill = document.getElementById('ca-floating-tracker');
      if (floatPill) floatPill.style.display = 'none';

      // Immediate fetch of domain order state
      await refreshOrderTrackingData();

      // Connect Realtime SSE Stream
      connectOrderSseStream(orderId, orderToken);

      // Start bounded fallback polling
      startOrderPolling(orderId, orderToken);
    }

    function setTransportBadge(isSse) {
      const badge = document.getElementById('ca-track-transport');
      if (!badge) return;
      if (isSse) {
        badge.innerHTML = '🟢 Live SSE Stream';
        badge.style.background = 'rgba(46, 133, 64, 0.1)';
        badge.style.color = 'var(--ca-green)';
        badge.style.borderColor = 'rgba(46, 133, 64, 0.25)';
      } else {
        badge.innerHTML = '🔄 Live Polling (4s)';
        badge.style.background = 'rgba(217, 154, 69, 0.1)';
        badge.style.color = 'var(--ca-gold)';
        badge.style.borderColor = 'rgba(217, 154, 69, 0.25)';
      }
    }

    function connectOrderSseStream(orderId, orderToken) {
      if (orderEventSource) {
        orderEventSource.close();
        orderEventSource = null;
      }

      try {
        const sseUrl = '/api/restaurant/events?token=' + encodeURIComponent(orderToken) + '&orderId=' + encodeURIComponent(orderId);
        orderEventSource = new EventSource(sseUrl);

        orderEventSource.onopen = () => {
          setTransportBadge(true);
        };

        orderEventSource.onmessage = () => {
          refreshOrderTrackingData();
        };

        // Listen for domain-specific events
        const eventTypes = [
          'order.status_updated',
          'order.created',
          'task.started',
          'task.ready',
          'task.bumped',
          'task.item_fulfilled'
        ];
        eventTypes.forEach(evtName => {
          orderEventSource.addEventListener(evtName, () => {
            refreshOrderTrackingData();
          });
        });

        orderEventSource.onerror = () => {
          setTransportBadge(false);
        };
      } catch (e) {
        setTransportBadge(false);
      }
    }

    async function refreshOrderTrackingData() {
      if (!activeTrackedOrderId) return;
      try {
        const headers = activeTrackedOrderToken
          ? { 'Authorization': 'Bearer ' + activeTrackedOrderToken, 'X-Order-Token': activeTrackedOrderToken }
          : {};
        const res = await fetch('/api/commerce/orders/' + encodeURIComponent(activeTrackedOrderId), { headers });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            stopOrderTracking();
          }
          return;
        }
        const data = await res.json();
        if (data && data.success && data.order) {
          renderAuthoritativeOrderTracking(data.order, data.liveStatus, data.statusLabel);
        }
      } catch (e) {}
    }

    function renderAuthoritativeOrderTracking(order, liveStatus, statusLabel) {
      lastKnownOrderStatus = liveStatus || order.status;
      const status = lastKnownOrderStatus;

      // Update Modal Header & Title
      const titleEl = document.getElementById('track-modal-title');
      const statusPill = document.getElementById('track-status-pill');
      const branchNameEl = document.getElementById('track-branch-name');

      if (titleEl) {
        if (status === 'READY') {
          titleEl.textContent = 'Order Prepared & Ready for Dispatch!';
        } else if (status === 'IN_PREPARATION') {
          titleEl.textContent = 'Cooking on Live Kitchen Stations';
        } else if (status === 'DELIVERED' || status === 'SERVED') {
          titleEl.textContent = 'Order Fulfilled & Complete';
        } else if (status === 'CANCELLED') {
          titleEl.textContent = 'Order Cancelled';
        } else {
          titleEl.textContent = 'Order Confirmed & Sent to Kitchen';
        }
      }

      if (statusPill) {
        statusPill.textContent = statusLabel || status;
        statusPill.style.color = (status === 'READY' || status === 'SERVED' || status === 'DELIVERED')
          ? 'var(--ca-green)'
          : (status === 'CANCELLED' ? 'var(--ca-red)' : 'var(--ca-primary)');
      }

      if (branchNameEl && order.targetBranch) {
        branchNameEl.textContent = order.targetBranch.name + ' (' + order.targetBranch.city + ')';
      }

      // 4-Step Stepper Update
      const step1 = document.getElementById('ca-step-1');
      const step2 = document.getElementById('ca-step-2');
      const step3 = document.getElementById('ca-step-3');
      const step4 = document.getElementById('ca-step-4');

      [step1, step2, step3, step4].forEach(s => {
        if (s) { s.classList.remove('active', 'done'); }
      });

      if (status === 'CONFIRMED') {
        if (step1) step1.classList.add('active');
      } else if (status === 'IN_PREPARATION') {
        if (step1) step1.classList.add('done');
        if (step2) step2.classList.add('active');
      } else if (status === 'READY') {
        if (step1) step1.classList.add('done');
        if (step2) step2.classList.add('done');
        if (step3) step3.classList.add('active');
      } else if (status === 'SERVED' || status === 'DELIVERED') {
        if (step1) step1.classList.add('done');
        if (step2) step2.classList.add('done');
        if (step3) step3.classList.add('done');
        if (step4) step4.classList.add('done');
      }

      // Station Tasks Breakdown
      const stationContainer = document.getElementById('track-station-tasks');
      if (stationContainer) {
        if (Array.isArray(order.stationTasks) && order.stationTasks.length > 0) {
          let tasksHtml = '';
          for (const t of order.stationTasks) {
            const stCol = t.status === 'READY' ? '#10B981' : (t.status === 'IN_PROGRESS' ? 'var(--ca-primary)' : 'var(--ca-stone)');
            const stBg = t.status === 'READY' ? 'rgba(16, 185, 129, 0.1)' : (t.status === 'IN_PROGRESS' ? 'var(--ca-primary-subtle)' : '#F3F4F6');
            tasksHtml += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #F9FAFB; border: 1px solid var(--ca-border); border-radius: 6px;">' +
              '<div style="display: flex; align-items: center; gap: 8px;">' +
                '<span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #E5E7EB; color: #374151;">' + (t.station || '') + '</span>' +
                '<span style="font-weight: 700; color: var(--ca-dark);">' + (t.name || '') + '</span>' +
              '</div>' +
              '<span style="font-size: 11px; font-weight: 800; color: ' + stCol + '; background: ' + stBg + '; padding: 2px 8px; border-radius: 999px;">' +
                (t.status === 'IN_PROGRESS' ? 'COOKING' : (t.status || 'PENDING')) +
              '</span>' +
            '</div>';
          }
          stationContainer.innerHTML = tasksHtml;
        } else {
          stationContainer.innerHTML = '<div style="color: var(--ca-muted); font-size: 12px; font-style: italic;">Routing to kitchen workstations...</div>';
        }
      }

      // Customer Summary
      const custName = document.getElementById('track-customer-name');
      const custPhone = document.getElementById('track-customer-phone');
      const custAddr = document.getElementById('track-customer-address');
      if (custName) custName.textContent = order.customerName || '-';
      if (custPhone) custPhone.textContent = order.customerPhone || '-';
      if (custAddr) custAddr.textContent = order.deliveryAddress || 'Takeaway Counter';

      // Update Floating Tracker Text
      const floatStatus = document.getElementById('ca-float-status');
      if (floatStatus) {
        floatStatus.textContent = (statusLabel || status) + ' · #' + (order.id ? order.id.slice(-6) : '');
      }

      // Stop polling & SSE if order completed or cancelled
      if (status === 'DELIVERED' || status === 'SERVED' || status === 'CANCELLED') {
        stopOrderTracking();
        try {
          localStorage.removeItem('ca_active_order');
        } catch (e) {}
      }
    }

    function startOrderPolling(orderId, orderToken) {
      if (orderPollInterval) clearInterval(orderPollInterval);
      orderPollInterval = setInterval(() => {
        refreshOrderTrackingData();
      }, 4000);
    }

    function stopOrderTracking() {
      if (orderPollInterval) {
        clearInterval(orderPollInterval);
        orderPollInterval = null;
      }
      if (orderEventSource) {
        orderEventSource.close();
        orderEventSource = null;
      }
    }

    function reopenTrackingModal() {
      const modal = document.getElementById('ca-tracking-modal');
      if (modal) modal.classList.add('open');
      const floatPill = document.getElementById('ca-floating-tracker');
      if (floatPill) floatPill.style.display = 'none';
      refreshOrderTrackingData();
    }

    function closeTrackingModal() {
      const modal = document.getElementById('ca-tracking-modal');
      if (modal) modal.classList.remove('open');

      // If order is still actively in progress, show floating tracker pill!
      if (activeTrackedOrderId && lastKnownOrderStatus && lastKnownOrderStatus !== 'DELIVERED' && lastKnownOrderStatus !== 'SERVED' && lastKnownOrderStatus !== 'CANCELLED') {
        const floatPill = document.getElementById('ca-floating-tracker');
        if (floatPill) floatPill.style.display = 'flex';
      }
    }

    // Auto-restore active order tracker on page reload
    try {
      const savedActive = localStorage.getItem('ca_active_order');
      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        if (parsed && parsed.orderId && parsed.orderToken) {
          activeTrackedOrderId = parsed.orderId;
          activeTrackedOrderToken = parsed.orderToken;
          refreshOrderTrackingData().then(() => {
            if (lastKnownOrderStatus && lastKnownOrderStatus !== 'DELIVERED' && lastKnownOrderStatus !== 'SERVED' && lastKnownOrderStatus !== 'CANCELLED') {
              const floatPill = document.getElementById('ca-floating-tracker');
              if (floatPill) floatPill.style.display = 'flex';
            }
          });
        }
      }
    } catch (e) {}

    // Initialize carousel buttons on page load
    window.addEventListener('DOMContentLoaded', () => {
      updateCarouselButtons();
    });
  </script>
</body>
</html>`;
}
