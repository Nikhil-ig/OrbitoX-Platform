'use client';

import React, { useState } from 'react';
import {
  useCommerceMedia,
  StoreMediaItem,
  StockPresetItem,
  MediaFolderType,
} from '@orbitox/commerce';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (media: { url: string; altText?: string; filename?: string }) => void;
  storeId?: string;
  initialUrl?: string;
  targetFolder?: MediaFolderType;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelectMedia,
  storeId = 'store_aura_luxury',
  initialUrl,
  targetFolder = 'general',
}: MediaPickerModalProps) {
  const {
    mediaItems,
    stockPresets,
    searchQuery,
    setSearchQuery,
    addMediaFromUrl,
    importStockPreset,
    deleteMedia,
  } = useCommerceMedia(storeId);

  const [activeTab, setActiveTab] = useState<'library' | 'stock' | 'upload'>('library');
  const [selectedFolder, setSelectedFolder] = useState<MediaFolderType | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<StoreMediaItem | StockPresetItem | null>(null);
  const [customAltText, setCustomAltText] = useState<string>('');

  // Upload Tab Form
  const [newUrl, setNewUrl] = useState<string>('');
  const [newFilename, setNewFilename] = useState<string>('');
  const [newAltText, setNewAltText] = useState<string>('');

  if (!isOpen) return null;

  const filteredMedia = mediaItems.filter((item) => {
    const matchesFolder = selectedFolder === 'all' || item.folder === selectedFolder;
    const matchesSearch =
      !searchQuery ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.altText && item.altText.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFolder && matchesSearch;
  });

  const handleSelectItem = (item: StoreMediaItem | StockPresetItem) => {
    setSelectedItem(item);
    setCustomAltText(item.altText || '');
  };

  const handleConfirmSelection = () => {
    if (!selectedItem) return;
    onSelectMedia({
      url: selectedItem.url,
      altText: customAltText || selectedItem.altText,
      filename: 'filename' in selectedItem ? selectedItem.filename : selectedItem.title,
    });
    onClose();
  };

  const handleAddNewFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const created = addMediaFromUrl({
      url: newUrl.trim(),
      filename: newFilename.trim() || `image_${Date.now()}.jpg`,
      altText: newAltText.trim() || newFilename.trim() || 'Store asset',
      folder: targetFolder,
    });

    handleSelectItem(created);
    setActiveTab('library');
    setNewUrl('');
    setNewFilename('');
    setNewAltText('');
  };

  const handleImportPreset = (preset: StockPresetItem) => {
    const imported = importStockPreset(preset, targetFolder);
    handleSelectItem(imported);
    setActiveTab('library');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '940px',
          maxWidth: '100%',
          height: '620px',
          background: '#121214',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9)',
          color: '#FFF',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🖼️</span>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Media & Asset Library</h2>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Select, upload, or import high-resolution photography for your storefront.
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div
          style={{
            padding: '12px 24px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'library', label: `📁 Store Assets (${mediaItems.length})` },
              { id: 'stock', label: `📸 Stock Presets (${stockPresets.length})` },
              { id: 'upload', label: `🔗 Add from URL / Upload` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab.id ? '#D4AF37' : 'rgba(255, 255, 255, 0.05)',
                  color: activeTab === tab.id ? '#000000' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'library' && (
            <input
              type="text"
              placeholder="Search assets by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '240px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#FFF',
                fontSize: '12px',
              }}
            />
          )}
        </div>

        {/* Modal Main Body (Grid + Details Sidebar) */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 280px', minHeight: 0 }}>
          {/* Main Grid View */}
          <div style={{ padding: '20px', overflowY: 'auto', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {activeTab === 'library' && (
              <div>
                {/* Folder filter badges */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                  {(['all', 'banners', 'products', 'pages', 'general'] as const).map((folder) => (
                    <button
                      key={folder}
                      onClick={() => setSelectedFolder(folder)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: selectedFolder === folder ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: selectedFolder === folder ? '#D4AF37' : 'rgba(255, 255, 255, 0.6)',
                        borderBottom: selectedFolder === folder ? '2px solid #D4AF37' : 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {folder}
                    </button>
                  ))}
                </div>

                {/* Media Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                  {filteredMedia.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        style={{
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ height: '110px', background: '#0B0B0C', overflow: 'hidden' }}>
                          <img
                            src={item.url}
                            alt={item.altText || item.filename}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ padding: '8px' }}>
                          <div
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.filename}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                            <span>{Math.round(item.sizeBytes / 1024)} KB</span>
                            <span style={{ textTransform: 'capitalize' }}>{item.folder}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'stock' && (
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 16px 0' }}>
                  Curated editorial photography licensed for commercial storefront usage. Click any preset to import or use directly.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                  {stockPresets.map((preset) => {
                    const isSelected = selectedItem?.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectItem(preset)}
                        style={{
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #D4AF37' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ height: '110px', overflow: 'hidden' }}>
                          <img
                            src={preset.thumbnailUrl}
                            alt={preset.altText}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div style={{ padding: '8px' }}>
                          <span style={{ fontSize: '9px', color: '#D4AF37', fontWeight: 800, textTransform: 'uppercase' }}>
                            {preset.category}
                          </span>
                          <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {preset.title}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportPreset(preset);
                            }}
                            style={{
                              marginTop: '6px',
                              width: '100%',
                              padding: '4px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.08)',
                              color: '#FFF',
                              border: 'none',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + Import to Store
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'upload' && (
              <form onSubmit={handleAddNewFromUrl} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Image URL (HTTPS / Unsplash / CDN)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '13px',
                    }}
                  />
                </div>

                {newUrl && (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', height: '160px', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={newUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Filename / Title</label>
                  <input
                    type="text"
                    placeholder="e.g. milan-runway-jacket.jpg"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Alt Text (SEO & Accessibility)</label>
                  <input
                    type="text"
                    placeholder="e.g. Tailored Italian virgin wool blazer in midnight black"
                    value={newAltText}
                    onChange={(e) => setNewAltText(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#FFF',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '13px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Add Asset to Media Library
                </button>
              </form>
            )}
          </div>

          {/* Right Selected Image Details Sidebar */}
          <div style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', fontWeight: 800 }}>
              Selected Asset Details
            </span>

            {selectedItem ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ height: '140px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <img src={selectedItem.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800 }}>
                    {'filename' in selectedItem ? selectedItem.filename : selectedItem.title}
                  </span>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)', marginTop: '2px' }}>
                    {selectedItem.width || 1200} × {selectedItem.height || 800} px
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>
                    Alt Text:
                  </label>
                  <input
                    type="text"
                    value={customAltText}
                    onChange={(e) => setCustomAltText(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFF',
                      fontSize: '11px',
                    }}
                  />
                </div>

                {'id' in selectedItem && selectedItem.id.startsWith('media_') && (
                  <button
                    onClick={() => {
                      deleteMedia(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                    }}
                  >
                    🗑️ Delete from Library
                  </button>
                )}

                <div style={{ marginTop: 'auto' }}>
                  <button
                    onClick={handleConfirmSelection}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #D4AF37, #F3E5AB)',
                      color: '#000000',
                      fontWeight: 800,
                      fontSize: '13px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 16px rgba(212, 175, 55, 0.35)',
                    }}
                  >
                    ✓ Select & Apply Image
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '11px' }}>
                Click on any image from the library or stock presets to view details and insert.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
