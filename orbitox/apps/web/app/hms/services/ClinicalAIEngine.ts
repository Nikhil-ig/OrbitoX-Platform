/**
 * Clinical Decision Support System (CDSS) & Real-Time Safety Engine
 * OrbitoX Hospital Operating System
 *
 * Implements:
 * 1. Drug-Drug Interaction (DDI) Cross-Matching with severity grading
 * 2. Drug-Allergy Conflict Detection
 * 3. National Early Warning Score (NEWS2) Vitals Acuity Calculation
 * 4. Smart Bed Station & Equipment AI Allocation Recommender
 */

export interface DrugInteraction {
  severity: 'CRITICAL' | 'WARNING' | 'MODERATE' | 'INFO';
  title: string;
  mechanism: string;
  recommendation: string;
}

export interface DrugAllergyConflict {
  allergen: string;
  drug: string;
  severity: 'HIGH_RISK_ANAPHYLAXIS' | 'CROSS_SENSITIVITY';
  description: string;
}

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

export interface BedRecommendation {
  bedId: string;
  bedLabel: string;
  wardName: string;
  matchScore: number;
  reasons: string[];
  equipmentMatched: string[];
}

// ─── 1. DRUG-DRUG INTERACTION (DDI) DATABASE ───
const DDI_RULES: Array<{
  drugs: [string, string];
  severity: 'CRITICAL' | 'WARNING' | 'MODERATE';
  title: string;
  mechanism: string;
  recommendation: string;
}> = [
  {
    drugs: ['metoprolol', 'diltiazem'],
    severity: 'CRITICAL',
    title: 'Severe Bradycardia & AV Heart Block Risk',
    mechanism: 'Additive negative inotropic and dromotropic effects on the sinoatrial and AV nodes.',
    recommendation: 'Continuous telemetry ECG monitoring required. Consider separating administration times or titrating to lower doses.'
  },
  {
    drugs: ['aspirin', 'warfarin'],
    severity: 'CRITICAL',
    title: 'Major Hemorrhage & Gastrointestinal Bleeding Risk',
    mechanism: 'Dual antiplatelet and anticoagulant synergy significantly increases bleeding time.',
    recommendation: 'Monitor INR strictly (target 2.0-3.0). Consider gastroprotective PPI co-prescription.'
  },
  {
    drugs: ['aspirin', 'heparin'],
    severity: 'WARNING',
    title: 'Elevated Bleeding Risk',
    mechanism: 'Combined antiplatelet and antithrombin action.',
    recommendation: 'Monitor aPTT and platelet count every 12 hours.'
  },
  {
    drugs: ['lisinopril', 'spironolactone'],
    severity: 'CRITICAL',
    title: 'Severe Hyperkalemia Risk',
    mechanism: 'ACE inhibitor combined with potassium-sparing diuretic inhibits renal potassium excretion.',
    recommendation: 'Check serum potassium and creatinine within 48 hours of co-administration.'
  },
  {
    drugs: ['ceftriaxone', 'calcium'],
    severity: 'CRITICAL',
    title: 'Fatal Ceftriaxone-Calcium Particulate Precipitation',
    mechanism: 'Precipitates in lungs and kidneys in IV administration lines.',
    recommendation: 'Do not infuse through the same IV line. Flush line thoroughly with 0.9% Normal Saline before administration.'
  },
  {
    drugs: ['ciprofloxacin', 'theophylline'],
    severity: 'WARNING',
    title: 'Theophylline Toxicity (CYP1A2 Inhibition)',
    mechanism: 'Ciprofloxacin inhibits hepatic CYP1A2 metabolism of theophylline.',
    recommendation: 'Reduce theophylline dose by 30-50% and monitor plasma theophylline levels.'
  },
  {
    drugs: ['amiodarone', 'warfarin'],
    severity: 'WARNING',
    title: 'Potentiated Anticoagulation (INR Surge)',
    mechanism: 'Amiodarone inhibits CYP2C9 and CYP3A4 metabolism of S-warfarin.',
    recommendation: 'Reduce warfarin dose by 33-50% when initiating amiodarone.'
  },
  {
    drugs: ['furosemide', 'gentamicin'],
    severity: 'CRITICAL',
    title: 'Ototoxicity & Acute Renal Failure Synergy',
    mechanism: 'Combined cochlear and proximal renal tubule cytotoxicity.',
    recommendation: 'Monitor peak/trough aminoglycoside levels and baseline audiometry.'
  }
];

