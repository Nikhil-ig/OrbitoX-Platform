import { createOrbitoXApp, orbitox } from '@orbitox/runtime';
import { hospitalEntityConfigs } from './domain/entities.config';
import { wireHospitalOS } from './index';
import { HierarchyService } from './services/hierarchy.service';
import { StaffService } from './services/staff.service';
import { HospitalSeedService } from './services/seed.service';

async function bootstrapHospitalOSServer() {
  console.log('🚀 Booting Enterprise Hospital OS on OrbitoX Platform...\n');

  // 1. Initialize OrbitoX App with Schemas
  const { app, server } = await createOrbitoXApp({
    app: { name: 'Apollo Hospital OS', port: 3000 },
    entities: hospitalEntityConfigs
  });

  // 2. Wire Clinical REST Routes & n8n Workflows
  wireHospitalOS(app);

  // 3. Provision Sample 6-Tier Hospital Context Hierarchy
  const tree = await HierarchyService.bootstrapStandardHospital({
    orgId: 'apollo-global',
    orgName: 'Apollo Health Global',
    branchId: 'apollo-ny',
    branchName: 'Apollo Hospital New York'
  });

  // 3.5. Seed Clinical Staff Directory & Credentials
  await StaffService.seedInitialStaff();

  // 4. Seed Initial Comprehensive Role-Tailored Hospital Database
  await HospitalSeedService.seedComprehensiveHospitalData(false, tree);

  console.log(`\n🎉 Hospital OS Live at http://localhost:3000/api`);
  console.log(`   - 🏥 Patient Admissions: POST /api/hospital/admissions`);
  console.log(`   - 👥 Patient Registry:   GET  /api/hospital/patients`);
  console.log(`   - 🛏️ Bed Provisioning:  GET/POST /api/hospital/beds`);
  console.log(`   - 📟 Live Telemetry:    POST /api/hospital/telemetry`);
  console.log(`   - 💊 Prescriptions:     GET/POST /api/hospital/treatments`);
  console.log(`   - 📅 Appointments:      GET/POST /api/hospital/appointments`);
  console.log(`   - 📊 Statistics:        GET  /api/hospital/stats`);
  console.log(`   - 🛡️ Audit Ledger:      GET  /api/hospital/audit`);
  console.log(`   - 🔄 Reset & Re-Seed:   POST /api/hospital/reset-seed\n`);
}

bootstrapHospitalOSServer().catch(console.error);
