# Celebrations

A premium digital celebration experience platform built for weddings, birthdays, anniversaries, family milestones, and other meaningful events.

Celebrations is designed to turn a simple event announcement into a beautiful, memorable digital story. It combines premium visual design, personalized event setup, guest interactions, and modern SaaS-style product flows into one experience.

---

## Why this project exists

People do not just want an invitation. They want an experience.

Traditional event invites are static, often dull, and disconnected from the energy of the occasion. Celebrations solves this by giving users a way to:

- create premium event experiences in minutes
- choose a visual style that matches the mood of the event
- publish a memorable celebration page for friends and family
- manage guest details, RSVP flow, story, venue, and date in one place
- deliver a polished digital experience that feels personal and premium

The project sits at the intersection of event planning, digital storytelling, guest engagement, and product design.

---

## Product purpose

The purpose of Celebrations is to help people create elegant digital experiences for life’s most important moments.

It is built for:

- weddings
- engagements
- anniversaries
- birthdays
- baby showers
- family functions
- cultural ceremonies
- corporate celebrations
- private events and milestone gatherings

The core product idea is simple: make the celebration feel as memorable online as it feels in real life.

---

## Product value

Celebrations delivers value across three dimensions:

### 1. Emotional value
It helps people tell a story around the celebration, not just share a date and time.

### 2. Operational value
It gives hosts an organized way to manage event details, guest expectations, and event information.

### 3. Brand value
It creates a premium experience that feels thoughtful, intentional, and well designed.

---

## Core features

### Occasion-based event creation
Users start by choosing the occasion type, such as wedding, birthday, or anniversary. This helps tailor the experience and visual guidance to that event category.

### Theme gallery and curated visual styles
The product includes multiple curated themes that define the mood, color palette, and style language of the celebration page.

### Guided multi-step creation flow
The creation journey is structured in a clean, guided flow:

1. choose occasion
2. select a visual theme
3. add details and story
4. preview the experience
5. publish and share

### Premium landing experience
The home screen behaves like a premium product marketing page, explaining the value and encouraging users to create their own celebration story.

### Guest-first user experience
The app is built not only for hosts but also for guests. It supports a polished event experience that users can share with loved ones.

### Plan and pricing model
The product includes pricing and feature positioning to support a real SaaS-style host offering and business model.

### Template and governance model
The app supports admin-managed templates, pricing tiers, feature visibility, and product-level governance. This makes it suitable for platform-level product operations.

### Event analytics and platform structure
The plugin architecture supports analytics, features, sections, orders, and event experiences, positioning the product as a deeper platform module rather than a standalone landing page.

---

## User journey

### Step 1: Discover the product
The user lands on the product page and sees the value proposition, curated experiences, and invitation storytelling language.

### Step 2: Select the occasion
The user chooses the event type that best matches the celebration.

### Step 3: Choose a style
The user picks a theme that creates the correct mood: elegant, minimal, royal, editorial, floral, modern, or cinematic.

### Step 4: Add event information
The user fills in the important details:

- names
- venue
- event date
- guest count
- tone or mood
- event story

### Step 5: Preview the story
The user previews how everything will look before publishing the experience.

### Step 6: Publish and share
The final event page becomes live and shareable with guests.

---

## Screens in the product

### Home / Landing Screen
Purpose: establish the premium identity of the product and encourage event creation.

Highlights:

- premium hero section
- value proposition messaging
- curated event categories
- theme previews
- pricing options
- clear call-to-action buttons

### Occasion Selection Screen
Purpose: guide the user into the correct event context.

### Theme Gallery Screen
Purpose: help the user browse visual styles and choose the look that matches the atmosphere.

### Creation Studio Screen
Purpose: support step-based creation of a celebration experience.

This screen includes:

- step indicators
- occasion selection
- theme selection
- form inputs for event details
- a live preview panel

### Preview Panel
Purpose: give a visual summary before publish.

This panel shows a live snapshot of the final event story and key details such as:

- title
- theme
- venue
- date
- guest flow
- atmosphere

