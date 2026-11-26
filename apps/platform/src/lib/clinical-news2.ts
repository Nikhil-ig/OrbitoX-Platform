export interface News2ScoreResult {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY_CODE_BLUE';
  clinicalAction: string;
  breakdown: {
    spo2Points: number;
    hrPoints: number;
    bpPoints: number;
    tempPoints: number;
    respPoints: number;
  };
}

export interface News2VitalsInput {
  spo2?: number;
  heartRate?: number;
  systolicBp?: number;
  temperature?: number;
  respiratoryRate?: number;
  onOxygen?: boolean;
}

/**
 * Computes National Early Warning Score (NEWS2) deterministically from clinical vital signs.
 * Shared across server MCP tools and HospitalOS UI views.
 */
export function calculateNews2Score(vitals: News2VitalsInput): News2ScoreResult {
  let spo2Points = 0;
  let hrPoints = 0;
  let bpPoints = 0;
  let tempPoints = 0;
  let respPoints = 0;
  const o2Points = vitals.onOxygen ? 2 : 0;

  const spo2 = vitals.spo2 ?? 98;
  if (spo2 <= 91) {
    spo2Points = 3;
  } else if (spo2 <= 93) {
    spo2Points = 2;
  } else if (spo2 <= 95) {
    spo2Points = 1;
  }

  const hr = vitals.heartRate ?? 75;
  if (hr <= 40 || hr >= 131) {
    hrPoints = 3;
  } else if (hr >= 111) {
    hrPoints = 2;
  } else if (hr <= 50 || hr >= 91) {
    hrPoints = 1;
  }

  const bp = vitals.systolicBp ?? 120;
  if (bp <= 90 || bp >= 220) {
    bpPoints = 3;
  } else if (bp <= 100) {
    bpPoints = 2;
  } else if (bp <= 110) {
    bpPoints = 1;
  }

  const temp = vitals.temperature ?? 37.0;
  if (temp <= 35.0) {
    tempPoints = 3;
  } else if (temp >= 39.1) {
    tempPoints = 2;
  } else if (temp <= 36.0 || temp >= 38.1) {
    tempPoints = 1;
  }

  const resp = vitals.respiratoryRate ?? 16;
  if (resp <= 8 || resp >= 25) {
    respPoints = 3;
  } else if (resp >= 21) {
    respPoints = 2;
  } else if (resp <= 11) {
    respPoints = 1;
  }

  const score = spo2Points + hrPoints + bpPoints + tempPoints + respPoints + o2Points;

  let riskLevel: News2ScoreResult['riskLevel'] = 'LOW';
  let clinicalAction = 'Standard ward monitoring (every 12 hours).';

  if (score >= 7 || spo2Points === 3 || hrPoints === 3) {
    riskLevel = 'EMERGENCY_CODE_BLUE';
    clinicalAction = 'Emergency Response / Medical Emergency Team (MET) call. Immediate continuous cardiac telemetry & physician bedside evaluation.';
  } else if (score >= 5) {
    riskLevel = 'HIGH';
    clinicalAction = 'Urgent clinical review by attending physician. Increase monitoring frequency to hourly and prepare ICU step-up.';
  } else if (score >= 1) {
    riskLevel = 'MEDIUM';
    clinicalAction = 'Prompt review by ward nurse. Reassess vitals every 4-6 hours.';
  }

  return {
    score,
    riskLevel,
    clinicalAction,
    breakdown: {
      spo2Points,
      hrPoints,
      bpPoints,
      tempPoints,
      respPoints,
    },
  };
}
