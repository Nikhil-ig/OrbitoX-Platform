'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAdmin } from '../data/admin-context';
import { BusinessModelType } from '../data/mock-data';
import { ProjectProvisionModal } from '../components/project-provision-modal';
import {
  RocketIcon,
  CheckIcon,
  BanIcon,
  SlidersIcon,
  GlobeIcon,
  KeyIcon,
  ZapIcon,
  BriefcaseIcon,
  PackageIcon,
  StoreIcon,
  HospitalIcon,
  ShoppingBagIcon,
  UtensilsIcon,
  CpuIcon,
  GraduationCapIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
} from '../components/icons';

export default function ClientProjectsPage() {
  const { projects, toggleProjectStatus, showToast } = useAdmin();

  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);

  // Model categories
  const filteredProjects = projects.filter((p) => {
    const matchesModel = selectedModelFilter === 'all' || p.businessModel === selectedModelFilter;
    const matchesQuery =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.customDomain && p.customDomain.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesModel && matchesQuery;
  });

  const totalCallsConsumed = projects.reduce((sum, p) => sum + p.monthlyApiCalls, 0);
  const totalAllocatedQuota = projects.reduce((sum, p) => sum + p.apiCallQuota, 0);
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;
  const o2oCount = projects.filter((p) => p.businessModel === 'O2O2B2B2C').length;

  const MODEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    O2O2B2B2C: { bg: 'rgba(255, 122, 26, 0.15)', text: '#FF7A1A', border: 'rgba(255, 122, 26, 0.3)' },
    HEALTHCARE_NETWORK: { bg: 'rgba(236, 72, 153, 0.15)', text: '#EC4899', border: 'rgba(236, 72, 153, 0.3)' },
    D2C: { bg: 'rgba(168, 85, 247, 0.15)', text: '#A855F7', border: 'rgba(168, 85, 247, 0.3)' },
    B2B_SaaS: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)' },
    B2B2C: { bg: 'rgba(99, 102, 241, 0.15)', text: '#6366F1', border: 'rgba(99, 102, 241, 0.3)' },
    FRANCHISE_RETAIL: { bg: 'rgba(20, 184, 166, 0.15)', text: '#14B8A6', border: 'rgba(20, 184, 166, 0.3)' },
  };

  const getServiceIcon = (serviceId: string) => {
    switch (serviceId) {
      case 'restaurant': return <UtensilsIcon size={13} color="#F59E0B" />;
      case 'pos': return <StoreIcon size={13} color="#14B8A6" />;
      case 'commerce': return <ShoppingBagIcon size={13} color="#A855F7" />;
      case 'crm': return <BriefcaseIcon size={13} color="#3B82F6" />;
      case 'finance': return <ZapIcon size={13} color="#10B981" />;
      case 'inventory': return <PackageIcon size={13} color="#EC4899" />;
      case 'hms': return <HospitalIcon size={13} color="#EF4444" />;
      case 'hrms': return <CpuIcon size={13} color="#8B5CF6" />;
      case 'school': return <GraduationCapIcon size={13} color="#6366F1" />;
      default: return <CpuIcon size={13} color="#9AA7C2" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* ─── Page Title & Action Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
              Client Projects & Ecosystem
            </h1>
            <span
              style={{
                background: 'rgba(88, 101, 242, 0.2)',
                color: '#818CF8',
                border: '1px solid rgba(88, 101, 242, 0.3)',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 800,
              }}
            >
              {projects.length} Total Projects
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#9AA7C2' }}>
            Zero-code plugin packaging & multi-tier business models (O2O2B2B2C, B2B2C, Enterprise SaaS) with live quota enforcement.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/admin/projects/create"
            style={{
              padding: '12px 20px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FF7A1A',
              color: '#FFFFFF',
              fontWeight: 800,
              borderRadius: '12px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(255, 122, 26, 0.4)',
            }}
          >
            <RocketIcon size={16} color="#FFFFFF" />
            <span>+ Create External OS Project</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsProvisionModalOpen(true)}
            className="pill-interactive pill-interactive-primary"
            style={{ padding: '12px 20px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>+ Provision In-Hub Client</span>
          </button>
        </div>
      </div>

      {/* ─── External OS Decoupled Products Live Banner ─── */}
      <div style={{ background: 'linear-gradient(135deg, rgba(255, 122, 26, 0.12) 0%, rgba(16, 20, 36, 0.95) 100%)', border: '1px solid rgba(255, 122, 26, 0.3)', borderRadius: '16px', padding: '22px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 900, background: '#FF7A1A', color: '#fff', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
              EXTERNAL RUNTIME PLANE
            </span>
            <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 800 }}>
              ● 1 Connected Product Active
            </span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, margin: '8px 0 4px 0', color: '#fff' }}>
            OrbitoX RestaurantOS (Independent Runtime)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#A3AED0' }}>
            Running independently on <code>localhost:4010</code>. Controlled authoritatively from OrbitoX Control Plane.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/admin/projects/project_restaurant_os"
            style={{
              padding: '10px 18px',
              background: '#1F263E',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '13px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SlidersIcon size={14} color="#FF7A1A" />
            <span>Open Control Center</span>
          </Link>

          <a
            href="http://localhost:4010"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 18px',
              background: '#FF7A1A',
              color: '#fff',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '13px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Launch Runtime (:4010)</span>
            <ExternalLinkIcon size={14} color="#fff" />
          </a>
        </div>
      </div>

      {/* ─── Platform Aggregate Metric Cards ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="squircle-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A3AED0', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            Total Client Projects
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#FFFFFF', marginTop: '6px' }}>
            {projects.length}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>
            {activeProjectsCount} Operational & Active
          </div>
        </div>

        <div className="squircle-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A3AED0', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            O2O2B2B2C Ecosystems
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#FF7A1A', marginTop: '6px' }}>
            {o2oCount}
          </div>
          <div style={{ fontSize: '12px', color: '#A3AED0', marginTop: '4px' }}>
            Multi-Tier Kitchens & POS
          </div>
        </div>

        <div className="squircle-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A3AED0', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            Live API Consumption
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#5865F2', marginTop: '6px' }}>
            {(totalCallsConsumed / 1000000).toFixed(1)}M
          </div>
          <div style={{ fontSize: '12px', color: '#A3AED0', marginTop: '4px' }}>
            of {(totalAllocatedQuota / 1000000).toFixed(0)}M allocated quota
          </div>
        </div>

        <div className="squircle-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#A3AED0', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            Global Quota Headroom
          </div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: '#10B981', marginTop: '6px' }}>
            {totalAllocatedQuota > 0 ? `${Math.round(((totalAllocatedQuota - totalCallsConsumed) / totalAllocatedQuota) * 100)}%` : '100%'}
          </div>
          <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px', fontWeight: 700 }}>
            Buffer Available for Scale
          </div>
        </div>
      </div>

      {/* ─── Search & Architecture Model Filters ─── */}
      <div
        className="squircle-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Architectures' },
            { id: 'O2O2B2B2C', label: 'O2O2B2B2C Networks' },
            { id: 'HEALTHCARE_NETWORK', label: 'Healthcare Networks' },
            { id: 'D2C', label: 'Omnichannel D2C' },
            { id: 'B2B_SaaS', label: 'B2B SaaS' },
            { id: 'B2B2C', label: 'B2B2C Campuses' },
            { id: 'FRANCHISE_RETAIL', label: 'Franchise POS' },
          ].map((tab) => {
            const isActive = selectedModelFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedModelFilter(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #5865F2' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isActive ? 'rgba(88, 101, 242, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? '#FFFFFF' : '#9AA7C2',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by project, domain, or entity..."
          style={{
            padding: '9px 16px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF',
            fontSize: '12.5px',
            outline: 'none',
            minWidth: '260px',
          }}
        />
      </div>

      {/* ─── Projects Master Table / Cards ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredProjects.length === 0 ? (
          <div className="squircle-card" style={{ padding: '60px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>No Projects Found</h3>
            <p style={{ fontSize: '13px', color: '#9AA7C2', marginTop: '6px' }}>
              No client projects match your search criteria. Provision a new project to get started.
            </p>
            <button
              type="button"
              onClick={() => setIsProvisionModalOpen(true)}
              className="pill-interactive pill-interactive-orange"
              style={{ marginTop: '16px', display: 'inline-flex', padding: '10px 20px', fontSize: '12.5px' }}
            >
              + Provision New Client Project
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const modelColor = MODEL_COLORS[project.businessModel] || {
              bg: 'rgba(255, 255, 255, 0.1)',
              text: '#FFFFFF',
              border: 'rgba(255, 255, 255, 0.2)',
            };
            const quotaPercent = Math.min(100, Math.round((project.monthlyApiCalls / project.apiCallQuota) * 100));
            const isSuspended = project.status === 'suspended';

            return (
              <div
                key={project.id}
                className="squircle-card"
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  border: isSuspended ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isSuspended ? 'rgba(239, 68, 68, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Card Top Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '16px',
                        background: modelColor.bg,
                        border: `1px solid ${modelColor.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: modelColor.text,
                      }}
                    >
                      <RocketIcon size={24} color={modelColor.text} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <Link
                          href={`/admin/projects/${project.id}`}
                          style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            color: '#FFFFFF',
                            textDecoration: 'none',
                            letterSpacing: '-0.3px',
                          }}
                        >
                          {project.name}
                        </Link>

                        {/* Model Badge */}
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: modelColor.bg,
                            color: modelColor.text,
                            border: `1px solid ${modelColor.border}`,
                          }}
                        >
                          {project.businessModel}
                        </span>

                        {/* Plan Badge */}
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 800,
                            background: 'rgba(88, 101, 242, 0.15)',
                            color: '#818CF8',
                            border: '1px solid rgba(88, 101, 242, 0.3)',
                          }}
                        >
                          {project.planLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '5px', fontSize: '12px', color: '#9AA7C2' }}>
                        <span>{project.organization}</span>
                        <span>•</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FFFFFF', fontFamily: 'monospace' }}>
                          <GlobeIcon size={12} color="#9AA7C2" />
                          <span>{project.customDomain}</span>
                        </span>
                        <span>•</span>
                        <span>{project.rateLimitPerMin.toLocaleString()} req/min limit</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => toggleProjectStatus(project.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '999px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        border: isSuspended ? '1px solid #10B981' : '1px solid rgba(239, 68, 68, 0.3)',
                        background: isSuspended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                        color: isSuspended ? '#10B981' : '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {isSuspended ? (
                        <>
                          <CheckIcon size={12} color="#10B981" />
                          <span>Activate</span>
                        </>
                      ) : (
                        <>
                          <BanIcon size={12} color="#EF4444" />
                          <span>Suspend</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="pill-interactive pill-interactive-primary"
                      style={{ textDecoration: 'none', padding: '8px 18px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <SlidersIcon size={13} color="#FFFFFF" />
                      <span>Tune Limits & Plan</span>
                      <ArrowRightIcon size={12} color="#FFFFFF" />
                    </Link>
                  </div>
                </div>

                {/* Subscribed Plugins & Quota Progress Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1fr',
                    gap: '20px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    alignItems: 'center',
                  }}
                >
                  {/* Enabled Packages Badges */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#A3AED0', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Subscribed Zero-Code Packages ({project.enabledServices.length})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {project.enabledServices.map((srv) => (
                        <div
                          key={srv}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#FFFFFF',
                          }}
                        >
                          {getServiceIcon(srv)}
                          <span>@{srv}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quota Progress Meter */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
                      <span style={{ color: '#A3AED0' }}>API Calls Consumption</span>
                      <span style={{ color: quotaPercent > 80 ? '#EF4444' : '#FFFFFF' }}>
                        {(project.monthlyApiCalls / 1000000).toFixed(2)}M / {(project.apiCallQuota / 1000000).toFixed(1)}M ({quotaPercent}%)
                      </span>
                    </div>

                    <div
                      style={{
                        height: '8px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          width: `${quotaPercent}%`,
                          height: '100%',
                          background:
                            quotaPercent > 90
                              ? '#EF4444'
                              : quotaPercent > 70
                              ? '#F59E0B'
                              : 'linear-gradient(90deg, #5865F2, #10B981)',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Provisioning Modal */}
      <ProjectProvisionModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
      />
    </div>
  );
}
