import {
  PaymentProvider,
  PaymentProviderType,
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  PaymentRefundRequest,
  PaymentRefundResponse,
  PaymentProviderConfig,
} from '../../../types/payment.types';

export class MockPaymentProvider implements PaymentProvider {
  readonly id: PaymentProviderType = 'mock';
  readonly name = 'Test Simulation Gateway (Instant)';

  async createPaymentOrder(request: PaymentOrderRequest, _config: PaymentProviderConfig): Promise<PaymentOrderResponse> {
    return {
      success: true,
      provider: 'mock',
      providerOrderId: `mock_order_${globalThis.crypto.randomUUID()}`,
      amount: request.amount,
      currency: request.currency,
      checkoutPayload: {
        mode: 'test',
        autoApprove: true,
      },
    };
  }

  async verifyPayment(request: PaymentVerifyRequest, _config: PaymentProviderConfig): Promise<PaymentVerifyResponse> {
    return {
      verified: true,
      paymentId: request.paymentId || `mock_pay_${Date.now()}`,
      status: 'paid',
      amount: 100,
      currency: 'USD',
      rawResponse: { simulated: true, verifiedAt: new Date().toISOString() },
    };
  }

  async refundPayment(request: PaymentRefundRequest, _config: PaymentProviderConfig): Promise<PaymentRefundResponse> {
    return {
      success: true,
      refundId: `mock_ref_${Date.now()}`,
      amount: request.amount || 0,
      status: 'refunded',
    };
  }
}
