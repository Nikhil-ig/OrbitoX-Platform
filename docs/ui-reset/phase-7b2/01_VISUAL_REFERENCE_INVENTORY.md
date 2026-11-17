# 🪐 OrbitoX Visual Reference Inventory: 44-Screen Master Concept Canvas (Reconciled & Decoded)

**Repository:** `Nikhil-ig/OrbitoX-Platform`  
**Governing Specification:** `PHASE7_UI_MASTER_BRIEF.md` (Sections 1, 2, 3)  
**Phase:** Phase 7B.2 — Stage 0 Architecture Research  
**Source Directory:** `OrbitoX — new look concept-png/`  
**Status:** 100% Verified (44 of 44 Screens Present, Bitstream-Decoded, and Visually Reconciled)  
**Date:** November 17, 2026 (Revised Blueprint)  

---

## 1. Verified Inventory Summary & Decoding Evidence

The owner-approved concept canvas comprises **44 authoritative reference screens** establishing the OrbitoX visual language across five user personas and four device classes.

### 1.1 Bitstream Decoding & Visual Integrity Verification
In addition to validating PNG `IHDR` chunks for logical dimensions, **all 44 PNG image bitstreams were fully decompressed and verified** using a binary chunk decompressor (`zlib.decompress` on concatenated `IDAT` chunks):
- **Image Format Invariant:** 100% of images conform to the PNG specification (`\x89PNG\r\n\x1a\n`).
- **Color Depth:** 8-bit depth per channel, Color Type 6 (RGBA with alpha channel).
- **Scanline Integrity:** All decompressed scanline buffers matched or exceeded the expected pixel volume ($H \times (1 + W \times 4)$ bytes). Zero corrupt chunks or truncated bitstreams.
- **Visual Inspection:** Confirms zero visual artifacting, correct color gradients, intact typography, and absence of placeholder mockups.

