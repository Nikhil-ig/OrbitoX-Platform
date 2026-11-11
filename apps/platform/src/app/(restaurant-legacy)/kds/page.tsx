'use client';

import React, { useState, useEffect } from 'react';

interface KitchenTask {
  id: string;
  orderId: string;
  itemName: string;
  quantity: number;
  stationId: string;
  stationName: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'READY' | 'DELAYED' | 'BUMPED';
  targetServeAt: string;
  fireAt: string;
  estimatedDurationMinutes: number;
  selectedModifiers: string[];
  specialInstructions?: string;
}

export default function KitchenKdsPage() {
  const [activeStation, setActiveStation] = useState<string>('st_tandoor');
  const [tasks, setTasks] = useState<KitchenTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const stations = [
    { id: 'st_tandoor', name: 'Tandoor Station' },
    { id: 'st_curry_line', name: 'Curry Line' },
    { id: 'st_bar', name: 'Bar & Beverages' },
    { id: 'st_dessert', name: 'Dessert Station' },
    { id: 'st_expo', name: 'Expo Pass (All)' },
  ];

  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/restaurant/kds?stationId=${activeStation}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error('KDS fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [activeStation]);

  const handleBumpTask = async (task: KitchenTask) => {
    const nextStatus = task.status === 'QUEUED' ? 'IN_PROGRESS' : 'READY';
    try {
      await fetch('/api/restaurant/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          newStatus: nextStatus,
          bumpedBy: 'Station Chef',
        }),
      });
      fetchQueue();
    } catch (err) {
      console.error('Bump error', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#070913', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 24 }}>
      {/* ─── KDS Header Bar ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, textTransform: 'uppercase', color: '#FF7A1A', fontWeight: 800, letterSpacing: '0.1em' }}>
            ORBITOX KITCHEN DISPLAY SYSTEM · HIGH VELOCITY DISPATCH
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>
            Ludhiana Main · <span style={{ color: '#818CF8' }}>Kitchen Station Terminal</span>
          </div>
        </div>

        {/* Station Tabs */}
        <div style={{ display: 'flex', gap: 8, background: '#13172B', padding: 6, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          {stations.map(st => (
            <button
              key={st.id}
              onClick={() => setActiveStation(st.id)}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: 'none',
                background: activeStation === st.id ? '#5865F2' : 'transparent',
                color: activeStation === st.id ? '#fff' : '#A3AED0',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {st.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─── KDS Ticket Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {tasks.map(task => {
          const isQueued = task.status === 'QUEUED';
          const isInProgress = task.status === 'IN_PROGRESS';
          const isReady = task.status === 'READY';

          return (
            <div
              key={task.id}
              style={{
                background: '#13172B',
                borderRadius: 20,
                border: isInProgress ? '2px solid #F59E0B' : isReady ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Ticket Top Header */}
              <div
                style={{
                  padding: '14px 18px',
                  background: isInProgress ? 'rgba(245, 158, 11, 0.15)' : isReady ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Table T-14</div>
                  <div style={{ fontSize: 11, color: '#7B87A8', fontWeight: 600 }}>Order #{task.orderId.slice(-4)}</div>
                </div>
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 12,
                    background: isInProgress ? '#F59E0B' : isReady ? '#10B981' : '#334155',
                    color: '#fff',
                  }}
                >
                  {task.status}
                </div>
              </div>

              {/* Ticket Body */}
              <div style={{ padding: 20, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>
                    <span style={{ color: '#FF7A1A', marginRight: 8 }}>{task.quantity}×</span>
                    {task.itemName}
                  </div>
                  <div style={{ fontSize: 13, color: '#818CF8', fontWeight: 700 }}>⏱ {task.estimatedDurationMinutes}m</div>
                </div>

                {task.selectedModifiers.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {task.selectedModifiers.map(mod => (
                      <span
                        key={mod}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(255, 122, 26, 0.15)',
                          color: '#FF7A1A',
                        }}
                      >
                        + {mod}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 12, color: '#A3AED0', marginTop: 8 }}>
                  Target Expo Arrival: <span style={{ color: '#fff', fontWeight: 700 }}>{new Date(task.targetServeAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Big Touch Bump Button (52px+) */}
              <div style={{ padding: '0 16px 16px 16px' }}>
                <button
                  onClick={() => handleBumpTask(task)}
                  disabled={isReady}
                  style={{
                    width: '100%',
                    height: 54,
                    borderRadius: 14,
                    border: 'none',
                    fontWeight: 900,
                    fontSize: 16,
                    cursor: isReady ? 'default' : 'pointer',
                    background: isQueued
                      ? 'linear-gradient(135deg, #FF7A1A 0%, #FF9533 100%)'
                      : isInProgress
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      : 'rgba(255,255,255,0.08)',
                    color: isReady ? '#7B87A8' : '#fff',
                    boxShadow: !isReady ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {isQueued ? '🔥 START COOKING' : isInProgress ? '✓ BUMP TO EXPO (READY)' : 'COMPLETED'}
                </button>
              </div>
            </div>
          );
        })}

        {tasks.length === 0 && !loading && (
          <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', background: '#13172B', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Station Queue is Clear!</div>
            <div style={{ fontSize: 14, color: '#7B87A8', marginTop: 4 }}>All scheduled dish tasks have been bumped or dispatched.</div>
          </div>
        )}
      </div>
    </div>
  );
}
