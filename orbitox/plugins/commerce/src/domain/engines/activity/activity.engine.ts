export type ActivityEventType =
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'order_placed'
  | 'order_paid'
  | 'order_shipped'
  | 'order_delivered'
  | 'discount_created'
  | 'discount_applied'
  | 'page_published'
  | 'theme_changed'
  | 'logic_rule_added'
  | 'automation_triggered'
  | 'media_uploaded'
  | 'cart_recovered'
  | 'customer_registered'
  | 'customer_updated';

export interface ActivityEvent {
  id: string;
  storeId: string;
  type: ActivityEventType;
  title: string;
  description: string;
  icon: string;
  severity: 'info' | 'success' | 'warning' | 'alert';
  timestamp: string;
  actorId?: string;
  link?: string;
  metadata?: Record<string, any>;
}

export class ActivityEngine {
  private events: ActivityEvent[] = [];

  constructor() {
    // Seed initial activity feed
    const now = Date.now();
    const seedEvents: ActivityEvent[] = [
      {
        id: 'act_1',
        storeId: 'store_aura_luxury',
        type: 'page_published',
        title: 'Storefront Published v3',
        description: 'New homepage runway drop & mobile navigation layout pushed live.',
        icon: '🚀',
        severity: 'success',
        timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
        link: '/commerce/store/builder',
      },
      {
        id: 'act_2',
        storeId: 'store_aura_luxury',
        type: 'order_placed',
        title: 'New High-Value Order #1892',
        description: 'Victoria S. purchased Cashmere Overcoat ($1,450.00).',
        icon: '💰',
        severity: 'success',
        timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
        link: '/commerce/orders',
      },
      {
        id: 'act_3',
        storeId: 'store_aura_luxury',
        type: 'automation_triggered',
        title: 'VIP Auto-Segment Upgrade',
        description: 'Customer Victoria S. tagged as VIP Patron (Lifetime Spend > $1,000).',
        icon: '👑',
        severity: 'info',
        timestamp: new Date(now - 44 * 60 * 1000).toISOString(),
        link: '/commerce/customers',
      },
      {
        id: 'act_4',
        storeId: 'store_aura_luxury',
        type: 'discount_applied',
        title: 'Promo Code WELCOME25 Redeemed',
        description: 'Coupon WELCOME25 applied on Order #1891 ($25.00 discount).',
        icon: '🏷️',
        severity: 'info',
        timestamp: new Date(now - 120 * 60 * 1000).toISOString(),
        link: '/commerce/discounts',
      },
      {
        id: 'act_5',
        storeId: 'store_aura_luxury',
        type: 'product_updated',
        title: 'Inventory Price & Image Synced',
        description: 'Updated pricing and lookbook photography for Silk Satin Evening Dress.',
        icon: '✏️',
        severity: 'info',
        timestamp: new Date(now - 180 * 60 * 1000).toISOString(),
        link: '/commerce/products',
      },
    ];

    this.events = seedEvents;
  }

  logEvent(payload: Omit<ActivityEvent, 'id' | 'timestamp'> & { timestamp?: string }): ActivityEvent {
    const event: ActivityEvent = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: payload.timestamp || new Date().toISOString(),
      ...payload,
    };

    this.events.unshift(event);
    if (this.events.length > 200) {
      this.events = this.events.slice(0, 200);
    }
    return event;
  }

  getRecentActivity(storeId: string, limit: number = 10): ActivityEvent[] {
    return this.events.filter((e) => e.storeId === storeId).slice(0, limit);
  }

  getActivityByType(storeId: string, type: ActivityEventType): ActivityEvent[] {
    return this.events.filter((e) => e.storeId === storeId && e.type === type);
  }
}
