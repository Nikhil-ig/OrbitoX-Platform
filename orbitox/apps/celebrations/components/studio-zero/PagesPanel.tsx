'use client';

import React, { useState } from 'react';
import {
  LayoutGrid,
  Plus,
  X,
  Copy,
  Trash2,
  Check,
  Edit2,
  ArrowUp,
  ArrowDown,
  Globe,
  Home,
  Layers,
  GripVertical,
} from 'lucide-react';
import { TemplateSceneDefinition, TemplatePageDefinition } from '@/components/template-studio/types/TemplateSchema';

interface PagesPanelProps {
  pages: TemplatePageDefinition[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onCreatePage: (name: string, route: string) => void;
  onDeletePage: (pageId: string) => void;
  onRenamePage: (pageId: string, name: string, route?: string) => void;
  onDuplicatePage: (pageId: string) => void;
  sections: TemplateSceneDefinition[];
  activeSceneId: string;
  onSelectScene: (sceneId: string) => void;
  onAddSection: (position?: number) => void;
  onMoveSection: (sectionId: string, direction?: 'up' | 'down', targetIndex?: number) => void;
  onReorderSections?: (sourceIndex: number, targetIndex: number) => void;
  onDeleteSection: (sectionId: string) => void;
  onDuplicateSection: (sectionId: string) => void;
  onClose: () => void;
}

export function PagesPanel({
  pages,
  activePageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onRenamePage,
  onDuplicatePage,
  sections,
  activeSceneId,
  onSelectScene,
  onAddSection,
  onMoveSection,
  onReorderSections,
  onDeleteSection,
  onDuplicateSection,
  onClose,
}: PagesPanelProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editPageName, setEditPageName] = useState('');
  const [editPageRoute, setEditPageRoute] = useState('');

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageRoute, setNewPageRoute] = useState('');

  const activePage = pages.find((p) => p.id === activePageId) || pages[0] || {
    id: 'page_home',
    name: 'Home',
    route: '/',
    sectionIds: [],
    isHome: true,
  };

  const handleStartRenamePage = (page: TemplatePageDefinition) => {
    setEditingPageId(page.id);
    setEditPageName(page.name);
    setEditPageRoute(page.route);
  };

  const handleSaveRenamePage = (pageId: string) => {
    if (editPageName.trim()) {
      onRenamePage(pageId, editPageName.trim(), editPageRoute.trim() || undefined);
    }
    setEditingPageId(null);
  };

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    const route = newPageRoute.trim()
      ? newPageRoute.trim().startsWith('/')
        ? newPageRoute.trim()
        : `/${newPageRoute.trim()}`
      : `/${newPageName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    onCreatePage(newPageName.trim(), route);
    setNewPageName('');
    setNewPageRoute('');
    setIsNewPageModalOpen(false);
  };

  return (
    <aside
      id="sz-pages-panel"
      style={{
        width: '320px',
        background: '#16181D',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 35,
        userSelect: 'none',
      }}
    >
      {/* ── HEADER ── */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutGrid size={15} style={{ color: '#3B82F6' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F3F4F6' }}>
            Pages & Sections
          </span>
        </div>
        <button
          id="sz-pages-close-btn"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '2px',
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div
        className="sz-custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* ── 1. WEBSITE ROUTES & PAGES ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Website Routes ({pages.length})
            </span>
            <button
              id="sz-add-page-btn"
              onClick={() => setIsNewPageModalOpen(true)}
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#60A5FA',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Plus size={11} />
              <span>New Page</span>
            </button>
          </div>

          {/* New Page Inline Modal */}
          {isNewPageModalOpen && (
            <form
              onSubmit={handleCreatePage}
              style={{
                background: '#1F2229',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#FFFFFF' }}>
                Create New Page
              </div>
              <input
                id="sz-new-page-name-input"
                type="text"
                placeholder="Page Name (e.g. About Us)"
                value={newPageName}
                onChange={(e) => {
                  setNewPageName(e.target.value);
                  if (!newPageRoute || newPageRoute === `/${newPageName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`) {
                    setNewPageRoute(`/${e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
                  }
                }}
                autoFocus
                style={{
                  background: '#16181D',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '5px',
                  padding: '5px 8px',
                  fontSize: '0.75rem',
                  color: '#FFFFFF',
                  outline: 'none',
                }}
              />
              <input
                id="sz-new-page-route-input"
                type="text"
                placeholder="Route (e.g. /about)"
                value={newPageRoute}
                onChange={(e) => setNewPageRoute(e.target.value)}
                style={{
                  background: '#16181D',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '5px',
                  padding: '5px 8px',
                  fontSize: '0.75rem',
                  color: '#9CA3AF',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewPageModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="sz-create-page-submit-btn"
                  type="submit"
                  disabled={!newPageName.trim()}
                  style={{
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '3px 10px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* List of Pages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {pages.map((page) => {
              const isActive = page.id === activePageId;
              const isEditing = editingPageId === page.id;

              return (
                <div
                  key={page.id}
                  id={`sz-page-row-${page.id}`}
                  onClick={() => onSelectPage(page.id)}
                  style={{
                    background: isActive ? '#1F2430' : '#1C1E25',
                    border: isActive ? '1px solid #3B82F6' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isEditing ? (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editPageName}
                        onChange={(e) => setEditPageName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRenamePage(page.id)}
                        autoFocus
                        style={{
                          background: '#121418',
                          border: '1px solid #3B82F6',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          fontSize: '0.75rem',
                          color: '#FFFFFF',
                          outline: 'none',
                          flex: 1,
                        }}
                      />
                      <button
                        onClick={() => handleSaveRenamePage(page.id)}
                        style={{
                          background: '#2563EB',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '3px 6px',
                          color: '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {page.isHome ? (
                          <Home size={14} style={{ color: isActive ? '#60A5FA' : '#9CA3AF' }} />
                        ) : (
                          <Globe size={14} style={{ color: isActive ? '#60A5FA' : '#9CA3AF' }} />
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: isActive ? 600 : 500,
                              color: isActive ? '#FFFFFF' : '#E5E7EB',
                            }}
                          >
                            {page.name}
                          </span>
                          <span style={{ fontSize: '0.66rem', color: '#6B7280' }}>
                            {page.route} • {page.sectionIds.length} sections
                          </span>
                        </div>
                      </div>

                      {/* Page Actions */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          id={`sz-rename-page-${page.id}`}
                          onClick={() => handleStartRenamePage(page)}
                          title="Rename Page"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            padding: '3px',
                            borderRadius: '3px',
                          }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          id={`sz-duplicate-page-${page.id}`}
                          onClick={() => onDuplicatePage(page.id)}
                          title="Duplicate Page"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            padding: '3px',
                            borderRadius: '3px',
                          }}
                        >
                          <Copy size={12} />
                        </button>
                        {!page.isHome && pages.length > 1 && (
                          <button
                            id={`sz-delete-page-${page.id}`}
                            onClick={() => onDeletePage(page.id)}
                            title="Delete Page"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '3px',
                              borderRadius: '3px',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. SECTIONS ON ACTIVE PAGE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={13} style={{ color: '#60A5FA' }} />
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Sections on {activePage.name} ({sections.length})
              </span>
            </div>
            <button
              id="sz-add-section-page-btn"
              onClick={() => onAddSection(sections.length)}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.68rem',
                color: '#9CA3AF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Plus size={11} />
              <span>Add</span>
            </button>
          </div>

          {/* List of Sections on this Page */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sections.map((scene, idx) => {
              const isSceneActive = scene.id === activeSceneId;
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              return (
                <div
                  key={scene.id}
                  id={`sz-page-section-row-${scene.id}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(idx));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedIndex(idx);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverIndex !== idx) {
                      setDragOverIndex(idx);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverIndex === idx) {
                      setDragOverIndex(null);
                    }
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedIndex !== null && draggedIndex !== idx) {
                      if (onReorderSections) {
                        onReorderSections(draggedIndex, idx);
                      } else if (sections[draggedIndex]) {
                        onMoveSection(sections[draggedIndex].id, undefined, idx);
                      }
                    }
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  onClick={() => {
                    onSelectScene(scene.id);
                    const el = document.getElementById(`sz-section-container-${scene.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  style={{
                    background: isDragging ? '#1A2035' : isSceneActive ? '#1E2538' : '#191B21',
                    border: isDragOver
                      ? '1px dashed #3B82F6'
                      : isSceneActive
                      ? '1px solid #3B82F6'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: isDragOver ? '0 0 0 1px #3B82F6' : undefined,
                    opacity: isDragging ? 0.4 : 1,
                    borderRadius: '5px',
                    padding: '6px 8px',
                    cursor: 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      id={`sz-drag-handle-${scene.id}`}
                      style={{
                        cursor: 'grab',
                        color: isSceneActive ? '#60A5FA' : '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Drag to reorder"
                    >
                      <GripVertical size={12} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: isSceneActive ? '#60A5FA' : '#6B7280',
                      }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: isSceneActive ? 600 : 500,
                        color: isSceneActive ? '#FFFFFF' : '#D1D5DB',
                      }}
                    >
                      {scene.name}
                    </span>
                  </div>

                  {/* Section Controls */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      id={`sz-panel-sec-up-${scene.id}`}
                      disabled={idx === 0}
                      onClick={() => onMoveSection(scene.id, 'up')}
                      title="Move Up"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: idx === 0 ? '#374151' : '#9CA3AF',
                        cursor: idx === 0 ? 'default' : 'pointer',
                        padding: '2px',
                      }}
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      id={`sz-panel-sec-down-${scene.id}`}
                      disabled={idx === sections.length - 1}
                      onClick={() => onMoveSection(scene.id, 'down')}
                      title="Move Down"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: idx === sections.length - 1 ? '#374151' : '#9CA3AF',
                        cursor: idx === sections.length - 1 ? 'default' : 'pointer',
                        padding: '2px',
                      }}
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      id={`sz-panel-sec-dup-${scene.id}`}
                      onClick={() => onDuplicateSection(scene.id)}
                      title="Duplicate Section"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <Copy size={11} />
                    </button>
                    <button
                      id={`sz-panel-sec-del-${scene.id}`}
                      disabled={sections.length <= 1}
                      onClick={() => onDeleteSection(scene.id)}
                      title="Delete Section"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: sections.length <= 1 ? '#374151' : '#EF4444',
                        cursor: sections.length <= 1 ? 'default' : 'pointer',
                        padding: '2px',
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
