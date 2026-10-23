# 🪐 OrbitoX Studio 3.0 — Real Creator Acceptance Plan
**Document ID:** `docs/P27/53_CREATOR_ACCEPTANCE_PLAN.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Ten Real Creator Journeys (Without Documentation)

Acceptance requires verifying that a first-time creator can accomplish all 10 tasks in a fresh browser session using ONLY visual UI:

| Journey ID | Title | Key Workflow Steps | Pass Criteria |
| :--- | :--- | :--- | :--- |
| **JOURNEY-01** | Create SaaS Landing Page | Open Template -> Select SaaS -> Edit Hero Headline -> Add Section -> Reorder Section -> Publish | Headline updated, section reordered, saved to cloud, live URL renders matching pixels. |
| **JOURNEY-02** | Universal HTML Ingestion | Drag HTML file onto canvas -> Auto-detect -> Import -> Select Heading -> Change Font -> Upload Image | All elements fully editable; heading font updates immediately; image renders. |
| **JOURNEY-03** | Template Switching & Remix | Open Template A -> Switch to Template B -> Add Pricing from Template C -> Apply Theme D | B replaces A cleanly; C section appends without data loss; theme alters tokens only. |
| **JOURNEY-04** | Asset Vault & Image Placement | Drag 5 images from desktop -> Drop onto canvas -> Resize with Shift -> Swap Hero background | Assets stored in vault; natural aspect ratio preserved; no console errors. |
| **JOURNEY-05** | Design System Token Cascade | Open Styles -> Edit Primary Color -> Change Heading Font -> Verify canvas -> Reload | All dependent buttons/headings reflect new tokens; changes persist across browser refresh. |
| **JOURNEY-06** | Master Component & Instance | Create Button Master -> Create 3 instances -> Override label on Instance 1 -> Edit Master color | All instances reflect Master color; Instance 1 retains local label override. |
| **JOURNEY-07** | Responsive Breakpoint Override | Desktop view -> Switch to Mobile -> Adjust button width & heading size -> Switch to Desktop | Desktop retains original size; Mobile reflects overrides; visual indicator shows override. |
| **JOURNEY-08** | Motion & Parallax | Select Card -> Add Scroll Parallax (Depth: +3) -> Open Preview -> Scroll page | Card translates smoothly at distinct speed using WAAPI/GSAP; 60 FPS verified. |
| **JOURNEY-09** | Right-Click Context Menu | Right-click Element -> Bring to Front -> Right-click Section -> Move Up -> Right-click Empty -> Paste | Every context menu action executes real command; updates SceneGraph; undo/redo works. |
| **JOURNEY-10** | Published Invariant Verification | Complete page design -> Click Publish -> Copy public link -> Open in incognito tab | Studio layout, computed styles, fonts, and interactions match published URL 100%. |
