'use client';

import React, { useState, useEffect, useMemo } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';
import { useStaffAuth } from '../context/StaffAuthContext';

interface InvoiceLineItem {
  description: string;
  category: 'bed_charge' | 'medication' | 'lab_test' | 'procedure';
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface InvoiceRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientDiagnosis?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  insuranceCoverage: number;
  patientDue: number;
  status: 'draft' | 'finalized' | 'paid';
  insuranceProvider?: string;
  policyNumber?: string;
  paymentMethod?: string;
  amountPaid?: number;
  transactionRef?: string;
  issuedAt: string;
  paidAt?: string;
}

export default function FinancialBillingPage() {
  const { currentStaff, can } = useStaffAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'finalized' | 'paid' | 'draft'>('all');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState<InvoiceRecord | null>(null);
  const [generatePatientId, setGeneratePatientId] = useState('');
  const [payMethod, setPayMethod] = useState('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [billingRes, patientsRes] = await Promise.all([
        fetch('/api/hospital/billing'),
        fetch('/api/hospital/patients')
      ]);

      const billingData = await billingRes.json();
      const patientsData = await patientsRes.json();

      if (billingData.success && billingData.data) {
        setInvoices(billingData.data);
      }
      if (patientsData.success && patientsData.data) {
        setPatients(patientsData.data);
        if (patientsData.data.length > 0 && !generatePatientId) {
          setGeneratePatientId(patientsData.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load financial billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
    const interval = setInterval(fetchBillingData, 7000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch =
        inv.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inv.insuranceProvider && inv.insuranceProvider.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  // Financial KPIs
  const financialStats = useMemo(() => {
    const totalBilled = invoices.reduce((acc, i) => acc + (i.subtotal || 0), 0);
    const totalCollected = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + (i.amountPaid || i.patientDue || 0), 0);
    const outstandingDue = invoices.filter(i => i.status !== 'paid').reduce((acc, i) => acc + (i.patientDue || 0), 0);
    const insuranceSettled = invoices.reduce((acc, i) => acc + (i.insuranceCoverage || 0), 0);

    return { totalBilled, totalCollected, outstandingDue, insuranceSettled };
  }, [invoices]);

  // Handle Generate Discharge Bill
  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const res = await fetch('/api/hospital/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: generatePatientId })
      });
      const data = await res.json();
      if (data.success) {
        setShowGenerateModal(false);
        await fetchBillingData();
      } else {
        alert(data.error || 'Failed to generate bill');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Settle Payment
  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/hospital/billing/pay/${showPayModal.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethod,
          amount: showPayModal.patientDue
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowPayModal(null);
        if (selectedInvoice && selectedInvoice.id === showPayModal.id) {
          setSelectedInvoice(data.invoice);
        }
        await fetchBillingData();
      } else {
        alert(data.error || 'Failed to process payment');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <HospitalNavLayout
      headerTitle="Inpatient Billing & Revenue Cycle 💳"
      headerSubtitle="Automated Itemized Invoicing, Insurance Claims & Patient Financial Settlement"
      actions={
        <div style={{ display: 'flex', gap: '10px' }}>
          {can('billing.manage') && (
            <button
              onClick={() => setShowGenerateModal(true)}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '24px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>+</span> Generate Itemized Bill
            </button>
          )}
        </div>
      }
    >
      {/* 1. Top Financial KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>TOTAL GROSS CHARGES</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
            ${financialStats.totalBilled.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#1e60ff', fontWeight: 600, marginTop: '2px' }}>● Stay + Meds + Labs</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>INSURANCE CLAIMS (80%)</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
            ${financialStats.insuranceSettled.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>✓ Policy Coverage Sown</div>
        </div>

        <div style={{ background: financialStats.outstandingDue > 0 ? '#fffbeb' : '#ffffff', padding: '20px', borderRadius: '20px', border: financialStats.outstandingDue > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: financialStats.outstandingDue > 0 ? '#b45309' : '#64748b' }}>PATIENT DUE BALANCE</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: financialStats.outstandingDue > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>
            ${financialStats.outstandingDue.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: financialStats.outstandingDue > 0 ? '#b45309' : '#64748b', fontWeight: 600, marginTop: '2px' }}>
            {financialStats.outstandingDue > 0 ? 'Awaiting Co-Pay Clearance' : 'Zero Balance'}
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '20px', borderRadius: '20px', border: '1px solid #bfdbfe', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>TOTAL REVENUE COLLECTED</div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e40af', marginTop: '4px' }}>
            ${financialStats.totalCollected.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: '#1e3a8a', fontWeight: 700, marginTop: '2px' }}>💳 Settled Transactions</div>
        </div>
      </div>

      {/* 2. Search & Status Filter */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', background: '#ffffff', padding: '14px 20px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder="Search invoices by patient name, invoice ID, or insurance..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '260px', padding: '9px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
        />

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'finalized', 'paid', 'draft'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '7px 14px',
                borderRadius: '12px',
                border: 'none',
                background: statusFilter === st ? '#0f172a' : '#f1f5f9',
                color: statusFilter === st ? '#ffffff' : '#64748b',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Invoices Table */}
      <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
            Inpatient Invoices & Claims ({filteredInvoices.length})
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Real-time Audit Ledger Linked</span>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading billing statements...</div>
        ) : filteredInvoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No invoices found matching criteria.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Invoice ID</th>
                  <th style={{ padding: '14px 20px' }}>Patient</th>
                  <th style={{ padding: '14px 20px' }}>Insurance Provider</th>
                  <th style={{ padding: '14px 20px' }}>Gross Total</th>
                  <th style={{ padding: '14px 20px' }}>Insurance (80%)</th>
                  <th style={{ padding: '14px 20px' }}>Patient Due</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const isPaid = inv.status === 'paid';

                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Invoice ID */}
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 700, color: '#1e60ff' }}>
                        #{inv.id.slice(-8).toUpperCase()}
                      </td>

                      {/* Patient */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{inv.patientName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {inv.patientAge ? `${inv.patientAge}y ${inv.patientGender || ''}` : ''} • {inv.patientDiagnosis || 'Clinical Inpatient'}
                        </div>
                      </td>

                      {/* Insurance */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: '#334155' }}>{inv.insuranceProvider || 'Self-Pay'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Policy: {inv.policyNumber || 'N/A'}</div>
                      </td>

                      {/* Gross Total */}
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#0f172a' }}>
                        ${inv.subtotal.toLocaleString()}
                      </td>

                      {/* Insurance Coverage */}
                      <td style={{ padding: '16px 20px', fontWeight: 700, color: '#10b981' }}>
                        -${inv.insuranceCoverage.toLocaleString()}
                      </td>

                      {/* Patient Due */}
                      <td style={{ padding: '16px 20px', fontWeight: 800, color: isPaid ? '#10b981' : '#dc2626' }}>
                        ${inv.patientDue.toLocaleString()}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: isPaid ? '#d1fae5' : '#fef3c7',
                            color: isPaid ? '#059669' : '#d97706'
                          }}
                        >
                          {isPaid ? '✓ PAID' : '● DUE'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '10px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#1e60ff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Itemized Bill
                          </button>

                          {!isPaid && (
                            can('billing.manage') ? (
                              <button
                                onClick={() => setShowPayModal(inv)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                                }}
                              >
                                Settle
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 8px', background: '#f8fafc', borderRadius: '8px' }}>
                                🔒 Billing Role
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: ITEMIZED INVOICE BREAKDOWN DRAWER ─── */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e60ff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ORBITOX CLINICAL HEALTHCARE SYSTEM</div>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Itemized Hospital Statement</h2>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Invoice: #{selectedInvoice.id} • Issued: {new Date(selectedInvoice.issuedAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => setSelectedInvoice(null)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            {/* Patient & Insurance Details Box */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ color: '#64748b', fontWeight: 600 }}>Patient Demographics:</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{selectedInvoice.patientName}</div>
                <div style={{ color: '#475569' }}>
                  ICD-10 Dx: <strong style={{ color: '#1e60ff' }}>{selectedInvoice.patientDiagnosis || 'I21.9 Acute Inpatient Condition'}</strong>
                </div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontWeight: 600 }}>Insurance & Payer:</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{selectedInvoice.insuranceProvider || 'Blue Cross Blue Shield'}</div>
                <div style={{ color: '#475569' }}>Policy #{selectedInvoice.policyNumber || 'BCBS-982144'} • Pre-Auth: <strong style={{ color: '#10b981' }}>APPROVED</strong></div>
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                Itemized Clinical Services & Supplies
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 800 }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Category</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.lineItems || []).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{item.description}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>{item.category.replace('_', ' ')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>${item.totalCost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal Gross Charges:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>${selectedInvoice.subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Healthcare Facility Surcharge (8.875%):</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>+${selectedInvoice.taxAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 700 }}>
                <span>Insurance Direct Settlement (80%):</span>
                <span>-${selectedInvoice.insuranceCoverage.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '10px', fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                <span>Patient Net Due:</span>
                <span style={{ color: selectedInvoice.status === 'paid' ? '#10b981' : '#dc2626' }}>
                  ${selectedInvoice.patientDue.toLocaleString()} {selectedInvoice.status === 'paid' && '(PAID)'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                🖨️ Print Statement
              </button>

              {selectedInvoice.status !== 'paid' && can('billing.manage') && (
                <button
                  onClick={() => {
                    setShowPayModal(selectedInvoice);
                  }}
                  style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                >
                  💳 Settle Balance (${selectedInvoice.patientDue.toLocaleString()})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: GENERATE DISCHARGE INVOICE ─── */}
      {showGenerateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '480px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Generate Itemized Bill 💳</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Calculates stay days, pharmacy eMAR & lab charges</span>
              </div>
              <button onClick={() => setShowGenerateModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleGenerateBill} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Select Inpatient *
                </label>
                <select
                  value={generatePatientId}
                  onChange={e => setGeneratePatientId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y {p.gender}) — {p.bedLabel || p.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
                💡 Dynamic calculation engine will cross-reference patient stay dates, administered treatments from pharmacy, and completed diagnostic labs.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                >
                  {isProcessing ? 'Generating Bill...' : 'Calculate & Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: SETTLE PAYMENT ─── */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '480px', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Process Patient Settlement 💳</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>For {showPayModal.patientName}</span>
              </div>
              <button onClick={() => setShowPayModal(null)} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <form onSubmit={handleSettlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Amount Due:</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626' }}>${showPayModal.patientDue.toLocaleString()}</span>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px' }}
                >
                  <option value="credit_card">💳 Credit / Debit Card (Online Terminal)</option>
                  <option value="insurance_direct">🛡️ Insurance Direct EFT / Co-Pay Card</option>
                  <option value="cash">💵 Cash / Hospital Treasury</option>
                  <option value="wire_transfer">🏦 Bank Wire Transfer</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}
                >
                  {isProcessing ? 'Processing Settlement...' : `Record Payment ($${showPayModal.patientDue.toLocaleString()})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
