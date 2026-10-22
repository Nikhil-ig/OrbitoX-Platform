'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Calendar, MapPin, Users, ExternalLink, Plus, Eye } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { useEcosystem } from '@/lib/ecosystem-context';

export default function WorkspaceCelebrationsPage() {
  const { agencyProjects } = useEcosystem();

  return (
    <WorkspaceShell>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff' }}>Celebrations Portfolio</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
              All client events, invitation portals, and live celebration worlds currently provisioned.
            </p>
          </div>

          <Link href="/create" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.84rem', background: '#3b82f6' }}>
            <Plus size={15} />
            <span>Launch New Celebration</span>
          </Link>
        </div>

        {/* Celebrations Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {agencyProjects.map((project) => (
            <div key={project.id} className="surface-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                    {project.occasionSlug.toUpperCase()}
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                    {project.status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                  {project.eventTitle}
                </h3>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                  Client: <strong>{project.clientName}</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} color="#60a5fa" />
                    <span>{project.eventDate}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} color="#60a5fa" />
                    <span>{project.venueName}, {project.venueCity}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={14} color="#60a5fa" />
                    <span>
                      {project.checkedInGuests} of {project.totalGuests} Guests Checked In
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '8px' }}>
                <Link
                  href={project.clientReviewUrl}
                  target="_blank"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '8px' }}
                >
                  <Eye size={13} />
                  <span>Preview Live</span>
                </Link>
                <Link
                  href="/create"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem', padding: '8px', background: '#3b82f6' }}
                >
                  <span>Edit Event</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceShell>
  );
}
