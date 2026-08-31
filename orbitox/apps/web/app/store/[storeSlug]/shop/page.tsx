'use client';

import React, { useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCommerceStorefront, useCommerceProducts, useCommerceCart, useCommerceCurrency, useCommerceWishlist, Product } from '@orbitox/commerce';
import { StorefrontCartDrawer } from '@/components/storefront/storefront-cart-drawer';
import { StorefrontQuickViewModal } from '@/components/storefront/storefront-quick-view-modal';
import { StorefrontWishlistDrawer } from '@/components/storefront/storefront-wishlist-drawer';
import { StorefrontRecentlyViewed } from '@/components/storefront/storefront-recently-viewed';
import { UniversalProductCard } from '@/components/storefront/universal-product-card';
import {
  IconHeart,
  IconShoppingBag,
  IconCrown,
  IconSliders,
} from '@/components/storefront/storefront-icons';

function ShopContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const rawSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || 'punjabi-jutti';
  const initialCat = searchParams?.get('category') || 'all';

  const { data: storefront } = useCommerceStorefront(storeSlug);
  const storeId = storefront?.store.id || 'store_punjabi_jutti';

  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { currentCurrency, setCurrentCurrency, supportedCurrencies, formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);
  const { count: wishlistCount, isInWishlist, toggleWishlist } = useCommerceWishlist(storeSlug);

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCat);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'created_desc'>('created_desc');
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState<boolean>(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickAddedId, setQuickAddedId] = useState<string | null>(null);

  const { products, categories } = useCommerceProducts(storeId, {
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    sortBy,
  });

  const { cart, addItem } = useCommerceCart(storeId);

  const handleQuickAdd = (product: Product) => {
    const variantId = product.variants[0]?.id;
    addItem({ productId: product.id, variantId, quantity: 1 });
    setQuickAddedId(product.id);
    setCartDrawerOpen(true);
    setTimeout(() => setQuickAddedId(null), 2000);
  };

  if (!storefront) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--orb-bg, #0D0D0E)', color: 'var(--orb-text, #FFF)' }}>
      {/* Header */}
      <header
        style={{
          padding: '18px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--orb-surface, #161618)',
          borderBottom: '1px solid var(--orb-border, rgba(255, 255, 255, 0.1))',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(12px)',
        }}
      >
        <Link
          href={`/store/${storeSlug}`}
          style={{
            fontSize: '20px',
            fontWeight: 900,
            fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
            color: '#FFF',
            textDecoration: 'none',
          }}
        >
          {storefront.store.name}
        </Link>

        <nav style={{ display: 'flex', gap: '24px', fontSize: '13px', fontWeight: 600 }}>
          <Link href={`/store/${storeSlug}`} style={{ color: 'inherit', textDecoration: 'none', opacity: 0.7 }}>Home</Link>
          <Link href={`/store/${storeSlug}/shop`} style={{ color: 'var(--orb-primary, #D4AF37)', textDecoration: 'none', fontWeight: 700 }}>Shop All</Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Currency Switcher */}
          <select
            value={currentCurrency}
            onChange={(e) => setCurrentCurrency(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--orb-radius-btn, 8px)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.15))',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {supportedCurrencies.map((curr) => (
              <option key={curr.code} value={curr.code} style={{ background: '#161618', color: '#FFF' }}>
                {curr.code} ({curr.symbol})
              </option>
            ))}
          </select>

          {/* Wishlist Button */}
          <button
            onClick={() => setWishlistDrawerOpen(true)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: wishlistCount > 0 ? '#EF4444' : '#FFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconHeart size={14} filled={wishlistCount > 0} color={wishlistCount > 0 ? '#EF4444' : '#FFF'} />
            <span>Wishlist ({wishlistCount})</span>
          </button>

          {/* Shopping Bag Button */}
          <button
            onClick={() => setCartDrawerOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--orb-radius-btn, 8px)',
              background: 'var(--orb-primary, #D4AF37)',
              color: '#000',
              border: 'none',
              fontWeight: 800,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(229, 169, 60, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <IconShoppingBag size={15} color="#000" />
            <span>Bag ({cart?.totals.itemsCount || 0})</span>
          </button>
        </div>
      </header>

      {/* Main Catalog View */}
      <div style={{ maxWidth: 'var(--orb-container-max-width, 1280px)', margin: '40px auto', padding: '0 24px' }}>
        {/* Title & Filter Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ROYAL ATELIER CATALOG
            </span>
            <h1
              style={{
                fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
                fontSize: '36px',
                fontWeight: 900,
                margin: '4px 0 6px 0',
              }}
            >
              All Masterpieces ({products.length})
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--orb-text-muted, #888)', margin: 0 }}>
              Curated artisanal juttis & accessories crafted with 24K gold dabka and triple-padded bite-free soles.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: '10px 16px',
                borderRadius: 'var(--orb-radius-input, 8px)',
                background: 'var(--orb-surface, #161618)',
                border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.15))',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="created_desc">Featured / Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '36px' }}>
          {/* Sidebar Category Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0', color: 'var(--orb-text-muted, #888)' }}>
              Departments
            </h3>

            <button
              onClick={() => setSelectedCategory('all')}
              style={{
                textAlign: 'left',
                padding: '10px 14px',
                borderRadius: 'var(--orb-radius-btn, 8px)',
                background: selectedCategory === 'all' ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                border: selectedCategory === 'all' ? '1px solid var(--orb-primary, #D4AF37)' : '1px solid transparent',
                color: selectedCategory === 'all' ? 'var(--orb-primary, #D4AF37)' : '#FFFFFF',
                fontWeight: selectedCategory === 'all' ? 800 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <IconCrown size={14} color={selectedCategory === 'all' ? 'var(--orb-primary, #D4AF37)' : '#888'} />
              <span>All Departments</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 'var(--orb-radius-btn, 8px)',
                  background: selectedCategory === cat.id ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
                  border: selectedCategory === cat.id ? '1px solid var(--orb-primary, #D4AF37)' : '1px solid transparent',
                  color: selectedCategory === cat.id ? 'var(--orb-primary, #D4AF37)' : '#FFFFFF',
                  fontWeight: selectedCategory === cat.id ? 800 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {products.map((product) => {
              const inWish = isInWishlist(product.id);
              return (
                <UniversalProductCard
                  key={product.id}
                  product={product}
                  storeSlug={storeSlug}
                  theme={storefront?.theme}
                  variant="auto"
                  inWishlist={inWish}
                  onToggleWishlist={toggleWishlist}
                  onQuickAdd={handleQuickAdd}
                  onQuickView={setQuickViewProduct}
                  formatPrice={formatPrice}
                  accentColor={storefront?.theme.colors?.primary}
                  isQuickAdded={quickAddedId === product.id}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <StorefrontQuickViewModal
        product={quickViewProduct}
        storeSlug={storeSlug}
        storeId={storeId}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddedToCart={() => setCartDrawerOpen(true)}
      />

      {/* Wishlist Drawer */}
      <StorefrontWishlistDrawer
        storeSlug={storeSlug}
        storeId={storeId}
        isOpen={wishlistDrawerOpen}
        onClose={() => setWishlistDrawerOpen(false)}
        onOpenCart={() => setCartDrawerOpen(true)}
      />

      {/* Floating Recently Viewed Bar */}
      <StorefrontRecentlyViewed
        storeSlug={storeSlug}
        storeId={storeId}
        onOpenCart={() => setCartDrawerOpen(true)}
      />

      {/* Cart Drawer */}
      <StorefrontCartDrawer
        storeSlug={storeSlug}
        storeId={storeId}
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
      />

      {/* Floating Luxury Cart Quick-Access Button */}
      {cart && cart.totals.itemsCount > 0 && !cartDrawerOpen && (
        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: 'linear-gradient(135deg, rgba(22, 22, 24, 0.95) 0%, rgba(14, 14, 16, 0.98) 100%)',
            border: '2px solid var(--orb-primary, #D4AF37)',
            borderRadius: '9999px',
            padding: '10px 20px',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 12px 35px rgba(0,0,0,0.6), 0 0 25px rgba(212, 175, 55, 0.35)',
            cursor: 'pointer',
            zIndex: 990,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            fontFamily: 'var(--orb-font-body, "Plus Jakarta Sans", sans-serif)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--orb-primary, #D4AF37)',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '14px',
            }}
          >
            <IconShoppingBag size={18} color="#000" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Shopping Bag
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
              {cart.totals.itemsCount} {cart.totals.itemsCount === 1 ? 'item' : 'items'} • {formatPrice(cart.totals.grandTotal)}
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

export default function StorefrontShopPageWrapper() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#FFF' }}>Loading Catalog...</div>}>
      <ShopContent />
    </Suspense>
  );
}
