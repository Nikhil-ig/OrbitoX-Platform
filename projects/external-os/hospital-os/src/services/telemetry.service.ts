import { orbitox } from '@orbitox/runtime';
import { VitalsSnapshot } from '../domain/types';

export class TelemetryService {
  static async processVitalsStream(bedId: string, vitals: VitalsSnapshot, contextId?: string) {
    let bed: any = null;
    if (contextId) {
      bed = await orbitox.db.findById<any>('bed', bedId, contextId);
    }
    if (!bed) {
      bed = await orbitox.db.findById<any>('bed', bedId);
    }
    if (!bed) {
      const all = await orbitox.db.findMany<any>('bed');
      bed = all.data.find((b: any) => b.id === bedId);
    }

    if (!bed) throw new Error(`Bed '${bedId}' not found for telemetry streaming.`);

    const targetContextId = bed.contextId || contextId || 'default-context';

    const thresholds = bed.telemetryThresholds || {
      minSpO2: 90,
      maxHeartRate: 130,
      minHeartRate: 45,
      maxTemperature: 39.5,
      minTemperature: 35.0,
      maxRespiratoryRate: 30
    };

    const alarms: string[] = [];

    if (vitals.spo2 < thresholds.minSpO2) {
      alarms.push(`🚨 SpO2 CRITICAL: ${vitals.spo2}% (Threshold: < ${thresholds.minSpO2}%)`);
    }
    if (vitals.heartRate > thresholds.maxHeartRate) {
      alarms.push(`🚨 TACHYCARDIA: ${vitals.heartRate} bpm (Threshold: > ${thresholds.maxHeartRate} bpm)`);
    }
    if (vitals.heartRate < thresholds.minHeartRate) {
      alarms.push(`🚨 BRADYCARDIA: ${vitals.heartRate} bpm (Threshold: < ${thresholds.minHeartRate} bpm)`);
    }

    if (alarms.length > 0) {
      console.log(`🚨 [TELEMETRY ALARM] Bed ${bed.label} breached vital thresholds! Alarms:`, alarms);

      // Emit high-priority event for n8n workflows
      await orbitox.events.emit('vitals.alarm.critical', {
        bedId,
        bedLabel: bed.label,
        alarms,
        vitals,
        severity: vitals.spo2 < 85 ? 'CODE_BLUE' : 'HIGH_PRIORITY',
        timestamp: new Date().toISOString()
      }, targetContextId);

      return { status: 'alarm', alarms, vitals };
    }

    return { status: 'normal', vitals };
  }
}
