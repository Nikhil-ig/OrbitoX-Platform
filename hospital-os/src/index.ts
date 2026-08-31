import { definePlugin, HeadlessPlugin } from '@orbitox/sdk';
import { hospitalEntityConfigs } from './domain/entities.config';
import { patientHooks } from './hooks/patient.hooks';
import { bedHooks } from './hooks/bed.hooks';
import { treatmentHooks } from './hooks/treatment.hooks';
import { HospitalWorkflowRunner } from './automation/workflow-runner';
import { HOSPITAL_RECIPES } from './automation/recipes';
import { registerClinicalRoutes } from './routes/clinical.routes';
import { registerInfrastructureRoutes } from './routes/infrastructure.routes';
import { registerTelemetryRoutes } from './routes/telemetry.routes';
import { registerDashboardRoutes } from './routes/dashboard.routes';
import { registerSecurityRoutes } from './routes/security.routes';

// Export all domain types
export * from './domain/types';
export * from './domain/entities.config';
export * from './domain/equipment-catalog';
export * from './factory';
export * from './client';

// Export automation nodes & recipes
export * from './automation/triggers';
export * from './automation/actions';
export * from './automation/recipes';
export * from './automation/workflow-runner';

// Export core clinical services
export * from './services/hierarchy.service';
export * from './services/admission.service';
export * from './services/telemetry.service';
export * from './services/pharmacy.service';
export * from './services/lab.service';
export * from './services/billing.service';
export * from './services/dashboard.service';
export * from './services/security.service';
export * from './services/staff.service';

export interface HospitalOSPluginOptions {
  complianceFramework?: 'HIPAA' | 'NABH' | 'JCI';
  telemetry?: {
    enabled: boolean;
    brokerUrl?: string;
  };
  surgeBeds?: {
    allowTemporarySurge: boolean;
    autoDecommissionOnDischarge: boolean;
  };
  billing?: {
    autoDailyBedCharges: boolean;
    currency?: string;
  };
}

/**
 * HospitalOSPlugin — Modular Plug-and-Play Hospital SaaS Plugin for OrbitoX Platform
 */
export function HospitalOSPlugin(options: HospitalOSPluginOptions = {}): HeadlessPlugin {
  return definePlugin({
    id: 'hospital-os',
    name: '@orbitox/plugin-hospital-os',
    version: '2.4.0',
    displayName: 'Hospital OS Enterprise Plugin',
    category: 'healthcare',
    description: 'Enterprise Hospital Management SaaS with real-world IoT telemetry, surge beds, n8n-style workflows, and role dashboards.',
    author: 'OrbitoX Healthcare Engineering',
    permissions: [
      'patient.read', 'patient.create', 'patient.update', 'patient.delete',
      'medical_record.read', 'medical_record.create',
      'treatment.read', 'treatment.create', 'treatment.update',
      'lab_order.read', 'lab_order.create', 'lab_order.update',
      'bed.read', 'bed.create', 'bed.update', 'bed.manage_equipment',
      'staff.read', 'staff.manage',
      'invoice.read', 'invoice.manage',
      'hospital.break_glass', 'hospital.telemetry_stream'
    ],
    events: {
      emits: [
        'patient.admitted', 'patient.discharged', 'patient.transferred',
        'treatment.ordered', 'treatment.dispensed', 'treatment.administered',
        'vitals.alarm.critical', 'device.status.offline',
        'lab.result.critical', 'lab.result.completed',
        'housekeeping.dispatch', 'equipment.maintenance.overdue',
        'staffing.shortage.alert', 'security.break_glass'
      ],
      subscribes: [
        'iot.telemetry.vitals', 'iot.device.heartbeat',
        'billing.payment.settled', 'user.shift.change'
      ]
    }
  });
}

/**
 * Helper to wire all routes and automated workflows into an Express/OrbitoX app
 */
export function wireHospitalOS(app: any) {
  // 1. Register REST Routes
  registerClinicalRoutes(app);
  registerInfrastructureRoutes(app);
  registerTelemetryRoutes(app);
  registerDashboardRoutes(app);
  registerSecurityRoutes(app);

  // 2. Register n8n Automated Recipes
  for (const recipe of HOSPITAL_RECIPES) {
    HospitalWorkflowRunner.registerRecipe(recipe);
  }

  console.log('✅ [HospitalOS] All 5 Route Sets and 3 Automated Clinical Recipes Wired.');
}
