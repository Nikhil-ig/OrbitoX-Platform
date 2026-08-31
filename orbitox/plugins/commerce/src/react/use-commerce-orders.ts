import { useState, useEffect, useCallback } from 'react';
import { Order, OrderStatus, FulfillmentStatus } from '../domain/types/order.types';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceOrders(storeId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshOrders = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    const list = commerceEngine.orders.listOrdersByStore(storeId);
    setOrders(list);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const updateStatus = (orderId: string, status: OrderStatus, note?: string) => {
    const updated = commerceEngine.orders.updateOrderStatus(orderId, status, 'Merchant Admin', note);
    refreshOrders();
    return updated;
  };

  const markPaid = (orderId: string, transactionId: string = `tx_${Date.now()}`, provider: string = 'card') => {
    const updated = commerceEngine.orders.markPaymentPaid(orderId, transactionId, provider);
    refreshOrders();
    return updated;
  };

  const updateFulfillment = (orderId: string, status: FulfillmentStatus, trackingNumber?: string, carrier?: string) => {
    const updated = commerceEngine.orders.updateFulfillment(orderId, status, trackingNumber, carrier);
    refreshOrders();
    return updated;
  };

  return {
    orders,
    loading,
    updateStatus,
    markPaid,
    updateFulfillment,
    refreshOrders,
  };
}
