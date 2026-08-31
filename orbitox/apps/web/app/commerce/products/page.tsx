'use client';

import React, { useState } from 'react';
import { useCommerceStore, useCommerceProducts, commerceEngine, Product, ProductVariant } from '@orbitox/commerce';
import { MediaPickerModal } from '@/components/commerce/media-picker-modal';

export default function CommerceProductsPage() {
  const { store } = useCommerceStore();
  const storeId = store?.id || 'store_punjabi_jutti';
  const tenantId = store?.tenantId || 'tenant_aura_corp';

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const { products, categories, createProduct, updateProduct, deleteProduct } = useCommerceProducts(storeId, {
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: search ? search : undefined,
  });

  // Modal State for New Product
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPrice, setNewPrice] = useState<string>('450');
  const [newComparePrice, setNewComparePrice] = useState<string>('');
  const [newCostPerItem, setNewCostPerItem] = useState<string>('120');
  const [newCategory, setNewCategory] = useState<string>('cat_outerwear');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState<string>('https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800&auto=format&fit=crop');
  const [hasVariants, setHasVariants] = useState<boolean>(true);
  const [sizes, setSizes] = useState<string>('S, M, L, XL');
  const [colors, setColors] = useState<string>('Midnight Black, Camel Gold');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  // Modal State for Editing Existing Product (with Tabs)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTab, setEditTab] = useState<'pricing' | 'variants' | 'seo'>('pricing');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editComparePrice, setEditComparePrice] = useState<string>('');
  const [editCostPerItem, setEditCostPerItem] = useState<string>('');
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editInventoryStock, setEditInventoryStock] = useState<number>(20);
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);

  // SEO Editing State
  const [editSeoTitle, setEditSeoTitle] = useState<string>('');
  const [editSeoDesc, setEditSeoDesc] = useState<string>('');

  // Media Picker Modal State
  const [mediaPickerOpen, setMediaPickerOpen] = useState<boolean>(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'create' | 'edit'>('create');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inventory Summary
  const inventorySummary = commerceEngine.products.getInventorySummary(storeId);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAiGenerateCopy = () => {
    const targetTitle = editingProduct ? editTitle : newTitle;
    const targetPrice = editingProduct ? Number(editPrice) : Number(newPrice);

    if (!targetTitle.trim()) {
      alert('Please enter a product title first so the AI can generate copy.');
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      const copy = commerceEngine.ai.generateProductCopy({
        title: targetTitle,
        tone: 'luxury',
        price: targetPrice,
      });
      if (editingProduct) {
        setEditDescription(copy.description);
      } else {
        setNewDescription(copy.description);
      }
      setAiGenerating(false);
    }, 400);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setEditTab('pricing');
    setEditTitle(p.title);
    setEditPrice(p.price.toString());
    setEditComparePrice(p.compareAtPrice ? p.compareAtPrice.toString() : '');
    setEditCostPerItem(p.costPrice ? p.costPrice.toString() : '');
    setEditImageUrl(p.media?.[0]?.url || '');
    setEditCategory(p.categoryId || 'cat_outerwear');
    setEditDescription(p.description || '');
    setEditInventoryStock(p.inventoryQuantity || 15);
    setEditVariants(p.variants ? [...p.variants] : []);

    const seoAudit = commerceEngine.seo.analyzeProductSEO(p);
    setEditSeoTitle(p.seoTitle || seoAudit.metaTitle);
    setEditSeoDesc(p.seoDescription || seoAudit.metaDescription);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const priceNum = parseFloat(editPrice) || editingProduct.price;
    const compareNum = editComparePrice ? parseFloat(editComparePrice) : undefined;
    const costNum = editCostPerItem ? parseFloat(editCostPerItem) : undefined;

    updateProduct(editingProduct.id, {
      title: editTitle,
      price: priceNum,
      compareAtPrice: compareNum,
      costPrice: costNum,
      categoryId: editCategory,
      categoryName: categories.find((c) => c.id === editCategory)?.name || editingProduct.categoryName,
      description: editDescription,
      inventoryQuantity: Number(editInventoryStock),
      variants: editVariants,
      seoTitle: editSeoTitle,
      seoDescription: editSeoDesc,
      media: editImageUrl
        ? [{ id: `med_${Date.now()}`, type: 'image', url: editImageUrl, order: 0 }, ...(editingProduct.media?.slice(1) || [])]
        : editingProduct.media,
    });

    commerceEngine.activity.logEvent({
      storeId,
      type: 'product_updated',
      title: `Updated Product: ${editTitle}`,
      description: `Price set to $${priceNum.toFixed(2)}, stock updated to ${editInventoryStock} units.`,
      icon: '🛍️',
      severity: 'info',
    });

    setEditingProduct(null);
    showToast(`✓ Product "${editTitle}" updated successfully!`);
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const priceNum = parseFloat(newPrice) || 100;
    const compareNum = newComparePrice ? parseFloat(newComparePrice) : undefined;
    const costNum = newCostPerItem ? parseFloat(newCostPerItem) : undefined;

    const sizeArray = sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const colorArray = colors.split(',').map((c) => c.trim()).filter(Boolean);

    const generatedVariants = commerceEngine.products.generateQuickVariantMatrix({
      basePrice: priceNum,
      sizes: sizeArray,
      colors: colorArray,
      defaultStock: 20,
    });

    createProduct({
      storeId,
      tenantId,
      title: newTitle.trim(),
      price: priceNum,
      compareAtPrice: compareNum,
      costPrice: costNum,
      categoryId: newCategory,
      categoryName: categories.find((c) => c.id === newCategory)?.name,
      description: newDescription || 'Artisanal luxury handcrafted piece.',
      hasVariants: sizeArray.length > 1 || colorArray.length > 1,
      variants: generatedVariants,
      inventoryQuantity: generatedVariants.length * 20,
      media: [
        {
          id: `med_${Date.now()}`,
          url: newImageUrl,
          type: 'image',
          isPrimary: true,
          order: 0,
        },
      ],
    });

    commerceEngine.activity.logEvent({
      storeId,
      type: 'product_created',
      title: `New Product Added: ${newTitle}`,
      description: `Created catalog item with price $${priceNum.toFixed(2)} and ${generatedVariants.length} variants.`,
      icon: '✨',
      severity: 'success',
    });

    setCreateModalOpen(false);
    setNewTitle('');
    setNewPrice('450');
    setNewComparePrice('');
    setNewDescription('');
    showToast(`🎉 New product "${newTitle}" created successfully!`);
  };

  const handleQuickRestockAll = () => {
    const lowProds = commerceEngine.products.getLowStockProducts(storeId, 5);
    const updates = lowProds.map((p) => ({
      productId: p.id,
      quantity: 25,
    }));
    commerceEngine.products.bulkUpdateInventory(updates);

    commerceEngine.activity.logEvent({
      storeId,
      type: 'product_updated',
      title: `Restocked ${lowProds.length} Low-Stock Products`,
      description: 'Automated restock added +25 units to all depleted SKUs.',
      icon: '📦',
      severity: 'success',
    });

    showToast(`⚡ Restocked ${lowProds.length} depleted SKUs to 25 units!`);
  };

  const handleAiOptimizeSEO = () => {
    if (!editingProduct) return;
    const optimized = commerceEngine.seo.generateOptimizedMetaTags({
      title: editTitle || editingProduct.title,
      description: editDescription || editingProduct.description,
      price: parseFloat(editPrice) || editingProduct.price,
      category: categories.find((c) => c.id === editCategory)?.name,
    });
    setEditSeoTitle(optimized.metaTitle);
    setEditSeoDesc(optimized.metaDescription);
    showToast('✨ SEO meta tags AI-optimized!');
  };

  const handleGenerateMatrixForEdit = () => {
    const sizeArray = ['S', 'M', 'L', 'XL'];
    const colorArray = ['Midnight Black', 'Camel Gold'];
    const newVars = commerceEngine.products.generateQuickVariantMatrix({
      productId: editingProduct?.id,
      basePrice: parseFloat(editPrice) || 450,
      sizes: sizeArray,
      colors: colorArray,
      defaultStock: 15,
    });
    setEditVariants(newVars);
    showToast(`⚡ Generated ${newVars.length} variant combinations!`);
  };

  // Calculated Profit Margin %
  const currentPriceNum = parseFloat(editPrice) || 0;
  const currentCostNum = parseFloat(editCostPerItem) || 0;
  const grossProfitDollar = currentPriceNum > 0 ? currentPriceNum - currentCostNum : 0;
  const grossMarginPercent = currentPriceNum > 0 ? ((grossProfitDollar / currentPriceNum) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#FFF' }}>
      {/* ─── Header ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🛍️</span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Products & Inventory Matrix
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', margin: '6px 0 0 0' }}>
            Manage pricing, gross profit margins, variant combinations, Unsplash imagery, and automated SEO ranking.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)',
            color: '#000000',
            fontWeight: 800,
            fontSize: '13px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 0 16px rgba(212, 175, 55, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>+</span>
          <span>Add New Product</span>
        </button>
      </div>

      {toastMessage && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10B981',
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* ─── Inventory Sentinel KPI Cards ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Catalog SKUs
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#FFF' }}>
            {inventorySummary.totalProducts} Products ({inventorySummary.totalVariants} Variants)
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Stock On Hand
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#10B981' }}>
            {inventorySummary.totalStockUnits} Units
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Low Stock Alert (Under 5)
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, color: inventorySummary.lowStockCount > 0 ? '#F59E0B' : '#10B981' }}>
              {inventorySummary.lowStockCount} SKUs
            </div>
            {inventorySummary.lowStockCount > 0 && (
              <button
                onClick={handleQuickRestockAll}
                style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #F59E0B', color: '#F59E0B', fontSize: '10px', fontWeight: 800, cursor: 'pointer' }}
              >
                ⚡ Restock (+25)
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase' }}>
            Average Gross Margin
          </span>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#D4AF37' }}>
            73.4%
          </div>
        </div>
      </div>

      {/* ─── Search & Category Filter Bar ──────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          padding: '14px 18px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: selectedCategory === 'all' ? '#D4AF37' : 'rgba(255, 255, 255, 0.06)',
              color: selectedCategory === 'all' ? '#000' : '#FFF',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            All Items ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: selectedCategory === c.id ? '#D4AF37' : 'rgba(255, 255, 255, 0.06)',
                color: selectedCategory === c.id ? '#000' : '#FFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '260px' }}>
          <input
            type="text"
            placeholder="Search by title, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              background: '#000',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#FFF',
              fontSize: '12px',
            }}
          />
        </div>
      </div>

      {/* ─── Products Table ────────────────────────────────────── */}
      <div
        style={{
          borderRadius: '14px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Product & Imagery</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Category</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Selling Price</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Compare-At</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>Inventory Stock</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.5)' }}>SEO Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.5)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const mainImg = p.media?.[0]?.url || 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800&auto=format&fit=crop';
              const seoAudit = commerceEngine.seo.analyzeProductSEO(p);

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  {/* Title & Media */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={mainImg}
                        alt={p.title}
                        style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#FFF' }}>{p.title}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                          SKU: {p.sku} • {p.variants?.length || 1} Variant(s)
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {p.categoryName || 'General'}
                  </td>

                  {/* Price */}
                  <td style={{ padding: '12px 16px', fontWeight: 800, color: '#D4AF37' }}>
                    ${p.price.toFixed(2)}
                  </td>

                  {/* Compare at */}
                  <td style={{ padding: '12px 16px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    {p.compareAtPrice ? (
                      <span style={{ textDecoration: 'line-through' }}>
                        ${p.compareAtPrice.toFixed(2)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Inventory */}
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: p.inventoryQuantity < 5 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                        color: p.inventoryQuantity < 5 ? '#F59E0B' : '#10B981',
                        fontWeight: 800,
                        fontSize: '11px',
                      }}
                    >
                      {p.inventoryQuantity} in stock
                    </span>
                  </td>

                  {/* SEO Score */}
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: seoAudit.score >= 80 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: seoAudit.score >= 80 ? '#10B981' : '#F59E0B',
                        fontWeight: 800,
                        fontSize: '11px',
                      }}
                    >
                      {seoAudit.score}/100 SEO
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(212, 175, 55, 0.15)',
                          border: '1px solid #D4AF37',
                          color: '#D4AF37',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit Product & SEO
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#EF4444',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── EDIT PRODUCT MODAL (WITH PRICING, VARIANTS, & SEO TABS) ─── */}
      {editingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setEditingProduct(null)}
        >
          <form
            onSubmit={handleSaveEditProduct}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '600px',
              maxWidth: '100%',
              background: '#161618',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #D4AF37',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header & Tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Product Cockpit</h3>
                <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 600 }}>{editingProduct.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Sub-Tab Navigation */}
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.5)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {[
                { id: 'pricing', label: '💎 Price & Imagery' },
                { id: 'variants', label: '🗂️ Variant Matrix' },
                { id: 'seo', label: '🔍 SEO & SERP' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEditTab(t.id as any)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: editTab === t.id ? '#D4AF37' : 'transparent',
                    color: editTab === t.id ? '#000' : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: 800,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: PRICING & IMAGERY */}
            {editTab === 'pricing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
                  />
                </div>

                {/* Price, Compare-At, Cost per Item */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 800 }}>
                      Selling Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #D4AF37', color: '#D4AF37', fontSize: '14px', fontWeight: 800 }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                      Compare-At ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 600.00"
                      value={editComparePrice}
                      onChange={(e) => setEditComparePrice(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                      Cost Per Item ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 120.00"
                      value={editCostPerItem}
                      onChange={(e) => setEditCostPerItem(e.target.value)}
                      style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
                    />
                  </div>
                </div>

                {/* Gross Margin Callout */}
                <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    Calculated Gross Profit Margin:
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                    +${grossProfitDollar.toFixed(2)} ({grossMarginPercent}%)
                  </span>
                </div>

                {/* Media Image */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                      Product Image URL
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaPickerTarget('edit');
                        setMediaPickerOpen(true);
                      }}
                      style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      🖼️ Browse Library
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <img src={editImageUrl} alt="" style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', background: '#000' }} />
                    <input
                      type="text"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '11px' }}
                    />
                  </div>
                </div>

                {/* Description & AI Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                      Description
                    </label>
                    <button
                      type="button"
                      onClick={handleAiGenerateCopy}
                      disabled={aiGenerating}
                      style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✨ {aiGenerating ? 'Writing...' : 'AI Rewrite Copy'}
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: VARIANT MATRIX */}
            {editTab === 'variants' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#D4AF37' }}>
                    Active Variants Matrix ({editVariants.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateMatrixForEdit}
                    style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.15)', border: '1px solid #D4AF37', color: '#D4AF37', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ⚡ Auto-Generate Combinations
                  </button>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {editVariants.map((v, i) => (
                    <div key={v.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>{v.title}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>{v.sku}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 700 }}>${v.price}</span>
                        <input
                          type="number"
                          value={v.inventoryQuantity}
                          onChange={(e) => {
                            const copy = [...editVariants];
                            copy[i]!.inventoryQuantity = Number(e.target.value);
                            setEditVariants(copy);
                          }}
                          style={{ width: '60px', padding: '4px 6px', borderRadius: '4px', background: '#000', border: '1px solid #444', color: '#FFF', fontSize: '11px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SEO COCKPIT & GOOGLE SERP PREVIEW */}
            {editTab === 'seo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* SERP Google Preview Card */}
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#202124', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '10px', color: '#BDC1C6' }}>Google Search Result Preview</span>
                  <div style={{ fontSize: '14px', color: '#8AB4F8', fontWeight: 600, cursor: 'pointer' }}>
                    {editSeoTitle || editTitle} | Official Store
                  </div>
                  <div style={{ fontSize: '11px', color: '#00875A' }}>
                    https://orbitox.store/{storeId}/product/{editingProduct.slug}
                  </div>
                  <p style={{ fontSize: '11px', color: '#BDC1C6', margin: '4px 0 0 0' }}>
                    {editSeoDesc || editDescription || 'Shop luxury handcrafted pieces online with complimentary express shipping.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAiOptimizeSEO}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(243, 229, 171, 0.1))',
                    border: '1px solid #D4AF37',
                    color: '#D4AF37',
                    fontWeight: 800,
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>✨</span>
                  <span>AI Optimize Meta Title & Snippet</span>
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                      SEO Meta Title
                    </label>
                    <span style={{ fontSize: '10px', color: editSeoTitle.length > 60 ? '#EF4444' : 'rgba(255, 255, 255, 0.4)' }}>
                      {editSeoTitle.length}/60 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editSeoTitle}
                    onChange={(e) => setEditSeoTitle(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                      SEO Meta Description
                    </label>
                    <span style={{ fontSize: '10px', color: editSeoDesc.length > 160 ? '#EF4444' : 'rgba(255, 255, 255, 0.4)' }}>
                      {editSeoDesc.length}/160 chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={editSeoDesc}
                    onChange={(e) => setEditSeoDesc(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 2, padding: '10px', borderRadius: '6px', background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── CREATE PRODUCT MODAL ─────────────────────────────── */}
      {createModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
          onClick={() => setCreateModalOpen(false)}
        >
          <form
            onSubmit={handleCreateProductSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '560px',
              maxWidth: '100%',
              background: '#161618',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #D4AF37',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Add New Product</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                Product Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sculptural Wool Trench"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 800 }}>
                  Selling Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #D4AF37', color: '#D4AF37', fontSize: '14px', fontWeight: 800 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Compare-At ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 600.00"
                  value={newComparePrice}
                  onChange={(e) => setNewComparePrice(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Cost Per Item ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 120.00"
                  value={newCostPerItem}
                  onChange={(e) => setNewCostPerItem(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Sizes (comma-separated)
                </label>
                <input
                  type="text"
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Colors (comma-separated)
                </label>
                <input
                  type="text"
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                  Image URL
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMediaPickerTarget('create');
                    setMediaPickerOpen(true);
                  }}
                  style={{ background: 'none', border: 'none', color: '#D4AF37', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  🖼️ Browse Media Library
                </button>
              </div>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 2, padding: '10px', borderRadius: '6px', background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Create Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Universal Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelectMedia={(media) => {
          if (mediaPickerTarget === 'edit') setEditImageUrl(media.url);
          else setNewImageUrl(media.url);
          setMediaPickerOpen(false);
        }}
        storeId={storeId}
        targetFolder="products"
      />
    </div>
  );
}
