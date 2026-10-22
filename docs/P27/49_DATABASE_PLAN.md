# 🪐 OrbitoX Studio 3.0 — Database Migration Plan
**Document ID:** `docs/P27/49_DATABASE_PLAN.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. Required Prisma Schema Additions

The database must gain tenant-scoped persistent models for OrbitoX Visual Studio:

```prisma
// ─────────────────────────────────────────────────────────────
// 🪐 ORBITOX VISUAL STUDIO 3.0 PERSISTENCE MODELS
// ─────────────────────────────────────────────────────────────

enum StudioProjectStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model StudioProject {
  id               String               @id @default(cuid())
  contextId        String               // Tenant partitioning link
  slug             String               @unique
  name             String
  description      String?
  status           StudioProjectStatus  @default(DRAFT)
  currentVersion   Int                  @default(1)
  publishedVersion Int                  @default(0)
  designTokens     Json                 // Color, typography, spacing tokens
  cmsCollections   Json                 @default("{}")
  settings         Json                 @default("{}")
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  pages            StudioPage[]
  assets           StudioAsset[]
  snapshots        StudioSnapshot[]

  @@index([contextId])
  @@index([slug])
}

model StudioPage {
  id               String          @id @default(cuid())
  projectId        String
  project          StudioProject   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name             String
  route            String
  order            Int             @default(0)
  isHome           Boolean         @default(false)
  seoTitle         String?
  seoDescription   String?
  ogImageUrl       String?
  sections         StudioSection[]

  @@index([projectId])
}

model StudioSection {
  id               String       @id @default(cuid())
  pageId           String
  page             StudioPage   @relation(fields: [pageId], references: [id], onDelete: Cascade)
  name             String
  kind             String       // hero, features, gallery, cta, footer, custom
  order            Int          @default(0)
  isLocked         Boolean      @default(false)
  isHidden         Boolean      @default(false)
  sceneGraph       Json         // Complete JSON SceneGraph tree

  @@index([pageId])
}

model StudioAsset {
  id               String        @id @default(cuid())
  projectId        String
  project          StudioProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name             String
  fileUrl          String
  mimeType         String
  sizeBytes        Int
  width            Int?
  height           Int?
  variants         Json          @default("{}") // Responsive srcset WebP URLs
  usedInNodes      String[]      @default([])
  createdAt        DateTime      @default(now())

  @@index([projectId])
}

model StudioSnapshot {
  id               String        @id @default(cuid())
  projectId        String
  project          StudioProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  version          Int
  documentSnapshot Json          // Immutable full project document JSON
  publishedBy      String?
  publishedAt      DateTime      @default(now())

  @@index([projectId, version])
}
```

---

## 2. Migration Execution Directive

* **Zero Migrations in Phase 0:** In strict accordance with user commands, no database migrations are executed in Phase 0.
* **Phase 6 Execution:** Migrations will be generated and run via `npx prisma migrate dev --name add_studio_persistence` only after approval.