// ─── 2. DRUG-ALLERGY CROSS-SENSITIVITY DATABASE ───
const ALLERGY_MAP: Record<string, { triggers: string[]; severity: 'HIGH_RISK_ANAPHYLAXIS' | 'CROSS_SENSITIVITY'; desc: string }[]> = {
  penicillin: [
    { triggers: ['penicillin', 'amoxicillin', 'ampicillin', 'piperacillin', 'augmentin'], severity: 'HIGH_RISK_ANAPHYLAXIS', desc: 'Direct beta-lactam core cross-reactivity causing potential anaphylaxis.' },
    { triggers: ['ceftriaxone', 'cefazolin', 'cephalexin', 'cefepime'], severity: 'CROSS_SENSITIVITY', desc: 'Cephalosporin cross-reactivity (~2-5% risk). Administer only under direct clinical observation.' }
  ],
  sulfa: [
    { triggers: ['sulfamethoxazole', 'bactrim', 'septra', 'furosemide', 'celecoxib'], severity: 'HIGH_RISK_ANAPHYLAXIS', desc: 'Sulfonamide arylamine cross-reactivity risk.' }
  ],
  aspirin: [
    { triggers: ['aspirin', 'ibuprofen', 'naproxen', 'ketorolac', 'diclofenac'], severity: 'HIGH_RISK_ANAPHYLAXIS', desc: 'COX-1 inhibition cross-reactivity causing bronchospasm or urticaria.' }
  ],
  nsaid: [
    { triggers: ['aspirin', 'ibuprofen', 'naproxen', 'ketorolac', 'diclofenac', 'indomethacin'], severity: 'HIGH_RISK_ANAPHYLAXIS', desc: 'Non-steroidal anti-inflammatory cross-reactivity.' }
  ],
  iodine: [
    { triggers: ['amiodarone', 'contrast', 'iodinated', 'betadine'], severity: 'CROSS_SENSITIVITY', desc: 'Potential iodine-related organification sensitivity.' }
  ]
};

export class ClinicalAIEngine {
  /**
   * Check for Drug-Drug Interactions (DDI) against a list of active medications and a candidate drug
   */
  static checkDrugInteractions(candidateDrug: string, activeDrugs: string[]): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    const candNorm = candidateDrug.toLowerCase().trim();

    for (const active of activeDrugs) {
      const activeNorm = active.toLowerCase().trim();
      if (!activeNorm || activeNorm === candNorm) continue;

      for (const rule of DDI_RULES) {
        const [d1, d2] = rule.drugs;
        const matchesCandidate = candNorm.includes(d1) || candNorm.includes(d2);
        const matchesActive = activeNorm.includes(d1) || activeNorm.includes(d2);

        if (matchesCandidate && matchesActive) {
          // Avoid duplicate triggers
          if (!interactions.some(i => i.title === rule.title)) {
            interactions.push({
              severity: rule.severity,
              title: rule.title,
              mechanism: rule.mechanism,
              recommendation: rule.recommendation
            });
          }
        }
      }
    }

