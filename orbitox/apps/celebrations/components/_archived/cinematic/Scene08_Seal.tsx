'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Share2, Copy, Check, QrCode, ExternalLink, Send, ArrowRight } from 'lucide-react';
import { atelierSoundscape } from '@/lib/atelier-soundscape';

interface Scene08Props {
  names: string;
  isWaxSealed: boolean;
  onAffixSeal: () => void;
  onResetExperience: () => void;
  isCalmMode?: boolean;
}

export const Scene08_Seal: React.FC<Scene08Props> = ({
  names,
  isWaxSealed,
  onAffixSeal,
  onResetExperience,
  isCalmMode = false,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  // Generate invitation slug from names
  const slug = names
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'celebration';
  const shareUrl = `http://localhost:3010/e/${slug}`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      atelierSoundscape.playPaperWhisper();
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `✨ You are cordially invited to our celebration: ${names}!\n\nOpen your personal digital experience here:\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <section
      id="scene-8"
      className="cinematic-scene"
      style={{
        minHeight: '100vh',
        justifyContent: 'center',
        padding: '100px 24px',
        position: 'relative',
        zIndex: 35,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}>
        {/* Scene Kicker */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            color: '#D4AF37',
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          <Sparkles size={14} color="#F5D061" />
          <span>Scene 08</span>
          <span>—</span>
          <span>The Imperial Seal & Distribution</span>
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.4rem, 5.5vw, 4.5rem)',
            fontWeight: 800,
            color: '#FAF8F5',
            lineHeight: 1.15,
            marginBottom: 16,
          }}
        >
          {isWaxSealed ? 'The Seal Has Been Affixed' : 'Affix The Imperial Seal'}
        </h2>

        <p
          style={{
            color: 'rgba(245, 247, 251, 0.75)',
            fontSize: 'clamp(1rem, 1.8vw, 1.25rem)',
            maxWidth: 620,
            margin: '0 auto 48px',
          }}
        >
          {isWaxSealed
            ? 'Your living experience is preserved in high cryptographic fidelity and ready for your guests.'
            : 'Press the crimson wax seal to complete your invitation and generate the sacred guest dispatch.'}
        </p>

        {/* Tactile Wax Seal Button */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            marginBottom: 48,
          }}
        >
          <button
            onClick={() => {
              atelierSoundscape.playWaxSealStamp();
              onAffixSeal();
            }}
            data-cursor="STAMP"
            className="wax-seal-btn"
            style={{
              transform: isWaxSealed ? 'scale(1.1)' : undefined,
              borderColor: isWaxSealed ? '#F5D061' : '#D4AF37',
            }}
            title="Press to Stamp Wax Seal"
          >
            <Sparkles size={24} color="#F5D061" style={{ marginBottom: 4 }} />
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.15em',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                textTransform: 'uppercase',
              }}
            >
              {isWaxSealed ? 'SEALED' : 'PRESS'}
            </span>
          </button>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(245, 247, 251, 0.5)',
            }}
          >
            {isWaxSealed ? 'Imperial Crest Embedded' : 'Click Stamp to Seal'}
          </span>
        </div>

        {/* Share Suite (Revealed when sealed) */}
        {isWaxSealed && (
          <div
            className="cinematic-glass-card"
            style={{
              padding: 'clamp(28px, 5vw, 44px)',
              maxWidth: 720,
              margin: '0 auto 48px',
              animation: 'fadeIn 0.8s ease',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                color: '#FAF8F5',
                marginBottom: 20,
              }}
            >
              The Guest Experience Is Live
            </h3>

            {/* URL Copy Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: 16,
                padding: '10px 16px',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: '#FAF8F5',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                }}
              >
                {shareUrl}
              </span>
              <button
                onClick={handleCopyLink}
                data-cursor="COPY"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: isCopied ? '#22C55E' : '#D4AF37',
                  color: isCopied ? '#FFF' : '#07090D',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                }}
              >
                {isCopied ? <Check size={14} /> : <Copy size={14} />}
                <span>{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Direct Share Options */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={handleWhatsAppShare}
                data-cursor="WHATSAPP"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 999,
                  background: 'rgba(37, 211, 102, 0.15)',
                  border: '1px solid rgba(37, 211, 102, 0.4)',
                  color: '#25D366',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Send size={15} />
                <span>Share via WhatsApp</span>
              </button>

              <Link
                href={`/e/${slug}`}
                target="_blank"
                data-cursor="VISIT"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  borderRadius: 999,
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#F5D061',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>Open Experience</span>
                <ExternalLink size={15} />
              </Link>
            </div>
          </div>
        )}

        {/* Footer Navigation Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            flexWrap: 'wrap',
            color: 'rgba(245, 247, 251, 0.6)',
            fontSize: 13,
          }}
        >
          <button
            onClick={() => {
              atelierSoundscape.playPaperWhisper();
              onResetExperience();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Start Another Celebration
          </button>
          <span>•</span>
          <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Host & Agency Dashboard
          </Link>
          <span>•</span>
          <Link href="/explore" style={{ color: 'inherit', textDecoration: 'underline' }}>
            Explore All Creations
          </Link>
        </div>
      </div>
    </section>
  );
};
