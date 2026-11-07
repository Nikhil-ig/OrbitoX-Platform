import { orbitox } from '@orbitox/runtime';
import { SecurityService } from '../services/security.service';
import { StaffService, STANDARD_STAFF_ROLES } from '../services/staff.service';

export function registerSecurityRoutes(app: any) {
  // ─── 0. Staff Authentication & Session Governance ───────────────

  // POST /api/hospital/security/login - Authenticate clinical staff by Email / Staff ID + PIN
  app.post('/api/hospital/security/login', async (req: any, res: any) => {
    try {
      const { identifier, pinOrPassword } = req.body;
      const authResult = await StaffService.authenticateStaff(identifier, pinOrPassword);
      if (!authResult.success || !authResult.staff) {
        return res.status(401).json({ success: false, error: authResult.error || 'Authentication failed.' });
      }

      const staff = authResult.staff;
      const roleMeta = STANDARD_STAFF_ROLES.find(r => r.role === staff.role);
      const enriched = {
        ...staff,
        effectivePermissions: StaffService.getEffectivePermissions(staff),
        roleCategory: roleMeta?.category || 'Clinical',
        roleDisplayName: roleMeta?.displayName || staff.role,
        scope: roleMeta?.scope || 'department.*'
      };

      res.status(200).json({
        success: true,
        message: `Welcome, ${staff.name}`,
        staff: enriched,
        token: `session_${staff.id}_${Date.now()}`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/hospital/security/session - Get active staff profile from headers
  app.get('/api/hospital/security/session', async (req: any, res: any) => {
    try {
      const staffId = req.headers['x-staff-id'] || req.query.staffId || 'admin_root_01';
      const staff = await StaffService.getStaffById(staffId as string);
      if (!staff) {
        return res.status(404).json({ success: false, error: `Staff session '${staffId}' not found.` });
      }

      const roleMeta = STANDARD_STAFF_ROLES.find(r => r.role === staff.role);
      const enriched = {
        ...staff,
        effectivePermissions: StaffService.getEffectivePermissions(staff),
        roleCategory: roleMeta?.category || 'Clinical',
        roleDisplayName: roleMeta?.displayName || staff.role,
        scope: roleMeta?.scope || 'department.*'
      };

      res.status(200).json({ success: true, staff: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── 1. Staff Directory & Management CRUD ────────────────────────

  // GET /api/hospital/security/staff - List staff directory with query filters
  app.get('/api/hospital/security/staff', async (req: any, res: any) => {
    try {
      const { role, departmentId, contextId, status, search, isOnDuty } = req.query;
      const parsedIsOnDuty = isOnDuty !== undefined ? isOnDuty === 'true' : undefined;

      const staffList = await StaffService.listStaff({
        role: role as string,
        departmentId: departmentId as string,
        contextId: contextId as string,
        status: status as string,
        search: search as string,
        isOnDuty: parsedIsOnDuty
      });

      // Enrich with effective permissions and role details
      const enriched = staffList.map(s => {
        const roleMeta = STANDARD_STAFF_ROLES.find(r => r.role === s.role);
        return {
          ...s,
          effectivePermissions: StaffService.getEffectivePermissions(s),
          roleCategory: roleMeta?.category || 'Clinical',
          roleDisplayName: roleMeta?.displayName || s.role,
          scope: roleMeta?.scope || 'department.*'
        };
      });

      res.status(200).json({ success: true, count: enriched.length, data: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/hospital/security/staff/:id - Get single staff member
  app.get('/api/hospital/security/staff/:id', async (req: any, res: any) => {
    try {
      const staff = await StaffService.getStaffById(req.params.id);
      if (!staff) {
        return res.status(404).json({ success: false, error: `Staff member '${req.params.id}' not found.` });
      }

      const roleMeta = STANDARD_STAFF_ROLES.find(r => r.role === staff.role);
      const enriched = {
        ...staff,
        effectivePermissions: StaffService.getEffectivePermissions(staff),
        roleCategory: roleMeta?.category || 'Clinical',
        roleDisplayName: roleMeta?.displayName || staff.role,
        scope: roleMeta?.scope || 'department.*'
      };

      res.status(200).json({ success: true, data: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/hospital/security/staff - Create new staff member
  app.post('/api/hospital/security/staff', async (req: any, res: any) => {
    try {
      const operatorId = req.headers['x-staff-id'] || 'admin_root_01';
      const created = await StaffService.createStaff(req.body, operatorId as string);
      res.status(201).json({ success: true, message: `Staff member ${created.name} created successfully.`, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // PUT/PATCH /api/hospital/security/staff/:id - Update staff details / role / permissions
  const updateHandler = async (req: any, res: any) => {
    try {
      const operatorId = req.headers['x-staff-id'] || 'admin_root_01';
      const updated = await StaffService.updateStaff(req.params.id, req.body, operatorId as string);
      res.status(200).json({ success: true, message: `Staff member ${updated.name} updated.`, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
  app.put('/api/hospital/security/staff/:id', updateHandler);
  app.patch('/api/hospital/security/staff/:id', updateHandler);

  // DELETE /api/hospital/security/staff/:id - Soft deactivate staff member
  app.delete('/api/hospital/security/staff/:id', async (req: any, res: any) => {
    try {
      const operatorId = req.headers['x-staff-id'] || 'admin_root_01';
      const deleted = await StaffService.deleteStaff(req.params.id, operatorId as string);
      if (!deleted) {
        return res.status(404).json({ success: false, error: `Staff member '${req.params.id}' not found.` });
      }
      res.status(200).json({ success: true, message: `Staff member '${req.params.id}' deactivated.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /api/hospital/security/staff/:id/toggle-duty - Toggle on-duty status
  app.post('/api/hospital/security/staff/:id/toggle-duty', async (req: any, res: any) => {
    try {
      const { isOnDuty } = req.body;
      const operatorId = req.headers['x-staff-id'] || 'admin_root_01';
      const updated = await StaffService.toggleDuty(req.params.id, Boolean(isOnDuty), operatorId as string);
      res.status(200).json({ success: true, message: `Staff duty status updated to ${isOnDuty ? 'ON DUTY' : 'OFF DUTY'}.`, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // GET /api/hospital/security/roles - List all standard clinical roles and capabilities
  app.get('/api/hospital/security/roles', async (req: any, res: any) => {
    try {
      res.status(200).json({ success: true, count: STANDARD_STAFF_ROLES.length, data: STANDARD_STAFF_ROLES });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── 2. Break-Glass Emergency Trauma Override ────────────────────
  app.post('/api/hospital/security/break-glass', async (req: any, res: any) => {
    try {
      const { doctorId, reason, patientId } = req.body;
      const override = await SecurityService.requestBreakGlassOverride({ doctorId, reason, patientId });
      res.status(200).json({ success: true, override });
    } catch (err: any) {
      res.status(403).json({ success: false, error: err.message });
    }
  });

  // ─── 3. Superadmin: Query System RBAC & Root Permissions ─────────
  app.get('/api/hospital/security/permissions', async (req: any, res: any) => {
    try {
      const staffMembers = await StaffService.listStaff();
      const staffDirectory = staffMembers.map(s => {
        const roleMeta = STANDARD_STAFF_ROLES.find(r => r.role === s.role);
        return {
          id: s.id,
          name: s.name,
          role: roleMeta?.displayName || s.role,
          status: s.status === 'active' ? (s.isOnDuty ? 'On Duty' : 'Off Duty') : s.status,
          scope: roleMeta?.scope || 'department.*',
          contextName: s.contextName || s.departmentName || 'General',
          lastActive: s.lastActive || 'Recently'
        };
      });

      const permissionsMatrix = {
        role: 'superadmin',
        userId: 'admin_root_01',
        name: 'Super Admin (Root Operator)',
        scope: '*.*',
        capabilities: [
          { id: 'clinical_bypass', name: 'Clinical Intake & Surge Bypass', granted: true, description: 'Directly admit, transfer, or discharge patients across any ward or emergency bay' },
          { id: 'pharmacy_override', name: 'eMAR & 5-Rights Pharmacy Override', granted: true, description: 'Dispense and administer medications with emergency root sign-off' },
          { id: 'beds_omni', name: 'Bed Matrix & Housekeeping Turnover Root', granted: true, description: 'Add, decommission, transfer, and instant-turnover any bed or ward station' },
          { id: 'security_breakglass', name: 'Cryptographic Break-Glass Authority', granted: true, description: 'Issue 30-minute Zero-Trust cryptographic override tokens' },
          { id: 'ledger_audit_export', name: 'SHA-256 Immutable Audit Ledger Export', granted: true, description: 'Export full cryptographic blockchain ledger and compliance hashes' },
          { id: 'hierarchy_root', name: '6-Tier Multi-Context Hierarchy Architect', granted: true, description: 'Create, modify, and delete Organization, Branch, Department, and Ward nodes' }
        ],
        staffDirectory
      };

      res.status(200).json({ success: true, permissions: permissionsMatrix });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── 4. Superadmin: Instant Bulk Turnover of Sanitizing Beds ──────
  app.post('/api/hospital/security/purge-sanitized', async (req: any, res: any) => {
    try {
      const allBeds = await orbitox.db.findMany<any>('bed');
      const sanitizingBeds = allBeds.data.filter((b: any) => b.status === 'sanitizing');

      for (const bed of sanitizingBeds) {
        await orbitox.db.update('bed', bed.id, { status: 'available' }, bed.contextId || 'default-context');
        await orbitox.audit.log({
          action: 'SUPERADMIN_BULK_TURNOVER',
          entityType: 'bed',
          entityId: bed.id,
          userId: 'admin_root_01',
          reason: `Super Admin bulk turnover verified: ${bed.label} marked AVAILABLE.`
        });
      }

      res.status(200).json({
        success: true,
        purgedCount: sanitizingBeds.length,
        message: `Successfully turned over ${sanitizingBeds.length} bed(s) to Available.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── 5. Superadmin: Hospital Emergency Drill Dispatch ────────────
  app.post('/api/hospital/security/drill', async (req: any, res: any) => {
    try {
      const { type = 'CODE_BLUE_DRILL', ward = 'Cardiac ICU' } = req.body;

      await orbitox.audit.log({
        action: 'SUPERADMIN_EMERGENCY_DRILL_DISPATCHED',
        entityType: 'platform',
        entityId: 'apollo-ny',
        userId: 'admin_root_01',
        reason: `Super Admin initiated ${type} simulation in ${ward}. Team response timer started.`
      });

      await orbitox.events.emit('hospital.drill.started', {
        drillType: type,
        ward,
        dispatchedBy: 'admin_root_01',
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: `Emergency Drill '${type}' dispatched to ${ward}. Audit logged.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
