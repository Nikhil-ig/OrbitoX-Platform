'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  MapPin,
  Heart,
  Palette,
  Users,
  FileText,
  Sliders,
  Eye,
  Send,
  Save,
  Copy,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Gift,
} from 'lucide-react';
import { LivePreviewPanel, StudioFormData } from './LivePreviewPanel';

interface CreationStudioProps {
  initialOccasionSlug?: string;
  initialThemeSlug?: string;
}

const STEPS = [
  { id: 1, name: 'Occasion', icon: <Heart size={15} /> },
  { id: 2, name: 'Style & Theme', icon: <Palette size={15} /> },
  { id: 3, name: 'Protagonists', icon: <Users size={15} /> },
  { id: 4, name: 'Event Details', icon: <Calendar size={15} /> },
  { id: 5, name: 'Story & Narrative', icon: <FileText size={15} /> },
  { id: 6, name: 'Content Modules', icon: <Sliders size={15} /> },
  { id: 7, name: 'Guest & Shagun', icon: <Gift size={15} /> },
  { id: 8, name: 'Device Preview', icon: <Eye size={15} /> },
  { id: 9, name: 'Publish & Share', icon: <Send size={15} /> },
];

export function CreationStudio({ initialOccasionSlug, initialThemeSlug }: CreationStudioProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [savedDraftToast, setSavedDraftToast] = useState(false);
  const [published, setPublished] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [formData, setFormData] = useState<StudioFormData>({
    occasionSlug: initialOccasionSlug || 'wedding',
    themeSlug: initialThemeSlug || 'editorial-atelier',
    protagonist1: 'Aarav Sharma',
    protagonist2: 'Meera Singhania',
    eventTitle: 'Aarav & Meera Wedding Celebration',
    tagline: 'Together with their families, invite you to share their joy.',
    date: '2027-02-18',
    venueName: 'Umaid Bhawan Palace',
    city: 'Jodhpur, Rajasthan',
    storyQuote: 'Two souls, one heart, beginning our timeless voyage.',
    enableRsvp: true,
    enableShagun: true,
    upiId: 'aarav.meera@okhdfcbank',
    enableGuestbook: true,
  });

  const updateField = (field: keyof StudioFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = () => {
    setSavedDraftToast(true);
    setTimeout(() => setSavedDraftToast(false), 2500);
  };

  const handlePublish = () => {
    setPublished(true);
  };

  const copyLiveLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/e/vikram-ananya-wedding');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Studio Top Action Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(9, 9, 11, 0.95)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              color: 'var(--color-text-secondary)',
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#ffffff' }}>Creation Studio</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-tertiary)' }}>•</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-accent)', fontWeight: 600 }}>
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.name}
            </span>
          </div>
        </div>

        {/* Draft save & step controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {savedDraftToast && (
            <span style={{ fontSize: '0.78rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} /> Draft Saved
            </span>
          )}

          <button
            onClick={handleSaveDraft}
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: '0.82rem', gap: '6px' }}
          >
            <Save size={13} />
            <span>Save Draft</span>
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="btn-secondary"
              style={{
                padding: '7px 12px',
                fontSize: '0.82rem',
                opacity: currentStep === 1 ? 0.4 : 1,
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Previous
            </button>
            <button
              onClick={() => {
                if (currentStep < STEPS.length) {
                  setCurrentStep((prev) => prev + 1);
                } else {
                  handlePublish();
                }
              }}
              className="btn-primary"
              style={{ padding: '7px 16px', fontSize: '0.82rem', gap: '6px' }}
            >
              <span>{currentStep === STEPS.length ? 'Publish Celebration' : 'Continue'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Step Progress Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-1)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              style={{
                flex: 1,
                minWidth: '120px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                background: isActive ? 'rgba(124, 92, 252, 0.08)' : 'transparent',
                color: isActive ? '#ffffff' : isDone ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--color-accent)' : isDone ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                  color: isActive || isDone ? '#ffffff' : 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                }}
              >
                {isDone ? <Check size={11} /> : step.id}
              </div>
              <span>{step.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Studio Canvas: Left Editor Controls + Right Live Preview */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          height: 'calc(100vh - 110px)',
          overflow: 'hidden',
        }}
      >
        {/* Left Column: Current Step Editor Controls */}
        <div style={{ padding: '36px 40px', overflowY: 'auto' }}>
          {/* Step 1: Occasion */}
          {currentStep === 1 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 1</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Select Celebration Occasion
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Choose the nature of your celebration to configure optimal ceremony timelines, RSVP fields, and cultural ceremonies.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                {[
                  { slug: 'wedding', name: 'Wedding & Sangeet', desc: 'Nuptials, Haldi, Vow Ceremonies', icon: '💍' },
                  { slug: 'birthday', name: 'Milestone Birthday', desc: 'Jubilees, 18th, 30th, 50th Galas', icon: '🎂' },
                  { slug: 'anniversary', name: 'Anniversary', desc: 'Silver, Gold & Vow Renewals', icon: '💎' },
                  { slug: 'engagement', name: 'Engagement & Roka', desc: 'Ring Ceremonies & Soirées', icon: '✨' },
                  { slug: 'baby-shower', name: 'Baby Shower & Godh Bharai', desc: 'New arrival blessings', icon: '👶' },
                  { slug: 'corporate', name: 'Corporate Gala', desc: 'Awards, Keynotes & Summits', icon: '🏛️' },
                ].map((occ) => {
                  const isSel = formData.occasionSlug === occ.slug;
                  return (
                    <button
                      key={occ.slug}
                      onClick={() => updateField('occasionSlug', occ.slug)}
                      style={{
                        padding: '18px 16px',
                        borderRadius: '14px',
                        background: isSel ? 'rgba(124, 92, 252, 0.12)' : 'var(--color-surface-2)',
                        border: isSel ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{occ.icon}</div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>{occ.name}</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-text-secondary)' }}>{occ.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Style & Theme */}
          {currentStep === 2 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 2</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Choose Your Aesthetic Universe
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Every universe has its own bespoke typography, color grading, and interactive door reveal effects.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {[
                  { slug: 'editorial-atelier', name: 'Editorial Atelier', desc: 'Vogue-style serif, high contrast gold & charcoal', border: '#d4af37' },
                  { slug: 'royal-heritage', name: 'Royal Heritage', desc: 'Palatial luxury, regal filigree & gold foil', border: '#eab308' },
                  { slug: 'botanical-solarium', name: 'Botanical Solarium', desc: 'Verdant greens, soft foliage & organic romanticism', border: '#10b981' },
                  { slug: 'midnight-starlight', name: 'Midnight Starlight', desc: 'Nocturnal deep indigo, stardust particles', border: '#818cf8' },
                ].map((th) => {
                  const isSel = formData.themeSlug === th.slug;
                  return (
                    <button
                      key={th.slug}
                      onClick={() => updateField('themeSlug', th.slug)}
                      style={{
                        padding: '20px',
                        borderRadius: '16px',
                        background: isSel ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                        border: isSel ? `2px solid ${th.border}` : '1px solid var(--color-border)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>{th.name}</span>
                        {isSel && <Check size={16} color={th.border} />}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{th.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Protagonists */}
          {currentStep === 3 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 3</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Protagonists & Celebrants
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Enter the names of the individuals being celebrated. These appear prominently across invitation headers and door seals.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">First Protagonist / Groom / Birthday Host</label>
                  <input
                    type="text"
                    value={formData.protagonist1}
                    onChange={(e) => updateField('protagonist1', e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Second Protagonist / Bride / Partner (Optional)</label>
                  <input
                    type="text"
                    value={formData.protagonist2}
                    onChange={(e) => updateField('protagonist2', e.target.value)}
                    placeholder="e.g. Meera Singhania"
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Invitation Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => updateField('tagline', e.target.value)}
                    placeholder="Together with their families, invite you to share their joy."
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Event Details */}
          {currentStep === 4 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 4</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Date & Palace Venue
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Provide key calendar dates and location coordinates for the venue radar map.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Ceremony Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Palace / Venue Name</label>
                  <input
                    type="text"
                    value={formData.venueName}
                    onChange={(e) => updateField('venueName', e.target.value)}
                    placeholder="e.g. Umaid Bhawan Palace"
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">City & State</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="e.g. Jodhpur, Rajasthan"
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Story & Narrative */}
          {currentStep === 5 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 5</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Story & Love Narrative
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Share your personal journey or celebration quote that greets guests upon entering the experience.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Inspirational Quote or Motto</label>
                  <input
                    type="text"
                    value={formData.storyQuote}
                    onChange={(e) => updateField('storyQuote', e.target.value)}
                    placeholder="Two souls, one heart..."
                    className="input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">The Narrative Journey</label>
                  <textarea
                    rows={5}
                    defaultValue="From a chance meeting during coffee in London to a sunset proposal in Tuscany. We are thrilled to celebrate this union surrounded by our most cherished family and friends."
                    className="textarea"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Content Modules */}
          {currentStep === 6 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 6</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Enable Celebration Modules
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Toggle which interactive sections appear in the guest invitation experience.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  { title: 'Interactive Multi-Event Itinerary', desc: 'Display timing and dress codes for Mehndi, Sangeet & Reception', active: true },
                  { title: 'Interactive RSVP & Plus-One Engine', desc: 'Collect guest confirmations, dietary preferences & hotel logistics', active: formData.enableRsvp, toggle: () => updateField('enableRsvp', !formData.enableRsvp) },
                  { title: 'Digital Shagun UPI Gift Registry', desc: 'Direct monetary blessings to your registered UPI ID with 0% commission', active: formData.enableShagun, toggle: () => updateField('enableShagun', !formData.enableShagun) },
                  { title: 'Live Guestbook & Photo Wall', desc: 'Guests leave blessings, voice notes, and candid celebration photos', active: formData.enableGuestbook, toggle: () => updateField('enableGuestbook', !formData.enableGuestbook) },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={item.toggle}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '12px',
                      background: 'var(--color-surface-2)',
                      border: item.active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: item.toggle ? 'pointer' : 'default',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#ffffff' }}>{item.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        background: item.active ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.active && <Check size={14} color="#ffffff" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Guest & Shagun Config */}
          {currentStep === 7 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 7</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                RSVP & Shagun Configuration
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Configure guest headcount allocations and your verified bank UPI ID for direct blessings.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Host UPI ID for Digital Shagun</label>
                  <input
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => updateField('upiId', e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="input"
                  />
                  <span style={{ fontSize: '0.74rem', color: '#10b981' }}>
                    ✓ 0% platform fee. All contributions deposit immediately into your account.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Allow Plus-Ones by Default?</label>
                  <select className="select">
                    <option value="yes">Yes, allow 1 plus-one per invite</option>
                    <option value="no">No, named guests only</option>
                    <option value="custom">Custom per guest family</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Device Preview */}
          {currentStep === 8 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 8</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Device Audit & Experience Check
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Verify that your invitation looks stunning on mobile smartphones and tablets before sharing.
              </p>

              <div
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                  Ready for Final Publish
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  The preview on the right shows how your guests will experience the invitation. You can test
                  interactive RSVP clicks and theme toggles in real-time.
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(9)}
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: '0.9rem' }}
              >
                <span>Looks Perfect — Proceed to Publish</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Step 9: Publish & Share */}
          {currentStep === 9 && (
            <div>
              <span className="kicker" style={{ marginBottom: '14px' }}>Step 9</span>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>
                Publish & Distribute Celebration
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginBottom: '24px' }}>
                Your bespoke celebration portal is ready to be shared with guests worldwide.
              </p>

              {published ? (
                <div
                  style={{
                    padding: '28px',
                    borderRadius: '16px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1.5px solid rgba(16, 185, 129, 0.3)',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 800, marginBottom: '8px' }}>
                    <CheckCircle2 size={20} />
                    <span>Your Celebration is Live!</span>
                  </div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', marginBottom: '18px' }}>
                    Guests can now view your invitation, confirm attendance, and send digital Shagun blessings.
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={copyLiveLink}
                      className="btn-primary"
                      style={{ padding: '9px 16px', fontSize: '0.85rem', gap: '6px' }}
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Copied to Clipboard!' : 'Copy Guest Link'}</span>
                    </button>
                    <Link
                      href="/e/vikram-ananya-wedding"
                      target="_blank"
                      className="btn-secondary"
                      style={{ padding: '9px 16px', fontSize: '0.85rem', gap: '6px' }}
                    >
                      <Eye size={14} />
                      <span>Open Live Experience</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <button
                    onClick={handlePublish}
                    className="btn-primary"
                    style={{
                      padding: '14px 28px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      justifyContent: 'center',
                    }}
                  >
                    <Sparkles size={17} />
                    <span>Publish Celebration Now</span>
                  </button>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                    You can always edit details, update photos, or modify itineraries after publishing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Live Preview Panel */}
        <LivePreviewPanel data={formData} />
      </div>
    </div>
  );
}
