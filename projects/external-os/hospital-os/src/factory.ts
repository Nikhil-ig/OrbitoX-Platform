import { createOrbitoXApp, orbitox } from '@orbitox/runtime';
import { hospitalEntityConfigs } from './domain/entities.config';
import { wireHospitalOS } from './index';
import { HierarchyService } from './services/hierarchy.service';

export interface HospitalSaaSConfig {
  /**
   * Hospital or Healthcare Group Name
   * @example "Apollo Health Global" or "Mayo Clinic"
   */
  name: string;

  /**
   * Server Port (Default: 3000)
   */
  port?: number;

  /**
   * Compliance Framework (Default: "HIPAA")
   */
  complianceFramework?: 'HIPAA' | 'NABH' | 'JCI' | 'GDPR';

  /**
   * Initial Branch / Facility Name (Default: "Main Hospital Facility")
   */
  initialBranchName?: string;

  /**
   * Initial Departments to auto-provision
   */
  departments?: string[];

  /**
   * Number of Initial ICU and Ward Beds to seed (Default: true)
   */
  seedSampleBeds?: boolean;

  /**
   * Custom Medical Devices Catalog
   */
  customEquipment?: Array<{ model: string; manufacturer: string; type: string }>;
}

/**
 * 🚀 createHospitalSaaS — 1-Line Universal Hospital SaaS Factory
 *
 * Bootstraps the entire Hospital Management System:
 * - 8 Database Entity Schemas (Patients, Beds, Treatments, Records, Labs, Invoices, Staff)
 * - 6-Tier Context Hierarchy (Org -> Branch -> Dept -> Ward -> Room -> Bed)
 * - Automated n8n-style Clinical Workflows
 * - Real-Time Telemetry & Code Blue Alarm Engines
 * - 5-Rights Pharmacy Safety & Verification
 * - SHA-256 Cryptographic Audit Vault
 * - 12 Live REST API Endpoints
 *
 * @example
 * ```typescript
 * import { createHospitalSaaS } from 'hospital-os';
 *
 * const hospital = await createHospitalSaaS({
 *   name: 'Mayo Clinic Healthcare',
 *   port: 3000
 * });
 * ```
 */
export async function createHospitalSaaS(config: HospitalSaaSConfig): Promise<{
  app: any;
  server: any;
  tree: any;
  orbitox: typeof orbitox;
}> {
  const port = config.port || 3000;
  const branchName = config.initialBranchName || `${config.name} - Branch 1`;
  const orgSlug = config.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const branchSlug = `${orgSlug}-branch-1`;

  console.log(`\n🏥 [Hospital-OS Factory] Initializing ${config.name} (${config.complianceFramework || 'HIPAA'} Compliant)...`);

  // 1. Initialize OrbitoX App Kernel with Schemas
  const { app, server } = await createOrbitoXApp({
    app: { name: config.name, port },
    entities: hospitalEntityConfigs
  });

  // 2. Wire Clinical REST Routes & Automation Workflows
  wireHospitalOS(app);

  // 3. Provision Multi-Tier Context Hierarchy
  const tree = await HierarchyService.bootstrapStandardHospital({
    orgId: orgSlug,
    orgName: config.name,
    branchId: branchSlug,
    branchName
  });

  // 4. Optionally Seed Initial Bed Stations
  if (config.seedSampleBeds !== false) {
    const cardioICUId = tree.wards.cardioICU.id;
    const room101Id = tree.rooms.room101.id;

    await orbitox.db.create<any>('bed', {
      id: `${branchSlug}-bed-101-a`,
      label: 'Bed 101-A (ICU Station)',
      wardId: cardioICUId,
      roomId: room101Id,
      type: 'icu',
      status: 'available',
      isTemporary: false,
      dailyRate: 1500,
      attachedEquipment: [
        { deviceId: 'dev_mx800_01', deviceType: 'multi_para_vitals_monitor', manufacturer: 'Philips', model: 'IntelliVue MX800', status: 'online' },
        { deviceId: 'dev_g5_01', deviceType: 'mechanical_ventilator', manufacturer: 'Hamilton Medical', model: 'Hamilton-G5', status: 'online' }
      ]
    }, tree.beds.bed101A.id);

    await orbitox.db.create<any>('bed', {
      id: `${branchSlug}-bed-101-b`,
      label: 'Bed 101-B (ICU Station)',
      wardId: cardioICUId,
      roomId: room101Id,
      type: 'icu',
      status: 'available',
      isTemporary: false,
      dailyRate: 1500,
      attachedEquipment: [
        { deviceId: 'dev_b650_01', deviceType: 'multi_para_vitals_monitor', manufacturer: 'GE Healthcare', model: 'CARESCAPE B650', status: 'online' }
      ]
    }, tree.beds.bed101B.id);

    await orbitox.db.create<any>('bed', {
      id: `${branchSlug}-bed-er-01`,
      label: 'Trauma Bay 01',
      wardId: tree.departments.emergency.id,
      type: 'emergency_trauma_bay',
      status: 'available',
      isTemporary: false,
      dailyRate: 850,
      attachedEquipment: [
        { deviceId: 'dev_zoll_01', deviceType: 'defibrillator_crash_cart', manufacturer: 'ZOLL Medical', model: 'R Series Plus', status: 'online' }
      ]
    }, tree.departments.emergency.id);
  }

  console.log(`\n🎉 [Hospital-OS Factory] ${config.name} Live at http://localhost:${port}/api`);
  console.log(`   - 🏥 Patient Admissions: POST http://localhost:${port}/api/hospital/admissions`);
  console.log(`   - 🛏️ Bed Provisioning:  POST http://localhost:${port}/api/hospital/beds`);
  console.log(`   - 📟 Live Telemetry:    POST http://localhost:${port}/api/hospital/telemetry`);
  console.log(`   - 💊 Prescriptions:     POST http://localhost:${port}/api/hospital/treatments`);
  console.log(`   - 🌳 Hierarchy Tree:    GET  http://localhost:${port}/api/hospital/hierarchy`);
  console.log(`   - 🚨 Break-Glass Mode:  POST http://localhost:${port}/api/hospital/security/break-glass\n`);

  return { app, server, tree, orbitox };
}
