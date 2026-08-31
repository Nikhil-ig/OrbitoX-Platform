import { useState, useEffect, useCallback } from 'react';
import { Cart, AddToCartPayload } from '../domain/types/cart.types';
import { commerceEngine } from '../domain/commerce.engine';

export function useCommerceCart(storeId: string, sessionId: string = 'guest_session_1') {
  const [cart, setCart] = useState<Cart | null>(null);

  const refreshCart = useCallback(() => {
    if (!storeId) return;
    const c = commerceEngine.cart.getOrCreateCart(storeId, sessionId);
    setCart({ ...c });
  }, [storeId, sessionId]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = (payload: AddToCartPayload) => {
    if (!cart) return;
    const updated = commerceEngine.cart.addItem(cart.id, payload);
    setCart({ ...updated });
    return updated;
  };

  const updateQuantity = (lineItemId: string, quantity: number) => {
    if (!cart) return;
    const updated = commerceEngine.cart.updateItemQuantity(cart.id, lineItemId, quantity);
    setCart({ ...updated });
    return updated;
  };

  const removeItem = (lineItemId: string) => {
    if (!cart) return;
    const updated = commerceEngine.cart.removeItem(cart.id, lineItemId);
    setCart({ ...updated });
    return updated;
  };

  const clearCart = () => {
    if (!cart) return;
    const updated = commerceEngine.cart.clearCart(cart.id);
    setCart({ ...updated });
    return updated;
  };

  const applyDiscount = (code: string) => {
    if (!cart) return;
    const updated = commerceEngine.cart.applyDiscountCode(cart.id, code);
    setCart({ ...updated });
    return updated;
  };

  const removeDiscount = () => {
    if (!cart) return;
    const updated = commerceEngine.cart.removeDiscountCode(cart.id);
    setCart({ ...updated });
    return updated;
  };

  return {
    cart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyDiscount,
    removeDiscount,
    refreshCart,
  };
}
