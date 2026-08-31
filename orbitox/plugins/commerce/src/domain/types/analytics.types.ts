export interface MetricCard {
  title: string;
  value: string | number;
  changePercent: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: number[];
}

export interface SalesTimeSeriesPoint {
  date: string;
  revenue: number;
  ordersCount: number;
}

export interface TopProductStat {
  id: string;
  title: string;
  imageUrl?: string;
  salesCount: number;
  revenue: number;
  inventory: number;
}

export interface CommerceDashboardAnalytics {
  grossRevenue: MetricCard;
  totalOrders: MetricCard;
  averageOrderValue: MetricCard;
  conversionRate: MetricCard;
  activeVisitors: number;
  salesHistory: SalesTimeSeriesPoint[];
  topProducts: TopProductStat[];
  recentOrdersCount: number;
  lowStockItemsCount: number;
}
