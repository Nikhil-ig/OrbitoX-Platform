export interface DomainEvent<T = any> {
  id: string;
  sequence: number;
  type: string;
  timestamp: string;
  producer: string;
  branchId: string;
  floorId?: string;
  tableNumber?: string;
  tenantId?: string;
  payload: T;
}

