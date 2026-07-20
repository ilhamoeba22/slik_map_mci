'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Logout modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Sidebar collapse setup
    const savedCollapse = localStorage.getItem('sidebar_collapsed') === 'true';
    setIsCollapsed(savedCollapse);
    document.documentElement.setAttribute('data-sidebar', savedCollapse ? 'collapsed' : 'expanded');

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

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar_collapsed', nextState);
    document.documentElement.setAttribute('data-sidebar', nextState ? 'collapsed' : 'expanded');
  };

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

  const menuItems = [
    { icon: '📊', name: 'Dashboard & Rekap', path: '/' },
    { icon: '📁', name: 'MAP Generator', path: '/map-generator' },
    { icon: '🔍', name: 'Permintaan SLIK', path: '/slik-request' },
    { icon: '📥', name: 'Upload Hasil SLIK', path: '/slik-parser' }
  ];

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="mobile-header no-print">
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)} 
          className="menu-toggle-btn"
          title="Toggle Menu"
        >
          ☰
        </button>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-display)' }}>
          BPRS HIK MCI Portal
        </div>
        <div className="profile-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
          {user ? user.nama.charAt(0).toUpperCase() : 'U'}
        </div>
      </header>

      {/* Sidebar Container */}
      <aside className={`sidebar no-print ${isMobileOpen ? 'open' : ''}`}>
        
        {/* Logo and Brand Header */}
        <div className="sidebar-header">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isCollapsed ? (
              <img 
                src="/mci_ico.ico" 
                alt="BPRS HIK MCI Icon" 
                style={{ width: '34px', height: '34px', objectFit: 'contain' }} 
              />
            ) : (
              <Image 
                src="/logo_mci.png" 
                alt="BPRS HIK MCI Logo" 
                width={150} 
                height={50} 
                style={{ objectFit: 'contain' }} 
                priority
              />
            )}
          </Link>
          <button 
            onClick={toggleCollapse} 
            className="sidebar-toggle-btn" 
            title={isCollapsed ? "Buka Sidebar" : "Minimize Sidebar"}
          >
            {isCollapsed ? '❯' : '❮'}
          </button>
        </div>

        {/* User Profile Info */}
        {user && (
          <div className="sidebar-profile" title={isCollapsed ? `${user.nama} (${user.role})` : ''}>
            <div className="profile-avatar">
              {user.nama.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-profile-info" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.nama}
              </span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.75rem' }}>
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* Menu Navigation */}
        <nav className="sidebar-menu">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`menu-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.name : ''}
              >
                <span className="menu-icon" style={{ fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span>
                <span className="menu-item-text">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer controls: theme toggler and logout */}
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
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

          <button 
            onClick={() => setShowLogoutModal(true)} 
            className="btn btn-secondary logout-btn" 
            title="Keluar Aplikasi"
            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.1)', background: 'rgba(239, 68, 68, 0.03)' }}
          >
            <span>🚪</span>
            <span className="sidebar-footer-text">Keluar Aplikasi</span>
          </button>
        </div>

      </aside>

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

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="no-print"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 105
          }}
        />
      )}
    </>
  );
}
