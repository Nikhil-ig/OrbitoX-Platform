# Canonical Document Model Audit
**Document ID:** `docs/P27/03_CANONICAL_DOCUMENT_AUDIT.md`

## 1. Current Model Fragmentation
Currently, three competing schemas represent project state:
1. `TemplateSchema`: Root JSON structure with scenes, designTokens, publishingConfig.
2. `SceneGraph`: Tree of nodes keyed by ID (`nodes: Record<string, SceneGraphNode>`).
3. Local UI state: Transient selections, open drawers, active tabs.

## 2. Deficiencies
- Schema stores sections as `scenes: TemplateSceneDefinition[]` rather than unified `pages[].sections[]`.
- Node styles mix raw CSS strings, token paths, and geometry properties.
