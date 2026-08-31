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

export class StripeProvider implements PaymentProvider {
  readonly id: PaymentProviderType = 'stripe';
  readonly name = 'Stripe Payments';

  async createPaymentOrder(request: PaymentOrderRequest, config: PaymentProviderConfig): Promise<PaymentOrderResponse> {
    const clientSecret = `pi_${Date.now()}_secret_${Math.random().toString(36).substring(2, 10)}`;

    return {
      success: true,
      provider: 'stripe',
      providerOrderId: `pi_${Date.now()}`,
      amount: request.amount,
      currency: request.currency,
      checkoutPayload: {
        clientSecret,
        publishableKey: config.credentials.publishableKey || 'pk_test_placeholder',
      },
    };
  }

  async verifyPayment(request: PaymentVerifyRequest, _config: PaymentProviderConfig): Promise<PaymentVerifyResponse> {
    const isValid = Boolean(request.paymentId);
    return {
      verified: isValid,
      paymentId: request.paymentId,
      status: isValid ? 'paid' : 'failed',
      amount: 0,
      currency: 'USD',
      rawResponse: { provider: 'stripe', verifiedAt: new Date().toISOString() },
    };
  }

  async refundPayment(request: PaymentRefundRequest, _config: PaymentProviderConfig): Promise<PaymentRefundResponse> {
    return {
      success: true,
      refundId: `re_${Date.now()}`,
      amount: request.amount || 0,
      status: 'refunded',
    };
  }
}
