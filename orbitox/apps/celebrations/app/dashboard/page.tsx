'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Gift,
  Heart,
  MapPin,
  MessageSquare,
  Plus,
  QrCode,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
  Building2,
} from 'lucide-react';
import { useEcosystem } from '../../lib/ecosystem-context';

interface GuestItem {
  id: string;
  name: string;
  status: 'Confirmed' | 'Declined' | 'Pending';
  partySize: number;
  diet: string;
  category: 'Family' | 'Close Friends' | 'Colleagues' | 'VIP';
  lastUpdated: string;
}

interface ShagunContribution {
  id: string;
  donorName: string;
  amount: number;
  message: string;
  timestamp: string;
}

const INITIAL_GUESTS: GuestItem[] = [
  { id: '1', name: 'Vikram & Radhika Malhotra', status: 'Confirmed', partySize: 2, diet: 'Pure Vegetarian', category: 'VIP', lastUpdated: '2 hours ago' },
  { id: '2', name: 'Pooja Bhatt', status: 'Confirmed', partySize: 1, diet: 'Jain Special', category: 'Family', lastUpdated: '5 hours ago' },
  { id: '3', name: 'Devraj Singh', status: 'Declined', partySize: 0, diet: 'N/A', category: 'Colleagues', lastUpdated: '1 day ago' },
  { id: '4', name: 'Ananya & Kabir Roy', status: 'Pending', partySize: 2, diet: 'Vegetarian', category: 'Close Friends', lastUpdated: '2 days ago' },
  { id: '5', name: 'Kavita Chawla', status: 'Confirmed', partySize: 3, diet: 'Vegan', category: 'Family', lastUpdated: '3 days ago' },
  { id: '6', name: 'Rohan Deshmukh', status: 'Confirmed', partySize: 1, diet: 'Non-Vegetarian', category: 'Close Friends', lastUpdated: '4 days ago' },
];

const RECENT_SHAGUN: ShagunContribution[] = [
  { id: 's1', donorName: 'Dr. Ashok & Sunita Singhania', amount: 21000, message: 'Wishing you both a lifetime of eternal joy and laughter!', timestamp: 'Today, 11:20 AM' },
  { id: 's2', donorName: 'Manoj Uncle & Chachi', amount: 11000, message: 'Sada khush raho! Deepest blessings on your wedding journey.', timestamp: 'Yesterday, 8:45 PM' },
  { id: 's3', donorName: 'Kabir & Ananya', amount: 5100, message: 'Can’t wait to dance at the Sangeet! Hugs!', timestamp: '2 days ago' },
  { id: 's4', donorName: 'Rajesh Chawla', amount: 15000, message: 'Warmest congratulations from all of us in London.', timestamp: '3 days ago' },
];

