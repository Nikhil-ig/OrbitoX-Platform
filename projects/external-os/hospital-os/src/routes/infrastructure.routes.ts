import { orbitox } from '@orbitox/runtime';
import { HierarchyService } from '../services/hierarchy.service';
import { HospitalSeedService } from '../services/seed.service';

export function registerInfrastructureRoutes(app: any) {
  // 1. Get Context Tree Hierarchy
  app.get('/api/hospital/hierarchy', async (req: any, res: any) => {
    try {
      const tree = HierarchyService.getTree();
      const allContexts = HierarchyService.getAllNodes();

      res.status(200).json({
        success: true,
        totalContexts: allContexts.length,
        tree,
        allContexts
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Get Live Departments & Wards from DB / Hierarchy Engine
  app.get('/api/hospital/departments', async (req: any, res: any) => {
    try {
      const { departments, wards } = HierarchyService.getDepartmentsAndWards();
      res.status(200).json({
        success: true,
        departments,
        wards,
        totalDepartments: departments.length,
        totalWards: wards.length
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Create Context Node in Hierarchy
  app.post('/api/hospital/contexts', async (req: any, res: any) => {
    try {
      const { id, name, type, parentId, meta } = req.body;

      const node = await HierarchyService.createContext({
        id,
        name,
        type,
        parentId,
        meta
      });

      let createdBed = null;
      if (type === 'bed') {
        createdBed = await orbitox.db.create<any>('bed', {
          id: node.id,
          label: name,
          wardId: parentId,
          type: meta?.bedType || 'icu',
          status: 'available',
          dailyRate: meta?.rate || 1000,
          attachedEquipment: meta?.devices ? meta.devices.map((d: string) => ({ model: d, status: 'online' })) : []
        }, node.id);
      }

      await orbitox.audit.log({
        action: 'HIERARCHY_NODE_CREATED',
        entityId: node.id,
        entityType: type,
        userId: 'admin_user',
        reason: `Provisioned ${type} node: ${name} under parent ${parentId || 'ROOT'}`
      });

      res.status(201).json({ success: true, context: node, bed: createdBed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 4. Provision New Bed (Complete fields)
  app.post('/api/hospital/beds', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || req.body.wardId || 'default-context';
      const bedId = req.body.id || `bed_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      
      const bed = await orbitox.db.create<any>('bed', {
        id: bedId,
        label: req.body.label || 'New Bed Station',
        wardId: req.body.wardId || 'cardio_icu',
        roomId: req.body.roomId || 'Room 101',
        type: req.body.type || 'icu',
        status: req.body.status || 'available',
        isTemporary: req.body.isTemporary || false,
        dailyRate: Number(req.body.dailyRate) || 850,
        attachedEquipment: req.body.attachedEquipment || [
          { deviceId: `dev_${Date.now()}`, manufacturer: 'Philips', model: 'IntelliVue MX800', status: 'online' }
        ]
      }, contextId);

      await orbitox.audit.log({
        action: 'BED_PROVISIONED',
        entityId: bed.id,
        entityType: 'bed',
        userId: 'admin_user',
        contextId,
        reason: `Provisioned new ${bed.type} bed: ${bed.label} (Rate: $${bed.dailyRate}/day)`
      });

      res.status(201).json({ success: true, bed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. Update Bed Status & Configuration
  app.patch('/api/hospital/beds/:id', async (req: any, res: any) => {
    try {
      const bedId = req.params.id;
      const updates = req.body;
      const allBeds = await orbitox.db.findMany<any>('bed');
      const existing = allBeds.data.find((b: any) => b.id === bedId);

      if (!existing) {
        return res.status(404).json({ success: false, error: `Bed '${bedId}' not found.` });
      }

      const updated = await orbitox.db.update('bed', bedId, updates, existing.contextId || 'default-context');

      await orbitox.audit.log({
        action: 'BED_UPDATED',
        entityId: bedId,
        entityType: 'bed',
        userId: 'staff_nurse',
        reason: `Updated bed ${existing.label}: ${JSON.stringify(updates)}`
      });

      res.status(200).json({ success: true, bed: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 6. Discharge Patient & Set Bed to Sanitizing
  app.post('/api/hospital/beds/:id/discharge', async (req: any, res: any) => {
    try {
      const bedId = req.params.id;
      const allBeds = await orbitox.db.findMany<any>('bed');
      const bed = allBeds.data.find((b: any) => b.id === bedId);
      if (!bed) return res.status(404).json({ success: false, error: 'Bed not found' });

      // Find active admitted patient
      const allPatients = await orbitox.db.findMany<any>('patient');
      const patient = allPatients.data.find((p: any) => p.bedId === bedId && p.status === 'admitted');

      if (patient) {
        const patientContext = patient.contextId || bed.contextId || 'default-context';
        await orbitox.db.update('patient', patient.id, {
          status: 'discharged',
          bedId: null,
          dischargedAt: new Date().toISOString()
        }, patientContext);

        await orbitox.audit.log({
          action: 'PATIENT_DISCHARGED',
          entityId: patient.id,
          entityType: 'patient',
          userId: 'attending_doctor',
          contextId: patientContext,
          reason: `Discharged ${patient.name} from ${bed.label}`
        });
      }

      // Update bed status to sanitizing
      const updatedBed = await orbitox.db.update('bed', bedId, { status: 'sanitizing' }, bed.contextId || 'default-context');

      await orbitox.audit.log({
        action: 'BED_TURNOVER_STARTED',
        entityId: bedId,
        entityType: 'bed',
        userId: 'housekeeping_lead',
        reason: `Bed ${bed.label} marked for terminal sanitization turnover`
      });

      res.status(200).json({ success: true, bed: updatedBed, dischargedPatient: patient });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 7. Complete Sanitization / Turnover -> Mark Bed Available
  app.post('/api/hospital/beds/:id/turnover', async (req: any, res: any) => {
    try {
      const bedId = req.params.id;
      const allBeds = await orbitox.db.findMany<any>('bed');
      const bed = allBeds.data.find((b: any) => b.id === bedId);
      if (!bed) return res.status(404).json({ success: false, error: 'Bed not found' });

      const updatedBed = await orbitox.db.update('bed', bedId, { status: 'available' }, bed.contextId || 'default-context');

      await orbitox.audit.log({
        action: 'BED_SANITIZED_AVAILABLE',
        entityId: bedId,
        entityType: 'bed',
        userId: 'housekeeping_lead',
        reason: `Sanitization verified. Bed ${bed.label} is now AVAILABLE for admissions.`
      });

      res.status(200).json({ success: true, bed: updatedBed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 8. List Beds in Department (with populated patient details)
  app.get('/api/hospital/beds', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const bedsResult = await orbitox.db.findMany<any>('bed', { contextId });
      const patientsResult = await orbitox.db.findMany<any>('patient', { contextId });

      const bedsWithPatients = bedsResult.data.map((bed: any) => {
        const activePatient = patientsResult.data.find((p: any) => p.bedId === bed.id && p.status === 'admitted');
        return {
          ...bed,
          patient: activePatient || null
        };
      });

      res.status(200).json({ success: true, total: bedsWithPatients.length, data: bedsWithPatients });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 9. Reset and Re-seed Comprehensive Enterprise Hospital Database
  app.post('/api/hospital/reset-seed', async (req: any, res: any) => {
    try {
      const summary = await HospitalSeedService.seedComprehensiveHospitalData(true);
      res.status(200).json({
        success: true,
        message: 'Successfully cleared and re-seeded enterprise hospital database for multi-role testing.',
        summary
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
