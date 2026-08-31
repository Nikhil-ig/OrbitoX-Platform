import { TelemetryThresholds, VitalsSnapshot } from '../domain/types';

export interface TriggerDefinition<T = any> {
  id: string;
  name: string;
  eventName: string;
  evaluate?: (payload: T, config?: any) => boolean;
}

export const HospitalTriggers = {
  onPatientAdmitted: {
    id: 'hospital.trigger.patientAdmitted',
    name: 'On Patient Admitted',
    eventName: 'patient.admitted'
  },

  onVitalsBreached: (thresholds?: Partial<TelemetryThresholds>): TriggerDefinition<{ bedId: string; vitals: VitalsSnapshot }> => ({
    id: 'hospital.trigger.vitalsBreached',
    name: 'On Vitals Threshold Breached',
    eventName: 'vitals.alarm.critical',
    evaluate: (payload) => {
      const minSpO2 = thresholds?.minSpO2 ?? 90;
      const maxHR = thresholds?.maxHeartRate ?? 130;
      return payload.vitals.spo2 < minSpO2 || payload.vitals.heartRate > maxHR;
    }
  }),

  onTreatmentOrdered: {
    id: 'hospital.trigger.treatmentOrdered',
    name: 'On Medication/Treatment Ordered',
    eventName: 'treatment.ordered'
  },

  onLabResultCompleted: (options?: { criticalOnly?: boolean }): TriggerDefinition<{ isCritical: boolean; testType: string }> => ({
    id: 'hospital.trigger.labResultCompleted',
    name: 'On Lab Result Completed',
    eventName: 'lab.result.completed',
    evaluate: (payload) => {
      if (options?.criticalOnly) return payload.isCritical === true;
      return true;
    }
  }),

  onPatientDischarged: {
    id: 'hospital.trigger.patientDischarged',
    name: 'On Patient Discharged',
    eventName: 'patient.discharged'
  },

  onDeviceOffline: {
    id: 'hospital.trigger.deviceOffline',
    name: 'On Medical Equipment Heartbeat Lost',
    eventName: 'device.status.offline'
  },

  onBreakGlassActivated: {
    id: 'hospital.trigger.breakGlassOverride',
    name: 'On Break-Glass Emergency Override',
    eventName: 'security.break_glass'
  }
};