export default function DashboardPage() {
  const { currentRole, hostCelebration } = useEcosystem();
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'shagun' | 'guestbook'>('overview');
  const [guestSearch, setGuestSearch] = useState('');
  const [guestFilter, setGuestFilter] = useState<string>('All');
  const [copiedLink, setCopiedLink] = useState(false);

  // Filtered guests
  const filteredGuests = useMemo(() => {
    return INITIAL_GUESTS.filter((g) => {
      const matchesQuery = g.name.toLowerCase().includes(guestSearch.toLowerCase()) || g.diet.toLowerCase().includes(guestSearch.toLowerCase());
      const matchesFilter = guestFilter === 'All' || g.status === guestFilter;
      return matchesQuery && matchesFilter;
    });
  }, [guestSearch, guestFilter]);

  const copyCelebrationLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/e/vikram-ananya-wedding');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '36px 0 80px 0' }}>
      <div className="container">
        {/* If user is an agency planner visiting /dashboard, show quick context switcher bar */}
        {currentRole === 'AGENCY_PLANNER' && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(96, 165, 250, 0.1)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', color: '#60a5fa' }}>
              <Building2 size={16} />
              <span>You are viewing the Single Host Hub while in <strong>Agency Planner</strong> persona.</span>
            </div>
            <Link href="/workspace" className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Switch to Multi-Client Agency Cockpit →
            </Link>
          </div>
        )}

        {/* Header Bar */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '20px',
            flexWrap: 'wrap',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-accent">Host Celebration Hub</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>•</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-tertiary)' }}>87 Days Until Ceremony</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }}>
              {hostCelebration?.coupleTitle || 'Aarav & Meera'}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: '4px' }}>
              Royal Wedding & Sangeet Celebration • Umaid Bhawan Palace, Jodhpur
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={copyCelebrationLink}
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: '0.85rem', gap: '6px' }}
            >
              {copiedLink ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Guest Link'}</span>
            </button>
            <Link
              href="/e/vikram-ananya-wedding"
              target="_blank"
              className="btn-secondary"
              style={{ padding: '9px 16px', fontSize: '0.85rem', gap: '6px' }}
            >
              <Eye size={15} />
              <span>Live Guest View</span>
            </Link>
            <Link
              href="/create?edit=aarav-meera-wedding&step=beginning"
              className="btn-primary"
              style={{ padding: '9px 18px', fontSize: '0.85rem', gap: '6px' }}
            >
              <Sparkles size={15} />
              <span>Edit Celebration</span>
            </Link>
          </div>
        </header>

        {/* 4 Top KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Confirmed RSVPs
              </span>
              <UserCheck size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              319 <span style={{ fontSize: '1rem', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>/ 420</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={13} />
              <span>+18 RSVPs this week (76% confirmed)</span>
            </div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Digital Shagun
              </span>
              <Gift size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              ₹1,48,000
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              14 contributors • 0% platform fee
            </div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Guestbook Blessings
              </span>
              <MessageSquare size={16} color="#f472b6" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              184
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              Includes 32 photo uploads
            </div>
          </div>

          <div className="surface-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)' }}>
                Invitation Views
              </span>
              <Eye size={16} color="#c4b5fd" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>
              1,240
            </div>
            <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '8px' }}>
              89% mobile open rate
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: '12px',
            marginBottom: '28px',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'overview', label: 'Celebration Overview', icon: <Sparkles size={15} /> },
            { id: 'guests', label: 'Guest List & RSVPs', icon: <Users size={15} /> },
            { id: 'shagun', label: 'Shagun Ledger', icon: <Gift size={15} /> },
            { id: 'guestbook', label: 'Live Guestbook', icon: <MessageSquare size={15} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                background: activeTab === tab.id ? 'var(--color-surface-2)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--color-text-secondary)',
                border: activeTab === tab.id ? '1px solid var(--color-border)' : '1px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Live Celebration Card */}
            <div className="surface-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Active Invitation Portal
                </span>
                <span className="badge badge-success">Portal Online</span>
              </div>

              <div
                style={{
                  height: '180px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #2e1d3d 0%, #15101f 100%)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <span className="badge badge-accent">Theme: Editorial Atelier</span>
                  <div className="font-display" style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ffffff', marginTop: '8px' }}>
                    {hostCelebration?.coupleTitle || 'Aarav & Meera'}
                  </div>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  https://celebrate.orbitox.io/e/vikram-ananya-wedding
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Ceremony Date:</span>
                  <span style={{ fontWeight: 600 }}>Feb 18, 2027</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Palace Venue:</span>
                  <span style={{ fontWeight: 600 }}>Umaid Bhawan Palace, Jodhpur</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Current Plan:</span>
                  <span className="badge badge-accent">Premier Celebration Pass</span>
                </div>
              </div>

              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '10px' }}>
                <Link
                  href="/create"
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.84rem' }}
                >
                  Edit Invitation
                </Link>
                <Link
                  href="/e/vikram-ananya-wedding"
                  target="_blank"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.84rem' }}
                >
                  <span>Launch Live</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>

            {/* Quick Actions & Sharing */}
            <div className="surface-card" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: '#ffffff' }}>
                Host Quick Actions
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <button
                  onClick={copyCelebrationLink}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Share2 size={16} color="var(--color-accent)" />
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Copy WhatsApp Invitation Message</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)' }}>Formatted with couple names & RSVP link</div>
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--color-text-tertiary)" />
                </button>

                <button
                  onClick={() => setActiveTab('guests')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={16} color="#10b981" />
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>Manage Guest Roster & Plus-Ones</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)' }}>Review dietary tags & seating groups</div>
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--color-text-tertiary)" />
                </button>

                <button
                  onClick={() => setActiveTab('shagun')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Gift size={16} color="#f59e0b" />
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600 }}>View Digital Shagun Bank Settlements</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)' }}>Direct deposits to your registered UPI ID</div>
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--color-text-tertiary)" />
                </button>
              </div>

              {/* Milestone Timeline */}
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
                Key Milestones
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>RSVP Deadline:</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>January 15, 2027</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Final Caterer Headcount:</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>January 22, 2027</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Sangeet Ceremony:</span>
                  <span style={{ fontWeight: 600, color: '#ffffff' }}>February 17, 2027</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Guest List & RSVPs */}
        {activeTab === 'guests' && (
          <div className="surface-card" style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                <div
                  style={{
                    position: 'relative',
                    flex: 1,
                    maxWidth: '340px',
                  }}
                >
                  <Search size={15} color="var(--color-text-tertiary)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <input
                    type="text"
                    placeholder="Search guest or diet..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    className="input"
                    style={{ paddingLeft: '34px', paddingRight: '12px', height: '38px', fontSize: '0.85rem' }}
                  />
                </div>

                <select
                  value={guestFilter}
                  onChange={(e) => setGuestFilter(e.target.value)}
                  className="select"
                  style={{ width: '140px', height: '38px', fontSize: '0.85rem' }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Declined">Declined</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="btn-secondary btn-sm" style={{ gap: '6px' }}>
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
                <button className="btn-primary btn-sm" style={{ gap: '6px' }}>
                  <Plus size={13} />
                  <span>Add Guest</span>
                </button>
              </div>
            </div>

            {/* Guests Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', fontSize: '0.78rem' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>GUEST NAME</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>STATUS</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>PARTY SIZE</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>DIETARY PREFERENCE</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>CATEGORY</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>LAST UPDATED</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuests.map((guest) => (
                    <tr
                      key={guest.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: '#ffffff' }}>
                        {guest.name}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {guest.status === 'Confirmed' ? (
                          <span className="badge badge-success">Confirmed</span>
                        ) : guest.status === 'Declined' ? (
                          <span className="badge badge-danger">Declined</span>
                        ) : (
                          <span className="badge badge-warning">Awaiting Response</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                        {guest.partySize > 0 ? `${guest.partySize} ${guest.partySize === 1 ? 'Guest' : 'Guests'}` : '—'}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-secondary)' }}>
                        {guest.diet}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className="badge badge-neutral">{guest.category}</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
                        {guest.lastUpdated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Shagun Ledger */}
        {activeTab === 'shagun' && (
          <div className="surface-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  Direct Shagun Contributions
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Total Collected: <strong style={{ color: '#10b981' }}>₹1,48,000</strong> • Direct settlements to UPI ID: <code>aarav.meera@okhdfcbank</code>
                </p>
              </div>
              <button className="btn-secondary btn-sm">Download Tax Ledger</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {RECENT_SHAGUN.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>{item.donorName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                      &ldquo;{item.message}&rdquo;
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
                      {item.timestamp} • Verified UPI Payment
                    </div>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                    +₹{item.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Live Guestbook */}
        {activeTab === 'guestbook' && (
          <div className="surface-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  Live Guestbook Wall (184 Notes)
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                  Emotional blessings and memories left by guests directly from their digital invitation portal.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {[
                { name: 'Rohan & Tanya Deshmukh', note: 'Can’t wait to celebrate the wedding of the decade! See you guys on the 17th in Jodhpur!', date: 'Yesterday' },
                { name: 'Kavita Chawla (Bua ji)', note: 'God bless Aarav and Meera! May you always smile like this. Lots of love from Chandigarh.', date: '2 days ago' },
                { name: 'Arjun & Sneha Verma', note: 'Packing our traditional outfits already! Wishing you both a lifetime of happiness.', date: '3 days ago' },
              ].map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: 'var(--color-surface-2)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>{card.name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)' }}>{card.date}</div>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    &ldquo;{card.note}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
