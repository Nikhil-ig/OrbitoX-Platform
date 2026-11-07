import { orbitox } from '@orbitox/runtime';

export interface HierarchyNode {
  id: string;
  name: string;
  type: string;
  parentId?: string;
  children?: HierarchyNode[];
  meta?: Record<string, any>;
}

export class HierarchyService {
  private static registeredNodes: Map<string, HierarchyNode> = new Map();

  static async bootstrapStandardHospital(params: {
    orgId: string;
    orgName: string;
    branchId: string;
    branchName: string;
  }) {
    console.log(`🏥 [Hierarchy] Bootstrapping Multi-Tier Context Tree for ${params.branchName}...`);

    // Tier 1: Global Healthcare Organization
    const org = await orbitox.tenant(params.orgId, params.orgName).type('organisation').create();
    this.registeredNodes.set(org.id, { id: org.id, name: params.orgName, type: 'organisation' });

    // Tier 2: Hospital Branch
    const branch = await orbitox.tenant(params.branchId, params.branchName).type('tenant').parent(org.id).create();
    this.registeredNodes.set(branch.id, { id: branch.id, name: params.branchName, type: 'tenant', parentId: org.id });

    // Tier 3: Departments & Tier 4: Wards
    // 1. Cardiology
    const cardiology = await orbitox.tenant(`${params.branchId}-cardio`, 'Cardiology Department').type('department').parent(branch.id).create();
    this.registeredNodes.set(cardiology.id, { id: cardiology.id, name: 'Cardiology Department', type: 'department', parentId: branch.id });

    const cardioICU = await orbitox.tenant(`${params.branchId}-cardio-icu`, 'Cardiac ICU Ward').type('ward').parent(cardiology.id).create();
    this.registeredNodes.set(cardioICU.id, { id: cardioICU.id, name: 'Cardiac ICU Ward', type: 'ward', parentId: cardiology.id });

    const cardioCCU = await orbitox.tenant(`${params.branchId}-cardio-ccu`, 'Coronary Care Unit (CCU)').type('ward').parent(cardiology.id).create();
    this.registeredNodes.set(cardioCCU.id, { id: cardioCCU.id, name: 'Coronary Care Unit (CCU)', type: 'ward', parentId: cardiology.id });

    // 2. Emergency Medicine
    const emergency = await orbitox.tenant(`${params.branchId}-er`, 'Emergency Department').type('department').parent(branch.id).create();
    this.registeredNodes.set(emergency.id, { id: emergency.id, name: 'Emergency Department', type: 'department', parentId: branch.id });

    const erTrauma = await orbitox.tenant(`${params.branchId}-er-trauma`, 'Trauma Resuscitation Ward').type('ward').parent(emergency.id).create();
    this.registeredNodes.set(erTrauma.id, { id: erTrauma.id, name: 'Trauma Resuscitation Ward', type: 'ward', parentId: emergency.id });

    const erObs = await orbitox.tenant(`${params.branchId}-er-obs`, 'ER Observation Ward').type('ward').parent(emergency.id).create();
    this.registeredNodes.set(erObs.id, { id: erObs.id, name: 'ER Observation Ward', type: 'ward', parentId: emergency.id });

    // 3. Neurology & Neurosurgery
    const neurology = await orbitox.tenant(`${params.branchId}-neuro`, 'Neurology & Stroke Department').type('department').parent(branch.id).create();
    this.registeredNodes.set(neurology.id, { id: neurology.id, name: 'Neurology & Stroke Department', type: 'department', parentId: branch.id });

    const neuroICU = await orbitox.tenant(`${params.branchId}-neuro-icu`, 'Neuro ICU & Stroke Unit').type('ward').parent(neurology.id).create();
    this.registeredNodes.set(neuroICU.id, { id: neuroICU.id, name: 'Neuro ICU & Stroke Unit', type: 'ward', parentId: neurology.id });

    // 4. Pediatrics & Neonatology
    const pediatrics = await orbitox.tenant(`${params.branchId}-peds`, 'Pediatrics & Neonatology').type('department').parent(branch.id).create();
    this.registeredNodes.set(pediatrics.id, { id: pediatrics.id, name: 'Pediatrics & Neonatology', type: 'department', parentId: branch.id });

    const pedsPICU = await orbitox.tenant(`${params.branchId}-peds-picu`, 'Pediatric ICU (PICU)').type('ward').parent(pediatrics.id).create();
    this.registeredNodes.set(pedsPICU.id, { id: pedsPICU.id, name: 'Pediatric ICU (PICU)', type: 'ward', parentId: pediatrics.id });

    const pedsNICU = await orbitox.tenant(`${params.branchId}-peds-nicu`, 'Neonatal ICU (NICU)').type('ward').parent(pediatrics.id).create();
    this.registeredNodes.set(pedsNICU.id, { id: pedsNICU.id, name: 'Neonatal ICU (NICU)', type: 'ward', parentId: pediatrics.id });

    // 5. General & Orthopedic Surgery
    const surgery = await orbitox.tenant(`${params.branchId}-surgery`, 'Surgical Services & PACU').type('department').parent(branch.id).create();
    this.registeredNodes.set(surgery.id, { id: surgery.id, name: 'Surgical Services & PACU', type: 'department', parentId: branch.id });

    const surgPACU = await orbitox.tenant(`${params.branchId}-surg-pacu`, 'Post-Anesthesia Care (PACU)').type('ward').parent(surgery.id).create();
    this.registeredNodes.set(surgPACU.id, { id: surgPACU.id, name: 'Post-Anesthesia Care (PACU)', type: 'ward', parentId: surgery.id });

    // 6. Field Surge & Overflow
    const surgeDept = await orbitox.tenant(`${params.branchId}-surge`, 'Disaster & Surge Medicine').type('department').parent(branch.id).create();
    this.registeredNodes.set(surgeDept.id, { id: surgeDept.id, name: 'Disaster & Surge Medicine', type: 'department', parentId: branch.id });

    const surgeWard = await orbitox.tenant(`${params.branchId}-surge-ward`, 'Field Surge Overflow Ward').type('ward').parent(surgeDept.id).create();
    this.registeredNodes.set(surgeWard.id, { id: surgeWard.id, name: 'Field Surge Overflow Ward', type: 'ward', parentId: surgeDept.id });

    // 7. Pharmacy & Pathology
    const pharmacy = await orbitox.tenant(`${params.branchId}-pharmacy`, 'Central Pharmacy').type('department').parent(branch.id).create();
    this.registeredNodes.set(pharmacy.id, { id: pharmacy.id, name: 'Central Pharmacy', type: 'department', parentId: branch.id });

    const pathology = await orbitox.tenant(`${params.branchId}-lab`, 'Pathology & Diagnostic Lab').type('department').parent(branch.id).create();
    this.registeredNodes.set(pathology.id, { id: pathology.id, name: 'Pathology & Diagnostic Lab', type: 'department', parentId: branch.id });

    // Tier 5: Room 101
    const room101 = await orbitox.tenant(`${params.branchId}-room-101`, 'ICU Room 101').type('room').parent(cardioICU.id).create();
    this.registeredNodes.set(room101.id, { id: room101.id, name: 'ICU Room 101', type: 'room', parentId: cardioICU.id });

    // Tier 6: Beds
    const bed101A = await orbitox.tenant(`${params.branchId}-bed-101-a`, 'Bed 101-A (ICU Station)').type('bed').parent(room101.id).create();
    this.registeredNodes.set(bed101A.id, {
      id: bed101A.id,
      name: 'Bed 101-A (ICU Station)',
      type: 'bed',
      parentId: room101.id,
      meta: { bedType: 'ICU Critical Care', rate: 1500, status: 'occupied', devices: ['Philips IntelliVue MX800', 'Hamilton-G5'] }
    });

    const bed101B = await orbitox.tenant(`${params.branchId}-bed-101-b`, 'Bed 101-B (ICU Station)').type('bed').parent(room101.id).create();
    this.registeredNodes.set(bed101B.id, {
      id: bed101B.id,
      name: 'Bed 101-B (ICU Station)',
      type: 'bed',
      parentId: room101.id,
      meta: { bedType: 'ICU Critical Care', rate: 1500, status: 'available', devices: ['GE CARESCAPE B650'] }
    });

    console.log(`✅ [Hierarchy] 6-Tier Context Tree initialized successfully for ${params.branchName}`);
    return {
      org,
      branch,
      departments: { cardiology, emergency, neurology, pediatrics, surgery, surgeDept, pharmacy, pathology },
      wards: { cardioICU, cardioCCU, erTrauma, erObs, neuroICU, pedsPICU, pedsNICU, surgPACU, surgeWard },
      rooms: { room101 },
      beds: { bed101A, bed101B }
    };
  }

