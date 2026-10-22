/**
 * 🪐 RestaurantOS External Integrations Adapters
 */

export interface ThermalPrinterAdapter {
  printKdsTicket(ticketId: string, payload: any): Promise<boolean>;
}

export interface PaymentGatewayAdapter {
  createSplitPaymentSession(tableNumber: string, amountMinor: number): Promise<{ paymentUrl: string }>;
}

export class MockThermalPrinterAdapter implements ThermalPrinterAdapter {
  async printKdsTicket(ticketId: string, payload: any): Promise<boolean> {
    console.log(`[ThermalPrinter] 🖨️ Printing ESC/POS Ticket ${ticketId}:`, payload.itemName);
    return true;
  }
}

export class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {
  async createSplitPaymentSession(tableNumber: string, amountMinor: number): Promise<{ paymentUrl: string }> {
    return {
      paymentUrl: `https://pay.orbitox.internal/table/${tableNumber}?amount=${amountMinor}`,
    };
  }
}
