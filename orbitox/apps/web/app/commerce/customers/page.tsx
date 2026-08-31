'use client';

import React, { useState } from 'react';
import { commerceEngine, Customer } from '@orbitox/commerce';

export default function CommerceCustomersPage() {
  const storeId = 'store_aura_luxury';
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerList, setCustomerList] = useState<Customer[]>(() =>
    commerceEngine.customers.listCustomersByStore(storeId)
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Customer Modal
  const [addCustomerOpen, setAddCustomerOpen] = useState<boolean>(false);
  const [newFirstName, setNewFirstName] = useState<string>('');
  const [newLastName, setNewLastName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('vip');

  // Direct Email Modal
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>('Private Runway Lookbook Invitation');
  const [emailBody, setEmailBody] = useState<string>('Dear Patron, We are delighted to grant you early access to our private autumn release.');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = customerList.filter(
    (c) =>
      c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedCustomer = selectedCustomerId
    ? customerList.find((c) => c.id === selectedCustomerId)
    : null;

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName || !newEmail) return;

    const newCust = commerceEngine.customers.upsertCustomer(storeId, {
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      email: newEmail.trim(),
      tags: newTag ? [newTag.trim()] : ['patron'],
      addresses: [
        {
          firstName: newFirstName,
          lastName: newLastName,
          addressLine1: '742 Evergreen Terrace',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
          phone: newPhone || '+1 (555) 019-2834',
        },
      ],
    });

    setCustomerList(commerceEngine.customers.listCustomersByStore(storeId));
    setAddCustomerOpen(false);
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');

    commerceEngine.activity.logEvent({
      storeId,
      type: 'customer_registered',
      title: `New Customer Profile: ${newCust.firstName} ${newCust.lastName}`,
      description: `Registered with email ${newCust.email} (Tags: ${newCust.tags.join(', ')}).`,
      icon: '👤',
      severity: 'info',
    });

    showToast(`✓ Customer "${newCust.firstName} ${newCust.lastName}" added to CRM!`);
  };

  const handleToggleVip = (cust: Customer) => {
    const isVip = cust.tags.includes('vip');
    const updatedTags = isVip ? cust.tags.filter((t) => t !== 'vip') : [...cust.tags, 'vip'];

    const updated = commerceEngine.customers.upsertCustomer(storeId, {
      ...cust,
      tags: updatedTags,
    });

    setCustomerList(commerceEngine.customers.listCustomersByStore(storeId));

    commerceEngine.activity.logEvent({
      storeId,
      type: 'customer_registered',
      title: `Customer ${cust.firstName} ${isVip ? 'Removed from VIP' : 'Promoted to VIP'}`,
      description: `Updated segment tags: [${updatedTags.join(', ')}].`,
      icon: isVip ? '👤' : '👑',
      severity: 'info',
    });

    showToast(`👑 ${cust.firstName} ${isVip ? 'removed from VIP tier' : 'promoted to VIP tier'}!`);
  };

  const handleSendEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    commerceEngine.activity.logEvent({
      storeId,
      type: 'customer_registered',
      title: `Sent Email to ${selectedCustomer.email}`,
      description: `Subject: "${emailSubject}"`,
      icon: '✉️',
      severity: 'info',
    });

    setEmailModalOpen(false);
    showToast(`✉️ Email dispatched to ${selectedCustomer.email}!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', color: '#FFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>👥</span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Customer CRM & Segmentation
            </h1>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Unified customer profiles, lifetime value aggregation, and automated VIP segmentation.
          </p>
        </div>

        <button
          onClick={() => setAddCustomerOpen(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)',
            color: '#000000',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 0 16px rgba(212, 175, 55, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>+</span>
          <span>Add New Customer</span>
        </button>
      </div>

      {toastMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, textTransform: 'uppercase' }}>Total Customers</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px' }}>{customerList.length}</div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, textTransform: 'uppercase' }}>VIP High-Value</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#D4AF37' }}>
            {customerList.filter((c) => c.tags.includes('vip') || c.totalSpent > 500).length}
          </div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, textTransform: 'uppercase' }}>Avg Lifetime Value</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#10B981' }}>
            ${customerList.length > 0 ? (customerList.reduce((acc, c) => acc + c.totalSpent, 0) / customerList.length).toFixed(2) : '0.00'}
          </div>
        </div>
        <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600, textTransform: 'uppercase' }}>Repeat Purchase Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: '#38BDF8' }}>
            {customerList.length > 0 ? `${Math.round((customerList.filter((c) => c.totalOrders > 1).length / customerList.length) * 100)}%` : '0%'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          type="text"
          placeholder="Search customers by name, email, tag (e.g. VIP)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#FFF',
            fontSize: '13px',
          }}
        />
      </div>

      {/* Customers Table */}
      <div style={{ borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Customer Name</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Email Address</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Orders Count</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Total Spent (LTV)</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Segment Tags</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: 'pointer',
                  background: selectedCustomerId === c.id ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                }}
                onClick={() => setSelectedCustomerId(c.id)}
              >
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '12px' }}>
                      {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                    </div>
                    <span>{c.firstName} {c.lastName}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.7)' }}>{c.email}</td>
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>{c.totalOrders} orders</td>
                <td style={{ padding: '16px 20px', fontWeight: 800, color: '#D4AF37' }}>${c.totalSpent.toFixed(2)}</td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {c.tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: tag === 'vip' ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                          color: tag === 'vip' ? '#D4AF37' : '#FFF',
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCustomerId(c.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFF',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    View Profile →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 100,
          }}
          onClick={() => setSelectedCustomerId(null)}
        >
          <div
            style={{
              width: '480px',
              maxWidth: '100%',
              height: '100%',
              background: '#161618',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Customer Profile</h2>
              <button
                onClick={() => setSelectedCustomerId(null)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#D4AF37', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '18px' }}>
                {selectedCustomer.firstName.charAt(0)}{selectedCustomer.lastName.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 800 }}>{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>{selectedCustomer.email}</div>
              </div>
              <button
                onClick={() => handleToggleVip(selectedCustomer)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: selectedCustomer.tags.includes('vip') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(212, 175, 55, 0.2)',
                  border: selectedCustomer.tags.includes('vip') ? '1px solid #EF4444' : '1px solid #D4AF37',
                  color: selectedCustomer.tags.includes('vip') ? '#EF4444' : '#D4AF37',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {selectedCustomer.tags.includes('vip') ? 'Remove VIP' : '👑 Make VIP'}
              </button>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setEmailModalOpen(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <span>✉️</span>
                <span>Send Direct Email</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>LIFETIME VALUE</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37', marginTop: '4px' }}>${selectedCustomer.totalSpent.toFixed(2)}</div>
              </div>
              <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>ORDERS PLACED</div>
                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>{selectedCustomer.totalOrders}</div>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.6)' }}>
                Primary Shipping Address
              </h4>
              {selectedCustomer.addresses[0] ? (
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.85)' }}>
                  {selectedCustomer.addresses[0].addressLine1}<br />
                  {selectedCustomer.addresses[0].city}, {selectedCustomer.addresses[0].state} {selectedCustomer.addresses[0].postalCode}<br />
                  {selectedCustomer.addresses[0].country}
                </p>
              ) : (
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>No saved address</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {addCustomerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setAddCustomerOpen(false)}
        >
          <form
            onSubmit={handleCreateCustomerSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '460px',
              maxWidth: '100%',
              background: '#161618',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #D4AF37',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Add New Customer</h3>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Helena"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Last Name</label>
                <input
                  type="text"
                  placeholder="e.g. Vance"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Email Address *</label>
              <input
                type="email"
                required
                placeholder="e.g. helena@aura-luxury.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Segment Tag</label>
                <select
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                >
                  <option value="vip">👑 VIP High Spender</option>
                  <option value="first_time">✨ First-Time</option>
                  <option value="wholesale">📦 Wholesale Partner</option>
                  <option value="patron">👤 Standard Patron</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setAddCustomerOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 2, padding: '10px', borderRadius: '6px', background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Create Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Direct Email Modal */}
      {emailModalOpen && selectedCustomer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setEmailModalOpen(false)}
        >
          <form
            onSubmit={handleSendEmailSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '460px',
              maxWidth: '100%',
              background: '#161618',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #D4AF37',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Send Direct Email</h3>
                <span style={{ fontSize: '11px', color: '#D4AF37' }}>To: {selectedCustomer.email}</span>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Subject *</label>
              <input
                type="text"
                required
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>Message Body *</label>
              <textarea
                rows={4}
                required
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 2, padding: '10px', borderRadius: '6px', background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Dispatch Email
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
