#!/usr/bin/env node
/**
 * 🚀 RestaurantOS — JSON to PostgreSQL One-Shot Migration Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrates legacy atomic file-backed JSON state (`restaurant-runtime-store.json`)
 * into the multi-tenant PostgreSQL Prisma database for the pilot restaurant.
 *
 * Supports:
 *   --dry-run             Reports what will be migrated without writing to DB.
 *   --tenant-id <id>      Target tenant ID (default: tenant_pilot_bistro)
 *   --tenant-name <name>  Target tenant Name (default: Orbitox Bistro Pilot)
 *   --tenant-slug <slug>  Target tenant slug (default: bistro-pilot)
 *   --source <path>       Path to source JSON file
 *   --verbose             Enable verbose row-level logging
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PostgresRestaurantStore } from '../packages/storage/postgres-store';

interface MigrationSummary {
  tenant: { id: string; name: string; slug: string };
  branches: number;
  floors: number;
  tables: number;
  categories: number;
  menuItems: number;
  menuOverrides: number;
  orders: number;
  kitchenTasks: number;
  serviceRequests: number;
  sessions: number;
  guests: number;
  staffMembers: number;
  staffRevocations: number;
  brandConfig: boolean;
  supportTickets: number;
  domainEvents: number;
  idempotencyRecords: number;
}

export async function runMigration(options?: {
  dryRun?: boolean;
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
  sourcePath?: string;
  verbose?: boolean;
}): Promise<MigrationSummary> {
  const args = process.argv.slice(2);
  const dryRun = options?.dryRun ?? (args.includes('--dry-run') || args.includes('-d'));
  const verbose = options?.verbose ?? (args.includes('--verbose') || args.includes('-v'));

  const getArg = (flag: string, fallback: string): string => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    return fallback;
  };

  const tenantId = options?.tenantId || getArg('--tenant-id', 'tenant_pilot_bistro');
  const tenantName = options?.tenantName || getArg('--tenant-name', 'Orbitox Bistro Pilot');
  const tenantSlug = options?.tenantSlug || getArg('--tenant-slug', 'bistro-pilot');
  const sourcePath =
    options?.sourcePath ||
    getArg(
      '--source',
      path.resolve(__dirname, '..', 'data', 'restaurant-runtime-store.json')
    );

  console.log('\n===============================================================');
  console.log('🪐 RestaurantOS Multi-Tenant Database Migration');
  console.log('===============================================================');
  console.log(`Mode:            ${dryRun ? '🔍 DRY RUN (Simulated, zero database writes)' : '⚡ LIVE MIGRATION'}`);
  console.log(`Source File:     ${sourcePath}`);
  console.log(`Target Tenant:   ${tenantId} ("${tenantName}", slug: "${tenantSlug}")`);
  console.log('===============================================================\n');

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`🚨 Source JSON store file not found at: ${sourcePath}`);
  }

  const rawJson = fs.readFileSync(sourcePath, 'utf8');
  const data = JSON.parse(rawJson);

  const branches = Array.isArray(data.branches) ? data.branches : [];
  const floors = Array.isArray(data.floors) ? data.floors : [];
  const tables = Array.isArray(data.tables) ? data.tables : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  const menuItems = Array.isArray(data.menuItems) ? data.menuItems : [];
  const menuOverrides = Array.isArray(data.branchMenuOverrides) ? data.branchMenuOverrides : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const kitchenTasks = Array.isArray(data.kitchenTasks) ? data.kitchenTasks : [];
  const serviceRequests = Array.isArray(data.serviceRequests) ? data.serviceRequests : [];
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const guests = Array.isArray(data.guests) ? data.guests : [];
  const supportTickets = Array.isArray(data.supportTickets) ? data.supportTickets : [];
  const events = Array.isArray(data.events) ? data.events : [];
  const brandConfig = data.tenantBrand || null;
  const idempotencyMap = data.idempotencyRecords || {};
  const idempotencyKeys = Object.keys(idempotencyMap);

  // Staff directory: read persisted staff members from JSON store
  const staffMembers = Array.isArray(data.staffMembers) ? data.staffMembers : [];
  const revokedJtis = Array.isArray(data.revokedStaffTokenJtis)
    ? data.revokedStaffTokenJtis
    : Array.isArray(data.revokedStaffTokens)
    ? data.revokedStaffTokens
    : [];

  const summary: MigrationSummary = {
    tenant: { id: tenantId, name: tenantName, slug: tenantSlug },
    branches: branches.length,
    floors: floors.length,
    tables: tables.length,
    categories: categories.length,
    menuItems: menuItems.length,
    menuOverrides: menuOverrides.length,
    orders: orders.length,
    kitchenTasks: kitchenTasks.length,
    serviceRequests: serviceRequests.length,
    sessions: sessions.length,
    guests: guests.length,
    staffMembers: staffMembers.length,
    staffRevocations: revokedJtis.length,
    brandConfig: !!brandConfig,
    supportTickets: supportTickets.length,
    domainEvents: events.length,
    idempotencyRecords: idempotencyKeys.length,
  };

  console.log('📦 Discovery Summary:');
  console.log(`  • Branches:              ${summary.branches}`);
  console.log(`  • Floors:                ${summary.floors}`);
  console.log(`  • Tables:                ${summary.tables}`);
  console.log(`  • Menu Categories:       ${summary.categories}`);
  console.log(`  • Menu Items:            ${summary.menuItems}`);
  console.log(`  • Branch Menu Overrides: ${summary.menuOverrides}`);
  console.log(`  • Orders:                ${summary.orders}`);
  console.log(`  • Kitchen Tasks:         ${summary.kitchenTasks}`);
  console.log(`  • Service Requests:      ${summary.serviceRequests}`);
  console.log(`  • Dining Sessions:       ${summary.sessions}`);
  console.log(`  • Guest Records:         ${summary.guests}`);
  console.log(`  • Staff Accounts:        ${summary.staffMembers}`);
  console.log(`  • Staff Revocations:     ${summary.staffRevocations}`);
  console.log(`  • Support Tickets:       ${summary.supportTickets}`);
  console.log(`  • Domain Events:         ${summary.domainEvents}`);
  console.log(`  • Idempotency Records:   ${summary.idempotencyRecords}`);
  console.log(`  • Brand Config:          ${summary.brandConfig ? 'Present' : 'None'}`);

  if (dryRun) {
    console.log('\n[DRY RUN COMPLETE] Zero changes committed to PostgreSQL.');
    console.log('Run without --dry-run to write records to the database.\n');
    return summary;
  }

  // Live migration execution
  console.log('\n🔄 Executing PostgreSQL transaction import...');
  const prisma = new PrismaClient();
  const store = new PostgresRestaurantStore(prisma);

  try {
    // 1. Ensure Tenant
    console.log(`  -> Upserting Tenant [${tenantId}]...`);
    await store.ensureTenant({
      id: tenantId,
      name: tenantName,
      slug: tenantSlug,
      status: 'active',
      orbitoxProjectId: 'restaurant-os-pilot',
      gstin: '03AAAAA0000A1Z5',
    });

    // 2. Branches
    console.log(`  -> Importing ${branches.length} branches...`);
    for (const b of branches) {
      if (verbose) console.log(`     Branch ${b.id}: ${b.name}`);
      await store.saveBranch(b, tenantId);
    }

    // 3. Floors
    console.log(`  -> Importing ${floors.length} floors...`);
    for (const f of floors) {
      if (verbose) console.log(`     Floor ${f.id}: ${f.name}`);
      await store.saveFloor(f, tenantId);
    }

    // 4. Tables
    console.log(`  -> Importing ${tables.length} tables...`);
    for (const t of tables) {
      if (verbose) console.log(`     Table ${t.id} (#${t.number})`);
      await store.saveTable(t, tenantId);
    }

    // 5. Categories
    console.log(`  -> Importing ${categories.length} menu categories...`);
    for (const cat of categories) {
      await store.saveCategory(cat, tenantId);
    }

    // 6. Menu Items
    console.log(`  -> Importing ${menuItems.length} menu items...`);
    for (const m of menuItems) {
      await store.saveMenuItem(m, tenantId);
    }

    // 7. Menu Overrides
    console.log(`  -> Importing ${menuOverrides.length} branch menu overrides...`);
    for (const o of menuOverrides) {
      await store.saveMenuOverride(o, tenantId);
    }

    // 8. Staff Accounts
    console.log(`  -> Importing ${staffMembers.length} staff directory members...`);
    for (const s of staffMembers) {
      await store.saveStaffMember(s, tenantId);
    }

    // 9. Staff Revocations
    console.log(`  -> Importing ${revokedJtis.length} staff token revocations...`);
    for (const jti of revokedJtis) {
      await store.revokeStaffToken(jti, 'Migrated from store.json', tenantId);
    }

    // 10. Sessions & Guests
    console.log(`  -> Importing ${sessions.length} dining sessions...`);
    for (const s of sessions) {
      await store.saveSession(s, tenantId);
    }

    console.log(`  -> Importing ${guests.length} guest records...`);
    for (const g of guests) {
      await store.saveGuest(g, tenantId);
    }

    // 11. Orders
    console.log(`  -> Importing ${orders.length} orders...`);
    for (const o of orders) {
      await store.saveOrder(o, tenantId);
    }

    // 12. Kitchen Tasks
    console.log(`  -> Importing ${kitchenTasks.length} kitchen tasks...`);
    for (const kt of kitchenTasks) {
      await store.saveKitchenTask(kt, tenantId);
    }

    // 13. Service Requests
    console.log(`  -> Importing ${serviceRequests.length} service requests...`);
    for (const sr of serviceRequests) {
      await store.saveServiceRequest(sr, tenantId);
    }

    // 14. Brand Config
    if (brandConfig) {
      console.log('  -> Importing brand configuration...');
      await store.saveBrandConfig(brandConfig, tenantId);
    }

    // 15. Support Tickets
    console.log(`  -> Importing ${supportTickets.length} support tickets...`);
    for (const st of supportTickets) {
      await store.saveSupportTicket(st, tenantId);
    }

    // 16. Events
    console.log(`  -> Importing ${events.length} domain events...`);
    for (const ev of events) {
      await store.saveDomainEvent(ev, tenantId);
    }

    // 17. Idempotency Records
    console.log(`  -> Importing ${idempotencyKeys.length} idempotency records...`);
    for (const key of idempotencyKeys) {
      await store.saveIdempotencyRecord(key, idempotencyMap[key], 86400 * 7, tenantId);
    }

    console.log('\n✅ [MIGRATION COMPLETE] All records successfully migrated to PostgreSQL!');
    return summary;
  } finally {
    await store.disconnect();
  }
}

// Direct execution CLI entrypoint
if (require.main === module) {
  runMigration().catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
}
