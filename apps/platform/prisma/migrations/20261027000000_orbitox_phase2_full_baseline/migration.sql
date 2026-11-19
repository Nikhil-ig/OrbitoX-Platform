-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('DRAFT', 'ACTIVE', 'MAINTENANCE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('UNFULFILLED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "StudioProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RestaurantTableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "DiningSessionStatus" AS ENUM ('ACTIVE', 'BILL_REQUESTED', 'SETTLING', 'CLOSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "DiningJoinPolicy" AS ENUM ('OPEN_JOIN', 'HOST_APPROVAL', 'STAFF_APPROVAL');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('HOST', 'GUEST', 'STAFF');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommercialState" AS ENUM ('DRAFT', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "FulfillmentState" AS ENUM ('UNFULFILLED', 'PREPARING', 'READY_TO_SERVE', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPaymentState" AS ENUM ('UNPAID', 'AUTHORIZED', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "KitchenState" AS ENUM ('NOT_SENT', 'QUEUED', 'IN_PROGRESS', 'EXPEDITED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ItemPrepStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KitchenStationType" AS ENUM ('HOT_LINE', 'COLD_LINE', 'TANDOOR', 'BAR', 'DESSERT', 'EXPO');

-- CreateEnum
CREATE TYPE "PreparationTaskStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'READY', 'DELAYED', 'REOPENED', 'BUMPED');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('INITIATED', 'AUTHORIZED', 'SETTLED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'DISPATCHED', 'FAILED');

-- CreateEnum
CREATE TYPE "PlatformProjectStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'DEGRADED', 'SUSPENDED', 'ARCHIVED', 'DEPROVISIONING');

-- CreateEnum
CREATE TYPE "EnvironmentTier" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION', 'SANDBOX', 'DISASTER_RECOVERY');

-- CreateEnum
CREATE TYPE "KeyLifecycleState" AS ENUM ('PRE_ACTIVE', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'COMPROMISED', 'REVOKED', 'DESTROYED');

-- CreateEnum
CREATE TYPE "PlatformRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CredentialHealthState" AS ENUM ('HEALTHY', 'EXPIRING_SOON', 'EXPIRED', 'FAILED_VALIDATION', 'ROTATION_PENDING');

-- CreateEnum
CREATE TYPE "PackageStatusState" AS ENUM ('ACTIVE', 'UPGRADING', 'SUSPENDED', 'SECURITY_BLOCKED');

-- CreateEnum
CREATE TYPE "DomainDnsStatus" AS ENUM ('PENDING_DNS', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "TlsCertStatus" AS ENUM ('PENDING', 'ISSUED', 'RENEWING', 'FAILED');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "primaryDomain" TEXT,
    "customDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER NOT NULL DEFAULT 1,
    "activeThemeId" TEXT NOT NULL DEFAULT 'aura-luxury-dark',
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTheme" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "presetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDark" BOOLEAN NOT NULL DEFAULT false,
    "colors" JSONB NOT NULL,
    "typography" JSONB NOT NULL,
    "layout" JSONB NOT NULL,
    "buttons" JSONB NOT NULL,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePage" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "publishedVersion" INTEGER NOT NULL DEFAULT 1,
    "draftVersion" INTEGER NOT NULL DEFAULT 1,
    "sectionsDraft" JSONB NOT NULL,
    "sectionsPublished" JSONB NOT NULL,
    "seo" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ruleType" TEXT NOT NULL DEFAULT 'manual',
    "rules" JSONB,
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "categoryId" TEXT,
    "collectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media" JSONB NOT NULL,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB NOT NULL,
    "trackQuantity" BOOLEAN NOT NULL DEFAULT true,
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 100,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isNewArrival" BOOLEAN NOT NULL DEFAULT true,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "seo" JSONB NOT NULL,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "compareAtPrice" DOUBLE PRECISION,
    "inventoryQuantity" INTEGER NOT NULL DEFAULT 50,
    "imageUrl" TEXT,
    "selectedOptions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "items" JSONB NOT NULL,
    "appliedDiscount" JSONB,
    "totals" JSONB NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "lastOrderAt" TIMESTAMP(3),
    "addresses" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'UNFULFILLED',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "couponCode" TEXT,
    "shippingAddress" JSONB NOT NULL,
    "billingAddress" JSONB NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentTransactionId" TEXT,
    "shippingMethod" TEXT,
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "customerNotes" TEXT,
    "adminNotes" TEXT,
    "timeline" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreDiscount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minOrderAmount" DOUBLE PRECISION,
    "maxDiscountAmount" DOUBLE PRECISION,
    "usageLimit" INTEGER,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreMedia" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "folder" TEXT NOT NULL DEFAULT 'products',
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'approved',
    "isVerifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationOccasionCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationOccasionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationOccasion" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultSections" TEXT[],
    "allowedFeatures" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationOccasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationTheme" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occasionId" TEXT NOT NULL,
    "previewImages" TEXT[],
    "thumbnailUrl" TEXT NOT NULL,
    "styleConfig" JSONB NOT NULL,
    "supportedSections" TEXT[],
    "tier" TEXT NOT NULL DEFAULT 'FREE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "author" TEXT DEFAULT 'OrbitoX Studio',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationSectionDefinition" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'essential',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fields" JSONB NOT NULL,
    "defaultConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationSectionDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationFeatureDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'core',
    "minTier" TEXT NOT NULL DEFAULT 'FREE',
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "priceInr" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationFeatureDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationExperience" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "occasionId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "customDomain" TEXT,
    "customPath" TEXT,
    "passwordProtection" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "eventDate" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "featuresEnabled" TEXT[],
    "styleOverrides" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationExperienceSection" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationExperienceSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationGuest" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "attending" TEXT NOT NULL DEFAULT 'ATTENDING',
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "dietaryRequirements" TEXT,
    "message" TEXT,
    "plusOneName" TEXT,
    "attendedEvents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CelebrationGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationWish" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CelebrationWish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationExperienceAnalytics" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "rsvpCount" INTEGER NOT NULL DEFAULT 0,
    "wishesCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationExperienceAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationPricingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "priceInr" INTEGER NOT NULL DEFAULT 0,
    "maxGuests" INTEGER NOT NULL DEFAULT 50,
    "maxPhotos" INTEGER NOT NULL DEFAULT 15,
    "customDomainAllowed" BOOLEAN NOT NULL DEFAULT false,
    "passwordProtectionAllowed" BOOLEAN NOT NULL DEFAULT false,
    "musicPlayerAllowed" BOOLEAN NOT NULL DEFAULT false,
    "analyticsAllowed" BOOLEAN NOT NULL DEFAULT false,
    "watermarkRemoved" BOOLEAN NOT NULL DEFAULT false,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "features" TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationPricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "experienceId" TEXT,
    "tier" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "taxInr" INTEGER NOT NULL,
    "totalInr" INTEGER NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentProvider" TEXT DEFAULT 'razorpay',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationMedia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "experienceId" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "altText" TEXT,
    "folder" TEXT NOT NULL DEFAULT 'gallery',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CelebrationMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioProject" (
    "id" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "StudioProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER NOT NULL DEFAULT 0,
    "designTokens" JSONB NOT NULL,
    "cmsCollections" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioPage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "ogImageUrl" TEXT,

    CONSTRAINT "StudioPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sceneGraph" JSONB NOT NULL,

    CONSTRAINT "StudioSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "variants" JSONB NOT NULL DEFAULT '{}',
    "usedInNodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "documentSnapshot" JSONB NOT NULL,
    "publishedBy" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "operatingHours" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantServiceArea" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "floorNumber" INTEGER DEFAULT 1,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "serviceAreaId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" "RestaurantTableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "activeSessionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantQRIdentity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "locator" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "redirectUrl" TEXT,
    "securityVersion" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantQRIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantDiningSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "sessionCode" TEXT NOT NULL,
    "status" "DiningSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinPolicy" "DiningJoinPolicy" NOT NULL DEFAULT 'OPEN_JOIN',
    "hostParticipantId" TEXT,
    "accessEpoch" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantDiningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "diningSessionId" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'GUEST',
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "capabilityTokenHash" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionJoinRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "diningSessionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestTokenHash" TEXT NOT NULL,
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantMenu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "channel" TEXT NOT NULL DEFAULT 'DINE_IN',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "schedule" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantCatalogItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "menuId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "basePriceMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "category" TEXT NOT NULL,
    "imageUrl" TEXT,
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietaryFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "maxDailyQuantity" INTEGER,
    "preparationDurationMinutes" INTEGER NOT NULL DEFAULT 10,
    "stationRouting" TEXT NOT NULL DEFAULT 'KITCHEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantModifierGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantModifier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDeltaMinor" BIGINT NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantRecipeBOM" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityRequired" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantRecipeBOM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantInventoryStock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onHandQuantity" DOUBLE PRECISION NOT NULL,
    "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "safetyThreshold" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantInventoryStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPricingQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "resultHash" TEXT NOT NULL,
    "subtotalMinor" BIGINT NOT NULL,
    "taxMinor" BIGINT NOT NULL,
    "serviceFeeMinor" BIGINT NOT NULL DEFAULT 0,
    "discountMinor" BIGINT NOT NULL DEFAULT 0,
    "totalMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "breakdown" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRedeemed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantPricingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "commercialState" "CommercialState" NOT NULL DEFAULT 'SUBMITTED',
    "fulfillmentState" "FulfillmentState" NOT NULL DEFAULT 'UNFULFILLED',
    "paymentState" "OrderPaymentState" NOT NULL DEFAULT 'UNPAID',
    "kitchenState" "KitchenState" NOT NULL DEFAULT 'QUEUED',
    "quoteId" TEXT,
    "idempotencyKey" TEXT,
    "totalMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "specialInstructions" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantOrderItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceMinor" BIGINT NOT NULL,
    "totalMinor" BIGINT NOT NULL,
    "selectedModifiers" JSONB NOT NULL DEFAULT '[]',
    "preparationStatus" "ItemPrepStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenStation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationType" "KitchenStationType" NOT NULL DEFAULT 'HOT_LINE',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxConcurrentCapacity" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KitchenPreparationTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "status" "PreparationTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "targetServeAt" TIMESTAMP(3) NOT NULL,
    "fireAt" TIMESTAMP(3) NOT NULL,
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 10,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "bumpedBy" TEXT,
    "dependencies" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenPreparationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantPaymentRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "orderId" TEXT,
    "participantId" TEXT,
    "paymentGateway" TEXT NOT NULL,
    "gatewayTransactionId" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'INITIATED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantPaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformIdempotencyRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformOutboxMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformOutboxMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformOrganization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "complianceTier" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessModel" TEXT NOT NULL,
    "planTier" TEXT NOT NULL,
    "enabledServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "apiCallQuota" BIGINT,
    "rateLimitPerMin" INTEGER,
    "status" "PlatformProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "technicalLead" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEnvironment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EnvironmentTier" NOT NULL DEFAULT 'DEVELOPMENT',
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "description" TEXT,
    "requireMtls" BOOLEAN NOT NULL DEFAULT false,
    "strictIpAllowlist" BOOLEAN NOT NULL DEFAULT false,
    "enforceFourEyes" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectEnvironment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformApiKey" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "keyType" TEXT NOT NULL DEFAULT 'PROJECT_SCOPED',
    "keyPrefix" TEXT NOT NULL,
    "secretFingerprint" TEXT NOT NULL,
    "authVerifier" TEXT NOT NULL,
    "maskedDisplay" TEXT NOT NULL,
    "status" "KeyLifecycleState" NOT NULL DEFAULT 'ACTIVE',
    "capabilities" TEXT[],
    "ipAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 1200,
    "tenantScope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riskScore" INTEGER NOT NULL DEFAULT 15,
    "riskLevel" "PlatformRiskLevel" NOT NULL DEFAULT 'LOW',
    "riskFactors" JSONB NOT NULL DEFAULT '[]',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "lastUsedIp" TEXT,
    "lastUsedRegion" TEXT,
    "compromisedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlatformApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformCredential" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "envelopeVersion" INTEGER NOT NULL DEFAULT 1,
    "kekIdentifier" TEXT NOT NULL,
    "encryptedDek" TEXT NOT NULL,
    "dekIv" TEXT NOT NULL DEFAULT '',
    "dekTag" TEXT NOT NULL DEFAULT '',
    "initializationVector" TEXT NOT NULL,
    "authenticationTag" TEXT NOT NULL,
    "encryptedCiphertext" TEXT NOT NULL,
    "secretFingerprint" TEXT NOT NULL,
    "maskedDisplay" TEXT NOT NULL,
    "health" "CredentialHealthState" NOT NULL DEFAULT 'HEALTHY',
    "lastRotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRotationDueAt" TIMESTAMP(3) NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),
    "validationError" TEXT,
    "ownerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPackage" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "currentStableVersion" TEXT NOT NULL,
    "signingPublicKeyPem" TEXT NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageVersion" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "tarballSha256" TEXT NOT NULL,
    "manifestHash" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "minPlatformVersion" TEXT NOT NULL,
    "releaseNotes" TEXT,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageInstallation" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "installedVersionId" TEXT NOT NULL,
    "status" "PackageStatusState" NOT NULL DEFAULT 'ACTIVE',
    "configOverrides" JSONB NOT NULL DEFAULT '{}',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackageInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDomain" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "domainName" TEXT NOT NULL,
    "isApex" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "DomainDnsStatus" NOT NULL DEFAULT 'PENDING_DNS',
    "cnameTarget" TEXT NOT NULL,
    "tlsCertificateStatus" "TlsCertStatus" NOT NULL DEFAULT 'PENDING',
    "sslExpiresAt" TIMESTAMP(3),
    "strictLicenseToken" TEXT,
    "edgeLatencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentQuotaPolicy" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "monthlyCallLimit" BIGINT NOT NULL DEFAULT 1000000,
    "monthlyCallsUsed" BIGINT NOT NULL DEFAULT 0,
    "storageQuotaGb" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "storageUsedGb" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "warningThreshold" INTEGER NOT NULL DEFAULT 80,
    "projectedExhaustionDays" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentQuotaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentRateLimitPolicy" (
    "id" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 1200,
    "requestsPerSecondBurst" INTEGER NOT NULL DEFAULT 100,
    "slidingWindowType" TEXT NOT NULL DEFAULT 'HYBRID_REDIS_RAM',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnvironmentRateLimitPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "organizationId" TEXT,
    "projectId" TEXT,
    "environmentId" TEXT,
    "ipAddress" TEXT,
    "requestId" TEXT,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRateLimitBucket" (
    "scopeType" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requestCount" BIGINT NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRateLimitBucket_pkey" PRIMARY KEY ("scopeType","scopeId","windowStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Store_primaryDomain_key" ON "Store"("primaryDomain");

-- CreateIndex
CREATE INDEX "Store_contextId_idx" ON "Store"("contextId");

-- CreateIndex
CREATE INDEX "Store_slug_idx" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "StoreTheme_storeId_idx" ON "StoreTheme"("storeId");

-- CreateIndex
CREATE INDEX "StorePage_storeId_idx" ON "StorePage"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StorePage_storeId_slug_key" ON "StorePage"("storeId", "slug");

-- CreateIndex
CREATE INDEX "Category_storeId_idx" ON "Category"("storeId");

-- CreateIndex
CREATE INDEX "Category_contextId_idx" ON "Category"("contextId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_storeId_slug_key" ON "Category"("storeId", "slug");

-- CreateIndex
CREATE INDEX "Collection_storeId_idx" ON "Collection"("storeId");

-- CreateIndex
CREATE INDEX "Collection_contextId_idx" ON "Collection"("contextId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_storeId_slug_key" ON "Collection"("storeId", "slug");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_contextId_idx" ON "Product"("contextId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "Cart_storeId_sessionId_idx" ON "Cart"("storeId", "sessionId");

-- CreateIndex
CREATE INDEX "Customer_storeId_idx" ON "Customer"("storeId");

-- CreateIndex
CREATE INDEX "Customer_contextId_idx" ON "Customer"("contextId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_storeId_email_key" ON "Customer"("storeId", "email");

-- CreateIndex
CREATE INDEX "Order_storeId_idx" ON "Order"("storeId");

-- CreateIndex
CREATE INDEX "Order_contextId_idx" ON "Order"("contextId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_orderNumber_key" ON "Order"("storeId", "orderNumber");

-- CreateIndex
CREATE INDEX "PaymentTransaction_orderId_idx" ON "PaymentTransaction"("orderId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_storeId_idx" ON "PaymentTransaction"("storeId");

-- CreateIndex
CREATE INDEX "StoreDiscount_storeId_idx" ON "StoreDiscount"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreDiscount_storeId_code_key" ON "StoreDiscount"("storeId", "code");

-- CreateIndex
CREATE INDEX "StoreMedia_storeId_idx" ON "StoreMedia"("storeId");

-- CreateIndex
CREATE INDEX "StoreMedia_contextId_idx" ON "StoreMedia"("contextId");

-- CreateIndex
CREATE INDEX "StoreReview_productId_idx" ON "StoreReview"("productId");

-- CreateIndex
CREATE INDEX "StoreReview_storeId_idx" ON "StoreReview"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationOccasionCategory_slug_key" ON "CelebrationOccasionCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationOccasion_slug_key" ON "CelebrationOccasion"("slug");

-- CreateIndex
CREATE INDEX "CelebrationOccasion_categoryId_idx" ON "CelebrationOccasion"("categoryId");

-- CreateIndex
CREATE INDEX "CelebrationOccasion_status_idx" ON "CelebrationOccasion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationTheme_slug_key" ON "CelebrationTheme"("slug");

-- CreateIndex
CREATE INDEX "CelebrationTheme_occasionId_idx" ON "CelebrationTheme"("occasionId");

-- CreateIndex
CREATE INDEX "CelebrationTheme_tier_idx" ON "CelebrationTheme"("tier");

-- CreateIndex
CREATE INDEX "CelebrationTheme_status_idx" ON "CelebrationTheme"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationSectionDefinition_type_key" ON "CelebrationSectionDefinition"("type");

-- CreateIndex
CREATE INDEX "CelebrationSectionDefinition_category_idx" ON "CelebrationSectionDefinition"("category");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationFeatureDefinition_key_key" ON "CelebrationFeatureDefinition"("key");

-- CreateIndex
CREATE INDEX "CelebrationFeatureDefinition_minTier_idx" ON "CelebrationFeatureDefinition"("minTier");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationExperience_customDomain_key" ON "CelebrationExperience"("customDomain");

-- CreateIndex
CREATE INDEX "CelebrationExperience_tenantId_idx" ON "CelebrationExperience"("tenantId");

-- CreateIndex
CREATE INDEX "CelebrationExperience_occasionId_idx" ON "CelebrationExperience"("occasionId");

-- CreateIndex
CREATE INDEX "CelebrationExperience_themeId_idx" ON "CelebrationExperience"("themeId");

-- CreateIndex
CREATE INDEX "CelebrationExperience_status_idx" ON "CelebrationExperience"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationExperience_tenantId_slug_key" ON "CelebrationExperience"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "CelebrationExperienceSection_experienceId_idx" ON "CelebrationExperienceSection"("experienceId");

-- CreateIndex
CREATE INDEX "CelebrationExperienceSection_order_idx" ON "CelebrationExperienceSection"("order");

-- CreateIndex
CREATE INDEX "CelebrationGuest_experienceId_idx" ON "CelebrationGuest"("experienceId");

-- CreateIndex
CREATE INDEX "CelebrationGuest_tenantId_idx" ON "CelebrationGuest"("tenantId");

-- CreateIndex
CREATE INDEX "CelebrationWish_experienceId_idx" ON "CelebrationWish"("experienceId");

-- CreateIndex
CREATE INDEX "CelebrationWish_tenantId_idx" ON "CelebrationWish"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationExperienceAnalytics_experienceId_key" ON "CelebrationExperienceAnalytics"("experienceId");

-- CreateIndex
CREATE INDEX "CelebrationExperienceAnalytics_tenantId_idx" ON "CelebrationExperienceAnalytics"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationPricingPlan_tier_key" ON "CelebrationPricingPlan"("tier");

-- CreateIndex
CREATE INDEX "CelebrationOrder_tenantId_idx" ON "CelebrationOrder"("tenantId");

-- CreateIndex
CREATE INDEX "CelebrationOrder_experienceId_idx" ON "CelebrationOrder"("experienceId");

-- CreateIndex
CREATE INDEX "CelebrationOrder_paymentStatus_idx" ON "CelebrationOrder"("paymentStatus");

-- CreateIndex
CREATE INDEX "CelebrationMedia_tenantId_idx" ON "CelebrationMedia"("tenantId");

-- CreateIndex
CREATE INDEX "CelebrationMedia_experienceId_idx" ON "CelebrationMedia"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "StudioProject_slug_key" ON "StudioProject"("slug");

-- CreateIndex
CREATE INDEX "StudioProject_contextId_idx" ON "StudioProject"("contextId");

-- CreateIndex
CREATE INDEX "StudioProject_slug_idx" ON "StudioProject"("slug");

-- CreateIndex
CREATE INDEX "StudioPage_projectId_idx" ON "StudioPage"("projectId");

-- CreateIndex
CREATE INDEX "StudioSection_pageId_idx" ON "StudioSection"("pageId");

-- CreateIndex
CREATE INDEX "StudioAsset_projectId_idx" ON "StudioAsset"("projectId");

-- CreateIndex
CREATE INDEX "StudioSnapshot_projectId_version_idx" ON "StudioSnapshot"("projectId", "version");

-- CreateIndex
CREATE INDEX "RestaurantLocation_tenantId_companyId_idx" ON "RestaurantLocation"("tenantId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantLocation_tenantId_companyId_slug_key" ON "RestaurantLocation"("tenantId", "companyId", "slug");

-- CreateIndex
CREATE INDEX "RestaurantServiceArea_tenantId_companyId_idx" ON "RestaurantServiceArea"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "RestaurantServiceArea_locationId_idx" ON "RestaurantServiceArea"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantServiceArea_locationId_code_key" ON "RestaurantServiceArea"("locationId", "code");

-- CreateIndex
CREATE INDEX "RestaurantTable_tenantId_companyId_idx" ON "RestaurantTable"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "RestaurantTable_locationId_serviceAreaId_idx" ON "RestaurantTable"("locationId", "serviceAreaId");

-- CreateIndex
CREATE INDEX "RestaurantTable_status_idx" ON "RestaurantTable"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_locationId_tableNumber_key" ON "RestaurantTable"("locationId", "tableNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantQRIdentity_tableId_key" ON "RestaurantQRIdentity"("tableId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantQRIdentity_locator_key" ON "RestaurantQRIdentity"("locator");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantQRIdentity_tokenHash_key" ON "RestaurantQRIdentity"("tokenHash");

-- CreateIndex
CREATE INDEX "RestaurantQRIdentity_tenantId_locationId_idx" ON "RestaurantQRIdentity"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "RestaurantQRIdentity_locator_idx" ON "RestaurantQRIdentity"("locator");

-- CreateIndex
CREATE INDEX "RestaurantQRIdentity_tokenHash_idx" ON "RestaurantQRIdentity"("tokenHash");

-- CreateIndex
CREATE INDEX "RestaurantDiningSession_tenantId_companyId_idx" ON "RestaurantDiningSession"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "RestaurantDiningSession_locationId_tableId_idx" ON "RestaurantDiningSession"("locationId", "tableId");

-- CreateIndex
CREATE INDEX "RestaurantDiningSession_tableId_status_idx" ON "RestaurantDiningSession"("tableId", "status");

-- CreateIndex
CREATE INDEX "RestaurantDiningSession_status_idx" ON "RestaurantDiningSession"("status");

-- CreateIndex
CREATE INDEX "SessionParticipant_tenantId_locationId_idx" ON "SessionParticipant"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "SessionParticipant_diningSessionId_isActive_idx" ON "SessionParticipant"("diningSessionId", "isActive");

-- CreateIndex
CREATE INDEX "SessionParticipant_capabilityTokenHash_idx" ON "SessionParticipant"("capabilityTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "SessionJoinRequest_requestTokenHash_key" ON "SessionJoinRequest"("requestTokenHash");

-- CreateIndex
CREATE INDEX "SessionJoinRequest_diningSessionId_status_idx" ON "SessionJoinRequest"("diningSessionId", "status");

-- CreateIndex
CREATE INDEX "SessionJoinRequest_tenantId_locationId_idx" ON "SessionJoinRequest"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "RestaurantMenu_tenantId_locationId_isPublished_idx" ON "RestaurantMenu"("tenantId", "locationId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantMenu_locationId_name_version_key" ON "RestaurantMenu"("locationId", "name", "version");

-- CreateIndex
CREATE INDEX "RestaurantCatalogItem_tenantId_locationId_category_idx" ON "RestaurantCatalogItem"("tenantId", "locationId", "category");

-- CreateIndex
CREATE INDEX "RestaurantCatalogItem_locationId_isAvailable_idx" ON "RestaurantCatalogItem"("locationId", "isAvailable");

-- CreateIndex
CREATE INDEX "RestaurantCatalogItem_menuId_idx" ON "RestaurantCatalogItem"("menuId");

-- CreateIndex
CREATE INDEX "RestaurantModifierGroup_itemId_idx" ON "RestaurantModifierGroup"("itemId");

-- CreateIndex
CREATE INDEX "RestaurantModifier_groupId_idx" ON "RestaurantModifier"("groupId");

-- CreateIndex
CREATE INDEX "RestaurantRecipeBOM_tenantId_companyId_idx" ON "RestaurantRecipeBOM"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "RestaurantRecipeBOM_ingredientId_idx" ON "RestaurantRecipeBOM"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantRecipeBOM_itemId_ingredientId_key" ON "RestaurantRecipeBOM"("itemId", "ingredientId");

-- CreateIndex
CREATE INDEX "RestaurantInventoryStock_tenantId_locationId_idx" ON "RestaurantInventoryStock"("tenantId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantInventoryStock_locationId_ingredientId_key" ON "RestaurantInventoryStock"("locationId", "ingredientId");

-- CreateIndex
CREATE INDEX "RestaurantPricingQuote_tenantId_sessionId_idx" ON "RestaurantPricingQuote"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "RestaurantPricingQuote_inputHash_resultHash_idx" ON "RestaurantPricingQuote"("inputHash", "resultHash");

-- CreateIndex
CREATE INDEX "RestaurantPricingQuote_expiresAt_isRedeemed_idx" ON "RestaurantPricingQuote"("expiresAt", "isRedeemed");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOrder_idempotencyKey_key" ON "RestaurantOrder"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RestaurantOrder_tenantId_companyId_idx" ON "RestaurantOrder"("tenantId", "companyId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_locationId_sessionId_idx" ON "RestaurantOrder"("locationId", "sessionId");

-- CreateIndex
CREATE INDEX "RestaurantOrder_sessionId_createdAt_idx" ON "RestaurantOrder"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "RestaurantOrder_commercialState_fulfillmentState_idx" ON "RestaurantOrder"("commercialState", "fulfillmentState");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_orderId_preparationStatus_idx" ON "RestaurantOrderItem"("orderId", "preparationStatus");

-- CreateIndex
CREATE INDEX "RestaurantOrderItem_itemId_idx" ON "RestaurantOrderItem"("itemId");

-- CreateIndex
CREATE INDEX "KitchenStation_tenantId_locationId_isActive_idx" ON "KitchenStation"("tenantId", "locationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenStation_locationId_name_key" ON "KitchenStation"("locationId", "name");

-- CreateIndex
CREATE INDEX "KitchenPreparationTask_stationId_status_fireAt_idx" ON "KitchenPreparationTask"("stationId", "status", "fireAt");

-- CreateIndex
CREATE INDEX "KitchenPreparationTask_orderId_idx" ON "KitchenPreparationTask"("orderId");

-- CreateIndex
CREATE INDEX "KitchenPreparationTask_tenantId_locationId_idx" ON "KitchenPreparationTask"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "RestaurantPaymentRecord_tenantId_locationId_idx" ON "RestaurantPaymentRecord"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "RestaurantPaymentRecord_sessionId_status_idx" ON "RestaurantPaymentRecord"("sessionId", "status");

-- CreateIndex
CREATE INDEX "RestaurantPaymentRecord_gatewayTransactionId_idx" ON "RestaurantPaymentRecord"("gatewayTransactionId");

-- CreateIndex
CREATE INDEX "PlatformIdempotencyRecord_expiresAt_idx" ON "PlatformIdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformIdempotencyRecord_tenantId_key_scope_key" ON "PlatformIdempotencyRecord"("tenantId", "key", "scope");

-- CreateIndex
CREATE INDEX "PlatformOutboxMessage_status_createdAt_idx" ON "PlatformOutboxMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformOutboxMessage_tenantId_aggregateType_aggregateId_idx" ON "PlatformOutboxMessage"("tenantId", "aggregateType", "aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformOrganization_slug_key" ON "PlatformOrganization"("slug");

-- CreateIndex
CREATE INDEX "PlatformOrganization_slug_idx" ON "PlatformOrganization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformProject_slug_key" ON "PlatformProject"("slug");

-- CreateIndex
CREATE INDEX "PlatformProject_organizationId_idx" ON "PlatformProject"("organizationId");

-- CreateIndex
CREATE INDEX "PlatformProject_slug_idx" ON "PlatformProject"("slug");

-- CreateIndex
CREATE INDEX "PlatformProject_status_idx" ON "PlatformProject"("status");

-- CreateIndex
CREATE INDEX "ProjectEnvironment_projectId_idx" ON "ProjectEnvironment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectEnvironment_type_idx" ON "ProjectEnvironment"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectEnvironment_projectId_slug_key" ON "ProjectEnvironment"("projectId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformApiKey_keyId_key" ON "PlatformApiKey"("keyId");

-- CreateIndex
CREATE INDEX "PlatformApiKey_environmentId_idx" ON "PlatformApiKey"("environmentId");

-- CreateIndex
CREATE INDEX "PlatformApiKey_secretFingerprint_idx" ON "PlatformApiKey"("secretFingerprint");

-- CreateIndex
CREATE INDEX "PlatformApiKey_status_idx" ON "PlatformApiKey"("status");

-- CreateIndex
CREATE INDEX "PlatformApiKey_riskLevel_idx" ON "PlatformApiKey"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformApiKey_authVerifier_key" ON "PlatformApiKey"("authVerifier");

-- CreateIndex
CREATE INDEX "PlatformCredential_environmentId_idx" ON "PlatformCredential"("environmentId");

-- CreateIndex
CREATE INDEX "PlatformCredential_provider_idx" ON "PlatformCredential"("provider");

-- CreateIndex
CREATE INDEX "PlatformCredential_health_idx" ON "PlatformCredential"("health");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformPackage_packageId_key" ON "PlatformPackage"("packageId");

-- CreateIndex
CREATE INDEX "PlatformPackage_packageId_idx" ON "PlatformPackage"("packageId");

-- CreateIndex
CREATE INDEX "PackageVersion_packageId_idx" ON "PackageVersion"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "PackageVersion_packageId_version_key" ON "PackageVersion"("packageId", "version");

-- CreateIndex
CREATE INDEX "PackageInstallation_environmentId_idx" ON "PackageInstallation"("environmentId");

-- CreateIndex
CREATE INDEX "PackageInstallation_packageId_idx" ON "PackageInstallation"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "PackageInstallation_environmentId_packageId_key" ON "PackageInstallation"("environmentId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDomain_domainName_key" ON "ProjectDomain"("domainName");

-- CreateIndex
CREATE INDEX "ProjectDomain_environmentId_idx" ON "ProjectDomain"("environmentId");

-- CreateIndex
CREATE INDEX "ProjectDomain_domainName_idx" ON "ProjectDomain"("domainName");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentQuotaPolicy_environmentId_key" ON "EnvironmentQuotaPolicy"("environmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentRateLimitPolicy_environmentId_key" ON "EnvironmentRateLimitPolicy"("environmentId");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_occurredAt_idx" ON "PlatformAuditEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_organizationId_occurredAt_idx" ON "PlatformAuditEvent"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_projectId_occurredAt_idx" ON "PlatformAuditEvent"("projectId", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_entityType_entityId_idx" ON "PlatformAuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PlatformAuditEvent_action_occurredAt_idx" ON "PlatformAuditEvent"("action", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformRateLimitBucket_expiresAt_idx" ON "PlatformRateLimitBucket"("expiresAt");

-- AddForeignKey
ALTER TABLE "StoreTheme" ADD CONSTRAINT "StoreTheme_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePage" ADD CONSTRAINT "StorePage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreDiscount" ADD CONSTRAINT "StoreDiscount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMedia" ADD CONSTRAINT "StoreMedia_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreReview" ADD CONSTRAINT "StoreReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationOccasion" ADD CONSTRAINT "CelebrationOccasion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CelebrationOccasionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationTheme" ADD CONSTRAINT "CelebrationTheme_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "CelebrationOccasion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationExperience" ADD CONSTRAINT "CelebrationExperience_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "CelebrationOccasion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationExperience" ADD CONSTRAINT "CelebrationExperience_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "CelebrationTheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationExperienceSection" ADD CONSTRAINT "CelebrationExperienceSection_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CelebrationExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationGuest" ADD CONSTRAINT "CelebrationGuest_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CelebrationExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationWish" ADD CONSTRAINT "CelebrationWish_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CelebrationExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationExperienceAnalytics" ADD CONSTRAINT "CelebrationExperienceAnalytics_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CelebrationExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationOrder" ADD CONSTRAINT "CelebrationOrder_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CelebrationExperience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationMedia" ADD CONSTRAINT "CelebrationMedia_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "CelebrationExperience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioPage" ADD CONSTRAINT "StudioPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSection" ADD CONSTRAINT "StudioSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "StudioPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioAsset" ADD CONSTRAINT "StudioAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSnapshot" ADD CONSTRAINT "StudioSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantServiceArea" ADD CONSTRAINT "RestaurantServiceArea_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_serviceAreaId_fkey" FOREIGN KEY ("serviceAreaId") REFERENCES "RestaurantServiceArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantQRIdentity" ADD CONSTRAINT "RestaurantQRIdentity_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantDiningSession" ADD CONSTRAINT "RestaurantDiningSession_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantDiningSession" ADD CONSTRAINT "RestaurantDiningSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_diningSessionId_fkey" FOREIGN KEY ("diningSessionId") REFERENCES "RestaurantDiningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionJoinRequest" ADD CONSTRAINT "SessionJoinRequest_diningSessionId_fkey" FOREIGN KEY ("diningSessionId") REFERENCES "RestaurantDiningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantMenu" ADD CONSTRAINT "RestaurantMenu_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantCatalogItem" ADD CONSTRAINT "RestaurantCatalogItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantCatalogItem" ADD CONSTRAINT "RestaurantCatalogItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "RestaurantMenu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantModifierGroup" ADD CONSTRAINT "RestaurantModifierGroup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RestaurantCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantModifier" ADD CONSTRAINT "RestaurantModifier_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RestaurantModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RestaurantDiningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrder" ADD CONSTRAINT "RestaurantOrder_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SessionParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderItem" ADD CONSTRAINT "RestaurantOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RestaurantCatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenStation" ADD CONSTRAINT "KitchenStation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "RestaurantLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KitchenPreparationTask" ADD CONSTRAINT "KitchenPreparationTask_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "KitchenStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformProject" ADD CONSTRAINT "PlatformProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "PlatformOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEnvironment" ADD CONSTRAINT "ProjectEnvironment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PlatformProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformApiKey" ADD CONSTRAINT "PlatformApiKey_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ProjectEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformCredential" ADD CONSTRAINT "PlatformCredential_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ProjectEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageVersion" ADD CONSTRAINT "PackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PlatformPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageInstallation" ADD CONSTRAINT "PackageInstallation_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ProjectEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageInstallation" ADD CONSTRAINT "PackageInstallation_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "PlatformPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageInstallation" ADD CONSTRAINT "PackageInstallation_installedVersionId_fkey" FOREIGN KEY ("installedVersionId") REFERENCES "PackageVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDomain" ADD CONSTRAINT "ProjectDomain_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ProjectEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentQuotaPolicy" ADD CONSTRAINT "EnvironmentQuotaPolicy_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ProjectEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentRateLimitPolicy" ADD CONSTRAINT "EnvironmentRateLimitPolicy_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "ProjectEnvironment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
