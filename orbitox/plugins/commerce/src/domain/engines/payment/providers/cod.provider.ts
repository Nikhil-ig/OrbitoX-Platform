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

export class CodPaymentProvider implements PaymentProvider {
  readonly id: PaymentProviderType = 'cod';
  readonly name = 'Cash on Delivery (Pay on Arrival)';

  async createPaymentOrder(request: PaymentOrderRequest, _config: PaymentProviderConfig): Promise<PaymentOrderResponse> {
    return {
      success: true,
      provider: 'cod',
      providerOrderId: `cod_${Date.now()}`,
      amount: request.amount,
      currency: request.currency,
      checkoutPayload: {
        isCod: true,
        instructions: 'Please keep exact cash ready upon parcel delivery.',
      },
    };
  }

  async verifyPayment(request: PaymentVerifyRequest, _config: PaymentProviderConfig): Promise<PaymentVerifyResponse> {
    return {
      verified: true,
      paymentId: `cod_receipt_${Date.now()}`,
      status: 'paid',
      amount: 0,
      currency: 'USD',
      rawResponse: { mode: 'cash_on_delivery' },
    };
  }

  async refundPayment(_request: PaymentRefundRequest, _config: PaymentProviderConfig): Promise<PaymentRefundResponse> {
    return {
      success: true,
      refundId: `cod_refund_${Date.now()}`,
      amount: 0,
      status: 'refunded',
    };
  }
}
