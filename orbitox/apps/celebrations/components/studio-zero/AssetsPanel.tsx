'use client';

import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Search,
  X,
  Upload,
  Sparkles,
  Plus,
  Check,
  Trash2,
  Copy,
  Folder,
  Film,
  Music,
  FileCode,
  Box,
  ExternalLink,
} from 'lucide-react';
import { SceneNodeKind } from '@/components/template-studio/engine/SceneGraphTypes';
import { ProjectAsset } from './WebsiteProjectTypes';
import { FileUploadService } from '../template-studio/services/FileUploadService';

interface AssetsPanelProps {
  assets?: ProjectAsset[];
  onCreateAsset?: (asset: ProjectAsset) => void;
  onDeleteAsset?: (assetId: string) => void;
  onInsertNode: (kind: SceneNodeKind, name: string, defaults?: any) => void;
  onReplaceImage?: (url: string, assetId?: string) => void;
  selectedNodeKind?: SceneNodeKind;
  onClose: () => void;
}

export function AssetsPanel({
  assets = [],
  onCreateAsset,
  onDeleteAsset,
  onInsertNode,
  onReplaceImage,
  selectedNodeKind,
  onClose,
}: AssetsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'photos' | 'graphics' | 'backgrounds' | 'video' | 'audio' | 'fonts' | '3d' | 'uploads'>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Curated professional media assets
  const defaultAssets: ProjectAsset[] = [
    {
      id: 'ast_font_cinzel',
      name: 'Cinzel Decorative Variable Font',
      category: 'font' as any,
      folder: 'fonts',
      url: 'https://fonts.gstatic.com/s/cinzeldecorative/v16/daaCSScvJGqLYhG8nNt8KPPswUAPnh7U_31y.woff2',
      sizeBytes: 84000,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'ast_3d_astrolabe',
      name: 'Celestial Astrolabe Rings (GLB)',
      category: '3d' as any,
      folder: '3d',
      url: 'https://assets.orbitox.io/models/astrolabe_rings.glb',
      sizeBytes: 240000,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a1',
      name: 'Architectural Palace Minimalist',
      category: 'image',
      folder: 'architecture',
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      sizeBytes: 420000,
      width: 1200,
      height: 800,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a2',
      name: 'Deep Space Nebula Portal',
      category: 'image',
      folder: 'celestial',
      url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
      sizeBytes: 530000,
      width: 1200,
      height: 800,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a3',
      name: 'Abstract Golden Fluid',
      category: 'image',
      folder: 'abstract',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      sizeBytes: 380000,
      width: 1200,
      height: 800,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a4',
      name: 'High Fashion Royal Editorial',
      category: 'image',
      folder: 'editorial',
      url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80',
      sizeBytes: 460000,
      width: 1200,
      height: 800,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a5',
      name: 'Royal Heritage Courtyard',
      category: 'image',
      folder: 'architecture',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
      sizeBytes: 490000,
      width: 1200,
      height: 800,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a6',
      name: 'Starlight Golden Constellation',
      category: 'image',
      folder: 'celestial',
      url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
      sizeBytes: 610000,
      width: 1200,
      height: 800,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a7',
      name: 'Luxury Botanical Flora',
      category: 'image',
      folder: 'editorial',
      url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80',
      sizeBytes: 390000,
      width: 1200,
      height: 800,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'a8',
      name: 'Cinematic Space Flight',
      category: 'video',
      folder: 'celestial',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
      sizeBytes: 2400000,
      createdAt: '2026-10-01T00:00:00.000Z',
    },
  ];

  // Combined project assets + defaults
  const allAssets: ProjectAsset[] = [...assets, ...defaultAssets];

  // Derive unique folders list
  const allFolders = Array.from(
    new Set([
      'architecture',
      'celestial',
      'editorial',
      'abstract',
      ...customFolders,
      ...allAssets.map((a) => a.folder || 'general'),
    ])
  ).filter(Boolean);

  const filteredAssets = allAssets.filter((a) => {
    // Category match
    let matchesCat = true;
    if (category === 'photos') matchesCat = a.category === 'image' && a.folder !== 'abstract';
    else if (category === 'backgrounds') matchesCat = a.folder === 'abstract' || a.folder === 'celestial';
    else if (category === 'graphics') matchesCat = a.category === 'svg';
    else if (category === 'video') matchesCat = a.category === 'video';
    else if (category === 'audio') matchesCat = a.category === 'audio';
    else if (category === 'fonts') matchesCat = (a.category as any) === 'font' || a.folder === 'fonts' || a.name.toLowerCase().includes('font');
    else if (category === '3d') matchesCat = (a.category as any) === '3d' || a.folder === '3d' || a.name.toLowerCase().includes('glb') || a.name.toLowerCase().includes('3d');
    else if (category === 'uploads') matchesCat = assets.some((up) => up.id === a.id);

    // Folder match
    const matchesFolder = selectedFolder === 'all' || a.folder === selectedFolder;

    // Search match
    const matchesSearch = !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCat && matchesFolder && matchesSearch;
  });

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && !customFolders.includes(newFolderName.trim().toLowerCase())) {
      const folderKey = newFolderName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      setCustomFolders((prev) => [...prev, folderKey]);
      setSelectedFolder(folderKey);
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  // Real File Upload handler via FileUploadService
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      try {
        const newAsset = await FileUploadService.uploadFile(file);
        if (onCreateAsset) {
          onCreateAsset(newAsset);
        }
      } catch (err) {
        console.error('[AssetsPanel] Upload failed:', err);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAssetClick = (asset: ProjectAsset) => {
    if (selectedNodeKind === 'image' && onReplaceImage) {
      onReplaceImage(asset.url, asset.id);
    } else if (asset.category === 'video') {
      onInsertNode('video', asset.name, {
        videoUrl: asset.url,
        geometry: { width: '100%', height: '400px', position: 'flow' },
        style: { border: { radius: '12px' } },
      });
    } else {
      onInsertNode('image', asset.name, {
        imageUrl: asset.url,
        geometry: { width: '100%', height: '400px', position: 'flow' },
        style: { border: { radius: '12px' } },
      });
    }
  };

  const handleCopyUrl = (e: React.MouseEvent, asset: ProjectAsset) => {
    e.stopPropagation();
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    if (onDeleteAsset) {
      onDeleteAsset(assetId);
    }
  };

  return (
    <div
      id="sz-assets-panel"
      style={{
        width: '320px',
        height: '100%',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        boxShadow: '10px 0 30px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Hidden Real File Input */}
      <input
        ref={fileInputRef}
        id="sz-asset-file-input"
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.svg,.woff2,.woff,.ttf,.glb,.gltf,.json"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={16} color="#3B82F6" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F3F4F6' }}>
            Asset Manager
          </span>
          <span style={{ fontSize: '0.68rem', color: '#9CA3AF', background: 'rgba(255, 255, 255, 0.06)', padding: '1px 6px', borderRadius: '4px' }}>
            {allAssets.length}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Upload Button */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <button
          id="sz-upload-asset-btn"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            border: 'none',
            borderRadius: '6px',
            padding: '9px 12px',
            color: '#FFFFFF',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.15s ease',
          }}
        >
          <Upload size={14} />
          <span>Upload Image / Media</span>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: '8px 16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1F2229',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '6px 10px',
          }}
        >
          <Search size={14} color="#6B7280" />
          <input
            id="sz-asset-search-input"
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F3F4F6',
              fontSize: '0.76rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: '4px', padding: '0 16px 8px', overflowX: 'auto' }} className="sz-custom-scrollbar">
        {(['all', 'photos', 'graphics', 'backgrounds', 'video', 'audio', 'fonts', '3d', 'uploads'] as const).map((cat) => (
          <button
            key={cat}
            id={`sz-asset-filter-${cat}`}
            onClick={() => setCategory(cat)}
            style={{
              background: category === cat ? '#3B82F6' : '#1F2229',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.68rem',
              fontWeight: 500,
              color: category === cat ? '#FFFFFF' : '#9CA3AF',
              cursor: 'pointer',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Folder Management Strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 16px 8px', overflowX: 'auto' }} className="sz-custom-scrollbar">
        <Folder size={12} style={{ color: '#6B7280', flexShrink: 0 }} />
        <button
          id="sz-folder-all"
          onClick={() => setSelectedFolder('all')}
          style={{
            background: selectedFolder === 'all' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            border: selectedFolder === 'all' ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '0.64rem',
            color: selectedFolder === 'all' ? '#60A5FA' : '#9CA3AF',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          All Folders
        </button>
        {allFolders.map((fld) => (
          <button
            key={fld}
            id={`sz-folder-${fld}`}
            onClick={() => setSelectedFolder(fld)}
            style={{
              background: selectedFolder === fld ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              border: selectedFolder === fld ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '0.64rem',
              color: selectedFolder === fld ? '#60A5FA' : '#9CA3AF',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textTransform: 'capitalize',
            }}
          >
            {fld}
          </button>
        ))}
        {!isCreatingFolder ? (
          <button
            id="sz-add-folder-btn"
            onClick={() => setIsCreatingFolder(true)}
            title="Create Folder"
            style={{
              background: 'transparent',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '4px',
              padding: '2px 5px',
              color: '#9CA3AF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Plus size={10} />
          </button>
        ) : (
          <form onSubmit={handleCreateFolder} style={{ display: 'flex', gap: '3px' }}>
            <input
              id="sz-new-folder-input"
              type="text"
              placeholder="Name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              style={{
                background: '#121418',
                border: '1px solid #3B82F6',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '0.64rem',
                color: '#FFFFFF',
                width: '60px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#2563EB',
                border: 'none',
                borderRadius: '3px',
                color: '#FFFFFF',
                padding: '2px 4px',
                cursor: 'pointer',
              }}
            >
              <Check size={10} />
            </button>
          </form>
        )}
      </div>

      {/* Selected Node Hint & Drag Hint */}
      <div
        id="sz-asset-drag-hint"
        style={{
          margin: '0 16px 8px',
          padding: '6px 10px',
          background: selectedNodeKind === 'image' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.04)',
          border: selectedNodeKind === 'image' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '6px',
          fontSize: '0.68rem',
          color: selectedNodeKind === 'image' ? '#93C5FD' : '#9CA3AF',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Sparkles size={12} style={{ color: selectedNodeKind === 'image' ? '#60A5FA' : '#9CA3AF', flexShrink: 0 }} />
        <span>
          {selectedNodeKind === 'image'
            ? 'Click or drag asset to replace selected Image'
            : 'Drag asset onto any canvas image to replace'}
        </span>
      </div>

      {/* Asset Grid (Draggable cards) */}
      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 16px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          alignContent: 'start',
        }}
      >
        {filteredAssets.map((asset) => (
          <div
            key={asset.id}
            id={`sz-asset-card-${asset.id}`}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('orbitox_asset', JSON.stringify(asset));
              e.dataTransfer.setData('text/plain', asset.url);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            onClick={() => handleAssetClick(asset)}
            style={{
              background: '#1F2229',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
            className="group"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                width: '100%',
                height: '90px',
                background: '#111317',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {asset.category === 'video' ? (
                <div style={{ color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <Film size={24} />
                  <span style={{ fontSize: '0.62rem' }}>Video</span>
                </div>
              ) : asset.category === 'audio' ? (
                <div style={{ color: '#9CA3AF', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <Music size={24} />
                  <span style={{ fontSize: '0.62rem' }}>Audio</span>
                </div>
              ) : (
                <img
                  src={asset.thumbnailUrl || asset.url}
                  alt={asset.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}

              {/* Hover Actions Overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(2px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                }}
                className="group-hover:!opacity-100"
              >
                <button
                  id={`sz-copy-asset-btn-${asset.id}`}
                  title="Copy URL"
                  onClick={(e) => handleCopyUrl(e, asset)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px',
                    color: copiedId === asset.id ? '#34D399' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {copiedId === asset.id ? <Check size={12} /> : <Copy size={12} />}
                </button>

                {onDeleteAsset && (
                  <button
                    id={`sz-delete-asset-btn-${asset.id}`}
                    title="Delete Asset"
                    onClick={(e) => handleDelete(e, asset.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '4px',
                      color: '#F87171',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Label */}
            <div style={{ padding: '6px 8px' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#F3F4F6',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {asset.name}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#6B7280', textTransform: 'capitalize' }}>
                {asset.category} {asset.sizeBytes ? `• ${Math.round(asset.sizeBytes / 1024)} KB` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
