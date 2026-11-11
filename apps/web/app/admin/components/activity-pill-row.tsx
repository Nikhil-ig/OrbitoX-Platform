'use client';

import React from 'react';
import { DynamicIcon } from './dynamic-icon';
import { ArrowDownIcon, ArrowUpIcon, RefreshCwIcon } from './icons';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  type: 'receive' | 'send' | 'sync' | 'audit';
  badgeLabel: string;
  icon?: string;
  timestamp: string;
}

export function ActivityPillRow({ item }: { item: ActivityItem }) {
  const isReceive = item.type === 'receive';
  const isSend = item.type === 'send';
  const isSync = item.type === 'sync';

  const pillBg = isReceive
    ? 'rgba(88, 101, 242, 0.16)'
    : isSend
    ? 'rgba(255, 122, 26, 0.16)'
    : 'rgba(16, 185, 129, 0.16)';

  const pillColor = isReceive ? '#818CF8' : isSend ? '#FB923C' : '#34D399';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: '16px',
        background: '#171D36',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#1C2342';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#171D36';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: isReceive
              ? 'rgba(88, 101, 242, 0.12)'
              : isSend
              ? 'rgba(255, 122, 26, 0.12)'
              : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${pillBg}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pillColor,
          }}
        >
          <DynamicIcon name={item.icon || 'zap'} size={18} color={pillColor} />
        </div>
        <div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#FFFFFF' }}>{item.title}</div>
          <div style={{ fontSize: '11px', color: '#A3AED0', marginTop: '2px' }}>
            {item.subtitle} • {item.timestamp}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 800,
            color: '#FFFFFF',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {item.amount}
        </span>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '999px',
            background: pillBg,
            color: pillColor,
            border: `1px solid ${pillColor}33`,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.3px',
          }}
        >
          <span>{item.badgeLabel}</span>
          {isReceive ? (
            <ArrowDownIcon size={12} color={pillColor} />
          ) : isSend ? (
            <ArrowUpIcon size={12} color={pillColor} />
          ) : (
            <RefreshCwIcon size={12} color={pillColor} />
          )}
        </div>
      </div>
    </div>
  );
}
