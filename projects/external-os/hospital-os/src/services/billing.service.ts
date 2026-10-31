import { orbitox } from '@orbitox/runtime';
import { InvoiceEntity } from '../domain/types';

export class BillingService {
  static async generateDischargeInvoice(patientId: string, contextId?: string): Promise<InvoiceEntity> {
    console.log(`💳 [Billing] Generating itemized discharge bill for Patient: ${patientId}...`);

    const [patientsRes, bedsRes, treatmentsRes, labsRes] = await Promise.all([
      orbitox.db.findMany<any>('patient', { contextId }),
      orbitox.db.findMany<any>('bed', { contextId }),
      orbitox.db.findMany<any>('treatment', { contextId }),
      orbitox.db.findMany<any>('lab_order', { contextId })
    ]);

    const patient = patientsRes.data.find((p: any) => p.id === patientId);
    const assignedBed = patient?.bedId ? bedsRes.data.find((b: any) => b.id === patient.bedId) : null;
    const patientTreatments = treatmentsRes.data.filter((t: any) => t.patientId === patientId);
    const patientLabs = labsRes.data.filter((l: any) => l.patientId === patientId);

    const lineItems: any[] = [];
    let subtotal = 0;

    // 1. Bed Stay Charges
    const admitDate = patient?.admittedAt ? new Date(patient.admittedAt) : new Date(Date.now() - 5 * 86400000);
    const dischargeDate = patient?.dischargedAt ? new Date(patient.dischargedAt) : new Date();
    const diffMs = Math.max(1000 * 3600 * 24, dischargeDate.getTime() - admitDate.getTime());
    const stayDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const dailyRate = assignedBed?.dailyRate || 1500;
    const bedTotal = stayDays * dailyRate;

    lineItems.push({
      description: `${assignedBed?.label || 'Inpatient Bed Station'} — ${stayDays} Day${stayDays > 1 ? 's' : ''}`,
      category: 'bed_charge',
      quantity: stayDays,
      unitCost: dailyRate,
      totalCost: bedTotal
    });
    subtotal += bedTotal;

    // 2. Pharmacy / Medication Charges
    for (const t of patientTreatments) {
      const drugPrice = 120; // Standard clinical IV/PO medication fee
      lineItems.push({
        description: `Rx: ${t.drugName} (${t.dosage})`,
        category: 'medication',
        quantity: 1,
        unitCost: drugPrice,
        totalCost: drugPrice
      });
      subtotal += drugPrice;
    }

    // 3. Laboratory Diagnostics Charges
    for (const l of patientLabs) {
      const labFee = l.priority === 'stat' ? 150 : 85;
      lineItems.push({
        description: `Lab: ${l.testType} (${(l.priority || 'routine').toUpperCase()})`,
        category: 'lab_test',
        quantity: 1,
        unitCost: labFee,
        totalCost: labFee
      });
      subtotal += labFee;
    }

    // Fallback if empty
    if (subtotal === 0) {
      subtotal = 7500;
      lineItems.push({
        description: 'Standard Clinical Inpatient Stay Package',
        category: 'bed_charge',
        quantity: 1,
        unitCost: 7500,
        totalCost: 7500
      });
    }

    const taxAmount = Math.round(subtotal * 0.08875);
    const insuranceRatio = patient?.insurance?.provider ? 0.80 : 0.0;
    const insuranceCoverage = Math.round(subtotal * insuranceRatio);
    const patientDue = subtotal + taxAmount - insuranceCoverage;

    const invoice = await orbitox.db.create<InvoiceEntity>('invoice', {
      patientId,
      lineItems,
      subtotal,
      taxAmount,
      insuranceCoverage,
      patientDue,
      status: 'finalized',
      insuranceProvider: patient?.insurance?.provider || 'Self-Pay',
      policyNumber: patient?.insurance?.policyNumber || 'N/A',
      issuedAt: new Date().toISOString()
    }, contextId || patient?.contextId || 'default-context');

    console.log(`✅ [Invoice Generated] Total: $${subtotal} | Insurance: -$${insuranceCoverage} | Patient Due: $${patientDue}`);

    await orbitox.events.emit('invoice.generated', {
      invoiceId: invoice.id,
      patientId,
      subtotal,
      patientDue
    }, contextId);

    return invoice;
  }

  static async listInvoices(contextId?: string, patientId?: string): Promise<any[]> {
    const [invoicesRes, patientsRes] = await Promise.all([
      orbitox.db.findMany<any>('invoice', { contextId }),
      orbitox.db.findMany<any>('patient', { contextId })
    ]);

    let invoices = invoicesRes.data;
    if (patientId) {
      invoices = invoices.filter((i: any) => i.patientId === patientId);
    }

    return invoices.map((inv: any) => {
      const pat = patientsRes.data.find((p: any) => p.id === inv.patientId);
      return {
        ...inv,
        patientName: pat?.name || 'Inpatient Patient',
        patientAge: pat?.age,
        patientGender: pat?.gender,
        patientDiagnosis: pat?.diagnosis,
        insuranceProvider: inv.insuranceProvider || pat?.insurance?.provider || 'Self-Pay',
        policyNumber: inv.policyNumber || pat?.insurance?.policyNumber || 'N/A'
      };
    });
  }

  static async payInvoice(invoiceId: string, paymentMethod = 'credit_card', amount?: number, contextId?: string): Promise<any> {
    const allInvoices = await orbitox.db.findMany<any>('invoice');
    const existing = allInvoices.data.find((i: any) => i.id === invoiceId);
    if (!existing) throw new Error(`Invoice ${invoiceId} not found`);

    const updated = await orbitox.db.update('invoice', invoiceId, {
      status: 'paid',
      paymentMethod,
      amountPaid: amount || existing.patientDue,
      transactionRef: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      paidAt: new Date().toISOString()
    }, contextId || existing.contextId || 'default-context');

    await orbitox.events.emit('invoice.paid', {
      invoiceId,
      patientId: existing.patientId,
      amountPaid: amount || existing.patientDue,
      paymentMethod
    }, contextId);

    return updated;
  }
}
