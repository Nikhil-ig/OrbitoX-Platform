import { HospitalTriggers } from './triggers';
import { HospitalActions } from './actions';

export interface WorkflowRecipe {
  id: string;
  name: string;
  description: string;
  trigger: any;
  actions: any[];
}

export const HOSPITAL_RECIPES: WorkflowRecipe[] = [
  {
    id: 'recipe-code-blue-escalation',
    name: 'Critical Vitals Code Blue Escalation',
    description: 'When bed telemetry drops below critical thresholds, blast Code Blue alarms, page on-call doctor, and log in audit ledger.',
    trigger: HospitalTriggers.onVitalsBreached({ minSpO2: 90, maxHeartRate: 130 }),
    actions: [
      HospitalActions.dispatchCodeBlue({ team: 'cardiac_resuscitation', severity: 'CODE_BLUE' }),
      HospitalActions.pageDoctor({ role: 'attending_doctor', urgent: true }),
      HospitalActions.auditVaultLog()
    ]
  },
  {
    id: 'recipe-prescription-safety-pipeline',
    name: 'Doctor Prescription to Pharmacy Dispensing Flow',
    description: 'When medication is prescribed, push order to pharmacy queue, notify bedside nurse, and log.',
    trigger: HospitalTriggers.onTreatmentOrdered,
    actions: [
      HospitalActions.queuePharmacy({ priority: 'routine' }),
      HospitalActions.auditVaultLog()
    ]
  },
  {
    id: 'recipe-patient-discharge-turnover',
    name: 'Zero-Friction Patient Discharge & Turnover',
    description: 'When doctor signs discharge, auto-generate invoice, dispatch housekeeping sanitization, and clean up temporary surge bed if applicable.',
    trigger: HospitalTriggers.onPatientDischarged,
    actions: [
      HospitalActions.generateInvoice(),
      HospitalActions.dispatchHousekeeping({ priority: 'high' }),
      HospitalActions.destroySurgeBed(),
      HospitalActions.auditVaultLog()
    ]
  }
];
