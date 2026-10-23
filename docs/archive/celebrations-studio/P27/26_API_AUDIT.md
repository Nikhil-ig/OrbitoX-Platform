# 🪐 OrbitoX Studio 3.0 — API Inventory & Forensic Audit
**Document ID:** `docs/P27/26_API_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Existing API Inventory

A forensic review of `orbitox/apps/celebrations/app/api/` reveals the following routes:

| API Route | Method | Purpose | Deficiencies Identified |
| :--- | :--- | :--- | :--- |
| `/api/importer` | `POST` | Parses code string into IR | Only accepts raw `{ code: string }`. Rejects multipart/form-data, binary files, or URL uploads. |
| `/api/crawler` | `POST` | Fetches public website HTML | Lacks asset downloading, CSS stylesheet aggregation, and bot-challenge handling. |
| `/api/celebrations/*` | `GET/POST`| Manages celebration experiences | Tightly coupled to legacy invitation schemas; no generic project document model. |

---

## 2. Missing Essential Studio APIs

1. **`POST /api/studio/projects`:** Missing. Projects cannot be saved to the cloud.
2. **`GET /api/studio/projects/:id`:** Missing. Loading is restricted to client-side localStorage/IndexedDB.
3. **`POST /api/studio/assets/upload`:** Missing. No endpoint for multipart binary file uploads to S3/R2 storage.
4. **`POST /api/studio/publish`:** Missing. No endpoint to generate immutable, hashed deployment bundles.
