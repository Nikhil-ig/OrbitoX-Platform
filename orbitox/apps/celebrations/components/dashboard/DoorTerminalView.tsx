'use client';

import React, { useState } from 'react';
import { useEcosystem } from '../../lib/ecosystem-context';
import { useResponsiveDevice } from '../../hooks/useResponsiveDevice';
import {
  QrCode,
  CheckCircle2,
  Search,
  Users,
  ShieldCheck,
  Lock,
  Unlock,
  Volume2,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Check,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';

interface SimulatedGuest {
  id: string;
  name: string;
  partySize: number;
  dietary: string;
  tableNumber: number;
  isVip: boolean;
  checkedIn: boolean;
  checkInTime?: string;
}

const INITIAL_DOOR_GUESTS: SimulatedGuest[] = [
  { id: 'dg_1', name: 'Dr. Vikram Malhotra & Family', partySize: 3, dietary: 'Jain Vegetarian', tableNumber: 4, isVip: true, checkedIn: true, checkInTime: '19:15' },
  { id: 'dg_2', name: 'Ananya Singhania & Kabir', partySize: 2, dietary: 'Strict Vegan', tableNumber: 1, isVip: true, checkedIn: true, checkInTime: '19:24' },
  { id: 'dg_3', name: 'Devraj Singh Rathore', partySize: 1, dietary: 'None', tableNumber: 8, isVip: false, checkedIn: false },
  { id: 'dg_4', name: 'Pooja Bhatt & Guest', partySize: 2, dietary: 'Gluten Free', tableNumber: 2, isVip: false, checkedIn: true, checkInTime: '19:30' },
  { id: 'dg_5', name: 'Rohan Mehta & Parents', partySize: 3, dietary: 'Standard Gourmet', tableNumber: 5, isVip: false, checkedIn: false },
  { id: 'dg_6', name: 'General Yashwardhan Roy', partySize: 2, dietary: 'Low Sodium', tableNumber: 3, isVip: true, checkedIn: false },
  { id: 'dg_7', name: 'Kavita & Siddharth Oberoi', partySize: 2, dietary: 'Jain Vegetarian', tableNumber: 4, isVip: true, checkedIn: false },
  { id: 'dg_8', name: 'Farhan & Zoya Akhtar', partySize: 2, dietary: 'Halal Gourmet', tableNumber: 9, isVip: false, checkedIn: false },
];

export function DoorTerminalView({ selectedProjectId }: { selectedProjectId?: string }) {
  const { agencyProjects, recordDoorCheckIn } = useEcosystem();
  const { isMobile, isTablet } = useResponsiveDevice();

  const [activeProjectId, setActiveProjectId] = useState<string>(
    selectedProjectId || agencyProjects[0]?.id || ''
  );

  const selectedProject = agencyProjects.find((p) => p.id === activeProjectId) || agencyProjects[0];

  const [guestList, setGuestList] = useState<SimulatedGuest[]>(INITIAL_DOOR_GUESTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCheckedIn, setRecentCheckedIn] = useState<string | null>(null);

  const handleCheckIn = (guest: SimulatedGuest) => {
    if (guest.checkedIn) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setGuestList((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, checkedIn: true, checkInTime: timeStr } : g))
    );

    if (selectedProject) {
      recordDoorCheckIn(selectedProject.id, guest.partySize);
    }

    setRecentCheckedIn(guest.name);
    setTimeout(() => setRecentCheckedIn(null), 3000);
  };

  const handleSimulateQrScan = () => {
    const nextUnchecked = guestList.find((g) => !g.checkedIn);
    if (nextUnchecked) {
      handleCheckIn(nextUnchecked);
    }
  };

  const filteredGuests = guestList.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.dietary.toLowerCase().includes(q) ||
      `table ${g.tableNumber}`.includes(q)
    );
  });

  const checkedInCount = guestList.filter((g) => g.checkedIn).length;
  const attendanceRate = Math.round((checkedInCount / guestList.length) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Terminal Header & Event Selector */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge-gold">Physical Venue Concierge</span>
            <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
              ● GATE SCANNER ONLINE
            </span>
          </div>
          <h2 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
            Door Staff Concierge Terminal
          </h2>
          <p style={{ color: 'var(--cel-text-secondary)', fontSize: '0.86rem', marginTop: '4px' }}>
            High-speed scanning &amp; verification for banquet door staff and red-carpet greeters.
          </p>
        </div>

        {/* Event Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
          <select
            value={activeProjectId}
            onChange={(e) => setActiveProjectId(e.target.value)}
            style={{
              width: isMobile ? '100%' : 'auto',
              background: '#0B0F1A',
              color: 'var(--cel-gold)',
              border: '1px solid rgba(223, 186, 107, 0.4)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.86rem',
              fontWeight: 700,
            }}
          >
            {agencyProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.eventTitle} ({p.venueCity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Instant Notification Toast */}
      {recentCheckedIn && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.08))',
            border: '1px solid #10B981',
            borderRadius: '12px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <CheckCircle2 size={18} color="#10B981" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FFFFFF' }}>
            Check-In Confirmed: <strong>{recentCheckedIn}</strong> recorded at Gate.
          </span>
        </div>
      )}

      {/* Arrival Radar & Gate Telemetry (Desktop/Tablet 3-col grid, Mobile 2-col compact) */}
      {selectedProject && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: isMobile ? '16px' : '22px',
              borderLeft: '4px solid #38BDF8',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Door Check-Ins
              </span>
              <Users size={15} color="#38BDF8" />
            </div>
            <div style={{ fontSize: isMobile ? '1.8rem' : '2.2rem', fontWeight: 900, color: '#38BDF8', marginTop: '4px' }}>
              {selectedProject.checkedInGuests}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--cel-text-dim)', fontWeight: 600 }}>
                / {selectedProject.totalGuests}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
              Live Synced across terminals
            </span>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: isMobile ? '16px' : '22px',
              borderLeft: '4px solid var(--cel-gold)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                Gate Passcode
              </span>
              <ShieldCheck size={15} color="var(--cel-gold)" />
            </div>
            <div style={{ fontSize: isMobile ? '1.3rem' : '1.6rem', fontWeight: 900, color: 'var(--cel-gold)', marginTop: '6px' }}>
              <code>{selectedProject.doorStaffPasscode}</code>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--cel-text-secondary)' }}>
              Staff authorization code
            </span>
          </div>

          {!isMobile && (
            <div
              className="glass-panel"
              style={{
                padding: '22px',
                borderLeft: '4px solid #10B981',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.70rem', color: 'var(--cel-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
                  Arrival Velocity
                </span>
                <Clock size={15} color="#10B981" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
                ~18 <span style={{ fontSize: '1rem', color: 'var(--cel-text-dim)', fontWeight: 500 }}>guests / 10m</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>
                Peak arrival window active
              </span>
            </div>
          )}
        </div>
      )}

      {/* Guest Check-in Interface */}
      <div className="glass-panel" style={{ padding: isMobile ? '18px' : '28px' }}>
        {/* Search & Fast QR Scan Trigger */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 280px' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cel-text-dim)' }}
            />
            <input
              type="text"
              placeholder="Search guest name, table #, dietary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: '10px',
                background: '#07090E',
                border: '1px solid rgba(223, 186, 107, 0.3)',
                color: '#fff',
                fontSize: '0.88rem',
              }}
            />
          </div>

          {/* Quick QR Scanner Simulator button (Large touch target) */}
          <button
            onClick={handleSimulateQrScan}
            className="btn-maison-primary touch-target"
            style={{
              padding: '12px 20px',
              fontSize: '0.86rem',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center',
            }}
          >
            <QrCode size={16} />
            <span>Simulate QR Pass Scan</span>
          </button>
        </div>

        {/* Guest Roster List (Mobile Touch Cards / Desktop Rows) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredGuests.map((guest) => {
            return (
              <div
                key={guest.id}
                style={{
                  padding: isMobile ? '14px' : '16px 20px',
                  borderRadius: '12px',
                  background: guest.checkedIn ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                  border: guest.checkedIn ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--cel-border-subtle)',
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'background 0.2s ease',
                }}
              >
                {/* Guest Details */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: guest.checkedIn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {guest.checkedIn ? <Check size={18} color="#10B981" /> : <Users size={16} color="var(--cel-text-muted)" />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: isMobile ? '0.98rem' : '1.05rem', color: '#FFFFFF' }}>
                        {guest.name}
                      </strong>
                      {guest.isVip && (
                        <span style={{ fontSize: '0.64rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(212, 175, 55, 0.25)', color: 'var(--cel-gold)', fontWeight: 800 }}>
                          VIP
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.70rem',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: 'rgba(96, 165, 250, 0.15)',
                          color: '#93C5FD',
                          fontWeight: 700,
                        }}
                      >
                        Table {guest.tableNumber}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: 'var(--cel-text-secondary)', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span>Party of {guest.partySize}</span>
                      <span>•</span>
                      <span style={{ color: guest.dietary !== 'None' && guest.dietary !== 'Standard Gourmet' ? '#F59E0B' : 'var(--cel-text-muted)' }}>
                        {guest.dietary}
                      </span>
                      {guest.checkedIn && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#10B981', fontWeight: 600 }}>
                            Checked in @ {guest.checkInTime || 'Gate'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Check-In Action Button (48px touch target on mobile) */}
                <div>
                  {guest.checkedIn ? (
                    <div
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#6EE7B7',
                        fontSize: '0.80rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Verified &amp; Admitted</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckIn(guest)}
                      className="btn-maison-primary touch-target"
                      style={{
                        width: isMobile ? '100%' : 'auto',
                        padding: '12px 20px',
                        fontSize: '0.84rem',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={15} />
                      <span>Admit Guest</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
