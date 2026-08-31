import { orbitox } from '@orbitox/runtime';

export class DashboardService {
  static async getDashboardForRole(role: string, contextId: string) {
    const allBeds = await orbitox.db.findMany('bed', { contextId });
    const allPatients = await orbitox.db.findMany('patient', { filter: { status: 'admitted' }, contextId });

    const totalBeds = allBeds.data.length || 1;
    const occupiedCount = allBeds.data.filter((b: any) => b.status === 'occupied').length;
    const occupancyRate = Math.round((occupiedCount / totalBeds) * 100);

    switch (role) {
      case 'super_admin':
      case 'facility_director':
        return {
          role,
          kpis: {
            occupancyRate,
            totalBeds: allBeds.data.length,
            occupiedBeds: occupiedCount,
            admittedPatients: allPatients.data.length,
            criticalAlarmsCount: 0
          },
          widgets: ['network_occupancy', 'branch_revenue', 'staff_on_duty', 'audit_log_feed']
        };

      case 'attending_doctor':
      case 'department_head':
        return {
          role,
          patients: allPatients.data,
          widgets: ['my_patient_list', 'bedside_vitals_panel', 'lab_results_feed', 'quick_prescribe']
        };

      case 'head_nurse':
      case 'staff_nurse':
        return {
          role,
          wardBedCensus: allBeds.data.map((b: any) => ({ id: b.id, label: b.label, status: b.status, type: b.type })),
          nurseToPatientRatio: '1:2 (ICU Standard)',
          widgets: ['ward_bed_matrix', 'medication_round_queue', 'vitals_alarm_panel', 'housekeeping_tracker']
        };

      case 'pharmacist':
        return {
          role,
          widgets: ['dispensing_queue', 'drug_interaction_checker', 'controlled_substance_log']
        };

      case 'biomed_engineer':
        return {
          role,
          widgets: ['equipment_status_grid', 'maintenance_calendar', 'calibration_overdue_alerts']
        };

      default:
        return {
          role,
          widgets: ['generic_overview']
        };
    }
  }
}
