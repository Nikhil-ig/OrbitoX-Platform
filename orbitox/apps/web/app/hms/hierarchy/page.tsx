'use client';

import React, { useState, useEffect } from 'react';
import HospitalNavLayout from '../components/HospitalNavLayout';

export type HierarchyTier = 'organisation' | 'tenant' | 'department' | 'ward' | 'room' | 'bed';

interface TreeNode {
  id: string;
  name: string;
  type: HierarchyTier;
  parentId?: string;
  children?: TreeNode[];
  meta?: Record<string, any>;
}

const TIER_ICONS: Record<HierarchyTier, { icon: string; label: string; color: string }> = {
  organisation: { icon: '🌐', label: 'Tier 1: Organisation (Network)', color: '#1e60ff' },
  tenant: { icon: '🏥', label: 'Tier 2: Tenant (Hospital Branch)', color: '#0284c7' },
  department: { icon: '🩺', label: 'Tier 3: Department (Specialization)', color: '#059669' },
  ward: { icon: '🏢', label: 'Tier 4: Ward (Care Unit)', color: '#d97706' },
  room: { icon: '🚪', label: 'Tier 5: Room (Physical Room)', color: '#db2777' },
  bed: { icon: '🛏️', label: 'Tier 6: Bed Station (Bound IoT)', color: '#7c3aed' },
};

export default function HierarchyTreePage() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const [showModal, setShowModal] = useState(false);
  const [modalTier, setModalTier] = useState<HierarchyTier>('department');
  const [parentTargetId, setParentTargetId] = useState('');
  const [newNodeName, setNewNodeName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLiveHierarchy = async () => {
    try {
      setLoading(true);
      const [hierRes, staffRes] = await Promise.all([
        fetch('/api/hospital/hierarchy'),
        fetch('/api/hospital/security/staff')
      ]);

      const [hierData, staffData] = await Promise.all([
        hierRes.json(),
        staffRes.json()
      ]);

      if (hierData.success && hierData.tree) {
        setTree(hierData.tree);
        const expandMap: Record<string, boolean> = {};
        if (hierData.allContexts) {
          hierData.allContexts.forEach((c: any) => {
            expandMap[c.id] = true;
          });
        }
        setExpandedNodes(expandMap);
      }

      if (staffData.success && staffData.data) {
        setStaffList(staffData.data);
      }
    } catch (err) {
      console.error('Failed to load hierarchy or staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveHierarchy();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openCreateModal = (tier: HierarchyTier, parentId: string) => {
    setModalTier(tier);
    setParentTargetId(parentId);
    setNewNodeName('');
    setShowModal(true);
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/hospital/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newNodeName || `New ${modalTier.toUpperCase()}`,
          type: modalTier,
          parentId: parentTargetId
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        await fetchLiveHierarchy();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTree = (node: TreeNode, depth = 0) => {
    const tierMeta = TIER_ICONS[node.type] || { icon: '📦', label: node.type, color: '#64748b' };
    const isExpanded = expandedNodes[node.id] !== false;
    const hasChildren = node.children && node.children.length > 0;

    let nextTier: HierarchyTier | null = null;
    if (node.type === 'organisation') nextTier = 'tenant';
    else if (node.type === 'tenant') nextTier = 'department';
    else if (node.type === 'department') nextTier = 'ward';
    else if (node.type === 'ward') nextTier = 'room';
    else if (node.type === 'room') nextTier = 'bed';

    const nodeStaff = staffList.filter(s => s.contextId === node.id || s.departmentId === node.id);

    return (
      <div key={node.id} style={{ marginLeft: `${depth * 24}px`, marginTop: '8px' }}>
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(node.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#94a3b8' }}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            ) : (
              <span style={{ width: '12px' }} />
            )}
            <span style={{ fontSize: '18px' }}>{tierMeta.icon}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{node.name}</strong>
              <span style={{ fontSize: '11px', fontWeight: 700, color: tierMeta.color, background: 'rgba(241, 245, 249, 0.8)', padding: '2px 8px', borderRadius: '8px' }}>
                {node.type.toUpperCase()}
              </span>
              {nodeStaff.length > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#0369a1',
                    background: '#e0f2fe',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    border: '1px solid #bae6fd'
                  }}
                  title={nodeStaff.map(s => `${s.name} (${s.customTitle || s.role})`).join('\n')}
                >
                  👥 {nodeStaff.length} Staff ({nodeStaff.slice(0, 2).map(s => s.name.split(' ')[1] || s.name).join(', ')}{nodeStaff.length > 2 ? ` +${nodeStaff.length - 2}` : ''})
                </span>
              )}
            </div>
          </div>

          {nextTier && (
            <button
              onClick={() => openCreateModal(nextTier!, node.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#1e60ff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Add {nextTier}
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div style={{ borderLeft: '2px solid #e2e8f0', marginLeft: '18px' }}>
            {node.children!.map((child) => renderTree(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <HospitalNavLayout
      headerTitle="6-Tier Context Hierarchy Tree"
      headerSubtitle="Enterprise multi-tenant isolation from Global Health Network to Bedside IoT."
      actions={
        <button
          onClick={fetchLiveHierarchy}
          style={{
            padding: '8px 16px',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          ↻ Refresh Tree
        </button>
      }
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderRadius: '28px',
          padding: '28px 32px',
          boxShadow: '0 10px 30px rgba(37, 99, 235, 0.05)'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {Object.entries(TIER_ICONS).map(([key, val]) => (
            <div
              key={key}
              style={{
                padding: '6px 12px',
                borderRadius: '12px',
                background: 'rgba(248, 250, 252, 0.9)',
                border: '1px solid #e2e8f0',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#334155'
              }}
            >
              <span>{val.icon}</span>
              <strong>{val.label}</strong>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Loading live hierarchy from OrbitoX Platform...
          </div>
        ) : tree ? (
          <div>{renderTree(tree)}</div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            No hierarchy tree found.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div
            style={{
              width: '420px',
              background: '#ffffff',
              borderRadius: '28px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Create {modalTier.toUpperCase()} Node
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Node Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. Cardiology Unit`}
                  value={newNodeName}
                  onChange={e => setNewNodeName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1e60ff 0%, #2563eb 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Creating...' : 'Provision Node'}
              </button>
            </form>
          </div>
        </div>
      )}
    </HospitalNavLayout>
  );
}
