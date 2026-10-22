'use client';

import React, { useEffect, useState } from 'react';
import { usePlatform } from '../components/PlatformContext';
import { tokens } from '../components/tokens';

export default function PlatformProjectsPage() {
  const { openInspector, refreshTrigger, triggerRefresh } = usePlatform();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    businessModel: 'B2B2C',
    planTier: 'enterprise',
    technicalLead: '',
    contactEmail: '',
  });
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch('/api/v1/platform/projects');
        const data = await res.json();
        if (data.success) {
          setProjects(data.data || []);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [refreshTrigger]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setCreating(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/v1/platform/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setFeedback(`Project "${result.data.project.name}" provisioned.`);
        setIsNewProjectModalOpen(false);
        setFormData({ name: '', slug: '', businessModel: 'B2B2C', planTier: 'enterprise', technicalLead: '', contactEmail: '' });
        triggerRefresh();
      } else {
        setFeedback(`Creation failed: ${result.error?.message}`);
      }
    } catch (err: any) {
      setFeedback(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (planFilter !== 'ALL' && p.plan?.toLowerCase() !== planFilter.toLowerCase()) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: tokens.typography.size.xxl, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0, letterSpacing: '-0.02em' }}>
            Projects
          </h1>
          <p style={{ fontSize: tokens.typography.size.base, color: tokens.colors.text.secondary, margin: '4px 0 0 0' }}>
            Manage client projects, isolated environments, and resource quotas.
          </p>
        </div>
        <button
          onClick={() => setIsNewProjectModalOpen(true)}
          style={{
            padding: '7px 14px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.text.primary,
            color: tokens.colors.text.inverted,
            fontWeight: tokens.typography.weight.semibold,
            fontSize: tokens.typography.size.base,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + Create Project
        </button>
      </div>

      {feedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.status.infoSubtle,
            border: `1px solid ${tokens.colors.status.info}`,
            color: tokens.colors.status.info,
            fontSize: tokens.typography.size.base,
          }}
        >
          {feedback}
        </div>
      )}

      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{
              width: '100%',
              padding: '7px 12px',
              backgroundColor: tokens.colors.bg.input,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.base,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted }}>Plan:</span>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.default}`,
              borderRadius: tokens.radius.sm,
              color: tokens.colors.text.primary,
              fontSize: tokens.typography.size.xs,
              outline: 'none',
            }}
          >
            <option value="ALL">All Plans</option>
            <option value="enterprise">Enterprise</option>
            <option value="growth">Growth</option>
            <option value="starter">Starter</option>
          </select>
        </div>
      </div>

      {/* Projects Data Table */}
      <div
        style={{
          backgroundColor: tokens.colors.bg.surface,
          border: `1px solid ${tokens.colors.border.subtle}`,
          borderRadius: tokens.radius.md,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: tokens.typography.size.base }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tokens.colors.border.subtle}`, height: '36px' }}>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Project
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Plan
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Environments
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                API Usage (24h)
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Health
              </th>
              <th style={{ padding: '0 16px', color: tokens.colors.text.muted, fontSize: tokens.typography.size.xs, fontWeight: tokens.typography.weight.semibold, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Security
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: tokens.colors.text.muted }}>
                  No matching projects found.
                </td>
              </tr>
            ) : (
              filteredProjects.map((p, idx) => (
                <tr
                  key={p.id}
                  onClick={() => openInspector('project', p)}
                  style={{
                    height: '48px',
                    borderBottom: idx < filteredProjects.length - 1 ? `1px solid ${tokens.colors.border.subtle}` : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = tokens.colors.bg.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ fontWeight: tokens.typography.weight.medium, color: tokens.colors.text.primary }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: tokens.typography.size.xs, color: tokens.colors.text.muted, fontFamily: tokens.typography.fontFamily.mono }}>
                      {p.slug}
                    </div>
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, textTransform: 'capitalize' }}>
                    {p.plan || 'Enterprise'}
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary }}>
                    {p.environments?.length || 3} active
                  </td>
                  <td style={{ padding: '0 16px', color: tokens.colors.text.secondary, fontFamily: tokens.typography.fontFamily.mono }}>
                    {p.slug === 'omnideliver' ? '6.2M' : p.slug === 'mednet' ? '3.1M' : '940K'} req
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: tokens.colors.status.healthy }} />
                      <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.size.xs }}>Healthy</span>
                    </div>
                  </td>
                  <td style={{ padding: '0 16px' }}>
                    <span style={{ fontSize: tokens.typography.size.xs, color: p.slug === 'mednet' ? tokens.colors.status.warning : tokens.colors.status.healthy }}>
                      {p.slug === 'mednet' ? '1 finding' : 'Good'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Provision Modal */}
      {isNewProjectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: tokens.colors.bg.surfaceRaised,
              border: `1px solid ${tokens.colors.border.strong}`,
              borderRadius: tokens.radius.lg,
              boxShadow: tokens.shadow.modal,
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: tokens.typography.size.lg, fontWeight: tokens.typography.weight.bold, color: tokens.colors.text.primary, margin: 0 }}>
                Create New Project
              </h2>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Project Name
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                  placeholder="e.g. Apex Logistics"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontSize: tokens.typography.size.base,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Slug / Tenant Identifier
                </label>
                <input
                  required
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="apex-logistics"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontSize: tokens.typography.size.base,
                    fontFamily: tokens.typography.fontFamily.mono,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: tokens.typography.size.xs, color: tokens.colors.text.secondary, marginBottom: '4px' }}>
                  Plan Tier
                </label>
                <select
                  value={formData.planTier}
                  onChange={(e) => setFormData({ ...formData, planTier: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    backgroundColor: tokens.colors.bg.input,
                    border: `1px solid ${tokens.colors.border.default}`,
                    borderRadius: tokens.radius.sm,
                    color: tokens.colors.text.primary,
                    fontSize: tokens.typography.size.base,
                    outline: 'none',
                  }}
                >
                  <option value="enterprise">Enterprise</option>
                  <option value="growth">Growth</option>
                  <option value="starter">Starter</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: 'transparent',
                    border: `1px solid ${tokens.colors.border.default}`,
                    color: tokens.colors.text.secondary,
                    fontSize: tokens.typography.size.base,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '7px 14px',
                    borderRadius: tokens.radius.sm,
                    backgroundColor: tokens.colors.text.primary,
                    color: tokens.colors.text.inverted,
                    fontWeight: tokens.typography.weight.semibold,
                    fontSize: tokens.typography.size.base,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
