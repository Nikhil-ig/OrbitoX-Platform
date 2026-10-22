# 🪐 OrbitoX Studio 3.0 — Target Project Document Model
**Document ID:** `docs/P27/33_TARGET_DOCUMENT_MODEL.md`  
**Status:** TARGET ARCHITECTURE SPECIFICATION (PHASE 0)  

---

## 1. The Absolute Architecture Principle (One Document)

Everything in OrbitoX Visual Studio resolves to **One Canonical Project Document**:

```
ORBITOX PROJECT DOCUMENT
       │
       ├── Metadata (id, tenantId, title, version, status)
       ├── Site Settings (favicon, seo, globalLayout)
       ├── Design Tokens (colors, typography, spacing, radii, shadows)
       ├── Asset Registry (images, fonts, videos, 3dModels)
       ├── CMS Collections (schemas, records, views)
       ├── Master Components (reusable symbols with slots and variants)
       └── Pages Array
             └── Page (id, name, slug, route, seo)
                   └── Sections Array (Ordered flow)
                         └── Section (id, name, kind, layoutMode)
                               └── SceneGraph
                                     └── Nodes (Frames, Text, Media, Buttons, 3D)
```

---

## 2. Core Schema Definition

```typescript
export interface OrbitoXProjectDocument {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  status: 'draft' | 'published';
  designTokens: DesignTokenSystem;
  assets: ProjectAsset[];
  masterComponents: Record<string, MasterComponentDefinition>;
  cms: {
    collections: Record<string, CMSCollection>;
  };
  pages: DocumentPage[];
  activePageId: string;
  updatedAt: string;
}

export interface DocumentPage {
  id: string;
  name: string;
  route: string;
  seo?: {
    title: string;
    description: string;
    ogImage?: string;
  };
  sections: DocumentSection[];
}

export interface DocumentSection {
  id: string;
  name: string;
  kind: SectionKind;
  isLocked?: boolean;
  isHidden?: boolean;
  sceneGraph: SceneGraphTree;
}
```
