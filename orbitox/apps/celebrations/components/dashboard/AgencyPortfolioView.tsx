'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useEcosystem, AgencyClientProject } from '../../lib/ecosystem-context';
import { useResponsiveDevice } from '../../hooks/useResponsiveDevice';
import {
  Building2,
  Plus,
  ExternalLink,
  QrCode,
  DollarSign,
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Copy,
  Check,
  X,
} from 'lucide-react';

export function AgencyPortfolioView({ onOpenDoorTerminal }: { onOpenDoorTerminal: (projectId: string) => void }) {
  const { agencyProjects, addAgencyClientProject } = useEcosystem();
  const { isMobile, isTablet } = useResponsiveDevice();
  const [showNewModal, setShowNewModal] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // New Client Form
  const [clientName, setClientName] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [occasionSlug, setOccasionSlug] = useState('wedding');
  const [templateSlug, setTemplateSlug] = useState('royal-regalia');
  const [eventDate, setEventDate] = useState('2026-12-20');
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState('');
  const [totalGuests, setTotalGuests] = useState(350);
  const [wholesaleCost, setWholesaleCost] = useState(2499);
  const [clientRetailPrice, setClientRetailPrice] = useState(15000);
  const [passcode, setPasscode] = useState('GATE-5520');

  const handleCreateClientProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !eventTitle.trim() || !venueName.trim()) return;

    addAgencyClientProject({
      clientName: clientName.trim(),
      eventTitle: eventTitle.trim(),
      occasionSlug,
      templateSlug,
      eventDate,
      venueName: venueName.trim(),
      venueCity: venueCity.trim() || 'Destination',
      status: 'LIVE_READY',
      totalGuests,
      wholesaleCostInr: wholesaleCost,
      clientRetailPriceInr: clientRetailPrice,
      clientReviewUrl: `/e/royal-wedding-demo?client=${encodeURIComponent(clientName.toLowerCase().replace(/\s+/g, '-'))}`,
      doorStaffPasscode: passcode,
    });

    setShowNewModal(false);
    setClientName('');
    setEventTitle('');
    setVenueName('');
  };

  const copyDoorPasscode = (code: string, id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    }
  };

  const totalWholesale = agencyProjects.reduce((sum, p) => sum + p.wholesaleCostInr, 0);
  const totalRetail = agencyProjects.reduce((sum, p) => sum + p.clientRetailPriceInr, 0);
  const totalMargin = totalRetail > 0 ? Math.round(((totalRetail - totalWholesale) / totalRetail) * 100) : 0;
  const totalGuestsManaged = agencyProjects.reduce((sum, p) => sum + p.totalGuests, 0);
  const totalCheckedIn = agencyProjects.reduce((sum, p) => sum + p.checkedInGuests, 0);

  const formContent = (
    <form onSubmit={handleCreateClientProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
          Client / Family Name *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. The Mittal Family"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#0B0F1A',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            fontSize: '0.9rem',
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
          Event Title *
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Palace Wedding of Aryan & Siya"
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: '10px',
            background: '#0B0F1A',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            fontSize: '0.9rem',
          }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
            Venue Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Umaid Bhawan Palace"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#0B0F1A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.9rem',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
            Destination City *
          </label>
          <input
            type="text"
            placeholder="e.g. Jodhpur, Rajasthan"
            value={venueCity}
            onChange={(e) => setVenueCity(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#0B0F1A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
            Date of Event
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#0B0F1A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.9rem',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
            Expected Headcount
          </label>
          <input
            type="number"
            value={totalGuests}
            onChange={(e) => setTotalGuests(parseInt(e.target.value, 10) || 100)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#0B0F1A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
            Client Retail Price (₹ INR)
          </label>
          <input
            type="number"
            value={clientRetailPrice}
            onChange={(e) => setClientRetailPrice(parseInt(e.target.value, 10) || 10000)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#0B0F1A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.9rem',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: '#fff' }}>
            Door Passcode
          </label>
          <input
            type="text"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#0B0F1A',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontSize: '0.9rem',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <button
          type="button"
          onClick={() => setShowNewModal(false)}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-maison-primary"
          style={{ flex: 2, padding: '12px', justifyContent: 'center', fontSize: '0.9rem' }}
        >
          <span>Provision Client Experience</span>
          <CheckCircle2 size={16} />
        </button>
      </div>
    </form>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner & Metric Deck */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge-purple">O2O2B Atelier Cockpit</span>
            <span className="badge-gold">Commercial Partner Network</span>
          </div>
          <h2 style={{ fontSize: isMobile ? '1.5rem' : '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', margin: 0 }}>
            Luxury Client Portfolio & Banquet Logistics
          </h2>
          <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            Manage client celebrations, white-label client preview portals, wholesale template margins, and offline door staff check-ins.
          </p>
        </div>

        <div style={{ width: isMobile ? '100%' : 'auto' }}>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-maison-primary"
            style={{ width: isMobile ? '100%' : 'auto', padding: '11px 22px', fontSize: '0.86rem', justifyContent: 'center' }}
          >
            <Plus size={16} />
            <span>Add Client Celebration</span>
          </button>
        </div>
      </div>

      {/* Financial & Logistics Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Client Galas
          </span>
          <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
            {agencyProjects.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim)' }}>Active Projects</span>
        </div>

        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Gross Billed
          </span>
          <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 800, color: 'var(--cel-gold)', marginTop: '4px' }}>
            ₹{(totalRetail / 1000).toFixed(0)}k
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
            +{totalMargin}% Net Margin
          </span>
        </div>

        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Managed Guests
          </span>
          <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 800, color: '#F472B6', marginTop: '4px' }}>
            {totalGuestsManaged}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim)' }}>Total Headcount</span>
        </div>

        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '20px' }}>
          <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Door Check-Ins
          </span>
          <div style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 800, color: '#38BDF8', marginTop: '4px' }}>
            {totalCheckedIn}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700 }}>
            {totalGuestsManaged > 0 ? Math.round((totalCheckedIn / totalGuestsManaged) * 100) : 0}% Arrived
          </span>
        </div>
      </div>

      {/* Active Client Galas List */}
      <div className="glass-panel" style={{ padding: isMobile ? '18px' : '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Active Client Celebrations &amp; Gates ({agencyProjects.length})
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {agencyProjects.map((project) => {
            const marginPercent = Math.round(
              ((project.clientRetailPriceInr - project.wholesaleCostInr) / project.clientRetailPriceInr) * 100
            );
            const checkInPercent = Math.round((project.checkedInGuests / project.totalGuests) * 100);
            const isCopied = copiedCodeId === project.id;

            return (
              <div
                key={project.id}
                style={{
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--cel-border-subtle)',
                  padding: isMobile ? '18px' : '24px',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? '16px' : '20px',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Event Details */}
                <div style={{ flex: isMobile ? 'none' : '1 1 340px', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge-purple" style={{ fontSize: '0.66rem' }}>{project.clientName}</span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: project.status === 'LIVE_READY' ? '#10B981' : '#60A5FA',
                        fontWeight: 700,
                      }}
                    >
                      ● {project.status.replace('_', ' ')}
                    </span>
                  </div>

                  <strong style={{ fontSize: isMobile ? '1.1rem' : '1.2rem', color: '#FFFFFF', display: 'block', marginBottom: '6px' }}>
                    {project.eventTitle}
                  </strong>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', fontSize: '0.80rem', color: 'var(--cel-text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="var(--cel-gold)" />
                      {project.venueName}, {project.venueCity}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} color="#60A5FA" />
                      {project.eventDate}
                    </span>
                    <button
                      onClick={() => copyDoorPasscode(project.doorStaffPasscode, project.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(223, 186, 107, 0.1)',
                        border: '1px solid rgba(223, 186, 107, 0.3)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        color: 'var(--cel-gold)',
                        fontWeight: 700,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                      }}
                      title="Click to copy door passcode"
                    >
                      <span>Code: {project.doorStaffPasscode}</span>
                      {isCopied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                {/* Margins & Billing (Responsive on mobile) */}
                <div
                  style={{
                    flex: isMobile ? 'none' : '0 1 200px',
                    width: isMobile ? '100%' : 'auto',
                    borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                    paddingLeft: isMobile ? '0' : '16px',
                    paddingTop: isMobile ? '12px' : '0',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--cel-text-muted)' }}>Financial Breakdown:</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                    ₹{project.clientRetailPriceInr.toLocaleString('en-IN')}
                    <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-dim)', fontWeight: 400 }}> (Billed)</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                    Margin: {marginPercent}% (₹{(project.clientRetailPriceInr - project.wholesaleCostInr).toLocaleString('en-IN')})
                  </div>
                </div>

                {/* Attendance Radar */}
                <div
                  style={{
                    flex: isMobile ? 'none' : '0 1 180px',
                    width: isMobile ? '100%' : 'auto',
                    borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                    paddingLeft: isMobile ? '0' : '16px',
                    paddingTop: isMobile ? '12px' : '0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--cel-text-muted)' }}>
                    <span>Gate Attendance:</span>
                    <strong style={{ color: '#38BDF8' }}>{checkInPercent}%</strong>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38BDF8', marginTop: '2px' }}>
                    {project.checkedInGuests} <span style={{ fontSize: '0.78rem', color: 'var(--cel-text-dim)' }}>/ {project.totalGuests}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${checkInPercent}%`, background: '#38BDF8', borderRadius: '999px' }} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                  <button
                    onClick={() => onOpenDoorTerminal(project.id)}
                    className="btn-outline-gold touch-target"
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <QrCode size={14} />
                    <span>Door Terminal</span>
                  </button>

                  <Link
                    href={project.clientReviewUrl}
                    target="_blank"
                    className="touch-target"
                    style={{
                      flex: isMobile ? 1 : 'none',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Client Portal</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: New Client Project (Mobile: Bottom Sheet, Desktop: Centered Modal) */}
      {showNewModal && (
        isMobile ? (
          <div className="mobile-bottom-sheet-backdrop" onClick={() => setShowNewModal(false)}>
            <div className="mobile-bottom-sheet-content" onClick={(e) => e.stopPropagation()}>
              <div className="bottom-sheet-drag-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  Register Client Celebration
                </h3>
                <button
                  onClick={() => setShowNewModal(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              {formContent}
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(16px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
            }}
            onClick={() => setShowNewModal(false)}
          >
            <div
              className="glass-panel-gold"
              style={{ maxWidth: '560px', width: '100%', padding: '36px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>
                Register New Client Celebration
              </h3>
              <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.86rem', marginBottom: '24px' }}>
                Create an isolated celebration instance for your client with wholesale pricing and door staff credentials.
              </p>
              {formContent}
            </div>
          </div>
        )
      )}
    </div>
  );
}
