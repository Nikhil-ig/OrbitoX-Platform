# 🪐 OrbitoX Studio 3.0 — Universal Import IR Specification
**Document ID:** `docs/P27/32_IMPORT_IR_SPEC.md`  
**Status:** ARCHITECTURAL SPECIFICATION (PHASE 0)  

---

## 1. Specification Overview

The OrbitoX Import Intermediate Representation (IR) is the single canonical normalized format produced by all ingestion adapters (HTML, React, Figma, Shopify, WordPress, Canva, URLs).

```typescript
export interface OrbitoXImportIR {
  version: '3.0.0';
  metadata: {
    sourceType: 'html' | 'react' | 'figma' | 'shopify' | 'wordpress' | 'xd' | 'canva' | 'url';
    importedAt: string;
    sourceUrl?: string;
    sourceAuthor?: string;
    confidenceTier: 'native' | 'hybrid' | 'custom-runtime' | 'unsupported';
    confidenceScore: number; // 0.0 - 1.0
  };
  project: {
    name: string;
    pages: IRPage[];
    designTokens: IRDesignTokens;
    assets: IRAsset[];
    masterComponents: Record<string, IRMasterComponent>;
  };
  sourceMappings?: Record<string, IRSourceMapping>;
  unsupportedFeatures?: IRUnsupportedFeature[];
}

export interface IRPage {
  id: string;
  name: string;
  route: string;
  sections: IRSection[];
}

export interface IRSection {
  id: string;
  name: string;
  kind: 'hero' | 'features' | 'gallery' | 'testimonials' | 'cta' | 'footer' | 'custom';
  sceneGraph: IRSceneGraph;
}

export interface IRSceneGraph {
  rootNodeId: string;
  renderOrder: string[];
  nodes: Record<string, IRNode>;
}

export interface IRNode {
  id: string;
  name: string;
  kind: 'frame' | 'text' | 'image' | 'video' | 'button' | 'stack' | 'grid' | 'threed';
  parentId?: string;
  children?: string[];
  geometry: {
    x: number;
    y: number;
    width: number | string;
    height: number | string;
    rotation?: number;
    position: 'flow' | 'absolute';
  };
  layout?: {
    mode: 'flow' | 'flex' | 'grid';
    direction?: 'horizontal' | 'vertical';
    gap?: number | string;
    padding?: { top: number; right: number; bottom: number; left: number };
    alignItems?: string;
    justifyContent?: string;
  };
  style: Record<string, any>;
  textContent?: string;
  src?: string;
  bindings?: Record<string, any>;
}

export interface IRSourceMapping {
  nodeId: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceSelector?: string;
}
```
