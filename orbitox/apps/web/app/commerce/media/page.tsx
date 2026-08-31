'use client';

import React, { useState } from 'react';
import { useCommerceStore, useCommerceMedia, MediaFolderType } from '@orbitox/commerce';
import { MediaPickerModal } from '@/components/commerce/media-picker-modal';

export default function CommerceMediaPage() {
  const { store } = useCommerceStore();
  const storeId = store?.id || 'store_aura_luxury';

  const {
    mediaItems,
    storageUsedBytes,
    searchQuery,
    setSearchQuery,
    addMediaFromUrl,
    updateMedia,
    deleteMedia,
  } = useCommerceMedia(storeId);

  const [selectedFolder, setSelectedFolder] = useState<MediaFolderType | 'all'>('all');
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Edit Alt-text modal
  const [editingItem, setEditingItem] = useState<{ id: string; filename: string; altText: string; folder: MediaFolderType } | null>(null);

  const filteredMedia = mediaItems.filter((item) => {
    const matchesFolder = selectedFolder === 'all' || item.folder === selectedFolder;
    const matchesSearch =
      !searchQuery ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.altText && item.altText.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFolder && matchesSearch;
  });

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    updateMedia(editingItem.id, {
      filename: editingItem.filename,
      altText: editingItem.altText,
      folder: editingItem.folder,
    });
    setEditingItem(null);
  };

  const storageMb = (storageUsedBytes / (1024 * 1024)).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: '#FFF' }}>
      {/* ─── Top Stats & Action Header ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(0, 0, 0, 0.4))',
          border: '1px solid rgba(212, 175, 55, 0.3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🖼️</span>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>
              Media & Brand Assets
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', margin: '6px 0 0 0' }}>
            Manage high-resolution product photography, lookbook banners, and editorial assets for <strong style={{ color: '#D4AF37' }}>{store?.name || 'AURA Luxury'}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsPickerOpen(true)}
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
            <span>Add / Import Media</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Total Assets</span>
          <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>{mediaItems.length}</div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Storage Consumed</span>
          <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px', color: '#10B981' }}>{storageMb} MB <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>/ 5.0 GB</span></div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Product Imagery</span>
          <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>
            {mediaItems.filter((m) => m.folder === 'products').length}
          </div>
        </div>

        <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 700 }}>Runway & Banners</span>
          <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '4px' }}>
            {mediaItems.filter((m) => m.folder === 'banners' || m.folder === 'pages').length}
          </div>
        </div>
      </div>

      {/* ─── Search & Folder Filter Bar ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'products', 'banners', 'pages', 'general'] as const).map((folder) => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: selectedFolder === folder ? '#D4AF37' : 'rgba(255, 255, 255, 0.05)',
                color: selectedFolder === folder ? '#000000' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {folder}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Search by name or alt-tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '280px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFF',
            fontSize: '12px',
          }}
        />
      </div>

      {/* ─── Media Assets Grid ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {filteredMedia.map((item) => (
          <div
            key={item.id}
            style={{
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ height: '180px', background: '#09090B', overflow: 'hidden', position: 'relative' }}>
              <img
                src={item.url}
                alt={item.altText || item.filename}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#D4AF37',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'capitalize',
                }}
              >
                {item.folder}
              </span>
            </div>

            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.filename}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px', fontStyle: 'italic' }}>
                  "{item.altText || 'No alt text'}"
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span>{item.width || 1200} × {item.height || 800}</span>
                <span>{Math.round(item.sizeBytes / 1024)} KB</span>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  onClick={() => handleCopyUrl(item.url, item.id)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '4px',
                    background: copiedId === item.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: copiedId === item.id ? '#10B981' : '#FFF',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedId === item.id ? '✓ Copied URL' : '🔗 Copy URL'}
                </button>

                <button
                  onClick={() => setEditingItem({ id: item.id, filename: item.filename, altText: item.altText || '', folder: item.folder })}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFF',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  ✏️
                </button>

                <button
                  onClick={() => deleteMedia(item.id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Edit Alt-Text Modal ────────────────────────────────── */}
      {editingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}
          onClick={() => setEditingItem(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              background: '#161618',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Edit Asset Metadata</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Filename</label>
              <input
                type="text"
                value={editingItem.filename}
                onChange={(e) => setEditingItem({ ...editingItem, filename: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Alt Text (SEO)</label>
              <input
                type="text"
                value={editingItem.altText}
                onChange={(e) => setEditingItem({ ...editingItem, altText: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Folder</label>
              <select
                value={editingItem.folder}
                onChange={(e) => setEditingItem({ ...editingItem, folder: e.target.value as any })}
                style={{ padding: '8px 12px', borderRadius: '6px', background: '#000', border: '1px solid #333', color: '#FFF', fontSize: '12px' }}
              >
                <option value="products">Products</option>
                <option value="banners">Banners</option>
                <option value="pages">Pages</option>
                <option value="logos">Logos</option>
                <option value="general">General</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: 'transparent', border: '1px solid #444', color: '#FFF', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{ flex: 1, padding: '10px', borderRadius: '6px', background: '#D4AF37', border: 'none', color: '#000', fontWeight: 800, cursor: 'pointer' }}
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Universal Media Picker Modal ───────────────────────── */}
      <MediaPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectMedia={(media) => {
          setIsPickerOpen(false);
        }}
        storeId={storeId}
      />
    </div>
  );
}
