'use client';

import React from 'react';
import Link from 'next/link';
import { useAdmin } from '../data/admin-context';
import { BUSINESS_CATEGORIES } from '../data/mock-data';
import { DynamicIcon } from '../components/dynamic-icon';
import { GlobeIcon, BuildingIcon, ArrowRightIcon } from '../components/icons';

export default function BusinessVerticalsPage() {
  const { providers } = useAdmin();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner */}
      <div
        className="squircle-card"
        style={{
          padding: '30px 34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          background: '#13172B',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          borderRadius: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(88, 101, 242, 0.2) 0%, rgba(88, 101, 242, 0.05) 100%)',
                border: '1px solid rgba(88, 101, 242, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818CF8',
                boxShadow: '0 8px 24px rgba(88, 101, 242, 0.25)',
              }}
            >
              <GlobeIcon size={26} color="#818CF8" />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', color: '#FFFFFF' }}>
              Business Ecosystems Directory
            </h1>
          </div>
          <p style={{ color: '#A3AED0', fontSize: '13.5px', margin: '8px 0 0 0', maxWidth: '750px', lineHeight: 1.6 }}>
            OrbitoX powers isolated multi-tenant business ecosystems. Select any vertical to inspect and govern its live providers (e.g. view all hospitals, all e-commerce stores, all restaurants).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div
            style={{
              padding: '12px 20px',
              borderRadius: '16px',
              background: '#171D36',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 122, 26, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FF7A1A',
              }}
            >
              <BuildingIcon size={18} color="#FF7A1A" />
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                TOTAL VERTICALS
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                {BUSINESS_CATEGORIES.length} Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verticals Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px',
        }}
      >
        {BUSINESS_CATEGORIES.map((cat) => {
          const providerList = providers[cat.slug] || [];
          return (
            <div
              key={cat.id}
              className="squircle-card squircle-card-indigo"
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '24px',
                background: '#13172B',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '24px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Radial gradient background accent */}
              <div
                style={{
                  position: 'absolute',
                  top: '-30px',
                  right: '-30px',
                  width: '180px',
                  height: '180px',
                  background: cat.color,
                  opacity: 0.14,
                  filter: 'blur(50px)',
                  pointerEvents: 'none',
                }}
              />

              <div>
                {/* Header Icon + Provider Counter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '18px',
                      background: `${cat.color}18`,
                      border: `1px solid ${cat.color}35`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: cat.color,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <DynamicIcon name={cat.slug || cat.id} size={28} color={cat.color} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: cat.color,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: `1px solid ${cat.color}40`,
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: cat.color,
                        boxShadow: `0 0 8px ${cat.color}`,
                      }}
                    />
                    <span>{providerList.length} Live Providers</span>
                  </div>
                </div>

                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
                  {cat.title}
                </h2>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: cat.color, marginTop: '4px' }}>
                  {cat.subtitle}
                </div>

                <p style={{ fontSize: '13px', color: '#A3AED0', lineHeight: 1.55, margin: '14px 0 20px 0' }}>
                  {cat.description}
                </p>

                {/* Telemetry pill row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    background: '#171D36',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '14px 16px',
                    borderRadius: '16px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.5px' }}>
                      MONTHLY TRAFFIC
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '3px' }}>
                      {cat.totalApiCalls}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.5px' }}>
                      AUDIENCE REACH
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#818CF8', marginTop: '3px' }}>
                      {cat.totalActiveUsers}
                    </div>
                  </div>
                </div>

                {/* Microservices involved */}
                <div style={{ marginTop: '18px' }}>
                  <div style={{ fontSize: '10.5px', color: '#7B87A8', fontWeight: 700, letterSpacing: '0.6px', marginBottom: '8px' }}>
                    MICROSERVICES INTEGRATED:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {cat.activeServices.map((svc) => (
                      <Link
                        key={svc}
                        href={`/admin/services/${svc}`}
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#CBD5E1',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          textDecoration: 'none',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <span>{svc}</span>
                        <span style={{ color: '#818CF8' }}>→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href={`/admin/business/${cat.slug}`}
                className="pill-interactive pill-interactive-orange"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  padding: '11px 20px',
                  fontSize: '12.5px',
                }}
              >
                <span>View All {cat.title.split(' ')[0]} ({providerList.length})</span>
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
