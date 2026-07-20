'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function Navbar() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);

  // Logout modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Fetch user status
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const confirmLogout = async () => {
    setLogoutLoading(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar" style={{ padding: '0.45rem 0' }}>
        <div className="container navbar-container">
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image 
              src="/logo_mci.png" 
              alt="BPRS HIK MCI Logo" 
              width={180} 
              height={65} 
              style={{ objectFit: 'contain' }} 
              priority
            />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ textAlign: 'right', fontSize: '0.8rem', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{user.nama}</span>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{user.role}</span>
                </div>
                <button 
                  onClick={() => setShowLogoutModal(true)} 
                  className="btn btn-secondary" 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  Keluar
                </button>
              </div>
            )}
            
            <button 
              onClick={toggleTheme} 
              className="theme-toggle-icon-btn" 
              title={theme === 'light' ? 'Ubah ke Mode Gelap' : 'Ubah ke Mode Terang'}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-glass)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'var(--text-primary)'
              }}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </nav>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div 
          className="no-print"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="glass-card" 
            style={{ 
              maxWidth: '400px', 
              width: '90%', 
              padding: '2rem', 
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-glass)',
              animation: 'scaleIn 0.2s ease-out'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚪</div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Konfirmasi Keluar Aplikasi
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: '1.5' }}>
              Apakah Anda yakin ingin mengakhiri sesi dan keluar dari portal <b>BPRS MCI</b>?
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.875rem' }}
                disabled={logoutLoading}
              >
                Batal
              </button>
              <button 
                onClick={confirmLogout}
                className="btn btn-danger"
                style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.875rem' }}
                disabled={logoutLoading}
              >
                {logoutLoading ? 'Keluar...' : 'Ya, Keluar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
