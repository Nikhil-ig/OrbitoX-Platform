# 🪐 OrbitoX Visual Reference Inventory: 44-Screen Master Concept Canvas (Revised)

**Repository:** `Nikhil-ig/OrbitoX-Platform`  
**Governing Specification:** `PHASE7_UI_MASTER_BRIEF.md` (Sections 1, 2, 3)  
**Phase:** Phase 7B.2 — Stage 0 Architecture Research  
**Source Directory:** `./OrbitoX — new look concept-png/`  
**Status:** 100% Verified (44 of 44 Screens Present, Readable, and Re-Cataloged)  
**Date:** November 17, 2026 (Revised Blueprint)  

---

## 1. Verified Inventory Summary

The owner-approved concept canvas comprises **44 authoritative reference screens** establishing the OrbitoX visual language across five user personas and four device classes. All 44 reference images have been verified on disk with exact pixel dimensions and design characteristics.

### Device Allocation Reconciliation:

| Device Category | Reported in Draft 1 | Verified Actual Count | Screen IDs Included |
|---|---|---|---|
| **Desktop** | 26 | **29** | A1, A2, A3, C0, C1, C2, C3, C4, C5, C6, U1, U2, AI1, F1, F2, F3, F4, F5, F6, R0, R1, R2, R3, R4, R5, R6, S3, S4, S5 |
| **Tablet Landscape** | 2 | **2** | S1 (Kitchen / KDS), S2 (POS Take Order & Checkout) |
| **Tablet Portrait** | 1 | **1** | D9 (Host Stand Live Floor Plan) |
| **Phone** | 14 | **11** | A4, U3, U4, D1, D2, D3, D4, D5, D6, D7, D8 |
| **Component Kit / Utilities** | 1 | **1** | P1 (Pop-ups, Warnings, Toasts, Skeletons, Banners) |
| **Total Screens** | **44** | **44** | **100% Accounted For and Readable** |

*Note on count reconciliation:* In the initial draft, screens `F4`, `F5`, and `F6` were incorrectly tabulated under the phone count because they depict setup checklists and split-screen previews; however, their image files (`2880 × 1920` and `2880 × 2080`) and layouts are native desktop views. The corrected counts are exactly **29 Desktop** and **11 Phone**.

---

## 2. Comprehensive Screen-by-Screen Reference Ledger

