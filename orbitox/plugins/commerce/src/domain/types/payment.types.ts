export type PaymentProviderType = 'mock' | 'razorpay' | 'stripe' | 'cod' | 'custom';

export interface PaymentCredentials {
  apiKey?: string;
  apiSecret?: string;
  publishableKey?: string;
  webhookSecret?: string;
  merchantId?: string;
  mode?: 'test' | 'live';
}

export interface PaymentProviderConfig {
  provider: PaymentProviderType;
  enabled: boolean;
  displayName: string;
  description?: string;
  credentials: PaymentCredentials;
}

export interface PaymentOrderRequest {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerPhone?: string;
  receiptNumber: string;
  metadata?: Record<string, any>;
}

export interface PaymentOrderResponse {
  success: boolean;
  provider: PaymentProviderType;
  providerOrderId: string;
  amount: number;
  currency: string;
  checkoutPayload?: Record<string, any>; // Client SDK parameters
  error?: string;
}

export interface PaymentVerifyRequest {
  orderId: string;
  providerOrderId: string;
  paymentId: string;
  signature?: string;
}

export interface PaymentVerifyResponse {
  verified: boolean;
  paymentId: string;
  status: 'paid' | 'failed';
  amount: number;
  currency: string;
  rawResponse?: any;
  error?: string;
}

export interface PaymentRefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: 'refunded' | 'failed';
  error?: string;
}

/**
 * Universal Payment Provider Interface
 */
export interface PaymentProvider {
  readonly id: PaymentProviderType;
  readonly name: string;
  createPaymentOrder(request: PaymentOrderRequest, config: PaymentProviderConfig): Promise<PaymentOrderResponse>;
  verifyPayment(request: PaymentVerifyRequest, config: PaymentProviderConfig): Promise<PaymentVerifyResponse>;
  refundPayment(request: PaymentRefundRequest, config: PaymentProviderConfig): Promise<PaymentRefundResponse>;
}
