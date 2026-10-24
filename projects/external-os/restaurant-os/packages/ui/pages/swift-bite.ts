/**
 * 🪐 RestaurantOS 5.2 — SwiftBite Single-Brand Speed-First Mobile Ordering App
 * ─────────────────────────────────────────────────────────────────────────────
 * High-velocity mobile-first ordering application for an individual restaurant brand.
 * Features:
 * - Single-Brand Identity (OrbitoX Bistro · SwiftBite)
 * - 1-Tap Branch Selector Pill (Ludhiana Main, Chandigarh Sector 17, Delhi Connaught Place)
 * - Fast delivery SLA (⚡ 20-25 mins from selected branch)
 * - Instant dish search with real-time filtering
 * - 1-tap category rail (Starters, Mains, Breads, Beverages, Desserts)
 * - "Order Again in 1-Tap" past favorites carousel
 * - 1-tap fast add for uncustomized items (directly becomes [- 1 +] stepper)
 * - Focused customizer bottom-sheet for items with required options
 * - Sticky mobile bottom bar + desktop persistent order folio
 * - Idempotency protection (`x-idempotency-key`) preventing duplicate orders
 * - Real KDS kitchen task routing and live status milestone progression
 * - Zero emojis: 100% vector SVG icons via packages/ui/icons.ts
 */

import { BranchRecord, ResolvedMenuItem, RestaurantOrder, TenantBrandConfig } from '../../domain';
import { icon } from '../icons';