| Screen ID | Filename | Dimensions | Device Category | Mood | Main Visual Characteristics | Shell Characteristics | Components & Patterns Demonstrated | Availability |
|---|---|---|---|---|---|---|---|---|
| **A1** | `1 · Operator console — dark.png` | 2880 × 2080 | Desktop | Dark (`#0D0F12`) | Soft radial header glow, 28px metric cards, status pills, zero inline data leakage. | 260px Sidebar Card, top bar with breadcrumbs and operator profile. | `HeroStat`, `Sparkline`, `StatusPill`, `Badge`, `SegmentedControl`, `ActionCard`. | Verified Readable |
| **A2** | `2 · Customer dashboard — light.png` | 2880 × 2194 | Desktop | Light (`#EEF1F5`) | Soft low shadow on white cards (`0 30px 60px -44px`), near-black active pills (`#14161A`). | Customer top navigation bar, org switcher, project shortcut. | `Card` (28px), `PillNav`, `Button`, `DataTable`, `StatStrip`, `ProgressBar`. | Verified Readable |
| **A3** | `3 · Appearance — you control it from the web.png` | 2400 × 1720 | Desktop | Dark | Interactive matrix of 8 accent swatches, 3 density sliders, radius presets (4–32px). | Settings page inside Console Shell; live preview iframe. | `RadioGroup`, `Slider`, `SegmentedControl`, `ColorSwatchPill`, `LiveStatusBar`. | Verified Readable |
| **A4** | `4 · RestaurantOS diner — phone.png` | 780 × 1688 | Phone | Tenant (Saffron) | Saffron accent, high-res dish hero cards, sticky bottom order bar with floating cart pill. | Diner customer mobile frame; zero operator chrome; clean header. | `MenuItemCard`, `VegMark`, `QuantityStepper`, `BottomOrderBar`, `PillBadge`. | Verified Readable |
| **C0** | `Shared console sidebar.png` | 544 × 2080 | Desktop | Dark | Fixed 260px sidebar card, 8 platform routes, 2 installed products, cluster status dock. | Reusable Operator Console Sidebar Card (`AppShell`). | `SidebarCard`, `NavItem` (pill), `PlatformGovernanceDock`, `OperatorProfileTile`. | Verified Readable |
| **C1** | `Organization detail.png` | 2880 × 2160 | Desktop | Dark | Enterprise tenant list, tier quotas, member seats, suspension and audit triggers. | Console Shell, 2-column detail layout, tabbed navigation. | `DataTable`, `Badge`, `Button` (secondary), `MaskedField`, `DangerousAction`. | Verified Readable |
| **C2** | `Tenant detail · suspend with re-auth.png` | 2880 × 2160 | Desktop | Dark | Modal step-up reauthentication dialog; typed confirmation reason field before tenant freeze. | Centered modal dialog with backdrop blur over Console Shell. | `DangerousAction`, `Input` (typed confirmation), `Button` (destructive), `LiveStatusBar`. | Verified Readable |
| **C3** | `Billing & payments.png` | 2880 × 2160 | Desktop | Dark | Multi-tenant billing status, payment gateway health, grace-period toggles, invoice logs. | Console Shell with sub-navigation pills and tabular reconciliation. | `DataTable`, `StatusPill`, `Button`, `HeroStat`, `DateRangePicker`. | Verified Readable |
| **C4** | `Provisioning job · retry.png` | 2880 × 2160 | Desktop | Dark | Saga pipeline visualizer, step-by-step progress indicator, payload inspector, idempotency retry. | Console Shell; multi-column job inspector. | `Stepper`, `StatusPill`, `Button` (retry), `CodeBlock` (monospace JetBrains Mono). | Verified Readable |
| **C5** | `Data rights requests.png` | 2880 × 2160 | Desktop | Dark | GDPR/DPDP export/erasure audit table, tenant purge controls, verification proof badges. | Console Shell; compliance audit layout. | `DataTable`, `Badge`, `CopyOnceSecret`, `DangerousAction`, `PillNav`. | Verified Readable |
| **C6** | `API keys · rotate.png` | 2880 × 2160 | Desktop | Dark | Cryptographic Ed25519 key viewer, rotation wizard, single-reveal modal with memory wipe. | Centered security dialog over Console Shell. | `CopyOnceSecret`, `MaskedField`, `Button`, `Toast`, `AlertBanner`. | Verified Readable |
| **U1** | `Change plan (customer).png` | 2880 × 2000 | Desktop | Light | 3-tier subscription cards (Starter, Pro, Enterprise), monthly/annual toggle, feature checklist. | Customer Workspace Shell; centered container. | `Card` (hero 32px), `SegmentedControl`, `Button` (pill), `ChecklistRow`, `Badge`. | Verified Readable |
| **U2** | `Diner template gallery (customer).png` | 2880 × 2006 | Desktop | Light | Visual catalog of diner templates (Saffron, Noir, Fresh), preview cards, activation triggers. | Customer Workspace Shell with grid catalog. | `ActionCard`, `Badge` (free/paid), `Button`, `Dialog` (live preview). | Verified Readable |
| **U3** | `Diner template “Noir” (paid).png` | 780 × 1688 | Phone | Tenant (Noir) | Dark atmospheric aesthetic, luxury gastronomy typography, gold/amber accents, image overlays. | Mobile diner shell with transparent header. | `MenuItemCard`, `HeroImage`, `QuantityStepper`, `BottomOrderBar`. | Verified Readable |
| **U4** | `Diner template “Fresh” (free).png` | 780 × 1688 | Phone | Tenant (Fresh) | Crisp emerald/white aesthetic, health-conscious layout, calorie/allergen tags, search bar. | Clean mobile diner shell with sticky search. | `MenuItemCard`, `VegMark`, `PillBadge`, `Input` (pill search), `FloatingCart`. | Verified Readable |
| **AI1** | `Ask OrbitoX — AI assistant over MCP@2x.png` | 2880 × 2160 | Desktop | Dark | Sliding AI copilot side-drawer, tool execution proposal cards, approval buttons, audit tags. | Console Shell with 380px right-docked AI assistant panel. | `SidePanel`, `ChatFeed`, `ActionApprovalCard`, `StatusPill`, `Button`. | Verified Readable |
| **F1** | `F1 · Sign up.png` | 2880 × 1800 | Desktop | Light | Centered onboarding card, email/password + TOTP, brand logo, clean white surface. | Public & Auth Shell (minimal chrome, zero sidebar). | `Card` (28px), `Input` (pill), `Button` (full-width pill), `AlertBanner`. | Verified Readable |
| **F2** | `F2 · Create your organization.png` | 2880 × 1800 | Desktop | Light | Org name, slug generator with real-time domain check, country/currency selector. | Public & Auth Shell with horizontal progress stepper. | `Stepper`, `Input`, `Select` (pill), `Button`, `StatusPill`. | Verified Readable |
| **F3** | `F3 · Add your restaurant.png` | 2880 × 1882 | Desktop | Light | Restaurant name, branch details, starter template choice, initial menu category selector. | Public & Auth Shell with multi-step card layout. | `Card`, `SegmentedControl`, `Input`, `Button`, `ImageUploadTile`. | Verified Readable |
| **F4** | `F4 · First login your site, live in preview.png` | 2880 × 1920 | Desktop | Light | Split screen: left onboarding checklist, right live interactive iframe preview of diner site. | Onboarding Split Shell (workspace guidance + preview). | `SplitView`, `ChecklistRow`, `IframeContainer`, `Button` (go live). | Verified Readable |
| **F5** | `F5 · Choose a plan and go live.png` | 2880 × 1920 | Desktop | Light | Plan confirmation, payment gateway integration (Razorpay), tax invoice preview. | Public & Auth Shell; checkout layout. | `Card`, `PriceCard`, `PaymentMethodSelector`, `Button` (secure pay). | Verified Readable |
| **F6** | `F6 · You're live setup checklist.png` | 2880 × 2080 | Desktop | Light | Operational checklist (connect printer, customize menu, print QR codes, invite staff). | Product Owner Workspace Shell; dashboard view. | `ProgressBar`, `ChecklistRow`, `ActionCard`, `HeroStat`, `Button`. | Verified Readable |
| **R0** | `Shared RestaurantOS sidebar.png` | 504 × 2080 | Desktop | Light | Light mood sidebar card (260px), restaurant logo, branch switcher, F&B operations links. | Product Owner Workspace Sidebar Card. | `SidebarCard`, `BranchSwitcher`, `NavItem`, `StaffPresenceTile`. | Verified Readable |
| **R1** | `R1 · Today.png` | 2880 × 2080 | Desktop | Light | Live daily dashboard: revenue, active tables, kitchen queue load, waiter assignments. | Product Owner Workspace Shell (Light mood). | `HeroStat`, `LineChart`, `BarChart`, `ListRowLink`, `LiveStatusBar`. | Verified Readable |
| **R2** | `R2 · Branches · edit branch.png` | 2880 × 2080 | Desktop | Light | Multi-branch management, opening hours, delivery zones, branch status toggle. | Product Owner Workspace Shell with slide-over edit drawer. | `DataTable`, `SideSheet`, `Switch` (pill), `Input`, `Button`. | Verified Readable |
| **R3** | `R3 · Floors & tables editor.png` | 2880 × 2080 | Desktop | Light | Visual floor plan editor: draggable tables, shapes (round/square), QR codes, capacity. | Product Owner Workspace Shell with full-canvas interactive grid. | `FloorPlanCanvas`, `ToolbarPill`, `Button`, `BottomSheet` (table detail). | Verified Readable |
| **R4** | `R4 · Menu · edit item.png` | 2880 × 2080 | Desktop | Light | F&B catalog: categories, dishes, prices, dietary badges, 82-item spreadsheet importer. | Product Owner Workspace Shell; master-detail layout. | `DataTable`, `VegMark`, `Badge`, `SideSheet`, `FileInput` (CSV/XLSX). | Verified Readable |
| **R5** | `R5 · Staff & roles.png` | 2880 × 2080 | Desktop | Light | Staff roster, PIN assignment, role gates (Manager, Waiter, Chef, Cashier), audit logs. | Product Owner Workspace Shell with tabular permissions. | `DataTable`, `Avatar`, `StatusPill`, `DangerousAction`, `Button`. | Verified Readable |
| **R6** | `R6 · Settings brand, domain, GST, payments.png` | 2880 × 2080 | Desktop | Light | Multi-tab settings: brand color picker, custom domain SSL, GSTIN configuration, Razorpay keys. | Product Owner Workspace Shell with vertical tab strip. | `Tabs`, `Input`, `ColorPicker`, `MaskedField`, `DangerousAction`. | Verified Readable |
| **P1** | `Pop-ups, warnings & utilities@2x.png` | 2880 × 2480 | Component Kit | Light | Master UI primitive kit: toasts, confirmation dialogs, empty states, skeletons, offline banner. | Standalone UI Component Showcase Surface. | `Toast`, `Dialog`, `AlertDialog`, `EmptyState`, `Skeleton`, `Banner`. | Verified Readable |
| **S1** | `Kitchen screen (KDS) · tablet landscape.png` | 2388 × 1668 | Tablet Land | Dark | High-contrast touch operational screen: order ticket columns, prep timers, item strike-through. | Staff Operational Shell (Landscape Zero-Chrome). | `TicketCard`, `RingTimer`, `VegMark`, `Button` (large $\ge$52px touch). | Verified Readable |
| **S2** | `POS take order & checkout · tablet landscape.png` | 2388 × 1668 | Tablet Land | Light | Dual-pane POS: left category/dish grid, right live ticket, split-bill, instant payment keypad. | Staff Operational Shell (Landscape Dual-Pane). | `GridMenu`, `QuantityStepper`, `TicketSummary`, `KeypadPill`, `Button`. | Verified Readable |
| **S3** | `Orders · desktop.png` | 2880 × 2080 | Desktop | Light | Centralized order ledger: dine-in, takeaway, delivery, live status filter, refund triggers. | Product Owner Workspace Shell; data-dense table. | `DataTable`, `StatusPill`, `DateRangePicker`, `Button` (export), `SearchInput`. | Verified Readable |
| **S4** | `Invoices & GST · desktop.png` | 2880 × 2080 | Desktop | Light | Tax invoices, GST breakdown (CGST/SGST), invoice sequence numbering, GSTR-1 export. | Product Owner Workspace Shell; compliance table. | `DataTable`, `StatusPill`, `Button` (download PDF/CSV), `HeroStat`. | Verified Readable |
| **S5** | `Reports · desktop.png` | 2880 × 2080 | Desktop | Light | Sales analytics, top dishes, peak hours heatmap, staff efficiency metrics. | Product Owner Workspace Shell; chart grid. | `BarChart`, `LineChart`, `DonutChart`, `StatStrip`, `SegmentedControl`. | Verified Readable |
| **D1** | `Owner phone · Today.png` | 780 × 1688 | Phone | Light | Owner mobile snapshot: daily sales hero card, live order stream, quick action pills. | Product Owner Mobile Shell with `BottomTabBar`. | `HeroStat`, `ListRowLink`, `BottomTabBar` (5 items), `ActionPill`. | Verified Readable |
| **D2** | `Owner phone · Orders.png` | 780 × 1688 | Phone | Light | Mobile order card list, swipe-to-accept/reject, status badges, customer contact trigger. | Product Owner Mobile Shell with `BottomTabBar`. | `SwipeActions`, `StatusPill`, `BottomTabBar`, `Button` (accessible fallback). | Verified Readable |
| **D3** | `Owner phone · Edit dish (bottom sheet).png` | 780 × 1688 | Phone | Light | Mobile bottom drawer: dish name, price, veg toggle, stock status, 75px dismissal drag. | Product Owner Mobile Shell + `BottomSheet`. | `BottomSheet` (drag handle), `Input`, `Switch`, `Button` (save). | Verified Readable |
| **D4** | `Waiter phone · My tables.png` | 780 × 1688 | Phone | Dark | High-contrast mobile table grid: table status (occupied, billing, available, dirty). | Staff Operational Mobile Shell with `BottomTabBar`. | `TableStatusCard`, `RingTimer`, `BottomTabBar`, `Badge`. | Verified Readable |
| **D5** | `Waiter phone · Take order.png` | 780 × 1688 | Phone | Dark | Rapid mobile order punch: category tabs, dish search, modifier pills, send to kitchen. | Staff Operational Mobile Shell (Full-Screen Touch). | `Tabs`, `QuantityStepper`, `VegMark`, `Button` (send to kitchen). | Verified Readable |
| **D6** | `Phone · First login, site in preview.png` | 780 × 1688 | Phone | Light | Mobile onboarding preview: live preview banner, share link trigger, go-live button. | Public & Auth Mobile Shell. | `Banner`, `Button` (pill), `Card`, `ShareTrigger`. | Verified Readable |
| **D7** | `Operator console · phone.png` | 780 × 1688 | Phone | Dark | Mobile platform operations: fleet health hero card, urgent alerts, tenant search, bottom pill. | Operator Console Mobile Shell (`BottomTabBar`). | `HeroStat`, `AlertCard`, `BottomTabBar` (max 5 items), `BottomSheet` (More). | Verified Readable |
| **D8** | `Customer dashboard · phone.png` | 780 × 1688 | Phone | Light | Mobile customer workspace: org overview, subscription status card, project shortcuts. | Customer Workspace Mobile Shell (`BottomTabBar`). | `Card`, `ProgressBar`, `BottomTabBar`, `AvatarMenu`. | Verified Readable |
| **D9** | `Host stand · tablet portrait.png` | 1668 × 2388 | Tablet Port | Dark | Floor map tablet view: live table allocation, waitlist queue drawer, party seating timer. | Staff Operational Shell (Portrait Tablet + Bottom Bar). | `FloorPlan`, `WaitlistCard`, `RingTimer`, `BottomBar`, `SideSheet`. | Verified Readable |

---

## 3. Key Observations for Shell Implementation
1. **Desktop Standard (`2880 × 1800–2160`):** 29 screens require desktop layout chrome: 260px fixed `SidebarCard` or top horizontal workspace navigation.
2. **Tablet Landscape (`2388 × 1668`, native 1194 × 834):** 2 operational screens (`S1`, `S2`) demand maximized canvas width; 64px `IconRail` or zero chrome.
3. **Tablet Portrait (`1668 × 2388`, native 834 × 1194):** 1 operational screen (`D9`) demands bottom navigation bar.
4. **Phone (`780 × 1688`, native 390 × 844):** 11 screens strictly require floating bottom navigation pill (`BottomTabBar`) with max 5 destinations and draggable `BottomSheet` for secondary workflows.
