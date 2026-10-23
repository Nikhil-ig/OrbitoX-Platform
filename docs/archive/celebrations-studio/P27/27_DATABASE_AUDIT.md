# 🪐 OrbitoX Studio 3.0 — Database Forensic Audit
**Document ID:** `docs/P27/27_DATABASE_AUDIT.md`  
**Status:** FORENSIC ANALYSIS (PHASE 0)  

---

## 1. Existing Prisma Database Schema Audit

An exhaustive review of `orbitox/prisma/schema.prisma` reveals 28 models:
* E-Commerce: `Store`, `StoreTheme`, `StorePage`, `Product`, `Order`, `Customer`, etc.
* Legacy Celebrations: `CelebrationExperience`, `CelebrationSectionDefinition`, `CelebrationGuest`, `CelebrationWish`.

### Forensic Finding: Zero Universal Studio Models
**There are NO models in the entire database for OrbitoX Visual Studio!**
* No `StudioProject`
* No `StudioPage`
* No `StudioSection`
* No `StudioNode`
* No `StudioAsset`
* No `StudioComponent`
* No `StudioSnapshot`

---

## 2. Impact on Creators

Because the database contains no models for Visual Studio:
* The entire platform functions as an ephemeral in-memory client application relying on browser `localStorage` and `IndexedDB`.
* Work cannot be synced across team members, cannot be backed up to the cloud, and is immediately destroyed if the browser cache is cleared.
* Multi-tenant domain routing cannot resolve studio websites because there are no database records associating custom domains with studio projects.
