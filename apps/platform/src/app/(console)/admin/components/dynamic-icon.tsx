import React from 'react';
import {
  HospitalIcon,
  ShoppingBagIcon,
  BriefcaseIcon,
  UtensilsIcon,
  CreditCardIcon,
  PackageIcon,
  UsersIcon,
  GraduationCapIcon,
  MonitorIcon,
  GlobeIcon,
  BuildingIcon,
  KeyIcon,
  ShieldIcon,
  ShieldCheckIcon,
  ZapIcon,
  SlidersIcon,
  HardDriveIcon,
  ServerIcon,
  HeartPulseIcon,
  GemIcon,
  StoreIcon,
  FlameIcon,
  ActivityIcon,
  PillIcon,
  SparklesIcon,
  RocketIcon,
  CpuIcon,
  IconProps,
} from './icons';

interface DynamicIconProps extends IconProps {
  name: string;
}

export function DynamicIcon({ name, size = 20, color = 'currentColor', ...props }: DynamicIconProps) {
  const normalized = (name || '').toLowerCase().trim();

  // Map slugs, names, or legacy emojis to precision SVG icons
  switch (normalized) {
    // Healthcare / Hospital
    case 'hospitals':
    case 'hospital':
    case 'healthcare':
    case 'hms':
    case '🏥':
    case '🩺':
    case '🛏️':
    case '🏨':
      return <HospitalIcon size={size} color={color} {...props} />;

    case 'heart':
    case 'pulse':
    case 'vital':
      return <HeartPulseIcon size={size} color={color} {...props} />;

    case 'pill':
    case 'medicine':
    case 'pharmacy':
    case '💊':
      return <PillIcon size={size} color={color} {...props} />;

    // E-Commerce
    case 'ecommerce':
    case 'e-commerce':
    case 'commerce':
    case 'store':
    case 'shop':
    case '🛍️':
    case '🛒':
      return <ShoppingBagIcon size={size} color={color} {...props} />;

    case 'luxury':
    case 'gem':
    case 'diamond':
    case 'jewelry':
    case '💎':
      return <GemIcon size={size} color={color} {...props} />;

    case 'furniture':
    case 'decor':
    case 'interior':
    case '🪑':
      return <StoreIcon size={size} color={color} {...props} />;

    case 'organic':
    case 'botanical':
    case 'wellness':
    case 'herb':
    case '🌿':
      return <SparklesIcon size={size} color={color} {...props} />;

    // CRM / Business Sales
    case 'sales':
    case 'crm':
    case 'business':
    case 'corporate':
    case '💼':
      return <BriefcaseIcon size={size} color={color} {...props} />;

    // Restaurant / Dining
    case 'restaurant':
    case 'dining':
    case 'food':
    case 'cafe':
    case 'bistro':
    case '🍽️':
    case '🍕':
    case '🍜':
    case '🌮':
      return <UtensilsIcon size={size} color={color} {...props} />;

    // Finance / Banking
    case 'finance':
    case 'fintech':
    case 'payments':
    case 'billing':
    case 'invoices':
    case '💳':
      return <CreditCardIcon size={size} color={color} {...props} />;

    // Logistics / Inventory
    case 'logistics':
    case 'inventory':
    case 'supply':
    case 'shipping':
    case 'warehouse':
    case '📦':
      return <PackageIcon size={size} color={color} {...props} />;

    // HR / People
    case 'hr':
    case 'hrms':
    case 'people':
    case 'staff':
    case 'employees':
    case 'users':
    case 'team':
    case '👥':
      return <UsersIcon size={size} color={color} {...props} />;

    // Education
    case 'education':
    case 'school':
    case 'academy':
    case 'learning':
    case 'university':
    case '🎓':
    case '📚':
      return <GraduationCapIcon size={size} color={color} {...props} />;

    // Retail / POS
    case 'retail':
    case 'pos':
    case 'pos-system':
    case 'terminal':
    case '🖥️':
    case '🏬':
      return <MonitorIcon size={size} color={color} {...props} />;

    // Security & Auth
    case 'security':
    case 'shield':
    case 'defense':
    case 'audit':
    case '🛡️':
    case '🔐':
    case '🔒':
      return <ShieldCheckIcon size={size} color={color} {...props} />;

    // Key / Credentials
    case 'key':
    case 'keys':
    case 'credential':
    case 'api-key':
    case 'api-keys':
    case '🔑':
      return <KeyIcon size={size} color={color} {...props} />;

    // Zap / API Volume
    case 'zap':
    case 'lightning':
    case 'api':
    case 'calls':
    case 'throughput':
    case 'endpoints':
    case '⚡':
      return <ZapIcon size={size} color={color} {...props} />;

    // Storage / Disk
    case 'storage':
    case 'disk':
    case 'drive':
    case 'database':
    case 'db':
    case '💾':
      return <HardDriveIcon size={size} color={color} {...props} />;

    // Global / DNS / Network
    case 'globe':
    case 'network':
    case 'dns':
    case 'anycast':
    case 'edge':
    case '🌐':
      return <GlobeIcon size={size} color={color} {...props} />;

    // Sliders / Quotas
    case 'quota':
    case 'quotas':
    case 'limit':
    case 'slider':
    case 'tune':
    case 'overview':
    case '📊':
    case '📈':
    case '🎚️':
      return <SlidersIcon size={size} color={color} {...props} />;

    // Architecture / Kernel
    case 'architecture':
    case 'kernel':
    case 'cpu':
    case 'system':
    case '🏗️':
      return <CpuIcon size={size} color={color} {...props} />;

    case 'activity':
      return <ActivityIcon size={size} color={color} {...props} />;

    case 'rocket':
    case 'launch':
    case '🚀':
      return <RocketIcon size={size} color={color} {...props} />;

    default:
      return <BuildingIcon size={size} color={color} {...props} />;
  }
}
