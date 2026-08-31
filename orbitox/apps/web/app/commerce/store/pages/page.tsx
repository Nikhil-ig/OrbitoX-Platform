'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCommerceStore, useCommerceBuilder, commerceEngine, StorePage } from '@orbitox/commerce';

export default function PagesManagementPage() {
  const { store } = useCommerceStore();
  const storeId = store?.id || 'store_aura_luxury';
  const { allPages, createNewPage, deleteStorePage, duplicateStorePage, refreshPage } = useCommerceBuilder(storeId);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSlug, setNewSlug] = useState<string>('');
  const [newTemplate, setNewTemplate] = useState<'blank' | 'lookbook' | 'about' | 'sale' | 'faq'>('lookbook');
  const [isHome, setIsHome] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    const autoSlug = '/' + val.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    setNewSlug(autoSlug);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim()) return;

    const created = createNewPage({
      title: newTitle.trim(),
      slug: newSlug.trim(),
      template: newTemplate,
      isHome,
      seo: {
        title: `${newTitle} | ${store?.name || 'AURA Luxury'}`,
        description: `Explore ${newTitle} at ${store?.name || 'AURA Luxury'}.`,
      },
    });

    setModalOpen(false);
    setNewTitle('');
    setNewSlug('');
    setIsHome(false);

    commerceEngine.activity.logEvent({
      storeId,
      type: 'page_published',
      title: `Created Page: ${created.title}`,
      description: `URL Slug: ${created.slug} (${created.sectionsDraft.length} sections from ${newTemplate} template).`,
      icon: '📄',
      severity: 'info',
    });

    showToast(`✓ Page "${created.title}" created successfully!`);
  };

  const handleDelete = (p: StorePage) => {
    if (p.isHome || p.slug === '/') {
      alert('You cannot delete the primary Homepage. Please set another page as Home first.');
      return;
    }
    if (confirm(`Are you sure you want to delete the page "${p.title}" (${p.slug})?`)) {
      deleteStorePage(p.id);
      showToast(`🗑️ Page "${p.title}" deleted.`);
    }
  };

  const handleDuplicate = (p: StorePage) => {
    const copy = duplicateStorePage(p.id);
    showToast(`📋 Duplicated page to "${copy.title}" (${copy.slug})!`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#FFF' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📄</span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Store Pages & Landing CMS
            </h1>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Create and manage custom landing pages, lookbooks, story pages, and promotional campaign drops.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
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
          <span>Add New Page</span>
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

      {/* Pages Table */}
      <div
        style={{
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'rgba(255, 255, 255, 0.5)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Page Title & Role</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>URL Slug</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Sections Count</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: 700 }}>Last Updated</th>
              <th style={{ padding: '14px 20px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allPages.map((p) => {
              const liveUrl = p.slug === '/' ? `/store/${store?.slug || 'aura-luxury'}` : `/store/${store?.slug || 'aura-luxury'}${p.slug}`;
              const isDirty = p.draftVersion > p.publishedVersion;

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{p.isHome ? '🏠' : '📄'}</span>
                      <span style={{ fontSize: '14px', fontWeight: 800 }}>{p.title}</span>
                      {p.isHome && (
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(212, 175, 55, 0.2)',
                            color: '#D4AF37',
                            fontSize: '10px',
                            fontWeight: 800,
                          }}
                        >
                          HOMEPAGE
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <code style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#C084FC', fontSize: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      {p.slug}
                    </code>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ fontWeight: 600 }}>{p.sectionsDraft.length} sections</span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: isDirty ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isDirty ? '#F59E0B' : '#10B981',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {isDirty ? `Draft Edits (v${p.draftVersion})` : `Published v${p.publishedVersion}`}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
                    {new Date(p.updatedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <Link
                        href={`/commerce/store/builder?page=${encodeURIComponent(p.slug)}`}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                          color: '#000000',
                          fontWeight: 800,
                          fontSize: '12px',
                          textDecoration: 'none',
                        }}
                      >
                        Edit in Builder ⚡
                      </Link>

                      <Link
                        href={liveUrl}
                        target="_blank"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#FFF',
                          fontSize: '12px',
                          textDecoration: 'none',
                        }}
                      >
                        Live ↗
                      </Link>

                      <button
                        onClick={() => handleDuplicate(p)}
                        title="Duplicate Page"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#FFF',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        📋
                      </button>

                      {!p.isHome && (
                        <button
                          onClick={() => handleDelete(p)}
                          title="Delete Page"
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
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create New Page Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={handleCreateSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '520px',
              maxWidth: '100%',
              background: '#161618',
              borderRadius: '16px',
              border: '1px solid #D4AF37',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Create New Storefront Page</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700 }}>Page Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Summer Lookbook 2026, About Our Atelier"
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '6px', background: '#000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#FFF', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700 }}>URL Path Slug *</label>
              <input
                type="text"
                required
                placeholder="e.g. /lookbook, /about, /vip-drop"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                style={{ padding: '10px 14px', borderRadius: '6px', background: '#000', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#C084FC', fontSize: '13px', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700 }}>Initial Page Template</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'lookbook', label: '✨ Lookbook / Editorial', desc: 'Hero, mosaic banner, testimonials, newsletter' },
                  { id: 'about', label: '📖 Brand Story / About', desc: 'Story hero, badges, master tailor banner' },
                  { id: 'sale', label: '⚡ Flash Sale / Drop', desc: 'Hero, product grid, countdown badges' },
                  { id: 'faq', label: '❓ FAQ & Support', desc: 'Trust badges, newsletter, support footer' },
                  { id: 'blank', label: '🎨 Blank Canvas', desc: 'Clean header, empty dropzone, footer' },
                ].map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setNewTemplate(tpl.id as any)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      background: newTemplate === tpl.id ? 'rgba(212, 175, 55, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      border: newTemplate === tpl.id ? '1px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#FFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 800, color: newTemplate === tpl.id ? '#D4AF37' : '#FFF' }}>{tpl.label}</span>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>{tpl.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)' }}>
              <input
                type="checkbox"
                id="isHomeCheckbox"
                checked={isHome}
                onChange={(e) => setIsHome(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="isHomeCheckbox" style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer' }}>
                Set as Primary Storefront Homepage (Replaces Current Home)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 2, padding: '12px', borderRadius: '8px', background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
              >
                Create & Open Page
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