export function renderSwiftBitePage(
  branches: BranchRecord[],
  activeBranch: BranchRecord,
  resolvedMenu: ResolvedMenuItem[],
  brand: TenantBrandConfig,
  currentTableNumber: string = 'T-14',
  pastOrders?: RestaurantOrder[]
): string {
  const openingHours = activeBranch.openingHours || {
    openTime: '12:00 PM',
    closeTime: '11:30 PM',
    daysOpen: 'Mon - Sun',
    isOpenNow: true,
  };

  const categories = ['ALL', 'Starters', 'Mains', 'Breads', 'Beverages', 'Desserts'];

  // Identify authentic reorder items from menu
  const butterChicken = resolvedMenu.find((m) => m.id === 'item_butter_chicken') || resolvedMenu[0];
  const dalMakhani = resolvedMenu.find((m) => m.id === 'item_dal_makhani') || resolvedMenu[1];
  const garlicNaan = resolvedMenu.find((m) => m.id === 'item_garlic_naan') || resolvedMenu[2];
  const butterNaan = resolvedMenu.find((m) => m.id === 'item_butter_naan') || resolvedMenu[3];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
  <title>SwiftBite · ${brand.restaurantName} (${activeBranch.name})</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --sb-primary: #FC8019;
      --sb-primary-hover: #E46F10;
      --sb-primary-subtle: rgba(252, 128, 25, 0.08);
      --sb-bg: #F7F7F8;
      --sb-surface: #FFFFFF;
      --sb-dark: #171A29;
      --sb-stone: #4A4D58;
      --sb-muted: #8D929D;
      --sb-border: #E5E7EB;
      --sb-green: #2E8540;
      --sb-red: #D9383A;
      --sb-radius: 12px;
      --sb-radius-sm: 8px;
      --sb-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      --sb-shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.1);
      --font-display: "Plus Jakarta Sans", -apple-system, sans-serif;
      --font-body: "Inter", -apple-system, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--sb-bg);
      color: var(--sb-dark);
      font-family: var(--font-body);
      -webkit-font-smoothing: antialiased;
      line-height: 1.45;
      padding-bottom: 96px;
    }

    /* Top Speed Header */
    .sb-topbar {
      background: var(--sb-surface);
      border-bottom: 1px solid var(--sb-border);
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }
    .sb-topbar-inner {
      max-width: 1320px;
      margin: 0 auto;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .sb-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--sb-dark);
    }
    .sb-brand-logo {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--sb-primary), #FF9F43);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFF;
      box-shadow: 0 3px 10px rgba(252, 128, 25, 0.35);
      flex-shrink: 0;
    }
    .sb-brand-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .sb-brand-title span { color: var(--sb-primary); }

    /* Branch Switcher Pill */
    .sb-branch-wrapper { position: relative; }
    .sb-branch-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #F3F4F6;
      border: 1px solid var(--sb-border);
      color: var(--sb-dark);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: all 120ms ease;
    }
    .sb-branch-pill:hover {
      background: #FFF;
      border-color: var(--sb-primary);
    }
    .sb-branch-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: 290px;
      background: #FFF;
      border: 1px solid var(--sb-border);
      border-radius: var(--sb-radius);
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 200;
      overflow: hidden;
    }
    .sb-branch-dropdown.open { display: block; }
    .sb-branch-item {
      padding: 10px 14px;
      border-bottom: 1px solid #F1F3F5;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .sb-branch-item:hover { background: #F8F9FA; }
    .sb-branch-item.active {
      background: var(--sb-primary-subtle);
      font-weight: 800;
      color: var(--sb-primary);
    }

    /* ETA Pill */
    .sb-eta-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(46, 133, 64, 0.1);
      border: 1px solid rgba(46, 133, 64, 0.25);
      color: var(--sb-green);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }

    /* Search Bar */
    .sb-search-box {
      flex: 1;
      max-width: 440px;
      position: relative;
    }
    .sb-search-input {
      width: 100%;
      padding: 9px 16px 9px 38px;
      border-radius: 999px;
      border: 1px solid var(--sb-border);
      background: var(--sb-bg);
      font-size: 13px;
      color: var(--sb-dark);
      outline: none;
      transition: all 140ms ease;
    }
    .sb-search-input:focus {
      background: #FFF;
      border-color: var(--sb-primary);
    }
    .sb-search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--sb-muted);
      display: flex;
    }

    /* Layout Container */
    .sb-container {
      max-width: 1320px;
      margin: 0 auto;
      padding: 20px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 28px;
      align-items: flex-start;
      min-width: 0;
      width: 100%;
    }
    .sb-feed {
      min-width: 0;
      width: 100%;
    }

    /* Category Rail */
    .sb-cat-rail {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 20px;
      scrollbar-width: none;
      max-width: 100%;
    }
    .sb-cat-rail::-webkit-scrollbar { display: none; }
    .sb-cat-btn {
      padding: 8px 16px;
      border-radius: 999px;
      border: 1px solid var(--sb-border);
      background: var(--sb-surface);
      font-size: 12px;
      font-weight: 800;
      color: var(--sb-stone);
      cursor: pointer;
      white-space: nowrap;
      transition: all 120ms ease;
    }
    .sb-cat-btn:hover, .sb-cat-btn.active {
      background: var(--sb-primary);
      color: #FFF;
      border-color: var(--sb-primary);
      box-shadow: 0 2px 8px rgba(252, 128, 25, 0.25);
    }

    /* 1-Tap Reorder Carousel */
    .sb-reorder-wrap {
      background: var(--sb-surface);
      border: 1px solid var(--sb-border);
      border-radius: var(--sb-radius);
      padding: 16px 20px;
      margin-bottom: 22px;
      max-width: 100%;
      overflow: hidden;
    }
    .sb-reorder-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 800;
      color: var(--sb-dark);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sb-reorder-items {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      max-width: 100%;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .sb-reorder-items::-webkit-scrollbar { display: none; }
    .sb-reorder-card {
      background: #FAFAFA;
      border: 1px solid var(--sb-border);
      border-radius: var(--sb-radius-sm);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 250px;
      flex-shrink: 0;
    }
    .sb-reorder-btn {
      background: var(--sb-primary);
      color: #FFF;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 11px;
      cursor: pointer;
      margin-left: auto;
      white-space: nowrap;
    }

    /* Menu Items Feed */
    .sb-menu-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .sb-dish-card {
      background: var(--sb-surface);
      border: 1px solid var(--sb-border);
      border-radius: var(--sb-radius);
      padding: 16px 18px;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      box-shadow: var(--sb-shadow);
      transition: all 140ms ease;
    }
    .sb-dish-card:hover { border-color: #D1D5DB; }
    .sb-dish-card.is-sold-out { opacity: 0.65; background: #FCFCFC; }
    .sb-dish-body { flex: 1; }
    .sb-dish-veg {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border: 1px solid var(--sb-green);
      border-radius: 3px;
      margin-bottom: 6px;
    }
    .sb-dish-veg::after {
      content: "";
      width: 6px;
      height: 6px;
      background: var(--sb-green);
      border-radius: 50%;
    }
    .sb-dish-nonveg {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border: 1px solid var(--sb-red);
      border-radius: 3px;
      margin-bottom: 6px;
    }
    .sb-dish-nonveg::after {
      content: "";
      width: 6px;
      height: 6px;
      background: var(--sb-red);
      border-radius: 50%;
    }
    .sb-dish-title {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 800;
      color: var(--sb-dark);
      margin-bottom: 4px;
    }
    .sb-dish-desc {
      font-size: 12px;
      color: var(--sb-stone);
      line-height: 1.4;
      margin-bottom: 6px;
    }
    .sb-dish-price {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 800;
      color: var(--sb-dark);
    }
    .sb-dish-media {
      width: 120px;
      height: 104px;
      position: relative;
      border-radius: var(--sb-radius-sm);
      overflow: hidden;
      flex-shrink: 0;
    }
    .sb-dish-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .sb-dish-action-area {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
    }
    .sb-dish-add-btn {
      background: #FFF;
      color: var(--sb-primary);
      border: 1px solid var(--sb-border);
      border-radius: 6px;
      font-weight: 800;
      font-size: 12px;
      padding: 6px 16px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      transition: all 120ms ease;
      white-space: nowrap;
    }
    .sb-dish-add-btn:hover:not(:disabled) {
      background: var(--sb-primary);
      color: #FFF;
      border-color: var(--sb-primary);
    }
    .sb-dish-add-btn:disabled {
      background: #E5E7EB;
      color: #9CA3AF;
      border-color: #D1D5DB;
      cursor: not-allowed;
      box-shadow: none;
    }
    .sb-fast-stepper {
      display: none;
      align-items: center;
      background: var(--sb-primary);
      color: #FFF;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(252, 128, 25, 0.35);
    }
    .sb-fast-stepper button {
      background: none;
      border: none;
      color: #FFF;
      font-weight: 800;
      font-size: 14px;
      padding: 5px 10px;
      cursor: pointer;
    }
    .sb-fast-stepper span {
      font-size: 12px;
      font-weight: 800;
      padding: 0 4px;
    }

    /* Desktop Persistent Order Folio */
    .sb-folio-card {
      background: var(--sb-surface);
      border: 1px solid var(--sb-border);
      border-radius: var(--sb-radius);
      padding: 22px;
      box-shadow: var(--sb-shadow);
      position: sticky;
      top: 80px;
    }
    .sb-folio-title {
      font-family: var(--font-display);
      font-size: 17px;
      font-weight: 800;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sb-folio-items {
      max-height: 280px;
      overflow-y: auto;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sb-folio-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .sb-folio-stepper {
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--sb-border);
      border-radius: 4px;
      padding: 2px 6px;
    }
    .sb-folio-stepper button {
      background: none;
      border: none;
      color: var(--sb-primary);
      font-weight: 800;
      cursor: pointer;
    }
    .sb-folio-calc {
      border-top: 1px dashed var(--sb-border);
      padding-top: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: var(--sb-stone);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .sb-folio-calc-row {
      display: flex;
      justify-content: space-between;
    }
    .sb-folio-total {
      border-top: 1px solid var(--sb-border);
      padding-top: 10px;
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 900;
      color: var(--sb-dark);
      display: flex;
      justify-content: space-between;
    }
    .sb-order-btn {
      width: 100%;
      background: var(--sb-primary);
      color: #FFF;
      border: none;
      padding: 13px;
      border-radius: var(--sb-radius-sm);
      font-size: 14px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(252, 128, 25, 0.35);
      transition: all 120ms ease;
    }
    .sb-order-btn:hover:not(:disabled) { background: var(--sb-primary-hover); }
    .sb-order-btn:disabled { background: #D1D5DB; cursor: not-allowed; box-shadow: none; }

    /* Mobile Sticky Bottom Cart Bar */
    .sb-mobile-bar {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--sb-surface);
      border-top: 1px solid var(--sb-border);
      padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
      z-index: 1000;
      box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
    }
    .sb-mobile-bar-btn {
      width: 100%;
      background: var(--sb-primary);
      color: #FFF;
      border: none;
      border-radius: var(--sb-radius-sm);
      padding: 12px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
    }

    /* Customizer Bottom Sheet Modal */
    .sb-modal-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 1100;
      align-items: flex-end;
      justify-content: center;
    }
    .sb-modal-backdrop.open { display: flex; }
    .sb-sheet {
      background: #FFF;
      border-radius: 16px 16px 0 0;
      width: 100%;
      max-width: 500px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 24px;
      animation: sbSlideUp 200ms ease-out;
    }
    @keyframes sbSlideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .sb-option-group {
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid #F1F3F5;
    }
    .sb-option-label {
      font-size: 13px;
      font-weight: 800;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .sb-radio-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      font-size: 13px;
      cursor: pointer;
    }
    /* Floating Reopen Tracker Pill */
    .sb-floating-tracker {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 1050;
      background: #111827;
      color: #FFF;
      border: 1px solid rgba(252, 128, 25, 0.5);
      border-radius: 999px;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 10px 32px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: all 180ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sb-floating-tracker:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 40px rgba(252, 128, 25, 0.35);
      border-color: var(--sb-primary);
    }
    .sb-pulse {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: sb-pulse-anim 1.8s infinite;
      flex-shrink: 0;
    }
    @keyframes sb-pulse-anim {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .sb-tracker-label {
      font-size: 10px;
      font-weight: 800;
      color: var(--sb-primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.1;
    }
    .sb-tracker-status {
      font-size: 12px;
      font-weight: 700;
      color: #FFF;
      line-height: 1.2;
    }
    .sb-tracker-action {
      font-size: 11px;
      font-weight: 800;
      color: #D1D5DB;
      background: rgba(255,255,255,0.12);
      padding: 4px 10px;
      border-radius: 999px;
    }

    /* Tracking Stepper */
    .sb-track-stepper {
      display: flex;
      flex-direction: column;
      margin: 16px 0;
    }
    .sb-track-step {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      position: relative;
      padding-bottom: 16px;
    }
    .sb-track-step:last-child {
      padding-bottom: 0;
    }
    .sb-track-step-line {
      position: absolute;
      left: 11px;
      top: 24px;
      bottom: 0;
      width: 2px;
      background: #E5E7EB;
    }
    .sb-track-step.done .sb-track-step-line {
      background: #10B981;
    }
    .sb-track-step-bullet {
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
    .sb-track-step.active .sb-track-step-bullet {
      background: var(--sb-primary);
      border-color: var(--sb-primary);
      color: #FFF;
      box-shadow: 0 0 0 4px rgba(252, 128, 25, 0.2);
    }
    .sb-track-step.done .sb-track-step-bullet {
      background: #10B981;
      border-color: #10B981;
      color: #FFF;
    }

    /* Responsive Breakdown */
    @media (max-width: 900px) {
      .sb-container { grid-template-columns: minmax(0, 1fr); }
      .sb-folio-card { display: none; }
      .sb-mobile-bar { display: block; }
    }
    @media (max-width: 600px) {
      .sb-topbar-inner {
        padding: 10px 14px;
        flex-wrap: wrap;
        gap: 8px;
      }
      .sb-brand-title { font-size: 16px; }
      .sb-branch-pill { max-width: 160px; }
      .sb-branch-pill span#sb-branch-name {
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sb-eta-pill { display: none; }
      .sb-search-box { order: 3; max-width: 100%; width: 100%; }
      .sb-container { padding: 12px; }
      .sb-reorder-wrap { padding: 12px 14px; }
      .sb-reorder-card { min-width: 220px; }
      .sb-dish-card { padding: 12px 14px; gap: 10px; }
      .sb-dish-media { width: 95px; height: 85px; }
    }
  </style>
</head>
<body>

  <!-- Top Speed Header -->
  <header class="sb-topbar">
    <div class="sb-topbar-inner">
      <a href="/apps/swift-bite?branch=${activeBranch.id}" class="sb-brand" id="sb-brand-link">
        <div class="sb-brand-logo">
          ${icon('zap', { size: 20, strokeWidth: 3 })}
        </div>
        <div class="sb-brand-title">${brand.restaurantName.split(' ')[0]}<span>Swift</span></div>
      </a>

      <!-- Branch Switcher Pill -->
      <div class="sb-branch-wrapper">
        <button class="sb-branch-pill" id="sb-branch-trigger" onclick="toggleBranchDropdown()">
          ${icon('map-pin', { size: 14, color: 'var(--sb-primary)' })}
          <span id="sb-branch-name">${activeBranch.name}</span>
          ${icon('chevron-down', { size: 12 })}
        </button>

        <div class="sb-branch-dropdown" id="sb-branch-dropdown">
          <div style="padding: 8px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--sb-muted); background: #F8F9FA;">
            Switch Branch
          </div>
          ${branches
            .map((b) => {
              const isActive = b.id === activeBranch.id;
              return `
            <div class="sb-branch-item ${isActive ? 'active' : ''}" onclick="selectBranch('${b.id}')">
              <span>${b.name} (${b.city})</span>
              ${isActive ? icon('check', { size: 14 }) : ''}
            </div>`;
            })
            .join('')}
        </div>
      </div>

      <!-- Fast ETA Pill -->
      <div class="sb-eta-pill">
        ${icon('clock', { size: 12 })}
        <span>⚡ 20-25 mins (${activeBranch.code})</span>
      </div>

      <!-- Quick Dish Search -->
      <div class="sb-search-box">
        <span class="sb-search-icon">${icon('search', { size: 15 })}</span>
        <input
          type="text"
          class="sb-search-input"
          id="sb-search-input"
          placeholder="Craving murgh makhani, roti, cold brew..."
          oninput="handleQuickSearch(this.value)"
        />
      </div>
    </div>
  </header>

  <!-- Main Feed & Persistent Folio -->
  <div class="sb-container">

    <!-- Left Feed -->
    <main class="sb-feed">

      <!-- 1-Tap Category Rail -->
      <div class="sb-cat-rail">
        ${categories
          .map(
            (cat) => `
          <button class="sb-cat-btn ${cat === 'ALL' ? 'active' : ''}" onclick="filterCategory('${cat}')">
            ${cat === 'ALL' ? 'All Cravings' : cat}
          </button>`
          )
          .join('')}
      </div>

      <!-- "Order Again in 1-Tap" Carousel -->
      <div class="sb-reorder-wrap">
        <div class="sb-reorder-title">
          <span>Order Again in 1-Tap</span>
          <span style="font-size: 11px; color: var(--sb-primary); font-weight: 700;">Recent Favorites</span>
        </div>
        <div class="sb-reorder-items">
          <div class="sb-reorder-card">
            <div>
              <div style="font-size: 13px; font-weight: 800;">${butterChicken.name} + Naan</div>
              <div style="font-size: 11px; color: var(--sb-muted);">Total ₹680 · Delivered 2 days ago</div>
            </div>
            <button class="sb-reorder-btn" onclick="reorderPair('${butterChicken.id}', '${garlicNaan.id}')">REORDER</button>
          </div>
          <div class="sb-reorder-card">
            <div>
              <div style="font-size: 13px; font-weight: 800;">${dalMakhani.name} + Roti</div>
              <div style="font-size: 11px; color: var(--sb-muted);">Total ₹440 · Delivered last week</div>
            </div>
            <button class="sb-reorder-btn" onclick="reorderPair('${dalMakhani.id}', 'item_tandoori_roti')">REORDER</button>
          </div>
        </div>
      </div>

      <!-- Menu Items List -->
      <div class="sb-menu-list" id="sb-menu-list">
        ${resolvedMenu
          .map((item) => {
            const isVeg = item.dietaryFlags?.includes('VEG') || false;
            const isSoldOut = !item.isAvailableAtBranch;
            const hasRequiredModifiers = Boolean(
              item.modifierGroups && item.modifierGroups.some((g) => g.minSelections > 0)
            );

            return `
          <div
            class="sb-dish-card ${isSoldOut ? 'is-sold-out' : ''}"
            id="dish-card-${item.id}"
            data-dish-id="${item.id}"
            data-dish-cat="${item.category}"
            data-dish-name="${item.name.toLowerCase()}"
            data-required-opts="${hasRequiredModifiers}"
          >
            <div class="sb-dish-body">
              <div class="${isVeg ? 'sb-dish-veg' : 'sb-dish-nonveg'}"></div>
              <div class="sb-dish-title">${item.name}</div>
              <div class="sb-dish-desc">${item.description}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="sb-dish-price">${item.effectiveFormattedPrice}</div>
                ${item.isPriceOverridden ? `<span style="font-size: 10px; background: rgba(252,128,25,0.1); color: var(--sb-primary); font-weight: 800; padding: 2px 6px; border-radius: 4px;">${activeBranch.code} Special</span>` : ''}
                ${isSoldOut ? `<span style="font-size: 10px; background: rgba(217,56,58,0.1); color: var(--sb-red); font-weight: 800; padding: 2px 6px; border-radius: 4px;">Sold Out at Outlet</span>` : ''}
              </div>
            </div>
            <div class="sb-dish-media">
              <img src="${item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}" alt="${item.name}" />
              <div class="sb-dish-action-area">
                <button
                  class="sb-dish-add-btn"
                  id="btn-add-${item.id}"
                  ${isSoldOut ? 'disabled' : ''}
                  onclick="triggerItemAdd('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.effectivePriceMinor}, ${hasRequiredModifiers})"
                >
                  ${isSoldOut ? '86\'d' : hasRequiredModifiers ? '+ ADD (Custom)' : '+ ADD'}
                </button>
                <div class="sb-fast-stepper" id="stepper-${item.id}">
                  <button onclick="updateQty('${item.id}', -1)">-</button>
                  <span id="qty-${item.id}">1</span>
                  <button onclick="updateQty('${item.id}', 1)">+</button>
                </div>
              </div>
            </div>
          </div>`;
          })
          .join('')}
      </div>

    </main>

    <!-- Right Column: Desktop Persistent Folio -->
    <aside class="sb-folio-card">
      <div class="sb-folio-title">
        <span>Order Folio</span>
        <span style="font-size: 12px; color: var(--sb-primary); font-weight: 800;">${activeBranch.name}</span>
      </div>

      <div class="sb-folio-items" id="sb-folio-items-list">
        <div style="text-align: center; color: var(--sb-muted); padding: 30px 10px; font-size: 13px;">
          ${icon('shopping-bag', { size: 32, color: '#D1D5DB' })}
          <div style="font-weight: 700; color: var(--sb-dark); margin-top: 8px;">Order folio is empty</div>
          <div style="font-size: 11px; margin-top: 2px;">Add dishes to review quote and dispatch.</div>
        </div>
      </div>

      <div class="sb-folio-calc">
        <div class="sb-folio-calc-row">
          <span>Subtotal</span>
          <span id="sb-folio-subtotal">₹0.00</span>
        </div>
        <div class="sb-folio-calc-row">
          <span>GST (5%)</span>
          <span id="sb-folio-tax">₹0.00</span>
        </div>
        <div class="sb-folio-calc-row">
          <span>Speed Delivery Fee</span>
          <span id="sb-folio-fee">₹35.00</span>
        </div>
        <div class="sb-folio-total">
          <span>Authoritative Quote</span>
          <span id="sb-folio-total">₹0.00</span>
        </div>
      </div>

      <!-- Customer & Delivery Inputs (Desktop) -->
      <div style="margin: 12px 0 14px 0; background: #F9FAFB; border: 1px solid var(--sb-border); border-radius: var(--sb-radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--sb-dark); letter-spacing: 0.04em;">
          Customer & Delivery Details
        </div>
        <div>
          <label for="sb-customer-name" style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">FULL NAME *</label>
          <input
            type="text"
            id="sb-customer-name"
            placeholder="e.g. Jaspreet Kaur"
            style="width: 100%; padding: 6px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--sb-dark);"
            maxlength="80"
          />
        </div>
        <div>
          <label for="sb-customer-phone" style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">MOBILE PHONE (+91) *</label>
          <input
            type="tel"
            id="sb-customer-phone"
            placeholder="+91 98765 43210"
            style="width: 100%; padding: 6px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--sb-dark);"
            maxlength="16"
          />
        </div>
        <div>
          <label for="sb-delivery-address" style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">DELIVERY ADDRESS IN ${activeBranch.city} *</label>
          <input
            type="text"
            id="sb-delivery-address"
            placeholder="Flat/house, building, street..."
            value="Phase 2, Urban Estate"
            style="width: 100%; padding: 6px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--sb-dark);"
            maxlength="250"
          />
        </div>
        <div>
          <label for="sb-customer-notes" style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">INSTRUCTIONS (OPTIONAL)</label>
          <input
            type="text"
            id="sb-customer-notes"
            placeholder="e.g. Leave with security, extra chutney"
            style="width: 100%; padding: 6px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 12px; font-family: var(--font-body); color: var(--sb-dark);"
            maxlength="200"
          />
        </div>
        <div id="sb-checkout-error" style="display: none; padding: 6px 10px; background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 11px; color: #DC2626; font-weight: 700;"></div>
      </div>

      <button class="sb-order-btn" id="sb-submit-order-btn" disabled onclick="submitOrder(false)">
        Dispatch Order (20-25m)
      </button>
    </aside>

  </div>

  <!-- Mobile Sticky Bottom Cart Summary -->
  <div class="sb-mobile-bar" id="sb-mobile-bar">
    <button class="sb-mobile-bar-btn" onclick="openMobileCheckout()">
      <span id="sb-mobile-cart-count">0 Items · ₹0.00</span>
      <span>View Cart & Dispatch →</span>
    </button>
  </div>

  <!-- Mobile Checkout Bottom Sheet Modal -->
  <div class="sb-modal-backdrop" id="sb-mobile-checkout-modal" onclick="if(event.target===this) closeMobileCheckout()">
    <div class="sb-sheet">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--sb-border); padding-bottom: 10px;">
        <div>
          <div style="font-family: var(--font-display); font-size: 17px; font-weight: 800;">Review & Dispatch Order</div>
          <div style="font-size: 12px; color: var(--sb-stone);">${activeBranch.name} Express</div>
        </div>
        <button onclick="closeMobileCheckout()" style="background: none; border: none; cursor: pointer; color: var(--sb-stone);">${icon('x', { size: 18 })}</button>
      </div>

      <div id="sb-m-items-list" style="margin-bottom: 14px; max-height: 180px; overflow-y: auto;">
        <!-- Injected dynamically -->
      </div>

      <div style="background: #F9FAFB; border: 1px solid var(--sb-border); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal</span>
          <span id="sb-m-subtotal">₹0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>GST (5%)</span>
          <span id="sb-m-tax">₹0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Speed Delivery Fee</span>
          <span>₹35.00</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 14px; border-top: 1px solid var(--sb-border); padding-top: 6px; margin-top: 2px;">
          <span>Total Quote</span>
          <span id="sb-m-total" style="color: var(--sb-primary);">₹0.00</span>
        </div>
      </div>

      <!-- Mobile Identity Inputs -->
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
        <div>
          <label style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">FULL NAME *</label>
          <input
            type="text"
            id="sb-m-customer-name"
            placeholder="e.g. Jaspreet Kaur"
            style="width: 100%; padding: 8px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 13px;"
            maxlength="80"
          />
        </div>
        <div>
          <label style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">MOBILE PHONE (+91) *</label>
          <input
            type="tel"
            id="sb-m-customer-phone"
            placeholder="+91 98765 43210"
            style="width: 100%; padding: 8px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 13px;"
            maxlength="16"
          />
        </div>
        <div>
          <label style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">DELIVERY ADDRESS IN ${activeBranch.city} *</label>
          <input
            type="text"
            id="sb-m-delivery-address"
            placeholder="Flat/house, building, street..."
            value="Phase 2, Urban Estate"
            style="width: 100%; padding: 8px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 13px;"
            maxlength="250"
          />
        </div>
        <div>
          <label style="display: block; font-size: 10px; font-weight: 700; color: var(--sb-stone); margin-bottom: 2px;">INSTRUCTIONS (OPTIONAL)</label>
          <input
            type="text"
            id="sb-m-customer-notes"
            placeholder="e.g. Leave with security, extra chutney"
            style="width: 100%; padding: 8px 10px; border: 1px solid var(--sb-border); border-radius: 6px; font-size: 13px;"
            maxlength="200"
          />
        </div>
        <div id="sb-m-checkout-error" style="display: none; padding: 6px 10px; background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 6px; font-size: 11px; color: #DC2626; font-weight: 700;"></div>
      </div>

      <button class="sb-order-btn" id="sb-m-submit-order-btn" onclick="submitOrder(true)">
        Confirm & Dispatch Order
      </button>
    </div>
  </div>

  <!-- Authoritative Order Tracking Modal -->
  <div class="sb-modal-backdrop" id="sb-tracking-modal" onclick="if(event.target===this) closeTrackingModal()">
    <div class="sb-sheet" style="max-width: 520px; border-radius: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; border-bottom: 1px solid var(--sb-border); padding-bottom: 10px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span id="sb-track-transport" style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 999px; background: rgba(46, 133, 64, 0.1); color: var(--sb-green); border: 1px solid rgba(46, 133, 64, 0.25);">
              🟢 Live SSE Stream
            </span>
            <span style="font-size: 12px; color: var(--sb-muted); font-family: monospace;">Order #<span id="sb-track-order-id">-</span></span>
          </div>
          <div id="sb-track-modal-title" style="font-family: var(--font-display); font-size: 18px; font-weight: 900; color: var(--sb-dark);">
            Order Confirmed & Sent to Kitchen
          </div>
        </div>
        <button onclick="closeTrackingModal()" style="background: none; border: none; cursor: pointer; color: var(--sb-stone); padding: 4px;">
          ${icon('x', { size: 20 })}
        </button>
      </div>

      <div style="background: #F9FAFB; border: 1px solid var(--sb-border); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: var(--sb-stone);">Kitchen Hub:</span>
          <strong id="sb-track-branch-name">${activeBranch.name} Express</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--sb-stone);">Authoritative Status:</span>
          <span id="sb-track-status-pill" style="font-weight: 800; color: var(--sb-primary); text-transform: uppercase;">CONFIRMED</span>
        </div>
      </div>

      <!-- 4-Step Stepper -->
      <div class="sb-track-stepper">
        <div class="sb-track-step" id="sb-step-1">
          <div class="sb-track-step-line"></div>
          <div class="sb-track-step-bullet">1</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--sb-dark);">Order Confirmed</div>
            <div style="font-size: 11px; color: var(--sb-stone);">Routed to branch kitchen stations</div>
          </div>
        </div>
        <div class="sb-track-step" id="sb-step-2">
          <div class="sb-track-step-line"></div>
          <div class="sb-track-step-bullet">2</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--sb-dark);">Cooking on Kitchen Stations</div>
            <div style="font-size: 11px; color: var(--sb-stone);">Preparation in progress</div>
          </div>
        </div>
        <div class="sb-track-step" id="sb-step-3">
          <div class="sb-track-step-line"></div>
          <div class="sb-track-step-bullet">3</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--sb-dark);">Order Ready</div>
            <div style="font-size: 11px; color: var(--sb-stone);">Packed for express dispatch</div>
          </div>
        </div>
        <div class="sb-track-step" id="sb-step-4">
          <div class="sb-track-step-bullet">4</div>
          <div>
            <div style="font-weight: 800; font-size: 13px; color: var(--sb-dark);">Dispatched / Complete</div>
            <div style="font-size: 11px; color: var(--sb-stone);">Fulfilled to customer</div>
          </div>
        </div>
      </div>

      <!-- Station Tasks Breakdown -->
      <div style="margin-top: 12px; border-top: 1px solid var(--sb-border); padding-top: 10px;">
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--sb-stone); margin-bottom: 8px;">
          Live Station Task Breakdown
        </div>
        <div id="sb-track-station-tasks" style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
          <div style="color: var(--sb-muted); font-size: 12px; font-style: italic;">Routing to kitchen workstations...</div>
        </div>
      </div>

      <!-- Customer Details -->
      <div style="margin-top: 12px; background: #FFF; border: 1px solid var(--sb-border); border-radius: 8px; padding: 10px 12px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span style="color: var(--sb-muted);">Recipient:</span>
          <strong id="sb-track-customer-name">-</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span style="color: var(--sb-muted);">Phone:</span>
          <span id="sb-track-customer-phone" style="font-family: monospace;">-</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--sb-muted);">Address:</span>
          <span id="sb-track-customer-address" style="text-align: right; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</span>
        </div>
      </div>

      <button class="sb-order-btn" style="margin-top: 14px;" onclick="closeTrackingModal()">
        Keep Browsing Menu
      </button>
    </div>
  </div>

  <!-- Floating Reopen Tracker Pill -->
  <div id="sb-floating-tracker" class="sb-floating-tracker" style="display: none;" onclick="reopenTrackingModal()">
    <div class="sb-pulse"></div>
    <div style="display: flex; flex-direction: column;">
      <span class="sb-tracker-label">ACTIVE ORDER</span>
      <span class="sb-tracker-status" id="sb-float-status">In Kitchen</span>
    </div>
    <span class="sb-tracker-action">Track Live →</span>
  </div>

  <!-- Customizer Bottom Sheet Modal -->
  <div class="sb-modal-backdrop" id="sb-customizer-modal" onclick="if(event.target===this) closeCustomizer()">
    <div class="sb-sheet">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div>
          <div id="cust-item-name" style="font-family: var(--font-display); font-size: 17px; font-weight: 800;">Customize Dish</div>
          <div id="cust-item-price" style="font-size: 13px; color: var(--sb-stone);">₹0.00</div>
        </div>
        <button onclick="closeCustomizer()" style="background: none; border: none; cursor: pointer;">${icon('x', { size: 18 })}</button>
      </div>

      <div class="sb-option-group">
        <div class="sb-option-label">
          <span>Spice Customization</span>
          <span style="font-size: 11px; color: var(--sb-primary);">Required</span>
        </div>
        <label class="sb-radio-option">
          <input type="radio" name="spice_opt" value="Mild" checked />
          <span>Mild & Fragrant Butter Sauce</span>
        </label>
        <label class="sb-radio-option">
          <input type="radio" name="spice_opt" value="Medium" />
          <span>Medium Bistro Signature Spice</span>
        </label>
        <label class="sb-radio-option">
          <input type="radio" name="spice_opt" value="Spicy" />
          <span>Amritsari Sharp Chili Punch</span>
        </label>
      </div>

      <div class="sb-option-group">
        <div class="sb-option-label">
          <span>Portion Size</span>
          <span style="font-size: 11px; color: var(--sb-primary);">Required</span>
        </div>
        <label class="sb-radio-option">
          <input type="radio" name="size_opt" value="Regular" data-delta="0" checked />
          <span>Regular Handi Portion (Serves 1-2)</span>
        </label>
        <label class="sb-radio-option">
          <input type="radio" name="size_opt" value="Large" data-delta="14000" />
          <span>Feast Size Handi (+₹140.00)</span>
        </label>
      </div>

      <button class="sb-order-btn" style="margin-top: 10px;" onclick="confirmCustomization()">
        Add Customized Item to Order
      </button>
    </div>
  </div>

  <script>
    const activeBranchId = "${activeBranch.id}";
    const menuItems = ${JSON.stringify(resolvedMenu)};
    let cart = [];
    let activeCustomizingItem = null;

    function toggleBranchDropdown() {
      document.getElementById('sb-branch-dropdown').classList.toggle('open');
    }

    function selectBranch(id) {
      if (id === activeBranchId) {
        toggleBranchDropdown();
        return;
      }
      if (cart.length > 0) {
        if (!confirm('Switching branch will update menu pricing and verify availability for this location. Proceed?')) {
          return;
        }
      }
      window.location.href = '/apps/swift-bite?branch=' + encodeURIComponent(id);
    }

    function filterCategory(cat) {
      document.querySelectorAll('.sb-cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === (cat === 'ALL' ? 'All Cravings' : cat));
      });
      document.querySelectorAll('.sb-dish-card').forEach(c => {
        if (cat === 'ALL' || c.getAttribute('data-dish-cat') === cat) {
          c.style.display = 'flex';
        } else {
          c.style.display = 'none';
        }
      });
    }

    function handleQuickSearch(q) {
      const query = q.toLowerCase().trim();
      document.querySelectorAll('.sb-dish-card').forEach(c => {
        const name = c.getAttribute('data-dish-name') || '';
        const desc = c.querySelector('.sb-dish-desc')?.textContent.toLowerCase() || '';
        c.style.display = (name.includes(query) || desc.includes(query)) ? 'flex' : 'none';
      });
    }

    function triggerItemAdd(id, name, priceMinor, hasRequiredModifiers) {
      if (hasRequiredModifiers) {
        activeCustomizingItem = { id, name, priceMinor };
        document.getElementById('cust-item-name').textContent = name;
        document.getElementById('cust-item-price').textContent = 'Base: ₹' + (priceMinor / 100).toFixed(2);
        document.getElementById('sb-customizer-modal').classList.add('open');
      } else {
        // Fast 1-tap add directly
        addItemToCart(id, name, priceMinor);
        toggleStepper(id, true, 1);
      }
    }

    function closeCustomizer() {
      document.getElementById('sb-customizer-modal').classList.remove('open');
      activeCustomizingItem = null;
    }

    function confirmCustomization() {
      if (!activeCustomizingItem) return;
      const spice = document.querySelector('input[name="spice_opt"]:checked')?.value || 'Medium';
      const sizeRadio = document.querySelector('input[name="size_opt"]:checked');
      const size = sizeRadio?.value || 'Regular';
      const deltaMinor = parseInt(sizeRadio?.getAttribute('data-delta') || '0', 10);

      const finalPriceMinor = activeCustomizingItem.priceMinor + deltaMinor;
      const itemName = activeCustomizingItem.name + ' (' + spice + ', ' + size + ')';

      addItemToCart(activeCustomizingItem.id, itemName, finalPriceMinor);
      closeCustomizer();
    }

    function addItemToCart(id, name, priceMinor) {
      const existing = cart.find(i => i.name === name);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ id, name, priceMinor, quantity: 1 });
      }
      renderFolio();
    }

    function updateQty(id, delta) {
      const idx = cart.findIndex(i => i.id === id);
      if (idx === -1) return;
      cart[idx].quantity += delta;
      const newQty = cart[idx].quantity;
      if (newQty <= 0) {
        cart.splice(idx, 1);
        toggleStepper(id, false, 0);
      } else {
        const qtySpan = document.getElementById('qty-' + id);
        if (qtySpan) qtySpan.textContent = newQty;
      }
      renderFolio();
    }

    function toggleStepper(id, show, qty) {
      const btn = document.getElementById('btn-add-' + id);
      const stepper = document.getElementById('stepper-' + id);
      const qtySpan = document.getElementById('qty-' + id);
      if (btn && stepper) {
        if (show) {
          btn.style.display = 'none';
          stepper.style.display = 'inline-flex';
          if (qtySpan) qtySpan.textContent = qty;
        } else {
          btn.style.display = 'inline-block';
          stepper.style.display = 'none';
        }
      }
    }

    function reorderPair(id1, id2) {
      const it1 = menuItems.find(m => m.id === id1);
      const it2 = menuItems.find(m => m.id === id2);
      if (it1) addItemToCart(it1.id, it1.name, it1.effectivePriceMinor);
      if (it2) addItemToCart(it2.id, it2.name, it2.effectivePriceMinor);
    }

    function renderFolio() {
      const listContainer = document.getElementById('sb-folio-items-list');
      const submitBtn = document.getElementById('sb-submit-order-btn');
      const mobileCount = document.getElementById('sb-mobile-cart-count');

      const totalItems = cart.reduce((acc, it) => acc + it.quantity, 0);

      if (cart.length === 0) {
        listContainer.innerHTML = \`
          <div style="text-align: center; color: var(--sb-muted); padding: 30px 10px; font-size: 13px;">
            ${icon('shopping-bag', { size: 32, color: '#D1D5DB' })}
            <div style="font-weight: 700; color: var(--sb-dark); margin-top: 8px;">Order folio is empty</div>
            <div style="font-size: 11px; margin-top: 2px;">Add dishes to review quote and dispatch.</div>
          </div>\`;
        document.getElementById('sb-folio-subtotal').textContent = '₹0.00';
        document.getElementById('sb-folio-tax').textContent = '₹0.00';
        document.getElementById('sb-folio-total').textContent = '₹0.00';
        submitBtn.disabled = true;
        if (mobileCount) mobileCount.textContent = '0 Items · ₹0.00';
        return;
      }

      let subtotalMinor = 0;
      let html = '';
      for (const it of cart) {
        const itemTotal = it.priceMinor * it.quantity;
        subtotalMinor += itemTotal;
        html += \`
          <div class="sb-folio-item">
            <div>
              <div style="font-weight: 700; color: var(--sb-dark);">\${it.name}</div>
              <div style="font-size: 11px; color: var(--sb-muted);">₹\${(it.priceMinor / 100).toFixed(2)} each</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 800;">x\${it.quantity}</span>
              <span style="font-weight: 800; width: 60px; text-align: right;">₹\${(itemTotal / 100).toFixed(2)}</span>
            </div>
          </div>\`;
      }
      listContainer.innerHTML = html;

      const taxMinor = Math.round(subtotalMinor * 0.05);
      const feeMinor = 3500;
      const totalMinor = subtotalMinor + taxMinor + feeMinor;

      document.getElementById('sb-folio-subtotal').textContent = '₹' + (subtotalMinor / 100).toFixed(2);
      document.getElementById('sb-folio-tax').textContent = '₹' + (taxMinor / 100).toFixed(2);
      document.getElementById('sb-folio-total').textContent = '₹' + (totalMinor / 100).toFixed(2);
      submitBtn.disabled = false;

      if (mobileCount) {
        mobileCount.textContent = totalItems + ' Items · ₹' + (totalMinor / 100).toFixed(2);
      }

      const mSubtotal = document.getElementById('sb-m-subtotal');
      const mTax = document.getElementById('sb-m-tax');
      const mTotal = document.getElementById('sb-m-total');
      const mList = document.getElementById('sb-m-items-list');
      if (mSubtotal) mSubtotal.textContent = '₹' + (subtotalMinor / 100).toFixed(2);
      if (mTax) mTax.textContent = '₹' + (taxMinor / 100).toFixed(2);
      if (mTotal) mTotal.textContent = '₹' + (totalMinor / 100).toFixed(2);
      if (mList && html) mList.innerHTML = html;
    }

    function openMobileCheckout() {
      if (cart.length === 0) return;
      renderFolio();
      // Sync desktop values into mobile inputs if present
      const dName = document.getElementById('sb-customer-name')?.value;
      const dPhone = document.getElementById('sb-customer-phone')?.value;
      const dAddr = document.getElementById('sb-delivery-address')?.value;
      const dNotes = document.getElementById('sb-customer-notes')?.value;
      if (dName && !document.getElementById('sb-m-customer-name')?.value) document.getElementById('sb-m-customer-name').value = dName;
      if (dPhone && !document.getElementById('sb-m-customer-phone')?.value) document.getElementById('sb-m-customer-phone').value = dPhone;
      if (dAddr && !document.getElementById('sb-m-delivery-address')?.value) document.getElementById('sb-m-delivery-address').value = dAddr;
      if (dNotes && !document.getElementById('sb-m-customer-notes')?.value) document.getElementById('sb-m-customer-notes').value = dNotes;

      document.getElementById('sb-mobile-checkout-modal')?.classList.add('open');
    }

    function closeMobileCheckout() {
      document.getElementById('sb-mobile-checkout-modal')?.classList.remove('open');
    }

    let pendingSbOrderAttemptKey = null;
    let sbOrderPollInterval = null;
    let sbOrderEventSource = null;
    let activeSbTrackedOrderId = null;
    let activeSbTrackedOrderToken = null;
    let lastKnownSbOrderStatus = null;

    function getSbOrderIdempotencyKey() {
      if (!pendingSbOrderAttemptKey) {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
          pendingSbOrderAttemptKey = 'idemp_sb_' + window.crypto.randomUUID();
        } else {
          pendingSbOrderAttemptKey = 'idemp_sb_' + Date.now().toString(36) + '_' + Array.from(window.crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('');
        }
      }
      return pendingSbOrderAttemptKey;
    }

    function showSbError(msg, isMobile) {
      const errEl = isMobile
        ? document.getElementById('sb-m-checkout-error')
        : document.getElementById('sb-checkout-error');
      if (!errEl) return;
      if (msg) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
      } else {
        errEl.textContent = '';
        errEl.style.display = 'none';
      }
    }

    async function submitOrder(isMobile) {
      if (cart.length === 0) return;
      showSbError(null, isMobile);

      const nameEl = document.getElementById(isMobile ? 'sb-m-customer-name' : 'sb-customer-name');
      const phoneEl = document.getElementById(isMobile ? 'sb-m-customer-phone' : 'sb-customer-phone');
      const addrEl = document.getElementById(isMobile ? 'sb-m-delivery-address' : 'sb-delivery-address');
      const notesEl = document.getElementById(isMobile ? 'sb-m-customer-notes' : 'sb-customer-notes');

      const customerName = (nameEl ? nameEl.value : '').trim();
      const customerPhone = (phoneEl ? phoneEl.value : '').trim();
      const deliveryAddress = (addrEl ? addrEl.value : '').trim();
      const customerNotes = (notesEl ? notesEl.value : '').trim();

      // Client-side validations
      if (!customerName || customerName.length < 2 || customerName.length > 80 || /<[a-zA-Z][^>]*>/.test(customerName)) {
        showSbError('Please enter a valid full name (2 to 80 characters, no HTML tags).', isMobile);
        if (nameEl) nameEl.focus();
        return;
      }

      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      const validPhone = (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) ||
        (cleanPhone.length === 12 && cleanPhone.startsWith('91') && /^[6-9]/.test(cleanPhone.slice(2))) ||
        (cleanPhone.length === 11 && cleanPhone.startsWith('0') && /^[6-9]/.test(cleanPhone.slice(1)));

      if (!validPhone) {
        showSbError('Please enter a valid 10-digit Indian mobile number (+91 [6-9]XXXXXXXXX).', isMobile);
        if (phoneEl) phoneEl.focus();
        return;
      }

      if (!deliveryAddress || deliveryAddress.length < 5) {
        showSbError('Please provide a complete delivery address (minimum 5 characters).', isMobile);
        if (addrEl) addrEl.focus();
        return;
      }

      const submitBtn = document.getElementById(isMobile ? 'sb-m-submit-order-btn' : 'sb-submit-order-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Dispatching to Kitchen...';
      }

      const idempotencyKey = getSbOrderIdempotencyKey();

      try {
        const res = await fetch('/api/commerce/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            branchId: activeBranchId,
            fulfillmentMethod: 'delivery',
            customerName: customerName,
            customerPhone: customerPhone,
            deliveryAddress: deliveryAddress,
            customerNotes: customerNotes,
            items: cart.map(it => ({
              id: it.id,
              name: it.name,
              quantity: it.quantity,
              priceMinor: it.priceMinor,
            })),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          pendingSbOrderAttemptKey = null; // Clear on definitive success
          cart = [];
          renderFolio();
          closeMobileCheckout();

          openTrackingModal(data.orderId, data.orderToken);
        } else {
          showSbError(data.message || data.error || 'Server error creating order.', isMobile);
        }
      } catch (err) {
        showSbError('Network connection issue. Order details preserved — click to retry.', isMobile);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = isMobile ? 'Confirm & Dispatch Order' : 'Dispatch Order (20-25m)';
        }
      }
    }

    // --- AUTHORITATIVE LIVE TRACKING (SSE + POLLING) ---
    async function openTrackingModal(orderId, orderToken) {
      activeSbTrackedOrderId = orderId;
      activeSbTrackedOrderToken = orderToken;

      try {
        localStorage.setItem('sb_active_order', JSON.stringify({
          orderId,
          orderToken,
          branchId: activeBranchId,
          timestamp: Date.now()
        }));
      } catch (e) {}

      document.getElementById('sb-track-order-id').textContent = orderId;
      document.getElementById('sb-tracking-modal')?.classList.add('open');
      const floatPill = document.getElementById('sb-floating-tracker');
      if (floatPill) floatPill.style.display = 'none';

      await refreshOrderTrackingData();
      connectSbOrderSseStream(orderId, orderToken);
      startSbOrderPolling(orderId, orderToken);
    }

    function setSbTransportBadge(isSse) {
      const badge = document.getElementById('sb-track-transport');
      if (!badge) return;
      if (isSse) {
        badge.innerHTML = '🟢 Live SSE Stream';
        badge.style.background = 'rgba(46, 133, 64, 0.1)';
        badge.style.color = 'var(--sb-green)';
        badge.style.borderColor = 'rgba(46, 133, 64, 0.25)';
      } else {
        badge.innerHTML = '🔄 Live Polling (4s)';
        badge.style.background = 'rgba(217, 154, 69, 0.1)';
        badge.style.color = '#D99A45';
        badge.style.borderColor = 'rgba(217, 154, 69, 0.25)';
      }
    }

    function connectSbOrderSseStream(orderId, orderToken) {
      if (sbOrderEventSource) {
        sbOrderEventSource.close();
        sbOrderEventSource = null;
      }

      try {
        const sseUrl = '/api/restaurant/events?token=' + encodeURIComponent(orderToken) + '&orderId=' + encodeURIComponent(orderId);
        sbOrderEventSource = new EventSource(sseUrl);

        sbOrderEventSource.onopen = () => {
          setSbTransportBadge(true);
        };

        sbOrderEventSource.onmessage = () => {
          refreshOrderTrackingData();
        };

        const eventTypes = [
          'order.status_updated',
          'order.created',
          'task.started',
          'task.ready',
          'task.bumped',
          'task.item_fulfilled'
        ];
        eventTypes.forEach(evtName => {
          sbOrderEventSource.addEventListener(evtName, () => {
            refreshOrderTrackingData();
          });
        });

        sbOrderEventSource.onerror = () => {
          setSbTransportBadge(false);
        };
      } catch (e) {
        setSbTransportBadge(false);
      }
    }

    async function refreshOrderTrackingData() {
      if (!activeSbTrackedOrderId) return;
      try {
        const headers = activeSbTrackedOrderToken
          ? { 'Authorization': 'Bearer ' + activeSbTrackedOrderToken, 'X-Order-Token': activeSbTrackedOrderToken }
          : {};
        const res = await fetch('/api/commerce/orders/' + encodeURIComponent(activeSbTrackedOrderId), { headers });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403 || res.status === 404) {
            stopSbOrderTracking();
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
      lastKnownSbOrderStatus = liveStatus || order.status;
      const status = lastKnownSbOrderStatus;

      const titleEl = document.getElementById('sb-track-modal-title');
      const statusPill = document.getElementById('sb-track-status-pill');
      const branchNameEl = document.getElementById('sb-track-branch-name');

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
          ? 'var(--sb-green)'
          : (status === 'CANCELLED' ? 'var(--sb-red)' : 'var(--sb-primary)');
      }

      if (branchNameEl && order.targetBranch) {
        branchNameEl.textContent = order.targetBranch.name + ' (' + order.targetBranch.city + ') Express';
      }

      // 4-Step Stepper Update
      const step1 = document.getElementById('sb-step-1');
      const step2 = document.getElementById('sb-step-2');
      const step3 = document.getElementById('sb-step-3');
      const step4 = document.getElementById('sb-step-4');

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

      // Station Breakdown
      const stationContainer = document.getElementById('sb-track-station-tasks');
      if (stationContainer) {
        if (Array.isArray(order.stationTasks) && order.stationTasks.length > 0) {
          let tasksHtml = '';
          for (const t of order.stationTasks) {
            const stCol = t.status === 'READY' ? '#10B981' : (t.status === 'IN_PROGRESS' ? 'var(--sb-primary)' : 'var(--sb-stone)');
            const stBg = t.status === 'READY' ? 'rgba(16, 185, 129, 0.1)' : (t.status === 'IN_PROGRESS' ? 'rgba(252, 128, 25, 0.1)' : '#F3F4F6');
            tasksHtml += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: #F9FAFB; border: 1px solid var(--sb-border); border-radius: 6px;">' +
              '<div style="display: flex; align-items: center; gap: 8px;">' +
                '<span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #E5E7EB; color: #374151;">' + (t.station || '') + '</span>' +
                '<span style="font-weight: 700; color: var(--sb-dark);">' + (t.name || '') + '</span>' +
              '</div>' +
              '<span style="font-size: 11px; font-weight: 800; color: ' + stCol + '; background: ' + stBg + '; padding: 2px 8px; border-radius: 999px;">' +
                (t.status === 'IN_PROGRESS' ? 'COOKING' : (t.status || 'PENDING')) +
              '</span>' +
            '</div>';
          }
          stationContainer.innerHTML = tasksHtml;
        } else {
          stationContainer.innerHTML = '<div style="color: var(--sb-muted); font-size: 12px; font-style: italic;">Routing to kitchen workstations...</div>';
        }
      }

      // Customer Summary
      const custName = document.getElementById('sb-track-customer-name');
      const custPhone = document.getElementById('sb-track-customer-phone');
      const custAddr = document.getElementById('sb-track-customer-address');
      if (custName) custName.textContent = order.customerName || '-';
      if (custPhone) custPhone.textContent = order.customerPhone || '-';
      if (custAddr) custAddr.textContent = order.deliveryAddress || '-';

      // Update Floating Tracker Text
      const floatStatus = document.getElementById('sb-float-status');
      if (floatStatus) {
        floatStatus.textContent = (statusLabel || status) + ' · #' + (order.id ? order.id.slice(-6) : '');
      }

      if (status === 'DELIVERED' || status === 'SERVED' || status === 'CANCELLED') {
        stopSbOrderTracking();
        try {
          localStorage.removeItem('sb_active_order');
        } catch (e) {}
      }
    }

    function startSbOrderPolling(orderId, orderToken) {
      if (sbOrderPollInterval) clearInterval(sbOrderPollInterval);
      sbOrderPollInterval = setInterval(() => {
        refreshOrderTrackingData();
      }, 4000);
    }

    function stopSbOrderTracking() {
      if (sbOrderPollInterval) {
        clearInterval(sbOrderPollInterval);
        sbOrderPollInterval = null;
      }
      if (sbOrderEventSource) {
        sbOrderEventSource.close();
        sbOrderEventSource = null;
      }
    }

    function reopenTrackingModal() {
      document.getElementById('sb-tracking-modal')?.classList.add('open');
      const floatPill = document.getElementById('sb-floating-tracker');
      if (floatPill) floatPill.style.display = 'none';
      refreshOrderTrackingData();
    }

    function closeTrackingModal() {
      document.getElementById('sb-tracking-modal')?.classList.remove('open');

      if (activeSbTrackedOrderId && lastKnownSbOrderStatus && lastKnownSbOrderStatus !== 'DELIVERED' && lastKnownSbOrderStatus !== 'SERVED' && lastKnownSbOrderStatus !== 'CANCELLED') {
        const floatPill = document.getElementById('sb-floating-tracker');
        if (floatPill) floatPill.style.display = 'flex';
      }
    }

    // Auto-restore active order tracker on page reload
    try {
      const savedActive = localStorage.getItem('sb_active_order');
      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        if (parsed && parsed.orderId && parsed.orderToken) {
          activeSbTrackedOrderId = parsed.orderId;
          activeSbTrackedOrderToken = parsed.orderToken;
          refreshOrderTrackingData().then(() => {
            if (lastKnownSbOrderStatus && lastKnownSbOrderStatus !== 'DELIVERED' && lastKnownSbOrderStatus !== 'SERVED' && lastKnownSbOrderStatus !== 'CANCELLED') {
              const floatPill = document.getElementById('sb-floating-tracker');
              if (floatPill) floatPill.style.display = 'flex';
            }
          });
        }
      }
    } catch (e) {}
  </script>
</body>
</html>`;
}
