# P26.1 Forensic Audit: CMS, Dynamic Data Collections & Repeater Architecture

## 1. Executive Summary

Modern web design platforms (Framer, Webflow, Shopify) rely on **Content Management Systems (CMS)** to decouple design structure from content data. A creator designs a single card or page template once, binds it to a dynamic data collection, and the platform automatically generates repeaters, lists, and individual dynamic routes (e.g. `/products/[handle]`, `/blog/[slug]`).

In the current OrbitoX Studio Zero:
- `DataPanel.tsx` contains only an ad-hoc local state list of key-value pairs (`siteTitle`, `eventName`, `ticketPrice`) stored in a React `useState`.
- There is no formal schema for **CMS Collections**, structured field types, repeater feeds, or dynamic detail page routing.
- This creates a major gap when importing Shopify themes (which expect `products`, `collections`, and `articles`) or WordPress sites (which expect `posts`, `pages`, and `custom post types`).

---

## 2. Current Implementation Audit

### 2.1 File: `orbitox/apps/celebrations/components/studio-zero/DataPanel.tsx`
- **Total Lines**: 238 lines
- **Current Data Structure**:
  ```typescript
  const [variables, setVariables] = useState([
    { name: 'siteTitle', type: 'string', value: 'OrbitoX Platform' },
    { name: 'eventName', type: 'string', value: 'Global Spatial Tech Summit' },
    { name: 'eventDate', type: 'string', value: 'October 24, 2026' },
    { name: 'ticketPrice', type: 'number', value: '499' },
    { name: 'isRsvpOpen', type: 'boolean', value: 'true' },
  ]);
  ```
- **Limitations**:
  1. Flat scalar values only: Cannot represent tabular arrays of objects (e.g. a list of 10 products with images, prices, variants, and descriptions).
  2. No Repeater component binding: Cannot select a Frame, mark it as a "Repeater", and bind it to a collection.
  3. No Dynamic Route generation: Cannot create a page route template `/blog/[slug]` that automatically renders a page for each post record.

---

## 3. The Target CMS & Data Architecture

The CMS mental model aligns with Framer CMS and Shopify Storefronts:

```
┌────────────────────────────────────────────────────────┐
│                   CMS COLLECTIONS                      │
│  [ Products ]  [ Blog Posts ]  [ Team ]  [ Events ]    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                   COLLECTION SCHEMA                    │
│  Fields: title (text), slug (string), price (currency),│
│          image (asset), body (rich_text), inStock (bool)│
└───────────────────────────┬────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│     REPEATER BINDING      │ │   DYNAMIC PAGE TEMPLATE   │
│  - Select Grid on Canvas  │ │  - Route: /products/[slug] │
│  - Bind to "Products"     │ │  - Heading -> title       │
│  - Map Card elements to   │ │  - Price Tag -> price     │
│    fields                 │ │  - Gallery -> images      │
└───────────────────────────┘ └───────────────────────────┘
```

### 3.1 Supported Field Types
1. **Plain Text**: Single-line text, titles, subtitles.
2. **Rich Text**: Markdown or HTML paragraphs with inline links and formatting.
3. **Image / Media Asset**: References an asset ID with natural dimensions and alt text.
4. **Number / Currency**: Formatted numeric values (`$49.00`, `€45.00`).
5. **Boolean / Toggle**: Visibility condition flag.
6. **Date / Time**: ISO 8601 timestamp with locale-aware formatting.
7. **Slug / Handle**: URL-safe identifier for dynamic routing.
8. **Relation / Reference**: Link to records in another collection (e.g. Author in Blog Post).

### 3.2 Real Bi-Directional Reactivity
- Modifying a field value in the CMS panel immediately re-renders all canvas nodes and repeaters referencing that field.
- Publishing compiles static JSON data bundles for instantaneous client-side hydration or static site generation (SSG).