    return interactions;
  }

  /**
   * Check for Drug-Allergy Conflicts against a patient's documented allergies
   */
  static checkAllergyConflicts(candidateDrug: string, patientAllergies: string[] | string): DrugAllergyConflict[] {
    const conflicts: DrugAllergyConflict[] = [];
    const candNorm = candidateDrug.toLowerCase().trim();

    const allergiesList = Array.isArray(patientAllergies)
      ? patientAllergies
      : (typeof patientAllergies === 'string' ? patientAllergies.split(',').map(s => s.trim()) : []);

    for (const allergy of allergiesList) {
      const allergyNorm = allergy.toLowerCase().trim();
      if (!allergyNorm || allergyNorm.includes('nkda') || allergyNorm.includes('none') || allergyNorm.includes('no known')) {
        continue;
      }

      // Check against ALLERGY_MAP
      for (const [allergenKey, rules] of Object.entries(ALLERGY_MAP)) {
        if (allergyNorm.includes(allergenKey)) {
          for (const rule of rules) {
            for (const trigger of rule.triggers) {
              if (candNorm.includes(trigger)) {
                conflicts.push({
                  allergen: allergy,
                  drug: candidateDrug,
                  severity: rule.severity,
                  description: rule.desc
                });
                break;
              }
            }
          }
        }
      }

      // Direct word match
      if (candNorm.includes(allergyNorm) && !conflicts.some(c => c.allergen === allergy)) {
        conflicts.push({
          allergen: allergy,
          drug: candidateDrug,
          severity: 'HIGH_RISK_ANAPHYLAXIS',
          description: `Direct match with documented allergy: '${allergy}'. High risk of immediate adverse reaction.`
        });
      }
    }

    return conflicts;
  }

  /**
   * Compute National Early Warning Score (NEWS2) from bedside vital signs
   */
  static calculateNews2(vitals: {
    spo2?: number;
    heartRate?: number;
    systolicBp?: number;
    temperature?: number;
    respiratoryRate?: number;
    onOxygen?: boolean;
  }): News2ScoreResult {
    let score = 0;
    let spo2Points = 0;
    let hrPoints = 0;
    let bpPoints = 0;
    let tempPoints = 0;
    let respPoints = 0;
    const o2Points = vitals.onOxygen ? 2 : 0;

    // 1. SpO2 Score
    const spo2 = vitals.spo2 ?? 98;
    if (spo2 <= 91) {
      spo2Points = 3;
    } else if (spo2 >= 92 && spo2 <= 93) {
      spo2Points = 2;
    } else if (spo2 >= 94 && spo2 <= 95) {
      spo2Points = 1;
    }

    // 2. Heart Rate Score
    const hr = vitals.heartRate ?? 75;
    if (hr <= 40 || hr >= 131) {
      hrPoints = 3;
    } else if (hr >= 111 && hr <= 130) {
      hrPoints = 2;
    } else if ((hr >= 41 && hr <= 50) || (hr >= 91 && hr <= 110)) {
      hrPoints = 1;
    }

    // 3. Systolic Blood Pressure Score
    const bp = vitals.systolicBp ?? 120;
    if (bp <= 90 || bp >= 220) {
      bpPoints = 3;
    } else if (bp >= 91 && bp <= 100) {
      bpPoints = 2;
    } else if (bp >= 101 && bp <= 110) {
      bpPoints = 1;
    }

    // 4. Temperature Score
    const temp = vitals.temperature ?? 37.0;
    if (temp <= 35.0) {
      tempPoints = 3;
    } else if (temp >= 39.1) {
      tempPoints = 2;
    } else if ((temp >= 35.1 && temp <= 36.0) || (temp >= 38.1 && temp <= 39.0)) {
      tempPoints = 1;
    }

    // 5. Respiratory Rate Score
    const resp = vitals.respiratoryRate ?? 16;
    if (resp <= 8 || resp >= 25) {
      respPoints = 3;
    } else if (resp >= 21 && resp <= 24) {
      respPoints = 2;
    } else if (resp >= 9 && resp <= 11) {
      respPoints = 1;
    }

    score = spo2Points + hrPoints + bpPoints + tempPoints + respPoints + o2Points;

    let riskLevel: News2ScoreResult['riskLevel'] = 'LOW';
    let clinicalAction = 'Standard ward monitoring (every 12 hours).';

    if (score >= 7 || spo2Points === 3 || hrPoints === 3) {
      riskLevel = 'EMERGENCY_CODE_BLUE';
      clinicalAction = '🚨 Emergency Response / Medical Emergency Team (MET) call. Immediate continuous cardiac telemetry & physician bedside evaluation.';
    } else if (score >= 5) {
      riskLevel = 'HIGH';
      clinicalAction = '⚠️ Urgent clinical review by attending physician. Increase monitoring frequency to hourly. Prepare ICU step-up.';
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
        respPoints
      }
    };
  }

  /**
   * Recommend the optimal bed station based on patient diagnosis, category, and equipment
   */
  static recommendBed(
    patient: { diagnosis: string; category?: string; triageLevel?: number },
    availableBeds: Array<{
      id: string;
      label: string;
      type: string;
      wardId?: string;
      wardName?: string;
      status: string;
      attachedEquipment?: Array<{ deviceType: string; model: string }>;
    }>
  ): BedRecommendation[] {
    const diagNorm = patient.diagnosis.toLowerCase();
    const isCritical = diagNorm.includes('stemi') || diagNorm.includes('cardiac') || diagNorm.includes('arrest') || diagNorm.includes('icu') || diagNorm.includes('infarction') || (patient.triageLevel && patient.triageLevel <= 2);
    const isPediatric = diagNorm.includes('peds') || diagNorm.includes('child') || diagNorm.includes('infant') || diagNorm.includes('neonatal');
    const isSurgery = diagNorm.includes('surgery') || diagNorm.includes('post-op') || diagNorm.includes('appendectomy') || diagNorm.includes('ortho');

    const ranked = availableBeds
      .filter(b => b.status === 'available')
      .map(bed => {
        let matchScore = 50; // base
        const reasons: string[] = [];
        const equipmentMatched: string[] = [];

        const bedType = bed.type.toLowerCase();
        const wardNorm = (bed.wardName || '').toLowerCase();

        // 1. Acuity & Bed Type Matching
        if (isCritical) {
          if (bedType === 'icu' || bedType === 'ccu' || wardNorm.includes('icu')) {
            matchScore += 40;
            reasons.push('High-acuity ICU/CCU station optimal for critical hemodynamic stability.');
          } else {
            matchScore -= 20;
          }
        } else if (isPediatric) {
          if (bedType === 'picu' || bedType === 'nicu' || wardNorm.includes('peds')) {
            matchScore += 40;
            reasons.push('Dedicated pediatric ward with specialized child monitoring.');
          }
        } else if (isSurgery) {
          if (wardNorm.includes('surg') || bedType === 'pacu') {
            matchScore += 35;
            reasons.push('Post-surgical suite with immediate recovery access.');
          }
        } else {
          if (bedType === 'general' || bedType === 'standard') {
            matchScore += 30;
            reasons.push('Standard general ward appropriate for clinical observation.');
          }
        }

        // 2. Equipment Matching
        if (bed.attachedEquipment && bed.attachedEquipment.length > 0) {
          for (const eq of bed.attachedEquipment) {
            equipmentMatched.push(eq.model || eq.deviceType);
            if (eq.deviceType.includes('vitals') || eq.deviceType.includes('monitor')) {
              matchScore += 10;
              reasons.push('Equipped with Continuous Multi-Parameter Vitals Monitor.');
            }
            if (isCritical && (eq.deviceType.includes('ventilator') || eq.model.includes('Hamilton') || eq.model.includes('PB980'))) {
              matchScore += 15;
              reasons.push('Equipped with Active Mechanical Ventilator for airway security.');
            }
          }
        }

        return {
          bedId: bed.id,
          bedLabel: bed.label,
          wardName: bed.wardName || 'General Specialty Ward',
          matchScore: Math.min(100, Math.max(10, matchScore)),
          reasons,
          equipmentMatched
        };
      });

    return ranked.sort((a, b) => b.matchScore - a.matchScore);
  }

  // ─── 5. SBAR CLINICAL SHIFT HANDOVER GENERATOR ───
  static generateSbarSummary(params: {
    patient: {
      name: string;
      age: number;
      gender: string;
      diagnosis: string;
      bedLabel?: string;
      triageLevel?: number;
      allergies?: string[] | string;
      clinicalNotes?: string;
      attendingDoctorId?: string;
    };
    vitals?: { spo2?: number; hr?: number; bp?: string; temp?: number; resp?: number };
    activeMeds?: string[];
    recentLabs?: Array<{ testType: string; numericValue?: number; flag?: string; isCritical?: boolean }>;
  }): {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
    formattedText: string;
  } {
    const p = params.patient;
    const v = params.vitals || { spo2: 98, hr: 76, bp: '120/80', temp: 37.0, resp: 16 };
    const meds = params.activeMeds && params.activeMeds.length > 0 ? params.activeMeds.join(', ') : 'None prescribed';
    const criticalLabs = (params.recentLabs || []).filter(l => l.isCritical);

    const situation = `Patient ${p.name}, ${p.age}yo ${p.gender}, currently in ${p.bedLabel || 'Inpatient Bed'} with primary diagnosis of ${p.diagnosis}. (Triage Acuity: Level ${p.triageLevel || 3})`;
    
    const background = `Allergies: ${Array.isArray(p.allergies) ? p.allergies.join(', ') : (p.allergies || 'NKDA')}. Attending: ${p.attendingDoctorId || 'On-Call Physician'}. Active Medications: ${meds}. Notes: ${p.clinicalNotes || 'Stable inpatient trajectory'}.`;
    
    const assessment = `Vitals: SpO2 ${v.spo2}%, HR ${v.hr} bpm, BP ${v.bp} mmHg, Temp ${v.temp}°C, RR ${v.resp}/min. ${criticalLabs.length > 0 ? `🚨 CRITICAL LAB ALERT: ${criticalLabs.map(c => `${c.testType} (${c.numericValue})`).join(', ')}.` : 'No critical panic lab flags active.'}`;
    
    const recommendation = `Continue telemetry monitoring. Monitor vitals q4h. Re-evaluate post-medication clinical response during morning rounds. Handover accepted.`;

    const formattedText = `=== SBAR CLINICAL HANDOVER ===\n[SITUATION]\n${situation}\n\n[BACKGROUND]\n${background}\n\n[ASSESSMENT]\n${assessment}\n\n[RECOMMENDATION]\n${recommendation}\n==============================`;

    return { situation, background, assessment, recommendation, formattedText };
  }

  // ─── 6. ICD-10 CLINICAL DIAGNOSIS LOOKUP & SUGGESTION ───
  static suggestIcd10Diagnosis(query: string): Array<{ code: string; name: string; category: string }> {
    const ICD10_DB = [
      { code: 'I21.9', name: 'Acute myocardial infarction, unspecified (STEMI/NSTEMI)', category: 'Cardiology' },
      { code: 'I50.9', name: 'Heart failure, unspecified (Congestive Heart Failure)', category: 'Cardiology' },
      { code: 'I10', name: 'Essential (primary) hypertension', category: 'Cardiology' },
      { code: 'I48.91', name: 'Unspecified atrial fibrillation (AFib with RVR)', category: 'Cardiology' },
      { code: 'J44.1', name: 'Chronic obstructive pulmonary disease with (acute) exacerbation (COPD)', category: 'Pulmonology' },
      { code: 'J18.9', name: 'Pneumonia, unspecified organism (Community-Acquired Pneumonia)', category: 'Pulmonology' },
      { code: 'J45.901', name: 'Unspecified asthma with (acute) exacerbation', category: 'Pulmonology' },
      { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications', category: 'Endocrinology' },
      { code: 'E11.65', name: 'Type 2 diabetes mellitus with hyperglycemia / DKA', category: 'Endocrinology' },
      { code: 'A41.9', name: 'Sepsis, unspecified organism (Severe Sepsis Protocol)', category: 'Infectious Disease' },
      { code: 'N17.9', name: 'Acute kidney failure, unspecified (AKI)', category: 'Nephrology' },
      { code: 'K35.80', name: 'Unspecified acute appendicitis', category: 'Gastroenterology / Surgery' },
      { code: 'S06.9X0A', name: 'Unspecified intracranial injury (Traumatic Brain Injury)', category: 'Neurology / Trauma' },
      { code: 'R07.9', name: 'Chest pain, unspecified (Cardiac Workup Required)', category: 'Emergency' },
      { code: 'R06.02', name: 'Shortness of breath (Dyspnea on exertion)', category: 'Emergency' }
    ];

    if (!query || !query.trim()) return ICD10_DB.slice(0, 6);
    const q = query.toLowerCase().trim();
    return ICD10_DB.filter(item =>
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }

  // ─── 7. DISCHARGE CLINICAL SUMMARY AUTO-COMPOSER ───
  static generateDischargeSummary(params: {
    patient: { name: string; age: number; gender: string; diagnosis: string; admittedAt?: string };
    stayDays: number;
    medications: Array<{ drugName: string; dosage: string }>;
    dischargeCondition?: 'Improved' | 'Stable' | 'Transferred' | 'AMA';
  }): string {
    const p = params.patient;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const medList = params.medications.length > 0
      ? params.medications.map(m => `• ${m.drugName} (${m.dosage}) - Take as directed`).join('\n')
      : '• No take-home prescription medications prescribed.';

    return `══════════════════════════════════════════════════════════
APOLLO HEALTHCARE SYSTEM — INPATIENT DISCHARGE SUMMARY
══════════════════════════════════════════════════════════
Patient Name:        ${p.name}
Age / Gender:        ${p.age} years / ${p.gender}
Admit Date:          ${p.admittedAt ? new Date(p.admittedAt).toLocaleDateString() : 'N/A'}
Discharge Date:      ${dateStr}
Length of Stay:      ${params.stayDays} Day${params.stayDays > 1 ? 's' : ''}
Discharge Condition: ${params.dischargeCondition || 'Stable & Clinically Improved'}

PRIMARY DIAGNOSIS:
${p.diagnosis}

HOSPITAL COURSE & CLINICAL SUMMARY:
Patient was admitted to inpatient care for clinical stabilization and management. Continuous telemetry monitoring, diagnostic laboratory evaluations, and targeted medication regimens were administered with positive therapeutic outcome. Vitals stable on discharge.

TAKE-HOME DISCHARGE MEDICATIONS:
${medList}

FOLLOW-UP CARE & INSTRUCTIONS:
1. Outpatient follow-up consultation with primary physician in 7 to 10 days.
2. Return immediately to Emergency Department if experiencing shortness of breath, chest pressure, fever > 38.5°C, or severe pain.
3. Maintain low-sodium, heart-healthy hydration and diet.

Attending Physician Sign-Off: Dr. Stephen Strange, MD (Signed Electronically)
══════════════════════════════════════════════════════════`;
  }
}

