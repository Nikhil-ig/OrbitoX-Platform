import { orbitox } from '@orbitox/runtime';
import { AdmissionService } from '../services/admission.service';
import { PharmacyService } from '../services/pharmacy.service';
import { LabService } from '../services/lab.service';
import { BillingService } from '../services/billing.service';

export function registerClinicalRoutes(app: any) {
  // 1. Patient Admission / Registration
  app.post('/api/hospital/admissions', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || 'default-context';
      const patient = await AdmissionService.admitPatient({
        ...req.body,
        contextId
      });
      res.status(201).json({ success: true, patient });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 2. Prescribe Treatment / Medication
  app.post('/api/hospital/treatments', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || 'default-context';
      const treatment = await PharmacyService.prescribeMedication({
        ...req.body,
        contextId
      });
      res.status(201).json({ success: true, treatment });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 3. List Treatments / Prescriptions
  app.get('/api/hospital/treatments', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const treatments = await orbitox.db.findMany('treatment', { contextId });
      const patients = await orbitox.db.findMany('patient', { contextId });
      const beds = await orbitox.db.findMany('bed', { contextId });

      const populated = treatments.data.map((t: any) => {
        const pat = patients.data.find((p: any) => p.id === t.patientId);
        const bed = (pat?.status === 'admitted' && pat?.bedId) ? beds.data.find((b: any) => b.id === pat.bedId) : null;
        return {
          ...t,
          patientName: pat?.name || 'Inpatient',
          bedId: bed?.label || (pat?.status === 'admitted' ? (pat.bedId || 'Inpatient Ward') : (pat?.status === 'discharged' ? 'Discharged' : 'Outpatient / Clinic'))
        };
      });

      res.status(200).json({ success: true, data: populated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 4. Dispense Medication
  app.post('/api/hospital/treatments/:id/dispense', async (req: any, res: any) => {
    try {
      const updated = await PharmacyService.verifyAndDispense(req.params.id, req.body.staffId || 'pharmacist_01');
      res.status(200).json({ success: true, updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 5. Administer Medication at Bedside
  app.post('/api/hospital/treatments/:id/administer', async (req: any, res: any) => {
    try {
      const updated = await PharmacyService.administerAtBedside(req.params.id, req.body.staffId || 'nurse_01');
      res.status(200).json({ success: true, updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 6. List Pathology Lab Orders
  app.get('/api/hospital/labs', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const patientId = req.query.patientId as string | undefined;
      const orders = await LabService.listLabOrders(contextId, patientId);
      res.status(200).json({ success: true, total: orders.length, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6B. Order Pathology Lab Test
  app.post('/api/hospital/labs', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || 'default-context';
      const order = await LabService.orderTest({
        ...req.body,
        contextId
      });
      res.status(201).json({ success: true, order });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 6C. Enter / Report Lab Test Results & Critical Values
  app.post('/api/hospital/labs/:id/results', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const updated = await LabService.reportResults({
        orderId: id,
        resultSummary: req.body.resultSummary,
        numericValue: req.body.numericValue !== undefined ? Number(req.body.numericValue) : undefined,
        isCriticalValue: req.body.isCriticalValue,
        technicianId: req.body.technicianId || req.body.staffId || 'lab_tech_01',
        contextId
      });
      res.status(200).json({ success: true, updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 7. List Itemized Invoices & Billing Records
  app.get('/api/hospital/billing', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const patientId = req.query.patientId as string | undefined;
      const invoices = await BillingService.listInvoices(contextId, patientId);
      res.status(200).json({ success: true, total: invoices.length, data: invoices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7B. Generate Discharge Bill
  app.post('/api/hospital/billing/discharge', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || 'default-context';
      const invoice = await BillingService.generateDischargeInvoice(req.body.patientId, contextId);
      res.status(200).json({ success: true, invoice });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 7C. Pay & Settle Invoice
  app.post('/api/hospital/billing/pay/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const updated = await BillingService.payInvoice(id, req.body.paymentMethod || 'credit_card', req.body.amount, contextId);
      res.status(200).json({ success: true, invoice: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 8. List All Patients (Real DB data - only admitted patients occupy bed)
  app.get('/api/hospital/patients', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const patientsResult = await orbitox.db.findMany('patient', { contextId });
      const bedsResult = await orbitox.db.findMany('bed', { contextId });

      const populated = patientsResult.data.map((p: any) => {
        const isAdmitted = (p.status || '').toLowerCase() === 'admitted';
        const bed = (isAdmitted && p.bedId) ? bedsResult.data.find((b: any) => b.id === p.bedId) : null;
        return {
          ...p,
          bedId: isAdmitted ? p.bedId : undefined,
          bedLabel: isAdmitted && bed ? bed.label : 'Unassigned',
          roomNo: isAdmitted && bed?.label ? bed.label.split(' ')[0] : 'H00001',
          email: p.email || `${p.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
        };
      });

      res.status(200).json({ success: true, total: populated.length, data: populated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8B. Update Patient Details / Status / Bed Assignment
  app.patch('/api/hospital/patients/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const allPatients = await orbitox.db.findMany<any>('patient');
      const patient = allPatients.data.find((p: any) => p.id === id);
      if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

      const contextId = patient.contextId || 'default-context';

      // If status changed from admitted to discharged or unassigned status:
      if (updates.status && updates.status !== 'admitted') {
        // Free bed if patient was assigned to one
        if (patient.bedId) {
          const allBeds = await orbitox.db.findMany<any>('bed');
          const bed = allBeds.data.find((b: any) => b.id === patient.bedId);
          if (bed) {
            const nextBedStatus = updates.status === 'discharged' ? 'sanitizing' : 'available';
            await orbitox.db.update('bed', bed.id, { status: nextBedStatus }, bed.contextId || contextId);
          }
        }
        updates.bedId = null;
        if (updates.status === 'discharged') {
          updates.dischargedAt = new Date().toISOString();
        }
      }

      // If status changed to admitted and bedId is provided, mark bed occupied
      if (updates.status === 'admitted' && updates.bedId) {
        const allBeds = await orbitox.db.findMany<any>('bed');
        const newBed = allBeds.data.find((b: any) => b.id === updates.bedId);
        if (newBed) {
          await orbitox.db.update('bed', newBed.id, { status: 'occupied' }, newBed.contextId || contextId);
        }
        updates.admittedAt = new Date().toISOString();
      }

      const updated = await orbitox.db.update('patient', patient.id, updates, contextId);

      await orbitox.audit.log({
        action: 'PATIENT_UPDATED',
        entityType: 'patient',
        entityId: patient.id,
        userId: req.body.staffId || 'dr_ashlynn_01',
        contextId,
        reason: `Updated patient ${patient.name} record: ${JSON.stringify(updates)}`
      });

      res.status(200).json({ success: true, patient: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8C. Admit / Assign Patient to Bed Action Endpoint
  app.post('/api/hospital/patients/:id/admit', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { bedId, doctorId } = req.body;
      if (!bedId) return res.status(400).json({ success: false, error: 'Bed ID is required' });

      const allPatients = await orbitox.db.findMany<any>('patient');
      const patient = allPatients.data.find((p: any) => p.id === id);
      if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

      const allBeds = await orbitox.db.findMany<any>('bed');
      const bed = allBeds.data.find((b: any) => b.id === bedId);
      if (!bed) return res.status(404).json({ success: false, error: 'Bed not found' });
      if (bed.status !== 'available') return res.status(400).json({ success: false, error: `Bed is currently ${bed.status}` });

      const contextId = bed.contextId || patient.contextId || 'default-context';

      // 1. Update patient
      const updatedPatient = await orbitox.db.update('patient', patient.id, {
        bedId: bed.id,
        status: 'admitted',
        admittedAt: new Date().toISOString(),
        attendingDoctorId: doctorId || patient.attendingDoctorId || 'dr_ashlynn_01'
      }, patient.contextId || contextId);

      // 2. Mark bed occupied
      await orbitox.db.update('bed', bed.id, { status: 'occupied' }, bed.contextId || contextId);

      // 3. Audit
      await orbitox.audit.log({
        action: 'PATIENT_ADMITTED',
        entityType: 'patient',
        entityId: patient.id,
        userId: doctorId || 'dr_ashlynn_01',
        contextId,
        reason: `Admitted ${patient.name} to ${bed.label}`
      });

      res.status(200).json({ success: true, patient: updatedPatient, bed });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8D. Discharge Patient Action Endpoint
  app.post('/api/hospital/patients/:id/discharge', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const allPatients = await orbitox.db.findMany<any>('patient');
      const patient = allPatients.data.find((p: any) => p.id === id);
      if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

      const contextId = patient.contextId || 'default-context';

      // Free bed if assigned -> sets bed to sanitizing
      if (patient.bedId) {
        const allBeds = await orbitox.db.findMany<any>('bed');
        const bed = allBeds.data.find((b: any) => b.id === patient.bedId);
        if (bed) {
          await orbitox.db.update('bed', bed.id, { status: 'sanitizing' }, bed.contextId || contextId);
        }
      }

      const updatedPatient = await orbitox.db.update('patient', patient.id, {
        status: 'discharged',
        bedId: null, // Clear bedId on patient entity
        dischargedAt: new Date().toISOString()
      }, contextId);

      await orbitox.audit.log({
        action: 'PATIENT_DISCHARGED',
        entityType: 'patient',
        entityId: patient.id,
        userId: req.body.staffId || 'dr_ashlynn_01',
        contextId,
        reason: `Discharged ${patient.name} from hospital inpatient care and freed bed for sanitization.`
      });

      res.status(200).json({ success: true, patient: updatedPatient });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8E. Delete Patient Record
  app.delete('/api/hospital/patients/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const allPatients = await orbitox.db.findMany<any>('patient');
      const patient = allPatients.data.find((p: any) => p.id === id);
      if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

      const contextId = patient.contextId || 'default-context';

      // If patient had an occupied bed, free the bed
      if (patient.bedId && patient.status === 'admitted') {
        const allBeds = await orbitox.db.findMany<any>('bed');
        const bed = allBeds.data.find((b: any) => b.id === patient.bedId);
        if (bed) {
          await orbitox.db.update('bed', bed.id, { status: 'available' }, bed.contextId || contextId);
        }
      }

      await orbitox.db.delete('patient', patient.id, contextId);

      await orbitox.audit.log({
        action: 'PATIENT_DELETED',
        entityType: 'patient',
        entityId: patient.id,
        userId: req.body.staffId || 'super_admin',
        contextId,
        reason: `Removed patient record for ${patient.name}`
      });

      res.status(200).json({ success: true, message: `Patient ${patient.name} deleted` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. List & Create Appointments (Real DB data)
  app.get('/api/hospital/appointments', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const appointments = await orbitox.db.findMany('appointment', { contextId });
      res.status(200).json({ success: true, total: appointments.data.length, data: appointments.data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/hospital/appointments', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || 'default-context';
      const created = await orbitox.db.create('appointment', {
        id: `apt_${Date.now()}`,
        patientName: req.body.patientName,
        doctor: req.body.doctor || 'Dr. Ashlynn Carder',
        type: req.body.type || 'General Consultation',
        time: req.body.time || '10:00 AM',
        date: req.body.date || 'Today',
        room: req.body.room || 'Consultation Room 1',
        status: req.body.status || 'Confirmed'
      }, contextId);

      await orbitox.audit.log({
        action: 'APPOINTMENT_SCHEDULED',
        entityType: 'appointment',
        entityId: created.id,
        userId: req.body.doctor || 'doctor',
        reason: `Booked ${req.body.type} for ${req.body.patientName}`
      });

      res.status(201).json({ success: true, appointment: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 9B. Update Appointment Status (Confirmed, Completed, Cancelled)
  app.patch('/api/hospital/appointments/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const allAppts = await orbitox.db.findMany<any>('appointment');
      const appt = allAppts.data.find((a: any) => a.id === id);
      if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });

      const contextId = appt.contextId || 'default-context';
      const updated = await orbitox.db.update('appointment', appt.id, updates, contextId);

      await orbitox.audit.log({
        action: 'APPOINTMENT_UPDATED',
        entityType: 'appointment',
        entityId: appt.id,
        userId: req.body.staffId || 'dr_ashlynn_01',
        contextId,
        reason: `Updated appointment for ${appt.patientName}: ${JSON.stringify(updates)}`
      });

      res.status(200).json({ success: true, appointment: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9C. Delete Appointment
  app.delete('/api/hospital/appointments/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const allAppts = await orbitox.db.findMany<any>('appointment');
      const appt = allAppts.data.find((a: any) => a.id === id);
      if (!appt) return res.status(404).json({ success: false, error: 'Appointment not found' });

      const contextId = appt.contextId || 'default-context';
      await orbitox.db.delete('appointment', appt.id, contextId);

      await orbitox.audit.log({
        action: 'APPOINTMENT_DELETED',
        entityType: 'appointment',
        entityId: appt.id,
        userId: 'admin',
        contextId,
        reason: `Cancelled and removed appointment for ${appt.patientName}`
      });

      res.status(200).json({ success: true, message: 'Appointment removed' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Query Real Audit Ledger
  app.get('/api/hospital/audit', async (req: any, res: any) => {
    try {
      const logs = await orbitox.audit.query({});
      res.status(200).json({ success: true, total: logs.length, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Compute Real Hospital Statistics directly from DB
  app.get('/api/hospital/stats', async (req: any, res: any) => {
    try {
      const contextId = (req.headers['x-context-id'] as string) || undefined;
      const allBeds = await orbitox.db.findMany('bed', { contextId });
      const allPatients = await orbitox.db.findMany('patient', { contextId });
      const allAppointments = await orbitox.db.findMany('appointment', { contextId });
      const allTreatments = await orbitox.db.findMany('treatment', { contextId });

      const totalBeds = allBeds.data.length;
      const occupiedBeds = allBeds.data.filter((b: any) => b.status === 'occupied' || b.status === 'alarm').length;
      const availableBeds = allBeds.data.filter((b: any) => b.status === 'available').length;
      const totalPatients = allPatients.data.length;
      const malePatients = allPatients.data.filter((p: any) => p.gender === 'M').length;
      const femalePatients = allPatients.data.filter((p: any) => p.gender === 'F').length;

      const totalRooms = Array.from(new Set(allBeds.data.map((b: any) => b.roomId).filter(Boolean))).length || (totalBeds > 0 ? Math.ceil(totalBeds / 2) : 0);

      res.status(200).json({
        success: true,
        stats: {
          totalPatients,
          malePatients,
          femalePatients,
          malePercent: totalPatients > 0 ? Math.round((malePatients / totalPatients) * 100) : 50,
          femalePercent: totalPatients > 0 ? Math.round((femalePatients / totalPatients) * 100) : 50,
          totalBeds,
          occupiedBeds,
          availableBeds,
          totalRooms,
          totalAppointments: allAppointments.data.length,
          totalTreatments: allTreatments.data.length,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
