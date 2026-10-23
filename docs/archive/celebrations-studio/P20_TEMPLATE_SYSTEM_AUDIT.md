# 🪐 OrbitoX Studio — P20 Template Architecture & Instantiation Audit
**Document ID:** `docs/P20_TEMPLATE_SYSTEM_AUDIT.md`  
**Phase:** P20 — Phase 0: Forensic Audit & Rebuild Planning  
**Date:** October 3, 2026  
**Auditor:** Principal Template & Blueprints Architect  
**Status:** **AUDIT COMPLETE (AWAITING USER APPROVAL)**

---

## 1. Executive Summary: The Deceptive Archetype Façade

In `TemplateBrowserModal.tsx`, OrbitoX presents 10 diverse website archetypes:
- `tmpl-saas-cloudpulse`: "NextGen SaaS developer telemetry cockpit with 4-tier bento grid & multi-currency pricing"
- `tmpl-business-apex`: "Institutional advisory & venture ecosystem"
- `tmpl-portfolio-mono`: "Editorial visual artist case study showcase"
- `tmpl-agency-kinetic`: "Full-service digital agency with bold chromatic motion"
- `tmpl-ecommerce-lumina`: "Minimalist luxury goods with spatial product inspect"
- `tmpl-restaurant-letoile`: "Michelin-starred culinary degustation menu"
- `tmpl-hotel-riviera`: "Coastal Mediterranean sanctuary with suite comparison slider"
- `tmpl-event-summit`: "Global spatial tech summit with multi-track speaker agenda"

### Forensic Code Reality:
When any of these templates is selected, `StudioShell.instantiateTemplateSchema()` executes:
```typescript
if (tmpl.category === 'editorial' || tmpl.category === 'portfolio') {
  manifest = TemplateFactory.createEditorialTemplate(tmpl.name);
} else if (tmpl.category === 'agency' || tmpl.category === 'saas') {
  manifest = TemplateFactory.createModernTemplate(tmpl.name);
} else if (tmpl.category === 'ecommerce') {
  manifest = TemplateFactory.createGlasshouseTemplate(tmpl.name);
} else if (tmpl.category === 'restaurant' || tmpl.category === 'hotel') {
  manifest = TemplateFactory.createAmalfiTemplate(tmpl.name);
}
```
And every single one of those factory methods outputs:
- `Opening Statement`
- `The Protagonists` / `Couple Feature` (Bride & Groom portraits)
- `Chronicle` / `Our Journey` (Love story)
- `The Clock` / `Save the Date` (Countdown to wedding date)
- `RSVP Gateway` / `Will You Attend?` (Guest meal choice & attendance decree)
- `Visual Anthology` (Bridal photo gallery)
- `Guest Expressions` (Blessings guestbook)

**The templates are cosmetic metadata wrappers over 4 wedding celebration schemas.** A creator building a SaaS product or agency website is handed a wedding invitation layout with blue or purple CSS variables.

---

## 2. Template Operations Disambiguation Contract

In professional tools, template actions must never be conflated. We establish **4 distinct, atomic template operations**:

```
                       TEMPLATE ACTION CHOICES
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
 1. NEW FROM TEMPLATE    2. REPLACE CURRENT SITE   3. ADD TEMPLATE SECTION
 • Creates new project   • Preserves draft snapshot • Inserts single section
 • Fresh project ID      • Replaces page sections  • Rekeyed fresh node IDs
 • Zero legacy state     • Atomicity rollback      • Preserves current theme
```

### 2.1 Operation 1: NEW_FROM_TEMPLATE
- Generates a new `projectId` (`proj_...`).
- Generates a fresh slug (`/admin/template-studio?project=...`).
- Instantiates the complete multi-page, multi-section blueprint.
- Sets initial design tokens and typography.

### 2.2 Operation 2: REPLACE_CURRENT_SITE (Atomic 8-Step Transaction)
To prevent accidental data loss or half-replaced states:
1. **Snapshot Draft**: Saves current project state to `localStorage.orbitox_draft_snapshot_before_replace`.
2. **Fetch Blueprint**: Loads target template schema blueprint.
3. **Validate Blueprint**: Verifies schema integrity (`TemplateSchemaService.validateTemplateSchema`).
4. **Instantiate**: Generates fresh unique IDs for all incoming sections and nodes.
5. **Content Migration**: Migrates matching field bindings (e.g. site title, logo, contact email, social links).
6. **Render Virtual DOM**: Mounts in memory and verifies zero render exceptions.
7. **Commit State**: Dispatches `REPLACE_PROJECT` command to store.
8. **Rollback Safety**: If any step 2–7 throws an error, automatically restores snapshot from Step 1 with an error banner.

### 2.3 Operation 3: ADD_TEMPLATE_SECTION
- Reads selected section from target template.
- Runs `rekeySceneGraph()` to ensure 100% unique node IDs.
- Inserts at chosen position without touching surrounding sections or theme tokens.

### 2.4 Operation 4: APPLY_THEME_ONLY
- Extracts only `designTokens` (colors, fonts, radius, shadows) from target template.
- Applies tokens to active project without modifying any text, images, or layout structure.

---

## 3. Real Blueprint Specifications for Primary Archetypes

To fulfill the product vision, OrbitoX Studio must supply genuine blueprints for standard industry use-cases:

### 3.1 SaaS Blueprint (`tmpl_saas_telemetry`):
1. **Navbar**: Brand logo, Feature links, Documentation, Sign In, Primary CTA.
2. **Hero**: Headline, Subheadline, Primary CTA, Secondary "View Docs" button, Interactive Dashboard UI mock.
3. **Social Proof**: Customer logos grid (monochrome / glow).
4. **Bento Grid**: 4-card feature layout (Speed, Security, Global CDN, Telemetry).
5. **Interactive Pricing**: Monthly / Annual toggle with 3 tiers (Starter, Pro, Enterprise).
6. **FAQ Accordion**: 5 expandable technical questions.
7. **Footer**: 4-column link directory with legal notice and status pill.

### 3.2 Agency Blueprint (`tmpl_agency_kinetic`):
1. **Header**: Minimalist agency mark with live local time indicator.
2. **Hero**: Massive bold typographic statement with reel background.
3. **Selected Works Grid**: 2-column alternating case study showcase with tags and hover zoom.
4. **Services Reel**: Horizontal marquee of capabilities (Brand, Web, 3D, Growth).
5. **Client Testimonials**: Quote slider with author avatar and metrics badge.
6. **Contact / Project Inquiry**: Interactive budget selector and form.

### 3.3 Restaurant / Hospitality Blueprint (`tmpl_hospitality_sanctuary`):
1. **Atmospheric Hero**: Brand mark, reservation CTA, ambient video loop.
2. **Culinary Narrative**: Split story card with chef profile and philosophy.
3. **Seasonal Degustation Menu**: Category tabs (Starters, Mains, Cellar, Desserts).
4. **Dining Room Gallery**: Masonry media showcase of interior and ambiance.
5. **Location & Sanctuary Map**: Interactive address, transit guide, and opening hours.
6. **Table Reservation**: Direct date/time/guest count reservation flow.
