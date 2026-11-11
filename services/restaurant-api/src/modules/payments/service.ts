import type { PaymentsRepository } from './repository';
import { razorpayAdapter } from '../../shared/state';

export class PaymentsService {
  constructor(private repo: PaymentsRepository) {}

  async createPaymentOrder(options: any) {
    return razorpayAdapter.createOrder(options);
  }
}
