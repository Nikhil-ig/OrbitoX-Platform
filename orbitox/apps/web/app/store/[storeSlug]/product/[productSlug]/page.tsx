'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useCommerceStorefront,
  useCommerceProducts,
  useCommerceCart,
  useCommerceReviews,
  useCommerceCurrency,
  useCommerceWishlist,
  useCommerceRecentlyViewed,
  ProductVariant,
} from '@orbitox/commerce';
import { StorefrontCartDrawer } from '@/components/storefront/storefront-cart-drawer';
import { StorefrontWishlistDrawer } from '@/components/storefront/storefront-wishlist-drawer';
import { StorefrontRecentlyViewed } from '@/components/storefront/storefront-recently-viewed';
import { JuttiSizeGuideModal } from '@/components/commerce/jutti-size-guide-modal';
import { useRouter } from 'next/navigation';
import {
  IconHeart,
  IconShoppingBag,
  IconCrown,
  IconFlame,
  IconSparkles,
  IconRuler,
  IconMinus,
  IconPlus,
  IconZap,
  IconCheck,
  IconStar,
  IconShieldCheck,
  IconClose,
  IconArrowLeft,
} from '@/components/storefront/storefront-icons';

export default function StorefrontProductDetailPage() {
  const params = useParams();
  const rawSlug = params?.storeSlug;
  const storeSlug: string = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || 'punjabi-jutti';

  const rawProdSlug = params?.productSlug;
  const productSlug: string = (Array.isArray(rawProdSlug) ? rawProdSlug[0] : rawProdSlug) || '';

  const { data: storefront } = useCommerceStorefront(storeSlug);
  const storeId = storefront?.store.id || 'store_punjabi_jutti';
  const { products } = useCommerceProducts(storeId);
  const { addItem, cart } = useCommerceCart(storeId);
  const baseCurrency = storeSlug === 'punjabi-jutti' ? 'INR' : 'USD';
  const { currentCurrency, setCurrentCurrency, supportedCurrencies, formatPrice } = useCommerceCurrency(baseCurrency, storeSlug);
  const { count: wishlistCount, isInWishlist, toggleWishlist } = useCommerceWishlist(storeSlug);
  const { trackProduct } = useCommerceRecentlyViewed(storeSlug);

  const product = products.find((p) => p.slug === productSlug) || products[0];
  const { reviews, stats, submitReview } = useCommerceReviews(product?.id || 'prod_jutti_1');

  const router = useRouter();
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product?.variants[0] || null);
  const [quantity, setQuantity] = useState<number>(1);
  const [cartDrawerOpen, setCartDrawerOpen] = useState<boolean>(false);
  const [wishlistDrawerOpen, setWishlistDrawerOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'shipping' | 'reviews'>('description');
  const [added, setAdded] = useState<boolean>(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState<boolean>(false);

  const handleBuyNow = () => {
    if (!product) return;
    const variantId = selectedVariant ? selectedVariant.id : product.variants[0]?.id;
    addItem({
      productId: product.id,
      variantId,
      quantity,
    });
    router.push(`/store/${storeSlug}/checkout`);
  };

  // Automatically track recently viewed product
  useEffect(() => {
    if (product) {
      trackProduct(product);
    }
  }, [product, trackProduct]);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState<boolean>(false);
  const [revName, setRevName] = useState<string>('');
  const [revEmail, setRevEmail] = useState<string>('');
  const [revRating, setRevRating] = useState<number>(5);
  const [revTitle, setRevTitle] = useState<string>('');
  const [revComment, setRevComment] = useState<string>('');

  if (!product || !storefront) return null;

  const inWish = isInWishlist(product.id);

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      quantity,
    });
    setAdded(true);
    setCartDrawerOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReview({
      storeId,
      customerName: revName,
      customerEmail: revEmail,
      rating: revRating,
      title: revTitle,
      comment: revComment,
    });
    setReviewModalOpen(false);
    setRevTitle('');
    setRevComment('');
    setActiveTab('reviews');
  };

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentComparePrice = selectedVariant ? selectedVariant.compareAtPrice : product.compareAtPrice;

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Currency Switcher */}
          <select
            value={currentCurrency}
            onChange={(e) => setCurrentCurrency(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {supportedCurrencies.map((c) => (
              <option key={c.code} value={c.code} style={{ background: '#1A1A1D', color: '#FFF' }}>
                {c.code} ({c.symbol})
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

          <Link href={`/store/${storeSlug}/shop`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#FFF', textDecoration: 'none' }}>
            <IconArrowLeft size={13} />
            <span>Back to Shop</span>
          </Link>

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

      {/* Main PDP Layout */}
      <div style={{ maxWidth: 'var(--orb-container-max-width, 1280px)', margin: '40px auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '48px' }}>
          {/* Media Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                position: 'relative',
                height: '520px',
                borderRadius: 'var(--orb-radius-card, 16px)',
                overflow: 'hidden',
                background: 'var(--orb-surface, #161618)',
                border: '1px solid var(--orb-border, rgba(255, 255, 255, 0.08))',
              }}
            >
              {product.media[selectedImageIdx] && (
                <img
                  src={product.media[selectedImageIdx].url}
                  alt={product.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            {/* Thumbnails */}
            {product.media.length > 1 && (
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {product.media.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedImageIdx(idx)}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: selectedImageIdx === idx ? '2px solid var(--orb-primary, #D4AF37)' : '1px solid rgba(255,255,255,0.1)',
                      background: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Purchasing Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--orb-primary, #D4AF37)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <IconCrown size={14} color="var(--orb-primary, #D4AF37)" />
                <span>{product.categoryName || 'ROYAL BRIDAL ATELIER'}</span>
              </div>
              <h1
                style={{
                  fontFamily: 'var(--orb-font-heading, "Playfair Display", serif)',
                  fontSize: '32px',
                  fontWeight: 900,
                  margin: '8px 0',
                }}
              >
                {product.title}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[...Array(5)].map((_, i) => (
                    <IconStar key={i} size={14} color="#F59E0B" filled />
                  ))}
                </div>
                <span style={{ color: 'var(--orb-text-muted, #888)' }}>{stats.averageRating} ({stats.totalReviews} reviews)</span>
                <span style={{ color: 'var(--orb-text-muted, #888)' }}>•</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>SKU: {product.sku}</span>
              </div>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--orb-primary, #D4AF37)' }}>
                {formatPrice(currentPrice)}
              </span>
              {currentComparePrice && (
                <span style={{ fontSize: '16px', color: 'var(--orb-text-muted, #888)', textDecoration: 'line-through' }}>
                  {formatPrice(currentComparePrice)}
                </span>
              )}
            </div>

            {/* Scarcity & Bite-Free Assurance Badge */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', fontSize: '11px', fontWeight: 700 }}>
                <IconFlame size={13} color="#EF4444" />
                <span>Only 3 Pairs Left in Patiala Atelier</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '6px', background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.3)', color: 'var(--orb-primary, #D4AF37)', fontSize: '11px', fontWeight: 700 }}>
                <IconSparkles size={13} color="var(--orb-primary, #D4AF37)" />
                <span>100% Bite-Free Double Padded</span>
              </div>
            </div>

            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
              {product.shortDescription || product.description}
            </p>

            {/* Variants Selector */}
            {product.hasVariants && product.options.map((opt) => (
              <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Select {opt.name}</label>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--orb-primary, #D4AF37)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      textDecoration: 'underline',
                    }}
                  >
                    <IconRuler size={13} color="var(--orb-primary, #D4AF37)" />
                    <span>Size & Fit Guide</span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {opt.values.map((v) => {
                    const isSelected = selectedVariant?.selectedOptions?.[opt.name] === v.label;
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          const matched = product.variants.find(
                            (vr) => vr.selectedOptions[opt.name] === v.label
                          );
                          if (matched) setSelectedVariant(matched);
                        }}
                        style={{
                          padding: '10px 18px',
                          borderRadius: 'var(--orb-radius-btn, 8px)',
                          background: isSelected ? 'var(--orb-primary, #D4AF37)' : 'var(--orb-surface, #161618)',
                          color: isSelected ? '#000000' : 'var(--orb-text, #FFF)',
                          border: isSelected ? '1px solid var(--orb-primary, #D4AF37)' : '1px solid var(--orb-border, rgba(255,255,255,0.15))',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quantity, Wishlist & Add to Bag CTA */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--orb-border, rgba(255,255,255,0.2))',
                  borderRadius: 'var(--orb-radius-btn, 8px)',
                  overflow: 'hidden',
                  background: 'var(--orb-surface, #161618)',
                }}
              >
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{ width: '40px', height: '48px', background: 'transparent', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconMinus size={13} />
                </button>
                <span style={{ fontSize: '14px', fontWeight: 800, width: '32px', textAlign: 'center' }}>
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  style={{ width: '40px', height: '48px', background: 'transparent', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconPlus size={13} />
                </button>
              </div>

              {/* Add to Bag Button */}
              <button
                onClick={handleAddToCart}
                style={{
                  flex: 1,
                  padding: '14px 28px',
                  borderRadius: 'var(--orb-radius-btn, 8px)',
                  background: added ? '#10B981' : 'var(--orb-primary, #D4AF37)',
                  color: '#000000',
                  border: 'none',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 0 24px rgba(229, 169, 60, 0.35)',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {added ? (
                  <>
                    <IconCheck size={16} />
                    <span>ADDED TO BAG</span>
                  </>
                ) : (
                  <>
                    <IconShoppingBag size={16} />
                    <span>ADD TO BAG • {formatPrice(currentPrice * quantity)}</span>
                  </>
                )}
              </button>

              {/* Wishlist Heart Button */}
              <button
                onClick={() => toggleWishlist(product)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: inWish ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: inWish ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: inWish ? '#EF4444' : '#FFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={inWish ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                <IconHeart size={18} filled={inWish} color={inWish ? '#EF4444' : '#FFF'} />
              </button>
            </div>

            {/* Instant 1-Click Buy Button */}
            <button
              onClick={handleBuyNow}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: 'var(--orb-radius-btn, 8px)',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 900,
                fontSize: '14px',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              <IconZap size={16} />
              <span>BUY NOW WITH 1-CLICK</span>
            </button>

            {/* Accordion Tabs */}
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--orb-border, rgba(255,255,255,0.1))', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                {['description', 'details', 'shipping', 'reviews'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: activeTab === tab ? 'var(--orb-primary, #D4AF37)' : 'var(--orb-text-muted, #888)',
                      fontWeight: 700,
                      fontSize: '13px',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                    }}
                  >
                    {tab} {tab === 'reviews' && `(${stats.totalReviews})`}
                  </button>
                ))}
              </div>

              <div style={{ padding: '16px 0', fontSize: '13px', lineHeight: 1.6, color: 'rgba(255,255,255,0.75)' }}>
                {activeTab === 'description' && product.description}
                {activeTab === 'details' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div><strong style={{ color: '#E5A93C' }}>Material:</strong> {product.material || 'Pure Raw Silk & Leather'}</div>
                      <div><strong style={{ color: '#E5A93C' }}>Embroidery:</strong> {product.embroideryWork || '24K Dabka & Zardozi'}</div>
                      <div><strong style={{ color: '#E5A93C' }}>Occasion:</strong> {product.occasion || 'Bridal & Festive Celebrations'}</div>
                      <div><strong style={{ color: '#E5A93C' }}>Sole & Cushion:</strong> {product.solePadding || 'Double Memory Foam (Bite-Free)'}</div>
                    </div>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)' }}>
                      • 100% handcrafted by generational Patiala master mochis.<br />
                      • Hand-stitched genuine vegetable-tanned leather sole.<br />
                      • Wipe with dry cloth; store in complimentary muslin dust bag.
                    </p>
                  </div>
                )}
                {activeTab === 'shipping' && (
                  <div>
                    <p>• Complimentary Express Worldwide Shipping over ₹4,999 / $100</p>
                    <p>• 30-Day returns and exchange guarantee</p>
                    <p>• Fully insured white-glove royal packaging</p>
                  </div>
                )}
                {activeTab === 'reviews' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFF' }}>{stats.averageRating} / 5.0</div>
                        <div style={{ fontSize: '11px', color: 'var(--orb-text-muted, #888)' }}>Based on {stats.totalReviews} verified patron reviews</div>
                      </div>
                      <button
                        onClick={() => setReviewModalOpen(true)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          background: 'var(--orb-primary, #D4AF37)',
                          color: '#000',
                          fontWeight: 800,
                          fontSize: '12px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        + Write a Review
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                      {reviews.map((r) => (
                        <div key={r.id} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#FFF', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span>{r.customerName}</span>
                              {r.isVerifiedPurchase && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#10B981', fontSize: '11px' }}>
                                  <IconShieldCheck size={11} color="#10B981" />
                                  <span>Verified Buyer</span>
                                </span>
                              )}
                            </span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[...Array(r.rating)].map((_, i) => (
                                <IconStar key={i} size={12} color="#F59E0B" filled />
                              ))}
                            </div>
                          </div>
                          {r.title && <div style={{ fontWeight: 700, fontSize: '13px', marginTop: '4px', color: '#D4AF37' }}>{r.title}</div>}
                          <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Submission Modal */}
      {reviewModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ width: '460px', background: '#161618', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Write a Review</h2>
              <button onClick={() => setReviewModalOpen(false)} style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Your Rating</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRevRating(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      <IconStar size={20} color={star <= revRating ? '#F59E0B' : '#444'} filled={star <= revRating} />
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                required
                placeholder="Your Name"
                value={revName}
                onChange={(e) => setRevName(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }}
              />

              <input
                type="email"
                required
                placeholder="Your Email"
                value={revEmail}
                onChange={(e) => setRevEmail(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }}
              />

              <input
                type="text"
                placeholder="Review Headline (e.g. Magnificent craftsmanship)"
                value={revTitle}
                onChange={(e) => setRevTitle(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }}
              />

              <textarea
                required
                rows={3}
                placeholder="Share your experience with this piece..."
                value={revComment}
                onChange={(e) => setRevComment(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', fontSize: '13px' }}
              />

              <button
                type="submit"
                style={{ padding: '12px', borderRadius: '8px', background: 'var(--orb-primary, #D4AF37)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}

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

      {/* Size Guide Modal */}
      <JuttiSizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        verticalId={storefront.store.settings.verticalPreset || 'punjabi-jutti'}
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

