'use client';

import React, { useState } from 'react';
import { useCommerceStore, useCommerceOrders, Order, commerceEngine } from '@orbitox/commerce';

export default function OrdersManagementPage() {
  const { store } = useCommerceStore();
  const storeId = store?.id || 'store_aura_luxury';
  const { orders, updateStatus, markPaid, updateFulfillment } = useCommerceOrders(storeId);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customTrackingNumber, setCustomTrackingNumber] = useState<string>('');
  const [customCarrier, setCustomCarrier] = useState<string>('FedEx Express');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleMarkPaid = (orderId: string) => {
    const updated = markPaid(orderId);
    setSelectedOrder({ ...updated });
    commerceEngine.activity.logEvent({
      storeId,
      type: 'order_paid',
      title: `Order ${updated.orderNumber} Marked Paid`,
      description: `Payment confirmed for $${updated.grandTotal.toFixed(2)}.`,
      icon: '💳',
      severity: 'success',
    });
    showToast(`✓ Order ${updated.orderNumber} marked as paid!`);
  };

  const handleDispatchOrder = (orderId: string) => {
    const tracking = customTrackingNumber.trim() || `TRK-${Math.floor(100000 + Math.random() * 900000)}`;
    const updated = updateFulfillment(orderId, 'fulfilled', tracking, customCarrier);
    setSelectedOrder({ ...updated });
    setCustomTrackingNumber('');

    commerceEngine.activity.logEvent({
      storeId,
      type: 'order_shipped',
      title: `Order ${updated.orderNumber} Dispatched`,
      description: `Shipped via ${customCarrier} (Tracking: ${tracking}).`,
      icon: '🚚',
      severity: 'info',
    });
    showToast(`🚚 Order ${updated.orderNumber} shipped via ${customCarrier}!`);
  };

  const handleMarkDelivered = (orderId: string) => {
    const updated = updateStatus(orderId, 'delivered');
    setSelectedOrder({ ...updated });

    commerceEngine.activity.logEvent({
      storeId,
      type: 'order_delivered',
      title: `Order ${updated.orderNumber} Delivered`,
      description: `Customer package marked as delivered.`,
      icon: '📦',
      severity: 'success',
    });
    showToast(`📦 Order ${updated.orderNumber} marked as delivered!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#FFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Orders & Fulfillment Pipeline
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', margin: 0 }}>
            Manage incoming transactions, custom tracking numbers, carriers, payment captures, and audit timelines.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: filterStatus === st ? '#D4AF37' : 'rgba(255, 255, 255, 0.05)',
                color: filterStatus === st ? '#000000' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {st}
            </button>
          ))}
        </div>
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

      {/* Search Input Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <input
          type="text"
          placeholder="Search by order #, customer name, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '6px',
            background: '#000',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#FFF',
            fontSize: '12px',
          }}
        />
        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
          Showing {filteredOrders.length} of {orders.length} orders
        </span>
      </div>

      {/* Orders Table & Detail Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 400px' : '1fr', gap: '16px' }}>
        {/* Table */}
        <div
          style={{
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {filteredOrders.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)' }}>
              No orders matching this filter.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>
                  <th style={{ padding: '14px 16px' }}>Order #</th>
                  <th style={{ padding: '14px 16px' }}>Customer</th>
                  <th style={{ padding: '14px 16px' }}>Items</th>
                  <th style={{ padding: '14px 16px' }}>Total</th>
                  <th style={{ padding: '14px 16px' }}>Payment</th>
                  <th style={{ padding: '14px 16px' }}>Fulfillment</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const isSelected = selectedOrder?.id === ord.id;
                  return (
                    <tr
                      key={ord.id}
                      onClick={() => setSelectedOrder(ord)}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isSelected ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#D4AF37' }}>{ord.orderNumber}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{ord.shippingAddress.firstName} {ord.shippingAddress.lastName}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>{ord.customerEmail}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{ord.items.length} items</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>${ord.grandTotal.toFixed(2)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: ord.paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: ord.paymentStatus === 'paid' ? '#10B981' : '#F59E0B',
                          }}
                        >
                          {ord.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: ord.status === 'delivered' ? 'rgba(16, 185, 129, 0.15)' : ord.status === 'shipped' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                            color: ord.status === 'delivered' ? '#10B981' : ord.status === 'shipped' ? '#3B82F6' : '#FFF',
                          }}
                        >
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(ord);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#FFF',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Order Detail Inspector Panel */}
        {selectedOrder && (
          <div
            style={{
              borderRadius: '16px',
              background: '#16181F',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              overflowY: 'auto',
              maxHeight: '85vh',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#D4AF37' }}>{selectedOrder.orderNumber}</span>
                <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', margin: '2px 0 0 0' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Quick Actions & Fulfillment Dispatcher */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <span style={{ fontSize: '11px', color: '#D4AF37', textTransform: 'uppercase', fontWeight: 800 }}>
                ⚡ Fulfillment & Dispatch Controls
              </span>

              {/* Payment Button */}
              {selectedOrder.paymentStatus !== 'paid' && (
                <button
                  onClick={() => handleMarkPaid(selectedOrder.id)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10B981',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark Payment as Paid ($ {selectedOrder.grandTotal.toFixed(2)}) ✓
                </button>
              )}

              {/* Dispatch Section */}
              {selectedOrder.status !== 'shipped' && selectedOrder.status !== 'delivered' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <select
                      value={customCarrier}
                      onChange={(e) => setCustomCarrier(e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: '6px', background: '#000', border: '1px solid #444', color: '#FFF', fontSize: '11px' }}
                    >
                      <option value="FedEx Express">FedEx Express</option>
                      <option value="DHL Priority">DHL Priority</option>
                      <option value="UPS Next Day">UPS Next Day</option>
                      <option value="USPS Priority">USPS Priority</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Tracking # (optional)"
                      value={customTrackingNumber}
                      onChange={(e) => setCustomTrackingNumber(e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: '6px', background: '#000', border: '1px solid #444', color: '#FFF', fontSize: '11px' }}
                    />
                  </div>

                  <button
                    onClick={() => handleDispatchOrder(selectedOrder.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
                      border: 'none',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Dispatch Order via {customCarrier} 🚚
                  </button>
                </div>
              )}

              {selectedOrder.status === 'shipped' && (
                <button
                  onClick={() => handleMarkDelivered(selectedOrder.id)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10B981',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Mark Delivered to Customer 📦
                </button>
              )}
            </div>

            {/* Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>
                Purchased Items ({selectedOrder.items.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.title} style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#333' }} />
                      )}
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                          Qty: {item.quantity} {item.variantTitle && `• ${item.variantTitle}`}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#D4AF37' }}>${item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer & Shipping */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>
                Delivery Address
              </span>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.85)' }}>
                {selectedOrder.shippingAddress.addressLine1}, {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.postalCode}
              </p>
              <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.5)' }}>Phone: {selectedOrder.shippingAddress.phone}</p>
            </div>

            {/* Cryptographic Audit Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>
                Audit Timeline
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedOrder.timeline.map((evt) => (
                  <div key={evt.id} style={{ fontSize: '11px', borderLeft: '2px solid #D4AF37', paddingLeft: '8px' }}>
                    <div style={{ fontWeight: 700 }}>{evt.title}</div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.4)' }}>{new Date(evt.timestamp).toLocaleTimeString()} • {evt.actor}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
