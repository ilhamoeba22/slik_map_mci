'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard stats state
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        fetchDashboardStats();
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function fetchDashboardStats() {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/dashboard/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        window.location.reload();
      } else {
        setLoginError(data.message || 'Login gagal.');
      }
    } catch (err) {
      setLoginError('Terjadi kesalahan jaringan.');
    } finally {
      setLoginLoading(false);
    }
  }

  const formatRupiah = (number) => {
    if (!number) return 'Rp 0';
    if (number >= 1000000000) {
      return `Rp ${(number / 1000000000).toFixed(2)} Miliar`;
    }
    if (number >= 1000000) {
      return `Rp ${(number / 1000000).toFixed(1)} Juta`;
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDateSmart = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Memeriksa sesi masuk...</div>
      </div>
    );
  }

  // RENDER LOGIN SCREEN if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem 2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <img 
                  src="/logo_mci.png" 
                  alt="Logo BPRS HIK MCI" 
                  style={{ height: '65px', width: 'auto', objectFit: 'contain' }} 
                />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Masuk ke Sistem</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Gunakan NIK SSO Anda untuk mengakses Dashboard Portal MCI.</p>
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                padding: '0.75rem',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">NIK (Username)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Masukkan NIK Anda"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loginLoading}>
                {loginLoading ? 'Memverifikasi...' : 'Masuk via SSO'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Calculate monthly max for SVG chart scaling
  const monthlyTrend = stats?.monthlyTrend || [];
  const maxVal = Math.max(...monthlyTrend.map(m => Math.max(m.mapCount, m.slikCount)), 5);

  // Palette for Doughnut chart
  const pieColors = ['#00b486', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#64748b'];
  const segmentBreakdown = stats?.segmentBreakdown || [];
  const totalSegmentCount = segmentBreakdown.reduce((acc, curr) => acc + curr.count, 0) || 1;

  // Calculate Donut stroke offsets
  let cumulativePercent = 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <main className="container" style={{ flex: 1, padding: '2rem 1.5rem', marginBottom: '4rem' }}>
          
          {/* Header Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                📊 Executive Dashboard &amp; Rekapitulasi
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Ringkasan performa real-time pengajuan MAP Generator dan Checking SLIK OJK.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/map-generator" className="btn btn-primary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
                📁 MAP Generator
              </Link>
              <Link href="/slik-request" className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.85rem' }}>
                🔍 Ajukan Checking SLIK
              </Link>
            </div>
          </div>

          {loadingStats ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Memuat data ringkasan rekapitulasi...
            </div>
          ) : (
            <>
              {/* STAT CARDS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                
                {/* Stat 1: Total MAP */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      TOTAL MAP DIBUAT
                    </span>
                    <span style={{ fontSize: '1.5rem' }}>📁</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {stats?.summary?.totalMap || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Berkas</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>⚡ MAP Generator Active</span>
                  </div>
                </div>

                {/* Stat 2: Total Plafon */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      TOTAL PLAFON PENGAJUAN
                    </span>
                    <span style={{ fontSize: '1.5rem' }}>💰</span>
                  </div>
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {formatRupiah(stats?.summary?.totalPlafon || 0)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Akumulasi seluruh nominal MAP
                  </div>
                </div>

                {/* Stat 3: Permintaan SLIK */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      PERMINTAAN SLIK OJK
                    </span>
                    <span style={{ fontSize: '1.5rem' }}>🔍</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {stats?.summary?.totalSlikRequests || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Request</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                    <span>📋 Batch TXT Generated</span>
                  </div>
                </div>

                {/* Stat 4: Data SLIK Terparse */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      DATA SLIK PARSED
                    </span>
                    <span style={{ fontSize: '1.5rem' }}>💾</span>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {stats?.summary?.totalSlikData || 0} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>Nasabah</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Tersimpan di Database SLIK
                  </div>
                </div>

              </div>

              {/* CHARTS ROW */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* BAR / TREN CHART */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        📈 Tren Pengajuan &amp; Checking SLIK
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Perbandingan bulanan (6 Bulan Terakhir)</p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-primary)' }} />
                        <span>MAP</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }} />
                        <span>SLIK Req</span>
                      </div>
                    </div>
                  </div>

                  {monthlyTrend.length === 0 ? (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Belum ada data tren bulanan.
                    </div>
                  ) : (
                    <div style={{ position: 'relative', height: '220px', display: 'flex', alignItems: 'flex-end', gap: '1.25rem', paddingTop: '2rem', borderBottom: '1px solid var(--border-glass)' }}>
                      {monthlyTrend.map((m, idx) => {
                        const mapHeightPct = Math.round((m.mapCount / maxVal) * 100);
                        const slikHeightPct = Math.round((m.slikCount / maxVal) * 100);
                        const isHovered = hoveredBarIndex === idx;

                        return (
                          <div 
                            key={idx} 
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                            onMouseEnter={() => setHoveredBarIndex(idx)}
                            onMouseLeave={() => setHoveredBarIndex(null)}
                          >
                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div style={{
                                position: 'absolute',
                                top: '-45px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-glass)',
                                padding: '0.35rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                boxShadow: 'var(--shadow-md)',
                                zIndex: 20,
                                whiteSpace: 'nowrap',
                                textAlign: 'center'
                              }}>
                                <div style={{ fontWeight: 700 }}>{m.label}</div>
                                <div style={{ color: 'var(--accent-primary)' }}>MAP: {m.mapCount}</div>
                                <div style={{ color: '#3b82f6' }}>SLIK: {m.slikCount}</div>
                              </div>
                            )}

                            {/* Bars Group */}
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%', height: '100%', justifyContent: 'center' }}>
                              {/* MAP Bar */}
                              <div 
                                style={{ 
                                  width: '40%', 
                                  height: `${Math.max(mapHeightPct, 6)}%`, 
                                  background: 'linear-gradient(180deg, var(--accent-primary) 0%, rgba(0, 180, 134, 0.4) 100%)',
                                  borderRadius: '4px 4px 0 0',
                                  transition: 'height 0.4s ease'
                                }} 
                              />
                              {/* SLIK Bar */}
                              <div 
                                style={{ 
                                  width: '40%', 
                                  height: `${Math.max(slikHeightPct, 6)}%`, 
                                  background: 'linear-gradient(180deg, #3b82f6 0%, rgba(59, 130, 246, 0.4) 100%)',
                                  borderRadius: '4px 4px 0 0',
                                  transition: 'height 0.4s ease'
                                }} 
                              />
                            </div>

                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 600 }}>
                              {m.label.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* DONUT CHART: SEGMENT BREAKDOWN */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      🍩 Distribusi Segmen Nasabah (SLIK)
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kategori &amp; segmen nasabah yang dilakukan checking SLIK</p>
                  </div>

                  {segmentBreakdown.length === 0 ? (
                    <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Belum ada data segmen nasabah.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', height: '200px', flexWrap: 'wrap' }}>
                      
                      {/* SVG Donut Chart */}
                      <div style={{ position: 'relative', width: '130px', height: '130px', flexShrink: 0 }}>
                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          {segmentBreakdown.map((item, idx) => {
                            const percent = (item.count / totalSegmentCount) * 100;
                            const strokeDasharray = `${percent} ${100 - percent}`;
                            const strokeDashoffset = -cumulativePercent;
                            cumulativePercent += percent;
                            const color = pieColors[idx % pieColors.length];

                            return (
                              <circle
                                key={idx}
                                cx="18"
                                cy="18"
                                r="15.91549430918954"
                                fill="transparent"
                                stroke={color}
                                strokeWidth="3.8"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                style={{ transition: 'stroke-dasharray 0.5s ease' }}
                              />
                            );
                          })}
                        </svg>
                        
                        <div style={{
                          position: 'absolute',
                          top: 0, left: 0, right: 0, bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {totalSegmentCount}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Total
                          </span>
                        </div>
                      </div>

                      {/* Legend List */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px' }}>
                        {segmentBreakdown.map((item, idx) => {
                          const pct = Math.round((item.count / totalSegmentCount) * 100);
                          const color = pieColors[idx % pieColors.length];

                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.segment}</span>
                              </div>
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                                {item.count} ({pct}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>

              </div>

              {/* RECENT ACTIVITY LISTS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
                
                {/* Recent MAP List */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>📁</span> Berkas MAP Terbaru
                    </h3>
                    <Link href="/map-generator" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      Lihat Semua →
                    </Link>
                  </div>

                  {!stats?.recentMap || stats.recentMap.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Belum ada pengajuan MAP.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {stats.recentMap.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{item.nama}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>NIK: {item.nik} | Nopen: {item.nopen}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{formatRupiah(item.plafon_pengajuan)}</span>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{formatDateSmart(item.submitted_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent SLIK Requests */}
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>🔍</span> Permintaan SLIK OJK Terbaru
                    </h3>
                    <Link href="/slik-request" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      Lihat Semua →
                    </Link>
                  </div>

                  {!stats?.recentSlik || stats.recentSlik.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Belum ada permintaan checking SLIK.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {stats.recentSlik.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{item.nama}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>Batch ID: {item.id_slik}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>AO: {item.ao}</span>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{formatDateSmart(item.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
