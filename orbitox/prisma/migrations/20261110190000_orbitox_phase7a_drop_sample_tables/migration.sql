-- Phase 7A-1: Drop unused Commerce, Celebrations, and Studio sample-plugin tables & enums
-- Forward-only additive chain migration; RDS-compatible (owner-only DROP ... CASCADE).

DROP TABLE IF EXISTS public."StudioSnapshot" CASCADE;
DROP TABLE IF EXISTS public."StudioAsset" CASCADE;
DROP TABLE IF EXISTS public."StudioSection" CASCADE;
DROP TABLE IF EXISTS public."StudioPage" CASCADE;
DROP TABLE IF EXISTS public."StudioProject" CASCADE;

DROP TABLE IF EXISTS public."CelebrationMedia" CASCADE;
DROP TABLE IF EXISTS public."CelebrationOrder" CASCADE;
DROP TABLE IF EXISTS public."CelebrationPricingPlan" CASCADE;
DROP TABLE IF EXISTS public."CelebrationExperienceAnalytics" CASCADE;
DROP TABLE IF EXISTS public."CelebrationWish" CASCADE;
DROP TABLE IF EXISTS public."CelebrationGuest" CASCADE;
DROP TABLE IF EXISTS public."CelebrationExperienceSection" CASCADE;
DROP TABLE IF EXISTS public."CelebrationExperience" CASCADE;
DROP TABLE IF EXISTS public."CelebrationFeatureDefinition" CASCADE;
DROP TABLE IF EXISTS public."CelebrationSectionDefinition" CASCADE;
DROP TABLE IF EXISTS public."CelebrationTheme" CASCADE;
DROP TABLE IF EXISTS public."CelebrationOccasion" CASCADE;
DROP TABLE IF EXISTS public."CelebrationOccasionCategory" CASCADE;

DROP TABLE IF EXISTS public."StoreReview" CASCADE;
DROP TABLE IF EXISTS public."StoreMedia" CASCADE;
DROP TABLE IF EXISTS public."StoreDiscount" CASCADE;
DROP TABLE IF EXISTS public."PaymentTransaction" CASCADE;
DROP TABLE IF EXISTS public."Order" CASCADE;
DROP TABLE IF EXISTS public."Customer" CASCADE;
DROP TABLE IF EXISTS public."Cart" CASCADE;
DROP TABLE IF EXISTS public."ProductVariant" CASCADE;
DROP TABLE IF EXISTS public."Product" CASCADE;
DROP TABLE IF EXISTS public."Collection" CASCADE;
DROP TABLE IF EXISTS public."Category" CASCADE;
DROP TABLE IF EXISTS public."StorePage" CASCADE;
DROP TABLE IF EXISTS public."StoreTheme" CASCADE;
DROP TABLE IF EXISTS public."Store" CASCADE;

DROP TYPE IF EXISTS public."StudioProjectStatus" CASCADE;
DROP TYPE IF EXISTS public."DiscountType" CASCADE;
DROP TYPE IF EXISTS public."FulfillmentStatus" CASCADE;
DROP TYPE IF EXISTS public."PaymentStatus" CASCADE;
DROP TYPE IF EXISTS public."OrderStatus" CASCADE;
DROP TYPE IF EXISTS public."ProductStatus" CASCADE;
DROP TYPE IF EXISTS public."StoreStatus" CASCADE;

