# 🪐 OrbitoX Studio 3.0 — API Implementation Plan
**Document ID:** `docs/P27/50_API_PLAN.md`  
**Status:** IMPLEMENTATION PLANNING (PHASE 0)  

---

## 1. REST Endpoint Specifications

All endpoints require authentication and resolve `tenantId` via `AsyncLocalStorage` (`AGENTS.md` Rule 3):

### A. Project Management
* **`GET /api/studio/projects`:** Lists all projects for active tenant.
* **`POST /api/studio/projects`:** Creates a new project from a blueprint or blank document.
  * *Request Body:* `{ name: string, blueprintSlug?: string, initialDocument?: OrbitoXProjectDocument }`
  * *Response:* `{ project: StudioProject }`
* **`GET /api/studio/projects/:id`:** Fetches complete canonical project document.
* **`PUT /api/studio/projects/:id`:** Saves active draft document state.
* **`DELETE /api/studio/projects/:id`:** Soft-deletes project.

### B. Asset Pipeline
* **`POST /api/studio/assets/upload`:** Accepts `multipart/form-data`.
  * Uploads original file to S3/R2 storage.
  * Generates WebP thumbnails and responsive sizes.
  * Inserts `StudioAsset` record scoped to project.
  * *Response:* `{ asset: StudioAsset }`

### C. Publishing & Versions
* **`POST /api/studio/projects/:id/publish`:**
  * Creates an immutable snapshot record in `StudioSnapshot`.
  * Increments `publishedVersion`.
  * Triggers Edge CDN cache purge for custom domain.
  * *Response:* `{ publishedUrl: string, version: number }`
