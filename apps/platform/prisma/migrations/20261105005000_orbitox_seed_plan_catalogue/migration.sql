INSERT INTO "Plugin" (
    "id", "pluginId", "name", "description", "version", "status", "createdAt", "updatedAt"
) VALUES
    ('seed_plugin_hms', '@orbitox/hms', 'HospitalOS',
     'Multi-tenant Hospital Management System with RLS, appointments, labs, billing and staff roles',
     '2.3.1', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_plugin_restaurant', '@orbitox/restaurant', 'RestaurantOS',
     'Hospitality & Restaurant POS, Kitchen Display System (KDS) and Floor Management',
     '2.1.0', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("pluginId") DO NOTHING;

INSERT INTO "Plan" (
    "id", "planId", "pluginId", "name", "description", "tier", "priceMinor", "currency",
    "billingInterval", "gracePeriodDays", "suspensionGraceDays", "status", "createdAt", "updatedAt"
) VALUES
    ('seed_plan_hms_starter', 'hms-starter', '@orbitox/hms', 'HospitalOS Starter',
     'Core hospital management for clinics and small hospitals: patient registry, appointments and billing',
     'starter', 990000, 'INR', 'month', 7, 30, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_plan_hms_pro', 'hms-pro', '@orbitox/hms', 'HospitalOS Pro',
     'Comprehensive hospital operating system including diagnostic labs, verification and pharmacy',
     'pro', 2490000, 'INR', 'month', 7, 30, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_plan_restaurant_starter', 'restaurant-starter', '@orbitox/restaurant', 'RestaurantOS Starter',
     'Essential dining, orders, tables and kitchen display for cafes and bistros',
     'starter', 490000, 'INR', 'month', 7, 30, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_plan_restaurant_pro', 'restaurant-pro', '@orbitox/restaurant', 'RestaurantOS Pro',
     'Full restaurant suite with kitchen display, inventory deduction, pos billing and analytics',
     'pro', 1290000, 'INR', 'month', 7, 30, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("planId") DO NOTHING;

INSERT INTO "PlanFeature" ("id", "planId", "featureKey", "description", "enabled", "createdAt") VALUES
    ('seed_pf_hms_starter_patients', 'hms-starter', 'patients', 'Patient registry and demographics', true, CURRENT_TIMESTAMP),
    ('seed_pf_hms_starter_appointments', 'hms-starter', 'appointments', 'Doctor and OPD appointment booking', true, CURRENT_TIMESTAMP),
    ('seed_pf_hms_starter_billing', 'hms-starter', 'billing', 'Patient invoices and cash/card ledger payments', true, CURRENT_TIMESTAMP),
    ('seed_pf_hms_pro_patients', 'hms-pro', 'patients', 'Patient registry and demographics', true, CURRENT_TIMESTAMP),
    ('seed_pf_hms_pro_appointments', 'hms-pro', 'appointments', 'Doctor and OPD appointment booking', true, CURRENT_TIMESTAMP),
    ('seed_pf_hms_pro_billing', 'hms-pro', 'billing', 'Patient invoices and cash/card ledger payments', true, CURRENT_TIMESTAMP),
    ('seed_pf_hms_pro_labs', 'hms-pro', 'labs', 'Lab tests, diagnostic orders and result verification', true, CURRENT_TIMESTAMP),
    ('seed_pf_hms_pro_pharmacy', 'hms-pro', 'pharmacy', 'Clinical pharmacy dispensing and medication inventory', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_starter_orders', 'restaurant-starter', 'orders', 'Dining and takeaway order management', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_starter_menu', 'restaurant-starter', 'menu', 'Dynamic menu catalogue and item pricing', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_starter_tables', 'restaurant-starter', 'tables', 'Table management and floor layout', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_starter_kds', 'restaurant-starter', 'kds', 'Kitchen Display System with real-time bump', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_pro_orders', 'restaurant-pro', 'orders', 'Dining and takeaway order management', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_pro_menu', 'restaurant-pro', 'menu', 'Dynamic menu catalogue and item pricing', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_pro_tables', 'restaurant-pro', 'tables', 'Table management and floor layout', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_pro_kds', 'restaurant-pro', 'kds', 'Kitchen Display System with real-time bump', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_pro_inventory', 'restaurant-pro', 'inventory', 'Ingredient tracking and automatic stock deduction', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_pro_analytics', 'restaurant-pro', 'analytics', 'Revenue, sales and table turnover analytics', true, CURRENT_TIMESTAMP),
    ('seed_pf_restaurant_pro_pos', 'restaurant-pro', 'pos', 'Integrated billing, split payments and tax invoice generation', true, CURRENT_TIMESTAMP)
ON CONFLICT ("planId", "featureKey") DO NOTHING;

INSERT INTO "PlanQuota" ("id", "planId", "quotaKey", "limit", "window", "unit", "createdAt") VALUES
    ('seed_pq_hms_starter_patients', 'hms-starter', 'patients', 500, 'none', 'records', CURRENT_TIMESTAMP),
    ('seed_pq_hms_starter_beds', 'hms-starter', 'beds', 20, 'none', 'units', CURRENT_TIMESTAMP),
    ('seed_pq_hms_starter_doctors', 'hms-starter', 'doctors', 10, 'none', 'staff', CURRENT_TIMESTAMP),
    ('seed_pq_hms_starter_api_calls', 'hms-starter', 'api_calls', 10000, 'month', 'requests', CURRENT_TIMESTAMP),
    ('seed_pq_hms_pro_patients', 'hms-pro', 'patients', 5000, 'none', 'records', CURRENT_TIMESTAMP),
    ('seed_pq_hms_pro_beds', 'hms-pro', 'beds', 500, 'none', 'units', CURRENT_TIMESTAMP),
    ('seed_pq_hms_pro_doctors', 'hms-pro', 'doctors', 100, 'none', 'staff', CURRENT_TIMESTAMP),
    ('seed_pq_hms_pro_api_calls', 'hms-pro', 'api_calls', 100000, 'month', 'requests', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_starter_orders', 'restaurant-starter', 'orders', 1000, 'month', 'records', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_starter_tables', 'restaurant-starter', 'tables', 15, 'none', 'units', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_starter_staff', 'restaurant-starter', 'staff', 10, 'none', 'staff', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_starter_api_calls', 'restaurant-starter', 'api_calls', 25000, 'month', 'requests', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_pro_orders', 'restaurant-pro', 'orders', 10000, 'month', 'records', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_pro_tables', 'restaurant-pro', 'tables', 200, 'none', 'units', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_pro_staff', 'restaurant-pro', 'staff', 100, 'none', 'staff', CURRENT_TIMESTAMP),
    ('seed_pq_restaurant_pro_api_calls', 'restaurant-pro', 'api_calls', 250000, 'month', 'requests', CURRENT_TIMESTAMP)
ON CONFLICT ("planId", "quotaKey") DO NOTHING;
