'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  X,
  Link,
  Tag,
  Check,
  Table,
  Layers,
  Trash2,
  Edit2,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { CMSCollectionStore, CMSCollection, CMSField } from '../template-studio/engine/CMSCollectionStore';

interface DataPanelProps {
  selectedNodeId: string | null;
  selectedNodeName?: string;
  onBindVariable?: (variableName: string) => void;
  onBindCollection?: (collectionSlug: string) => void;
  onClose: () => void;
}

export function DataPanel({
  selectedNodeId,
  selectedNodeName,
  onBindVariable,
  onBindCollection,
  onClose,
}: DataPanelProps) {
  const [activeTab, setActiveTab] = useState<'collections' | 'variables'>('collections');
  const [collections, setCollections] = useState<CMSCollection[]>([]);
  const [selectedColId, setSelectedColId] = useState<string>('col_products');
  const [editingCell, setEditingCell] = useState<{ itemId: string; fieldKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [boundSuccess, setBoundSuccess] = useState<string | null>(null);

  // Global variables state (legacy & lightweight bindings)
  const [variables, setVariables] = useState([
    { name: 'siteTitle', type: 'string', value: 'OrbitoX Platform' },
    { name: 'eventName', type: 'string', value: 'Global Spatial Tech Summit' },
    { name: 'eventDate', type: 'string', value: 'October 24, 2026' },
    { name: 'ticketPrice', type: 'number', value: '499' },
    { name: 'isRsvpOpen', type: 'boolean', value: 'true' },
  ]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  // Subscribe to reactive CMSCollectionStore updates
  useEffect(() => {
    const update = () => {
      setCollections(CMSCollectionStore.getCollections());
    };
    update();
    const unsubscribe = CMSCollectionStore.subscribe(update);
    return () => unsubscribe();
  }, []);

  const activeCollection =
    collections.find((c) => c.id === selectedColId) || collections[0];

  const handleCellBlur = (itemId: string, fieldKey: string) => {
    if (!activeCollection) return;
    CMSCollectionStore.updateItem(activeCollection.id, itemId, {
      [fieldKey]: editValue,
    });
    setEditingCell(null);
  };

  const handleAddRow = () => {
    if (!activeCollection) return;
    const defaultData: Record<string, any> = {};
    activeCollection.fields.forEach((f) => {
      defaultData[f.key] =
        f.type === 'number'
          ? 0
          : f.type === 'boolean'
          ? true
          : f.type === 'image'
          ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80'
          : `New ${f.label}`;
    });
    CMSCollectionStore.addItem(activeCollection.id, defaultData);
  };

  const handleDeleteRow = (itemId: string) => {
    if (!activeCollection) return;
    CMSCollectionStore.deleteItem(activeCollection.id, itemId);
  };

  const handleBindCollectionRepeater = () => {
    if (!activeCollection) return;
    if (onBindCollection) {
      onBindCollection(activeCollection.slug);
    } else if (onBindVariable) {
      onBindVariable(`cms.${activeCollection.slug}`);
    }
    setBoundSuccess(activeCollection.name);
    setTimeout(() => setBoundSuccess(null), 2500);
  };

  const handleAddVariable = () => {
    if (newVarName.trim()) {
      setVariables((prev) => [
        ...prev,
        { name: newVarName.trim(), type: 'string', value: newVarValue.trim() || 'Sample Value' },
      ]);
      setNewVarName('');
      setNewVarValue('');
    }
  };

  return (
    <aside
      id="sz-data-panel"
      className="w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-30 select-none text-slate-200"
    >
      {/* ── HEADER ── */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-100">Data & CMS Engine</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── TAB SWITCHER: COLLECTIONS vs VARIABLES ── */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 gap-1">
        <button
          onClick={() => setActiveTab('collections')}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'collections'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          Collections ({collections.length})
        </button>
        <button
          onClick={() => setActiveTab('variables')}
          className={`py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'variables'
              ? 'bg-indigo-600 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Variables ({variables.length})
        </button>
      </div>

      {/* ── BINDING STATUS BANNER ── */}
      <div className="px-3.5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between">
        <div className="text-[11px] truncate">
          {selectedNodeId ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Target:</span>
              <span className="text-indigo-400 font-semibold truncate max-w-[140px]">
                {selectedNodeName || 'Selected Layer'}
              </span>
            </div>
          ) : (
            <span className="text-slate-500">Select canvas node to bind</span>
          )}
        </div>

        {activeTab === 'collections' && activeCollection && selectedNodeId && (
          <button
            onClick={handleBindCollectionRepeater}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[10px] font-semibold transition-all shadow-sm"
            title="Bind collection items as repeating canvas elements"
          >
            {boundSuccess ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Bound!</span>
              </>
            ) : (
              <>
                <Link className="w-3 h-3" />
                <span>Bind Repeater</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* ── TAB CONTENT ── */}
      {activeTab === 'collections' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Collection Pills Bar */}
          <div className="p-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedColId(c.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeCollection?.id === c.id
                    ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>{c.name}</span>
                <span className="text-[9px] px-1 py-0.2 bg-slate-900 rounded font-mono text-slate-400">
                  {c.items.length}
                </span>
              </button>
            ))}

            <button
              onClick={() => {
                const name = prompt('New Collection Name:', 'Customer Reviews');
                if (name) {
                  const created = CMSCollectionStore.createCollection({ name });
                  setSelectedColId(created.id);
                }
              }}
              className="px-2 py-1 rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-600/10 text-[11px] flex items-center gap-1 transition-colors"
              title="Create new collection"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Table Container */}
          {activeCollection ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-auto p-2">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                      {activeCollection.fields.map((f) => (
                        <th key={f.key} className="p-1.5 font-semibold">
                          {f.label}
                        </th>
                      ))}
                      <th className="p-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCollection.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-800/60 hover:bg-slate-800/40 group transition-colors"
                      >
                        {activeCollection.fields.map((f) => {
                          const val = item[f.key];
                          const isEditing =
                            editingCell?.itemId === item.id && editingCell?.fieldKey === f.key;

                          return (
                            <td
                              key={f.key}
                              onDoubleClick={() => {
                                setEditingCell({ itemId: item.id, fieldKey: f.key });
                                setEditValue(String(val ?? ''));
                              }}
                              className="p-1.5 cursor-pointer max-w-[120px] truncate font-mono text-slate-300"
                              title="Double click to edit"
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCellBlur(item.id, f.key)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCellBlur(item.id, f.key);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full bg-indigo-950 border border-indigo-500 rounded px-1 py-0.5 text-white text-[11px] outline-none font-mono"
                                />
                              ) : f.type === 'image' ? (
                                <div className="flex items-center gap-1.5">
                                  {val && (
                                    <img
                                      src={val}
                                      alt=""
                                      className="w-5 h-5 rounded object-cover border border-slate-700"
                                    />
                                  )}
                                  <span className="truncate text-slate-400 text-[10px]">
                                    {val ? 'Image' : 'none'}
                                  </span>
                                </div>
                              ) : f.type === 'boolean' ? (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    val
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-rose-500/20 text-rose-400'
                                  }`}
                                >
                                  {val ? 'TRUE' : 'FALSE'}
                                </span>
                              ) : (
                                <span className="truncate block">{String(val ?? '')}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-1.5 text-right">
                          <button
                            onClick={() => handleDeleteRow(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Add Row Button */}
              <div className="p-2.5 border-t border-slate-800 bg-slate-950/60">
                <button
                  onClick={handleAddRow}
                  className="w-full py-1.5 rounded-lg border border-dashed border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row to {activeCollection.name}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-slate-500 text-xs">
              No collections found. Click + to create one.
            </div>
          )}
        </div>
      ) : (
        /* ── VARIABLES TAB ── */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {variables.map((v) => (
              <div
                key={v.name}
                className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs font-mono font-semibold text-slate-200">
                      {v.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    &ldquo;{v.value}&rdquo;
                  </div>
                </div>

                {onBindVariable && selectedNodeId && (
                  <button
                    onClick={() => {
                      onBindVariable(v.name);
                      setBoundSuccess(v.name);
                      setTimeout(() => setBoundSuccess(null), 2000);
                    }}
                    className="p-1 rounded hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 transition-colors"
                    title={`Bind ${v.name} to selected layer`}
                  >
                    <Link className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add variable footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
            <input
              type="text"
              placeholder="Variable name (e.g. promoCode)"
              value={newVarName}
              onChange={(e) => setNewVarName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white outline-none font-mono focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Default value"
                value={newVarValue}
                onChange={(e) => setNewVarValue(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-white outline-none font-mono focus:border-indigo-500"
              />
              <button
                onClick={handleAddVariable}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