### 1.2 Device Allocation Reconciliation
| Device Category | Verified Screen Count | Screen Identifiers Included | Verified Dimensions | Verified Layout Characteristics |
| :--- | :---: | :--- | :--- | :--- |
| **Desktop** | **29** | `A1, A2, A3, C0, C1, C2, C3, C4, C5, C6, U1, U2, AI1, F1, F2, F3, F4, F5, F6, R0, R1, R2, R3, R4, R5, R6, S3, S4, S5` | $2880 \times 1800$ to $2880 \times 2160$ (Sidebars: $504/544 \times 2080$) | Fixed 260px `SidebarCard`, full top bar, multi-column card grids. |
| **Tablet Landscape** | **2** | `S1` (Kitchen / KDS), `S2` (POS Take Order & Checkout) | $2388 \times 1668$ (@2x for $1194 \times 834$ iPad Pro 11") | 64px `IconRail` or Zero-Chrome full-width operational mode. |
| **Tablet Portrait** | **1** | `D9` (Host Stand Live Floor Plan) | $1668 \times 2388$ (@2x for $834 \times 1194$ iPad Pro 11") | Floating `BottomNavPill` ($52\text{px}$ height). |
| **Phone** | **11** | `A4, U3, U4, D1, D2, D3, D4, D5, D6, D7, D8` | $780 \times 1688$ (@2x for $390 \times 844$ iPhone 12/13/14) | Floating `BottomTabBar` ($\le 5$ items) + `MoreNavSheet`. |
| **Component Kit** | **1** | `P1` (Pop-ups, Warnings, Toasts, Skeletons, Banners) | $2880 \times 2480$ | Master primitive showcase canvas. |
| **Total** | **44** | **All 44 Accounted For, Decoded, and Verified on Disk** | — | **Zero missing, unreadable, or unmatched files** |

*Note on count reconciliation:* In initial drafts, screens `F4`, `F5`, and `F6` were tabulated as phone because they depict onboarding checklists; however, their image files ($2880 \times 1920$ and $2880 \times 2080$) are desktop views. The reconciled count is exactly **29 Desktop** and **11 Phone**.

---

## 2. Comprehensive 44-Screen Reference & Decoding Ledger

| Screen ID | Filename (`OrbitoX — new look concept-png/`) | Dimensions | Decoded Uncompressed Data | Device Category | Visual Mood | Layout & Shell Characteristics | Demonstrated UI Patterns |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **A1** | `1 · Operator console — dark.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Dark (`#0D0F12`) | 260px `SidebarCard`, top bar with breadcrumbs and operator profile. | `HeroStat`, `Sparkline`, `StatusPill`, `Badge`, `SegmentedControl`, `ActionCard`. |
| **A2** | `2 · Customer dashboard — light.png` | $2880 \times 2194$ | 25,277,074 B | Desktop | Light (`#EEF1F5`) | Customer top navigation bar, org switcher, project shortcut. | `Card` (28px), `PillNav`, `Button`, `DataTable`, `StatStrip`, `ProgressBar`. |
| **A3** | `3 · Appearance — you control it from the web.png` | $2400 \times 1720$ | 16,513,720 B | Desktop | Dark | Settings page inside Console Shell; live preview iframe. | `RadioGroup`, `Slider`, `SegmentedControl`, `ColorSwatchPill`, `LiveStatusBar`. |
| **A4** | `4 · RestaurantOS diner — phone.png` | $780 \times 1688$ | 5,268,248 B | Phone | Tenant (Saffron) | Diner customer mobile frame; zero operator chrome; clean header. | `MenuItemCard`, `VegMark`, `QuantityStepper`, `BottomOrderBar`, `PillBadge`. |
| **C0** | `Shared console sidebar.png` | $544 \times 2080$ | 4,528,160 B | Desktop | Dark | Fixed 260px sidebar card, 8 platform routes, 2 installed products. | `SidebarCard`, `NavItem` (pill), `PlatformGovernanceDock`, `OperatorProfileTile`. |
| **C1** | `Organization detail.png` | $2880 \times 2160$ | 24,885,360 B | Desktop | Dark | Console Shell, 2-column detail layout, tabbed navigation. | `DataTable`, `Badge`, `Button` (secondary), `MaskedField`, `DangerousAction`. |
| **C2** | `Tenant detail · suspend with re-auth.png` | $2880 \times 2160$ | 24,885,360 B | Desktop | Dark | Modal step-up reauthentication dialog; typed confirmation field. | `DangerousAction`, `Input` (typed confirmation), `Button` (destructive). |
| **C3** | `Billing & payments.png` | $2880 \times 2160$ | 24,885,360 B | Desktop | Dark | Multi-tenant billing status, payment gateway health, invoice logs. | `DataTable`, `StatusPill`, `Button`, `HeroStat`, `DateRangePicker`. |
| **C4** | `Provisioning job · retry.png` | $2880 \times 2160$ | 24,885,360 B | Desktop | Dark | Saga pipeline visualizer, step-by-step progress indicator. | `Stepper`, `StatusPill`, `Button` (retry), `CodeBlock` (JetBrains Mono). |
| **C5** | `Data rights requests.png` | $2880 \times 2160$ | 24,885,360 B | Desktop | Dark | GDPR/DPDP export/erasure audit table, tenant purge controls. | `DataTable`, `Badge`, `CopyOnceSecret`, `DangerousAction`, `PillNav`. |
| **C6** | `API keys · rotate.png` | $2880 \times 2160$ | 24,885,360 B | Desktop | Dark | Cryptographic Ed25519 key viewer, rotation wizard, single-reveal modal. | `CopyOnceSecret`, `MaskedField`, `Button`, `Toast`, `AlertBanner`. |
| **U1** | `Change plan (customer).png` | $2880 \times 2000$ | 23,042,000 B | Desktop | Light | 3-tier subscription cards, monthly/annual toggle. | `Card` (hero 32px), `SegmentedControl`, `Button` (pill), `ChecklistRow`. |
| **U2** | `Diner template gallery (customer).png` | $2880 \times 2006$ | 23,111,126 B | Desktop | Light | Visual catalog of diner templates (Saffron, Noir, Fresh). | `ActionCard`, `Badge` (free/paid), `Button`, `Dialog` (live preview). |
| **U3** | `Diner template “Noir” (paid).png` | $780 \times 1688$ | 5,268,248 B | Phone | Tenant (Noir) | Dark atmospheric aesthetic, luxury gastronomy typography, gold accents. | `MenuItemCard`, `HeroImage`, `QuantityStepper`, `BottomOrderBar`. |
| **U4** | `Diner template “Fresh” (free).png` | $780 \times 1688$ | 5,268,248 B | Phone | Tenant (Fresh) | Crisp emerald/white aesthetic, health-conscious layout, calorie tags. | `MenuItemCard`, `VegMark`, `PillBadge`, `Input` (pill search), `FloatingCart`. |
| **AI1** | `Ask OrbitoX — AI assistant over MCP@2x.png` | $2880 \times 2160$ | 24,885,360 B | Desktop | Dark | Sliding AI copilot side-drawer, tool execution proposal cards. | `SidePanel`, `ChatFeed`, `ActionApprovalCard`, `StatusPill`, `Button`. |
| **F1** | `F1 · Sign up.png` | $2880 \times 1800$ | 20,737,800 B | Desktop | Light | Centered onboarding card, email/password + TOTP, brand logo. | `Card` (28px), `Input` (pill), `Button` (full-width pill), `AlertBanner`. |
| **F2** | `F2 · Create your organization.png` | $2880 \times 1800$ | 20,737,800 B | Desktop | Light | Org name, slug generator with real-time domain check. | `Stepper`, `Input`, `Select` (pill), `Button`, `StatusPill`. |
| **F3** | `F3 · Add your restaurant.png` | $2880 \times 1882$ | 21,682,522 B | Desktop | Light | Restaurant name, branch details, starter template choice. | `Card`, `SegmentedControl`, `Input`, `Button`, `ImageUploadTile`. |
| **F4** | `F4 · First login your site, live in preview.png` | $2880 \times 1920$ | 22,120,320 B | Desktop | Light | Split screen: left onboarding checklist, right live iframe preview. | `SplitView`, `ChecklistRow`, `IframeContainer`, `Button` (go live). |
| **F5** | `F5 · Choose a plan and go live.png` | $2880 \times 1920$ | 22,120,320 B | Desktop | Light | Plan confirmation, payment gateway integration, tax invoice preview. | `Card`, `PriceCard`, `PaymentMethodSelector`, `Button` (secure pay). |
| **F6** | `F6 · You're live setup checklist.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Operational checklist (connect printer, customize menu, print QR). | `ProgressBar`, `ChecklistRow`, `ActionCard`, `HeroStat`, `Button`. |
| **R0** | `Shared RestaurantOS sidebar.png` | $504 \times 2080$ | 4,195,360 B | Desktop | Light | Light mood sidebar card (260px), restaurant logo, branch switcher. | `SidebarCard`, `BranchSwitcher`, `NavItem`, `StaffPresenceTile`. |
| **R1** | `R1 · Today.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Live daily dashboard: revenue, active tables, kitchen queue load. | `HeroStat`, `LineChart`, `BarChart`, `ListRowLink`, `LiveStatusBar`. |
| **R2** | `R2 · Branches · edit branch.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Multi-branch management, opening hours, delivery zones. | `DataTable`, `SideSheet`, `Switch` (pill), `Input`, `Button`. |
| **R3** | `R3 · Floors & tables editor.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Visual floor plan editor: draggable tables, shapes, QR codes. | `FloorPlanCanvas`, `ToolbarPill`, `Button`, `BottomSheet` (table detail). |
| **R4** | `R4 · Menu · edit item.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | F&B catalog: categories, dishes, prices, dietary badges. | `DataTable`, `VegMark`, `Badge`, `SideSheet`, `FileInput` (CSV/XLSX). |
| **R5** | `R5 · Staff & roles.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Staff roster, PIN assignment, role gates (Manager, Waiter, Chef). | `DataTable`, `Avatar`, `StatusPill`, `DangerousAction`, `Button`. |
| **R6** | `R6 · Settings brand, domain, GST, payments.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Multi-tab settings: brand color picker, custom domain SSL, GSTIN. | `Tabs`, `Input`, `ColorPicker`, `MaskedField`, `DangerousAction`. |
| **P1** | `Pop-ups, warnings & utilities@2x.png` | $2880 \times 2480$ | 28,572,080 B | Component Kit | Light | Master UI primitive kit: toasts, confirmation dialogs, skeletons. | `Toast`, `Dialog`, `AlertDialog`, `EmptyState`, `Skeleton`, `Banner`. |
| **S1** | `Kitchen screen (KDS) · tablet landscape.png` | $2388 \times 1668$ | 15,934,404 B | Tablet Land | **Dark** (`#0D0F12`) | High-contrast touch operational screen: order ticket columns, prep timers. | `TicketCard`, `RingTimer`, `VegMark`, `Button` ($\ge$48px touch). |
| **S2** | `POS take order & checkout · tablet landscape.png` | $2388 \times 1668$ | 15,934,404 B | Tablet Land | **Light** (`#EEF1F5`) | Dual-pane POS: category/dish grid, live ticket, instant payment keypad. | `GridMenu`, `QuantityStepper`, `TicketSummary`, `KeypadPill`, `Button`. |
| **S3** | `Orders · desktop.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Centralized order ledger: dine-in, takeaway, delivery, live filters. | `DataTable`, `StatusPill`, `DateRangePicker`, `Button` (export). |
| **S4** | `Invoices & GST · desktop.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Tax invoices, GST breakdown (CGST/SGST), invoice sequence numbering. | `DataTable`, `StatusPill`, `Button` (download PDF/CSV), `HeroStat`. |
| **S5** | `Reports · desktop.png` | $2880 \times 2080$ | 23,963,680 B | Desktop | Light | Sales analytics, top dishes, peak hours heatmap, staff efficiency. | `BarChart`, `LineChart`, `DonutChart`, `StatStrip`, `SegmentedControl`. |
| **D1** | `Owner phone · Today.png` | $780 \times 1688$ | 5,268,248 B | Phone | Light | Owner mobile snapshot: daily sales hero card, live order stream. | `HeroStat`, `ListRowLink`, `BottomTabBar` (5 items), `ActionPill`. |
| **D2** | `Owner phone · Orders.png` | $780 \times 1688$ | 5,268,248 B | Phone | Light | Mobile order card list, swipe-to-accept/reject, status badges. | `SwipeActions`, `StatusPill`, `BottomTabBar`, `Button` (fallback). |
| **D3** | `Owner phone · Edit dish (bottom sheet).png` | $780 \times 1688$ | 5,268,248 B | Phone | Light | Mobile bottom drawer: dish name, price, veg toggle, stock status. | `BottomSheet` (drag handle), `Input`, `Switch`, `Button` (save). |
| **D4** | `Waiter phone · My tables.png` | $780 \times 1688$ | 5,268,248 B | Phone | **Dark** (`#0D0F12`) | High-contrast mobile table grid: table status (occupied, billing). | `TableStatusCard`, `RingTimer`, `BottomTabBar`, `Badge`. |
| **D5** | `Waiter phone · Take order.png` | $780 \times 1688$ | 5,268,248 B | Phone | **Dark** (`#0D0F12`) | Rapid mobile order punch: category tabs, dish search, modifier pills. | `Tabs`, `QuantityStepper`, `VegMark`, `Button` (send to kitchen). |
| **D6** | `Phone · First login, site in preview.png` | $780 \times 1688$ | 5,268,248 B | Phone | Light | Mobile onboarding preview: live preview banner, share link trigger. | `Banner`, `Button` (pill), `Card`, `ShareTrigger`. |
| **D7** | `Operator console · phone.png` | $780 \times 1688$ | 5,268,248 B | Phone | **Dark** (`#0D0F12`) | Mobile platform operations: fleet health hero card, urgent alerts. | `HeroStat`, `AlertCard`, `BottomTabBar` (max 5 items), `MoreNavSheet`. |
| **D8** | `Customer dashboard · phone.png` | $780 \times 1688$ | 5,268,248 B | Phone | Light | Mobile customer workspace: org overview, subscription status card. | `Card`, `ProgressBar`, `BottomTabBar`, `AvatarMenu`. |
| **D9** | `Host stand · tablet portrait.png` | $1668 \times 2388$ | 15,935,124 B | Tablet Port | **Dark** (`#0D0F12`) | Floor map tablet view: live table allocation, waitlist queue drawer. | `FloorPlan`, `WaitlistCard`, `RingTimer`, `BottomBar`, `SideSheet`. |
