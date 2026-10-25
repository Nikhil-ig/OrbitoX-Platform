import { AttachedMedicalDevice, MedicalDeviceType } from './types';

export interface HardwareCatalogSpec {
  brand: string;
  model: string;
  deviceType: MedicalDeviceType;
  defaultTelemetryTopic: string;
  isICUStandard: boolean;
  calibrationIntervalMonths: number;
}

export const REAL_WORLD_EQUIPMENT_CATALOG: Record<string, HardwareCatalogSpec> = {
  PHILIPS_MX800: {
    brand: 'Philips',
    model: 'IntelliVue MX800',
    deviceType: 'multi_para_vitals_monitor',
    defaultTelemetryTopic: 'telemetry/vitals/philips-mx800',
    isICUStandard: true,
    calibrationIntervalMonths: 6
  },
  GE_CARESCAPE_B650: {
    brand: 'GE Healthcare',
    model: 'CARESCAPE B650',
    deviceType: 'multi_para_vitals_monitor',
    defaultTelemetryTopic: 'telemetry/vitals/ge-b650',
    isICUStandard: true,
    calibrationIntervalMonths: 6
  },
  HAMILTON_G5: {
    brand: 'Hamilton Medical',
    model: 'Hamilton-G5',
    deviceType: 'mechanical_ventilator',
    defaultTelemetryTopic: 'telemetry/respiratory/hamilton-g5',
    isICUStandard: true,
    calibrationIntervalMonths: 3
  },
  DRAEGER_EVITA_V500: {
    brand: 'Dräger',
    model: 'Evita V500',
    deviceType: 'mechanical_ventilator',
    defaultTelemetryTopic: 'telemetry/respiratory/draeger-v500',
    isICUStandard: true,
    calibrationIntervalMonths: 3
  },
  BBRAUN_INFUSOMAT: {
    brand: 'B.Braun',
    model: 'Infusomat Space',
    deviceType: 'infusion_syringe_pump',
    defaultTelemetryTopic: 'telemetry/infusion/bbraun-space',
    isICUStandard: true,
    calibrationIntervalMonths: 12
  },
  ZOLL_R_SERIES: {
    brand: 'ZOLL Medical',
    model: 'R Series Plus',
    deviceType: 'defibrillator_crash_cart',
    defaultTelemetryTopic: 'telemetry/cardiac/zoll-r-series',
    isICUStandard: true,
    calibrationIntervalMonths: 6
  },
  FRESENIUS_5008S: {
    brand: 'Fresenius Medical Care',
    model: '5008S CorDiax',
    deviceType: 'dialysis_unit',
    defaultTelemetryTopic: 'telemetry/renal/fresenius-5008s',
    isICUStandard: false,
    calibrationIntervalMonths: 6
  },
  MASIMO_RAD97: {
    brand: 'Masimo',
    model: 'Rad-97',
    deviceType: 'pulse_oximeter_standalone',
    defaultTelemetryTopic: 'telemetry/oximetry/masimo-rad97',
    isICUStandard: false,
    calibrationIntervalMonths: 12
  },
  MAQUET_CARDIOHELP: {
    brand: 'Getinge / Maquet',
    model: 'Cardiohelp ECMO',
    deviceType: 'ecmo_circuit',
    defaultTelemetryTopic: 'telemetry/perfusion/cardiohelp',
    isICUStandard: true,
    calibrationIntervalMonths: 3
  }
};

export function instantiateMedicalDevice(specKey: keyof typeof REAL_WORLD_EQUIPMENT_CATALOG, serialNumber: string): AttachedMedicalDevice {
  const spec = REAL_WORLD_EQUIPMENT_CATALOG[specKey];
  const now = new Date();
  const nextDue = new Date(now);
  nextDue.setMonth(now.getMonth() + spec.calibrationIntervalMonths);

  return {
    deviceId: `dev_${specKey.toLowerCase()}_${serialNumber.slice(-4)}`,
    deviceType: spec.deviceType,
    manufacturer: spec.brand,
    model: spec.model,
    serialNumber,
    status: 'online',
    lastCalibrationDate: now.toISOString().split('T')[0],
    nextMaintenanceDue: nextDue.toISOString().split('T')[0],
    telemetryTopic: `${spec.defaultTelemetryTopic}/${serialNumber}`
  };
}