---

## Product architecture

The project is structured as a product app inside the OrbitoX platform and also includes a plugin domain package.

### App layer
The app is in:

- [orbitox/apps/celebrations](orbitox/apps/celebrations)

It contains the actual user-facing experience and the UI screens.

### Plugin domain layer
The domain logic, models, rules, and platform contracts are in:

- [orbitox/plugins/celebrations](orbitox/plugins/celebrations)

Key items:

- manifest metadata
- permissions and menu definitions
- domain engines for occasions, themes, pricing, and experiences
- reusable platform abstractions

### Central business concepts
The product model revolves around:

- Occasion
- Theme
- Experience
- Guest flow
- RSVP interactions
- Event sections
- Premium features
- Theme governance and visibility

---

## Key code foundation

The project references the following core domain logic:

- [orbitox/plugins/celebrations/src/domain/types.ts](orbitox/plugins/celebrations/src/domain/types.ts)
- [orbitox/plugins/celebrations/src/domain/occasion-engine.ts](orbitox/plugins/celebrations/src/domain/occasion-engine.ts)
- [orbitox/plugins/celebrations/src/domain/theme-engine.ts](orbitox/plugins/celebrations/src/domain/theme-engine.ts)
- [orbitox/plugins/celebrations/src/domain/experience-engine.ts](orbitox/plugins/celebrations/src/domain/experience-engine.ts)
- [orbitox/plugins/celebrations/manifest.json](orbitox/plugins/celebrations/manifest.json)

The app layer includes:

- [orbitox/apps/celebrations/app/page.tsx](orbitox/apps/celebrations/app/page.tsx)
- [orbitox/apps/celebrations/app/create/page.tsx](orbitox/apps/celebrations/app/create/page.tsx)
- [orbitox/apps/celebrations/app/themes/page.tsx](orbitox/apps/celebrations/app/themes/page.tsx)
- [orbitox/apps/celebrations/lib/ecosystem-context.tsx](orbitox/apps/celebrations/lib/ecosystem-context.tsx)
- [orbitox/apps/celebrations/components/layout/AppShell.tsx](orbitox/apps/celebrations/components/layout/AppShell.tsx)

---

## Tech stack

This app is built using modern web tooling and is part of the OrbitoX platform ecosystem.

### Frontend
- Next.js
- React
- TypeScript
- CSS and design-driven styling
- Lucide icons

### Platform integration
- OrbitoX plugin system
- package-level modular architecture
- app-level ecosystem context

### Product design direction
- premium editorial storytelling
- dark luxury interface language
- curated collection layouts
- interactive, mobile-friendly product experience

---

## Local setup

### Prerequisites

- Node.js 18+
- pnpm
- a working OrbitoX monorepo checkout

### Install dependencies

```bash
cd orbitox
pnpm install
```

### Run the celebrations app

```bash
cd orbitox
pnpm --filter celebrations dev
```

By default, the app runs on port 3010.

### Production build

```bash
cd orbitox
pnpm --filter celebrations build
```

---

## Folder structure

```text
orbitox/
  apps/
    celebrations/
      app/
      components/
      lib/
      public/
      package.json
      tsconfig.json
  plugins/
    celebrations/
      manifest.json
      src/
```

---

## Why Celebrations is a strong product

This project stands out because it combines:

- premium design language
- meaningful event storytelling
- a guided product journey
- plugin-based platform architecture
- SaaS monetization potential
- emotional, real-world use cases

It is not just a utility app. It is designed as a premium digital product that people enjoy using and enjoy sharing.

---

## Short project pitch

Celebrations is a premium digital celebration platform that helps people turn important life moments into beautiful, meaningful online experiences.

It brings together elegant design, event planning, guest experience, and high-end storytelling in one modern product.

---

## Conclusion

Celebrations is a product-first experience platform built for moments that matter. It turns event invitations into immersive digital stories and gives users a clear, polished path from occasion selection to final publishing.

It is positioned as a premium, emotionally resonant, and platform-ready product within the OrbitoX ecosystem.
