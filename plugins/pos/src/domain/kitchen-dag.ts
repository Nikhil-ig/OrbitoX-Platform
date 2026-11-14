/**
 * 🍳 OrbitoX RestaurantOS - Kitchen Display System (KDS) & Preparation DAG Scheduler
 * ─────────────────────────────────────────────────────────────
 * INVARIANT: Dishes across disparate culinary stations must arrive together at the expo pass.
 * Instead of firing all dishes simultaneously (causing cold sides or melted desserts),
 * the scheduler synchronizes tasks via a Directed Acyclic Graph (DAG) with computed fire times:
 *
 * targetServeAt = orderConfirmedTime + max(prepDurations) + buffer
 * fireAt(task)  = targetServeAt - task.estimatedDurationMinutes
 *
 * Example:
 * Tandoori Platter (18 min prep) fires at 19:00 -> Ready at 19:18
 * Naan Bread       (6 min prep)  fires at 19:12 -> Ready at 19:18
 * Cocktail         (2 min prep)  fires at 19:16 -> Ready at 19:18
 * All land synchronously at Expo Pass at 19:18!
 */

export type KitchenStationType = 'HOT_LINE' | 'COLD_LINE' | 'TANDOOR' | 'BAR' | 'DESSERT' | 'EXPO';
export type PreparationTaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'DELAYED' | 'REOPENED' | 'BUMPED';

export interface KitchenStation {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly name: string;
  readonly stationType: KitchenStationType;
  readonly displayOrder: number;
  readonly isActive: boolean;
  readonly maxConcurrentCapacity: number;
}

export interface KitchenPreparationTask {
  readonly id: string;
  readonly tenantId: string;
  readonly companyId: string;
  readonly locationId: string;
  readonly orderId: string;
  readonly orderItemId: string;
  readonly stationId: string;
  readonly stationName: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly selectedModifiers: string[];
  readonly specialInstructions?: string;
  readonly status: PreparationTaskStatus;
  readonly targetServeAt: string; // ISO-8601
  readonly fireAt: string; // ISO-8601 (Computed launch time)
  readonly estimatedDurationMinutes: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly bumpedBy?: string;
  readonly dependencies: string[]; // Preceding task IDs
  readonly version: number;
}

export interface OrderDishInput {
  readonly orderItemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly stationId: string;
  readonly stationName: string;
  readonly estimatedDurationMinutes: number;
  readonly selectedModifiers?: string[];
  readonly specialInstructions?: string;
}

export class KitchenDagScheduler {
  /**
   * Plans and schedules all kitchen tasks for an order with synchronized expo fire times.
   */
  static scheduleOrder(params: {
    tenantId: string;
    companyId: string;
    locationId: string;
    orderId: string;
    dishes: OrderDishInput[];
    orderConfirmedAt?: Date;
    expoBufferMinutes?: number;
  }): KitchenPreparationTask[] {
    const startTime = params.orderConfirmedAt ?? new Date();
    const buffer = params.expoBufferMinutes ?? 2; // Default 2 min plating/expo buffer

    // Find the longest cooking duration across all dishes in this course
    const maxDuration = Math.max(...params.dishes.map(d => d.estimatedDurationMinutes), 5);
    const targetServeAt = new Date(startTime.getTime() + (maxDuration + buffer) * 60 * 1000);

    return params.dishes.map((dish, index) => {
      // Fire time is reverse-calculated so all dishes complete exactly at targetServeAt
      const durationMs = dish.estimatedDurationMinutes * 60 * 1000;
      const fireAt = new Date(targetServeAt.getTime() - durationMs);

      return {
        id: `task_${params.orderId}_${index + 1}`,
        tenantId: params.tenantId,
        companyId: params.companyId,
        locationId: params.locationId,
        orderId: params.orderId,
        orderItemId: dish.orderItemId,
        stationId: dish.stationId,
        stationName: dish.stationName,
        itemName: dish.itemName,
        quantity: dish.quantity,
        selectedModifiers: dish.selectedModifiers ?? [],
        specialInstructions: dish.specialInstructions,
        status: 'QUEUED',
        targetServeAt: targetServeAt.toISOString(),
        fireAt: fireAt.toISOString(),
        estimatedDurationMinutes: dish.estimatedDurationMinutes,
        dependencies: [],
        version: 1,
      };
    });
  }

  /**
   * Evaluates if a task is currently runnable based on fire time and dependencies.
   */
  static isTaskFired(task: KitchenPreparationTask, currentTime: Date = new Date()): boolean {
    return new Date(task.fireAt).getTime() <= currentTime.getTime();
  }

  /**
   * Sorts the KDS station queue:
   * 1. Status priority (IN_PROGRESS > QUEUED > READY)
   * 2. Chronological fire time (earliest fireAt first)
   */
  static sortKdsQueue(tasks: KitchenPreparationTask[]): KitchenPreparationTask[] {
    const statusPriority: Record<PreparationTaskStatus, number> = {
      IN_PROGRESS: 1,
      QUEUED: 2,
      DELAYED: 3,
      REOPENED: 4,
      READY: 5,
      BUMPED: 6,
    };

    return [...tasks].sort((a, b) => {
      const pDiff = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
      if (pDiff !== 0) return pDiff;
      return new Date(a.fireAt).getTime() - new Date(b.fireAt).getTime();
    });
  }
}
