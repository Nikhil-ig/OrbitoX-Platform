# Target Canonical Document Model
**Document ID:** `docs/P27/53_TARGET_DOCUMENT_MODEL.md`

## 1. Canonical Project Schema
```ts
interface CanonicalProjectDocument {
  id: string;
  contextId: string;
  slug: string;
  name: string;
  pages: CanonicalPage[];
  components: Record<string, SceneGraphNode>;
  designTokens: TemplateDesignTokens;
  cms: Record<string, CMSCollection>;
  assets: Record<string, AssetRecord>;
}
```