  static async createContext(params: { id?: string; name: string; type: string; parentId?: string; meta?: any }) {
    const generatedId = params.id || `ctx_${params.type}_${Date.now().toString(36)}`;
    let builder = orbitox.tenant(generatedId, params.name).type(params.type as any);
    if (params.parentId) {
      builder = builder.parent(params.parentId);
    }
    const created = await builder.create();

    const node: HierarchyNode = {
      id: created.id,
      name: params.name,
      type: params.type,
      parentId: params.parentId,
      meta: params.meta
    };
    this.registeredNodes.set(node.id, node);
    return node;
  }

  static getDepartmentsAndWards() {
    const all = Array.from(this.registeredNodes.values());
    const departments = all.filter(n => n.type === 'department').map(d => ({
      id: d.id,
      name: d.name,
      type: 'department'
    }));

    const wards = all.filter(n => n.type === 'ward').map(w => {
      const parentDept = all.find(d => d.id === w.parentId);
      return {
        id: w.id,
        name: w.name,
        departmentId: w.parentId,
        departmentName: parentDept ? parentDept.name : 'General',
        type: 'ward'
      };
    });

    return { departments, wards };
  }

  static getTree(): HierarchyNode | null {
    const all = Array.from(this.registeredNodes.values());
    const roots = all.filter((n) => !n.parentId);
    if (roots.length === 0) return null;

    const build = (node: HierarchyNode): HierarchyNode => {
      const children = all.filter((n) => n.parentId === node.id);
      return {
        ...node,
        children: children.map(build)
      };
    };

    return build(roots[0]);
  }

  static getAllNodes(): HierarchyNode[] {
    return Array.from(this.registeredNodes.values());
  }
}
